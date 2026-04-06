import type { GameState, GameAction, GameResult, Card, PlayerGameState, PlayerInfo, OrganSlot } from './types'
import { getOrganState, hasWon, colorsCompatible, organName, colorDisplayName } from './types'
import { buildShuffledDeck } from './deckBuilder'

export function initGame(roomId: string, players: PlayerInfo[]): GameState {
  const deck = [...buildShuffledDeck()]
  const playerOrder = shuffle(players.map(p => p.id))
  const playerStates: Record<string, PlayerGameState> = {}
  for (const p of players) {
    playerStates[p.id] = { playerId: p.id, hand: deck.splice(0, 3), body: {}, skippedNextTurn: false }
  }
  return { roomId, deck, discardPile: [], playerOrder, playerStates, currentPlayerIndex: 0, phase: 'WAITING_ACTION', hasPlayedOrDiscarded: false, lastActionLog: '', turnNumber: 1 }
}

export function applyAction(state: GameState, playerId: string, action: GameAction): GameResult {
  if (state.winner) return { ok: false, message: 'El juego ha terminado.' }
  if (state.playerOrder[state.currentPlayerIndex] !== playerId && action.type !== 'END_TURN') {
    return { ok: false, message: 'No es tu turno.' }
  }

  let result: GameResult
  switch (action.type) {
    case 'PLAY_ORGAN': result = playOrgan(state, playerId, action.card, action.targetOrganColor); break
    case 'PLAY_VIRUS': result = playVirus(state, playerId, action.card, action.targetPlayerId, action.targetOrganColor); break
    case 'PLAY_MEDICINE': result = playMedicine(state, playerId, action.card, action.targetOrganColor); break
    case 'PLAY_TREATMENT': result = playTreatment(state, playerId, action); break
    case 'DISCARD_CARDS': result = discardCards(state, playerId, action.cards); break
    case 'END_TURN': result = endTurn(state, playerId); break
  }

  if (result.ok && !result.newState.winner) {
    for (const pid of result.newState.playerOrder) {
      const checked = checkWin(result.newState, pid)
      if (checked.ok && checked.newState.winner) return checked
    }
  }
  return result
}

function playOrgan(state: GameState, playerId: string, card: Card, targetOrganColor?: string): GameResult {
  if (state.hasPlayedOrDiscarded) return err('Ya jugaste o descartaste en este turno.')
  const ps = state.playerStates[playerId]
  if (!ps?.hand.find(c => c.id === card.id)) return err('No tienes esa carta.')
  if (card.type !== 'ORGAN') return err('No es un órgano.')

  const slotKey = card.color === 'MULTICOLOR' ? (targetOrganColor ?? null) : card.color
  if (!slotKey) return err('Debes elegir qué órgano representará el multicolor.')
  if (ps.body[slotKey]) return err('Ya tienes un órgano de ese color.')

  const storedCard = card.color === 'MULTICOLOR' ? { ...card, color: slotKey as Card['color'] } : card
  const newPs = { ...ps, hand: ps.hand.filter(c => c.id !== card.id), body: { ...ps.body, [slotKey]: { organCard: storedCard, viruses: [], medicines: [] } } }
  const colorLabel = card.color === 'MULTICOLOR' ? `Multicolor (${colorDisplayName(slotKey as Card['color'])})` : colorDisplayName(card.color)
  const ns = { ...state, playerStates: { ...state.playerStates, [playerId]: newPs }, hasPlayedOrDiscarded: true, lastActionLog: `${playerId} jugó órgano ${colorLabel}` }
  return checkWin(ns, playerId)
}

