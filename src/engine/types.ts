export type CardColor = 'RED' | 'YELLOW' | 'BLUE' | 'GREEN' | 'MULTICOLOR'
export type CardType = 'ORGAN' | 'VIRUS' | 'MEDICINE' | 'TREATMENT'
export type TreatmentType = 'TRANSPLANT' | 'ORGAN_THIEF' | 'CONTAGION' | 'LATEX_GLOVE' | 'MEDICAL_ERROR' | 'BLANK'
export type OrganState = 'FREE' | 'INFECTED' | 'VACCINATED' | 'IMMUNIZED'
export type GamePhase = 'WAITING_ACTION' | 'TURN_ENDED'

export interface Card {
  id: string
  type: CardType
  color: CardColor
  treatmentType?: TreatmentType
}

export interface OrganSlot {
  organCard: Card
  viruses: Card[]
  medicines: Card[]
}

export interface PlayerGameState {
  playerId: string
  hand: Card[]
  body: Record<string, OrganSlot>  // key = CardColor string
  skippedNextTurn: boolean
}

export interface PlayerInfo {
  id: string
  name: string
  photoUrl?: string
  isReady?: boolean
}

export interface GameState {
  roomId: string
  deck: Card[]
  discardPile: Card[]
  playerOrder: string[]
  playerStates: Record<string, PlayerGameState>
  currentPlayerIndex: number
  phase: GamePhase
  hasPlayedOrDiscarded: boolean
  winner?: string
  lastActionLog: string
  turnNumber: number
}

export type GameAction =
  | { type: 'PLAY_ORGAN'; card: Card; targetOrganColor?: string }
  | { type: 'PLAY_VIRUS'; card: Card; targetPlayerId: string; targetOrganColor: string }
  | { type: 'PLAY_MEDICINE'; card: Card; targetOrganColor: string }
  | { type: 'PLAY_TREATMENT'; card: Card; targetPlayerId?: string; targetOrganColor?: string; secondTargetPlayerId?: string; secondTargetOrganColor?: string }
  | { type: 'DISCARD_CARDS'; cards: Card[] }
  | { type: 'END_TURN' }

export type GameResult =
  | { ok: true; newState: GameState }
  | { ok: false; message: string }

// Helper functions
export function getOrganState(slot: OrganSlot): OrganState {
  if (slot.medicines.length >= 2) return 'IMMUNIZED'
  if (slot.medicines.length === 1) return 'VACCINATED'
  if (slot.viruses.length >= 1) return 'INFECTED'
  return 'FREE'
}

export function isSlotHealthy(slot: OrganSlot): boolean {
  const s = getOrganState(slot)
  return s === 'FREE' || s === 'VACCINATED' || s === 'IMMUNIZED'
}

export function hasWon(playerState: PlayerGameState): boolean {
  const healthyColored = Object.values(playerState.body)
    .filter(slot => isSlotHealthy(slot) && slot.organCard.color !== 'MULTICOLOR')
  const healthyMulti = Object.values(playerState.body)
    .filter(slot => isSlotHealthy(slot) && slot.organCard.color === 'MULTICOLOR')
  const uniqueColors = new Set(healthyColored.map(s => s.organCard.color))
  const total = uniqueColors.size + Math.min(healthyMulti.length, 4 - uniqueColors.size)
  return total >= 4
}

export function colorDisplayName(color: CardColor): string {
  const map: Record<CardColor, string> = {
    RED: 'Corazón', YELLOW: 'Estómago', BLUE: 'Cerebro', GREEN: 'Hueso', MULTICOLOR: 'Multicolor'
  }
  return map[color]
}

export function treatmentDisplayName(t: TreatmentType): string {
  const map: Record<TreatmentType, string> = {
    TRANSPLANT: 'Transplante', ORGAN_THIEF: 'Ladrón de Órganos', CONTAGION: 'Contagio',
    LATEX_GLOVE: 'Guante de Látex', MEDICAL_ERROR: 'Error Médico', BLANK: 'Carta en Blanco'
  }
  return map[t]
}