function playVirus(state: GameState, playerId: string, card: Card, targetPlayerId: string, targetOrganColor: string): GameResult {
  if (state.hasPlayedOrDiscarded) return err('Ya jugaste o descartaste en este turno.')
  const myPs = state.playerStates[playerId]
  if (!myPs?.hand.find(c => c.id === card.id)) return err('No tienes esa carta.')
  const targetPs = state.playerStates[targetPlayerId]
  if (!targetPs) return err('Jugador objetivo no encontrado.')
  const slot = targetPs.body[targetOrganColor]
  if (!slot) return err('El jugador no tiene ese órgano.')
  if (getOrganState(slot) === 'IMMUNIZED') return err('Ese órgano es inmune.')
  if (!colorsCompatible(card.color, slot.organCard.color)) return err('El virus no es compatible con ese órgano.')

  const newMyPs = { ...myPs, hand: myPs.hand.filter(c => c.id !== card.id) }
  const slotState = getOrganState(slot)
  let newTargetPs: PlayerGameState
  let newDiscard = state.discardPile
  let logMsg: string

  if (slotState === 'FREE') {
    newTargetPs = { ...targetPs, body: { ...targetPs.body, [targetOrganColor]: { ...slot, viruses: [...slot.viruses, card] } } }
    logMsg = `${playerId} infectó ${organName(targetOrganColor)} de ${targetPlayerId}`
  } else if (slotState === 'INFECTED') {
    const { [targetOrganColor]: _, ...restBody } = targetPs.body
    newTargetPs = { ...targetPs, body: restBody }
    newDiscard = [...newDiscard, slot.organCard, ...slot.viruses, card]
    logMsg = `${playerId} extirpó ${organName(targetOrganColor)} de ${targetPlayerId}`
  } else { // VACCINATED
    newTargetPs = { ...targetPs, body: { ...targetPs.body, [targetOrganColor]: { ...slot, medicines: [], viruses: [] } } }
    newDiscard = [...newDiscard, slot.medicines[0], card]
    logMsg = `${playerId} destruyó vacuna de ${organName(targetOrganColor)} de ${targetPlayerId}`
  }

  const ns = { ...state, playerStates: { ...state.playerStates, [playerId]: newMyPs, [targetPlayerId]: newTargetPs }, discardPile: newDiscard, hasPlayedOrDiscarded: true, lastActionLog: logMsg }
  return { ok: true, newState: ns }
}

function playMedicine(state: GameState, playerId: string, card: Card, targetOrganColor: string): GameResult {
  if (state.hasPlayedOrDiscarded) return err('Ya jugaste o descartaste en este turno.')
  const ps = state.playerStates[playerId]
  if (!ps?.hand.find(c => c.id === card.id)) return err('No tienes esa carta.')
  const slot = ps.body[targetOrganColor]
  if (!slot) return err('No tienes ese órgano.')
  if (getOrganState(slot) === 'IMMUNIZED') return err('Órgano ya inmunizado.')
  if (!colorsCompatible(card.color, slot.organCard.color)) return err('La medicina no es compatible con ese órgano.')

  const newHand = ps.hand.filter(c => c.id !== card.id)
  const slotState = getOrganState(slot)
  let newSlot: OrganSlot
  let newDiscard = state.discardPile
  let logMsg: string

  if (slotState === 'INFECTED') {
    newSlot = { ...slot, viruses: [], medicines: [] }
    newDiscard = [...newDiscard, slot.viruses[0], card]
    logMsg = `${playerId} curó ${organName(targetOrganColor)}`
  } else if (slotState === 'FREE') {
    newSlot = { ...slot, medicines: [card] }
    logMsg = `${playerId} vacunó ${organName(targetOrganColor)}`
  } else { // VACCINATED
    newSlot = { ...slot, medicines: [...slot.medicines, card] }
    logMsg = `${playerId} inmunizó ${organName(targetOrganColor)}`
  }

  const newPs = { ...ps, hand: newHand, body: { ...ps.body, [targetOrganColor]: newSlot } }
  const ns = { ...state, playerStates: { ...state.playerStates, [playerId]: newPs }, discardPile: newDiscard, hasPlayedOrDiscarded: true, lastActionLog: logMsg }
  return checkWin(ns, playerId)
}

function playTreatment(state: GameState, playerId: string, action: Extract<GameAction, { type: 'PLAY_TREATMENT' }>): GameResult {
  if (state.hasPlayedOrDiscarded) return err('Ya jugaste o descartaste en este turno.')
  const myPs = state.playerStates[playerId]
  if (!myPs?.hand.find(c => c.id === action.card.id)) return err('No tienes esa carta.')

  const newMyPs = { ...myPs, hand: myPs.hand.filter(c => c.id !== action.card.id) }
  const workingStates = { ...state.playerStates, [playerId]: newMyPs }
  const newDiscard = [...state.discardPile, action.card]

  switch (action.card.treatmentType) {
    case 'TRANSPLANT': return applyTransplant(state, workingStates, newDiscard, playerId, action)
    case 'ORGAN_THIEF': return applyOrganThief(state, workingStates, newDiscard, playerId, action)
    case 'CONTAGION': return applyContagion(state, workingStates, newDiscard, playerId)
    case 'LATEX_GLOVE': return applyLatexGlove(state, workingStates, newDiscard, playerId)
    case 'MEDICAL_ERROR': return applyMedicalError(state, workingStates, newDiscard, playerId, action)
    default: return { ok: true, newState: { ...state, playerStates: workingStates, discardPile: newDiscard, hasPlayedOrDiscarded: true, lastActionLog: `${playerId} jugó carta en blanco` } }
  }
}

function applyTransplant(state: GameState, ws: Record<string, PlayerGameState>, discard: Card[], playerId: string, action: Extract<GameAction, { type: 'PLAY_TREATMENT' }>): GameResult {
  const { targetPlayerId: t1, targetOrganColor: c1, secondTargetPlayerId: t2, secondTargetOrganColor: c2 } = action
  if (!t1 || !c1 || !t2 || !c2) return err('Faltan parámetros para Transplante.')
  const p1 = ws[t1], p2 = ws[t2]
  const o1 = p1?.body[c1], o2 = p2?.body[c2]
  if (!p1 || !p2 || !o1 || !o2) return err('Órgano no encontrado.')
  if (getOrganState(o1) === 'IMMUNIZED' || getOrganState(o2) === 'IMMUNIZED') return err('No se pueden transplantar órganos inmunes.')
  const newC1 = o2.organCard.color, newC2 = o1.organCard.color
  const p1Without = Object.fromEntries(Object.entries(p1.body).filter(([k]) => k !== c1))
  const p2Without = Object.fromEntries(Object.entries(p2.body).filter(([k]) => k !== c2))
  if (newC1 !== c1 && p1Without[newC1]) return err('Jugador 1 ya tiene ese color.')
  if (newC2 !== c2 && p2Without[newC2]) return err('Jugador 2 ya tiene ese color.')
  const newWs = { ...ws, [t1]: { ...p1, body: { ...p1Without, [newC1]: o2 } }, [t2]: { ...p2, body: { ...p2Without, [newC2]: o1 } } }
  const ns = { ...state, playerStates: newWs, discardPile: discard, hasPlayedOrDiscarded: true, lastActionLog: `${playerId} realizó un Transplante` }
  const r1 = checkWin(ns, t1)
  return r1.ok ? checkWin(r1.newState, t2) : r1
}

function applyOrganThief(state: GameState, ws: Record<string, PlayerGameState>, discard: Card[], playerId: string, action: Extract<GameAction, { type: 'PLAY_TREATMENT' }>): GameResult {
  const { targetPlayerId, targetOrganColor } = action
  if (!targetPlayerId || !targetOrganColor) return err('Falta jugador objetivo.')
  const myPs = ws[playerId], targetPs = ws[targetPlayerId]
  const slot = targetPs?.body[targetOrganColor]
  if (!slot) return err('El objetivo no tiene ese órgano.')
  if (getOrganState(slot) === 'IMMUNIZED') return err('No se pueden robar órganos inmunes.')
  if (myPs.body[targetOrganColor]) return err('Ya tienes un órgano de ese color.')
  const { [targetOrganColor]: _, ...targetRest } = targetPs.body
  const newWs = { ...ws, [playerId]: { ...myPs, body: { ...myPs.body, [targetOrganColor]: slot } }, [targetPlayerId]: { ...targetPs, body: targetRest } }
  const ns = { ...state, playerStates: newWs, discardPile: discard, hasPlayedOrDiscarded: true, lastActionLog: `${playerId} robó órgano de ${targetPlayerId}` }
  return checkWin(ns, playerId)
}