export function organName(colorKey: string): string {
  return colorDisplayName(colorKey as CardColor)
}

export function colorsCompatible(a: CardColor, b: CardColor): boolean {
  return a === 'MULTICOLOR' || b === 'MULTICOLOR' || a === b
}

// Firestore serialization helpers
export function cardFromFirestore(data: Record<string, unknown>): Card {
  return {
    id: data.id as string,
    type: data.type as CardType,
    color: data.color as CardColor,
    treatmentType: data.treatmentType as TreatmentType | undefined,
  }
}

export function organSlotFromFirestore(data: Record<string, unknown>): OrganSlot {
  return {
    organCard: cardFromFirestore(data.organCard as Record<string, unknown>),
    viruses: ((data.viruses as Record<string, unknown>[]) ?? []).map(cardFromFirestore),
    medicines: ((data.medicines as Record<string, unknown>[]) ?? []).map(cardFromFirestore),
  }
}

export function playerGameStateFromFirestore(data: Record<string, unknown>): PlayerGameState {
  const bodyRaw = (data.body as Record<string, Record<string, unknown>>) ?? {}
  return {
    playerId: data.playerId as string,
    hand: ((data.hand as Record<string, unknown>[]) ?? []).map(cardFromFirestore),
    body: Object.fromEntries(Object.entries(bodyRaw).map(([k, v]) => [k, organSlotFromFirestore(v)])),
    skippedNextTurn: (data.skippedNextTurn as boolean) ?? false,
  }
}

export function gameStateFromFirestore(data: Record<string, unknown>): GameState {
  const psRaw = (data.playerStates as Record<string, Record<string, unknown>>) ?? {}
  return {
    roomId: (data.roomId as string) ?? '',
    deck: ((data.deck as Record<string, unknown>[]) ?? []).map(cardFromFirestore),
    discardPile: ((data.discardPile as Record<string, unknown>[]) ?? []).map(cardFromFirestore),
    playerOrder: (data.playerOrder as string[]) ?? [],
    playerStates: Object.fromEntries(Object.entries(psRaw).map(([k, v]) => [k, playerGameStateFromFirestore(v)])),
    currentPlayerIndex: Number(data.currentPlayerIndex ?? 0),
    phase: (data.phase as GamePhase) ?? 'WAITING_ACTION',
    hasPlayedOrDiscarded: (data.hasPlayedOrDiscarded as boolean) ?? false,
    winner: data.winner as string | undefined,
    lastActionLog: (data.lastActionLog as string) ?? '',
    turnNumber: Number(data.turnNumber ?? 1),
  }
}

export function gameStateToFirestore(gs: GameState): Record<string, unknown> {
  const cardToObj = (c: Card) => ({ id: c.id, type: c.type, color: c.color, treatmentType: c.treatmentType ?? null })
  const slotToObj = (s: OrganSlot) => ({ organCard: cardToObj(s.organCard), viruses: s.viruses.map(cardToObj), medicines: s.medicines.map(cardToObj) })
  const psToObj = (ps: PlayerGameState) => ({
    playerId: ps.playerId,
    hand: ps.hand.map(cardToObj),
    body: Object.fromEntries(Object.entries(ps.body).map(([k, v]) => [k, slotToObj(v)])),
    skippedNextTurn: ps.skippedNextTurn,
  })
  return {
    roomId: gs.roomId,
    deck: gs.deck.map(cardToObj),
    discardPile: gs.discardPile.map(cardToObj),
    playerOrder: gs.playerOrder,
    playerStates: Object.fromEntries(Object.entries(gs.playerStates).map(([k, v]) => [k, psToObj(v)])),
    currentPlayerIndex: gs.currentPlayerIndex,
    phase: gs.phase,
    hasPlayedOrDiscarded: gs.hasPlayedOrDiscarded,
    winner: gs.winner ?? null,
    lastActionLog: gs.lastActionLog,
    turnNumber: gs.turnNumber,
  }
}