function applyContagion(state: GameState, ws: Record<string, PlayerGameState>, discard: Card[], playerId: string): GameResult {
  const myPs = ws[playerId]
  const infected = Object.entries(myPs.body).filter(([, s]) => getOrganState(s) === 'INFECTED')
  if (infected.length === 0) return err('No tienes órganos infectados para contagiar.')
  const hasTarget = infected.some(([, slot]) => {
    const virus = slot.viruses[0]
    return Object.entries(ws).some(([id, ps]) => id !== playerId && Object.values(ps.body).some(s => getOrganState(s) !== 'IMMUNIZED' && colorsCompatible(virus.color, s.organCard.color)))
  })
  if (!hasTarget) return err('Ningún oponente tiene órganos compatibles para contagiar.')

  let updWs = { ...ws }
  let updDiscard = discard
  for (const [colorKey, infSlot] of infected) {
    const virus = infSlot.viruses[0]
    for (const [otherId, otherPs] of Object.entries(updWs)) {
      if (otherId === playerId) continue
      const compat = Object.entries(otherPs.body).find(([, s]) => getOrganState(s) !== 'IMMUNIZED' && colorsCompatible(virus.color, s.organCard.color))
      if (compat) {
        const [otherKey, otherSlot] = compat
        const otherState = getOrganState(otherSlot)
        let newOtherBody = { ...otherPs.body }
        if (otherState === 'FREE') {
          newOtherBody[otherKey] = { ...otherSlot, viruses: [virus] }
        } else if (otherState === 'VACCINATED') {
          updDiscard = [...updDiscard, otherSlot.medicines[0], virus]
          newOtherBody[otherKey] = { ...otherSlot, medicines: [], viruses: [] }
        } else if (otherState === 'INFECTED') {
          updDiscard = [...updDiscard, otherSlot.organCard, ...otherSlot.viruses, virus]
          const { [otherKey]: _, ...rest } = newOtherBody
          newOtherBody = rest
        }
        const myBody = { ...updWs[playerId].body, [colorKey]: { ...infSlot, viruses: [] } }
        updWs = { ...updWs, [otherId]: { ...otherPs, body: newOtherBody }, [playerId]: { ...updWs[playerId], body: myBody } }
        break
      }
    }
  }
  return { ok: true, newState: { ...state, playerStates: updWs, discardPile: updDiscard, hasPlayedOrDiscarded: true, lastActionLog: `${playerId} propagó contagio` } }
}

function applyLatexGlove(state: GameState, ws: Record<string, PlayerGameState>, discard: Card[], playerId: string): GameResult {
  let updDiscard = discard
  let updWs = { ...ws }
  for (const [id, ps] of Object.entries(updWs)) {
    if (id !== playerId) {
      updDiscard = [...updDiscard, ...ps.hand]
      updWs = { ...updWs, [id]: { ...ps, hand: [], skippedNextTurn: true } }
    }
  }
  let ns: GameState = { ...state, playerStates: updWs, discardPile: updDiscard, hasPlayedOrDiscarded: true, lastActionLog: `${playerId} usó Guante de Látex` }
  for (const id of ns.playerOrder) {
    if (id !== playerId) ns = drawCards(ns, id)
  }
  return { ok: true, newState: ns }
}

function applyMedicalError(state: GameState, ws: Record<string, PlayerGameState>, discard: Card[], playerId: string, action: Extract<GameAction, { type: 'PLAY_TREATMENT' }>): GameResult {
  const { targetPlayerId } = action
  if (!targetPlayerId) return err('Falta jugador objetivo.')
  const myPs = ws[playerId], targetPs = ws[targetPlayerId]
  const newWs = { ...ws, [playerId]: { ...myPs, body: targetPs.body }, [targetPlayerId]: { ...targetPs, body: myPs.body } }
  const ns = { ...state, playerStates: newWs, discardPile: discard, hasPlayedOrDiscarded: true, lastActionLog: `${playerId} usó Error Médico con ${targetPlayerId}` }
  const r = checkWin(ns, playerId)
  return r.ok ? checkWin(r.newState, targetPlayerId) : r
}

function discardCards(state: GameState, playerId: string, cards: Card[]): GameResult {
  if (state.hasPlayedOrDiscarded) return err('Ya jugaste o descartaste en este turno.')
  if (cards.length === 0) return err('Debes descartar al menos una carta.')
  const ps = state.playerStates[playerId]
  const ids = new Set(cards.map(c => c.id))
  const discarded = ps.hand.filter(c => ids.has(c.id))
  if (discarded.length !== cards.length) return err('No tienes todas esas cartas.')
  const newPs = { ...ps, hand: ps.hand.filter(c => !ids.has(c.id)) }
  return { ok: true, newState: { ...state, playerStates: { ...state.playerStates, [playerId]: newPs }, discardPile: [...state.discardPile, ...discarded], hasPlayedOrDiscarded: true, lastActionLog: `${playerId} descartó ${discarded.length} carta(s)` } }
}

export function endTurn(state: GameState, playerId: string): GameResult {
  if (!state.hasPlayedOrDiscarded) return err('Debes jugar o descartar antes de pasar.')
  if (state.playerOrder[state.currentPlayerIndex] !== playerId) return err('No es tu turno.')
  let ws = drawCards(state, playerId)
  const nextIndex = (ws.currentPlayerIndex + 1) % ws.playerOrder.length
  const nextId = ws.playerOrder[nextIndex]
  const nextPs = ws.playerStates[nextId]
  let finalState: GameState
  if (nextPs?.skippedNextTurn) {
    const cleared = { ...ws, playerStates: { ...ws.playerStates, [nextId]: { ...nextPs, skippedNextTurn: false } } }
    const afterSkip = (nextIndex + 1) % cleared.playerOrder.length
    finalState = { ...cleared, currentPlayerIndex: afterSkip, hasPlayedOrDiscarded: false, turnNumber: cleared.turnNumber + 1, lastActionLog: `${playerId} pasó turno (${nextId} pierde turno por Guante de Látex)` }
  } else {
    finalState = { ...ws, currentPlayerIndex: nextIndex, hasPlayedOrDiscarded: false, turnNumber: ws.turnNumber + 1, lastActionLog: ws.lastActionLog }
  }
  return { ok: true, newState: recycleIfNeeded(finalState) }
}

function drawCards(state: GameState, playerId: string): GameState {
  const ps = state.playerStates[playerId]
  const needed = 3 - ps.hand.length
  if (needed <= 0) return state
  let deck = state.deck.length < needed ? [...state.deck, ...shuffle(state.discardPile)] : state.deck
  let discard = state.deck.length < needed ? [] : state.discardPile
  const drawn = deck.slice(0, needed)
  deck = deck.slice(needed)
  return { ...state, deck, discardPile: discard, playerStates: { ...state.playerStates, [playerId]: { ...ps, hand: [...ps.hand, ...drawn] } } }
}

function recycleIfNeeded(state: GameState): GameState {
  if (state.deck.length > 0 || state.discardPile.length === 0) return state
  return { ...state, deck: shuffle(state.discardPile), discardPile: [] }
}

function checkWin(state: GameState, playerId: string): GameResult {
  if (hasWon(state.playerStates[playerId])) {
    return { ok: true, newState: { ...state, winner: playerId, lastActionLog: `¡${playerId} ha ganado!` } }
  }
  return { ok: true, newState: state }
}

function err(message: string): GameResult { return { ok: false, message } }
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1));[a[i], a[j]] = [a[j], a[i]] }
  return a
}
