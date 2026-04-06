import type { GameState, GameAction, Card, PlayerGameState, CardColor } from './types'
import { getOrganState, colorsCompatible } from './types'

export function decideTurn(state: GameState, aiId: string): GameAction {
  const myPs = state.playerStates[aiId]
  if (!myPs || myPs.hand.length === 0) return { type: 'DISCARD_CARDS', cards: [] }
  const humanId = state.playerOrder.find(id => id !== aiId)
  const humanPs = humanId ? state.playerStates[humanId] : undefined

  // 1. Cure own infected organ
  for (const med of myPs.hand.filter(c => c.type === 'MEDICINE')) {
    const target = Object.entries(myPs.body).find(([, s]) => getOrganState(s) === 'INFECTED' && colorsCompatible(med.color, s.organCard.color))
    if (target) return { type: 'PLAY_MEDICINE', card: med, targetOrganColor: target[0] }
  }

  // 2. Extirpate opponent's infected organ
  if (humanId && humanPs) {
    for (const virus of myPs.hand.filter(c => c.type === 'VIRUS')) {
      const target = Object.entries(humanPs.body).find(([, s]) => getOrganState(s) === 'INFECTED' && colorsCompatible(virus.color, s.organCard.color))
      if (target) return { type: 'PLAY_VIRUS', card: virus, targetPlayerId: humanId, targetOrganColor: target[0] }
    }
  }

  // 3. Play organ if missing one
  for (const organ of myPs.hand.filter(c => c.type === 'ORGAN')) {
    if (organ.color === 'MULTICOLOR') {
      const targetColor = (['RED', 'YELLOW', 'BLUE', 'GREEN'] as CardColor[]).find(c => !myPs.body[c])
      if (targetColor) return { type: 'PLAY_ORGAN', card: organ, targetOrganColor: targetColor }
    } else if (!myPs.body[organ.color]) {
      return { type: 'PLAY_ORGAN', card: organ }
    }
  }

  // 4. Infect opponent's free organ
  if (humanId && humanPs) {
    for (const virus of myPs.hand.filter(c => c.type === 'VIRUS')) {
      const target = Object.entries(humanPs.body).find(([, s]) => getOrganState(s) === 'FREE' && colorsCompatible(virus.color, s.organCard.color))
      if (target) return { type: 'PLAY_VIRUS', card: virus, targetPlayerId: humanId, targetOrganColor: target[0] }
    }
  }

  // 5. Destroy opponent's vaccine
  if (humanId && humanPs) {
    for (const virus of myPs.hand.filter(c => c.type === 'VIRUS')) {
      const target = Object.entries(humanPs.body).find(([, s]) => getOrganState(s) === 'VACCINATED' && colorsCompatible(virus.color, s.organCard.color))
      if (target) return { type: 'PLAY_VIRUS', card: virus, targetPlayerId: humanId, targetOrganColor: target[0] }
    }
  }

  // 6. Vaccinate own free organ
  for (const med of myPs.hand.filter(c => c.type === 'MEDICINE')) {
    const target = Object.entries(myPs.body).find(([, s]) => getOrganState(s) === 'FREE' && colorsCompatible(med.color, s.organCard.color))
    if (target) return { type: 'PLAY_MEDICINE', card: med, targetOrganColor: target[0] }
  }

  // 7. Immunize own vaccinated organ
  for (const med of myPs.hand.filter(c => c.type === 'MEDICINE')) {
    const target = Object.entries(myPs.body).find(([, s]) => getOrganState(s) === 'VACCINATED' && colorsCompatible(med.color, s.organCard.color))
    if (target) return { type: 'PLAY_MEDICINE', card: med, targetOrganColor: target[0] }
  }

  // 8. Treatment cards
  for (const card of myPs.hand.filter(c => c.type === 'TREATMENT')) {
    const action = decideTreatment(card, state, aiId, humanId, humanPs)
    if (action) return action
  }

  // Fallback: discard worst card
  return discardWorst(myPs.hand, myPs, humanPs)
}

function decideTreatment(card: Card, state: GameState, aiId: string, humanId: string | undefined, humanPs: PlayerGameState | undefined): GameAction | null {
  const myPs = state.playerStates[aiId]
  switch (card.treatmentType) {
    case 'ORGAN_THIEF': {
      if (!humanId || !humanPs) return null
      const toSteal = Object.entries(humanPs.body).find(([k, s]) => getOrganState(s) !== 'IMMUNIZED' && !myPs.body[k])
      return toSteal ? { type: 'PLAY_TREATMENT', card, targetPlayerId: humanId, targetOrganColor: toSteal[0] } : null
    }
    case 'MEDICAL_ERROR': {
      if (!humanId || !humanPs) return null
      const myHealthy = Object.values(myPs.body).filter(s => getOrganState(s) !== 'INFECTED').length
      const humanHealthy = Object.values(humanPs.body).filter(s => getOrganState(s) !== 'INFECTED').length
      return humanHealthy >= myHealthy + 2 ? { type: 'PLAY_TREATMENT', card, targetPlayerId: humanId } : null
    }
    case 'CONTAGION': {
      const infected = Object.values(myPs.body).filter(s => getOrganState(s) === 'INFECTED')
      const hasTarget = infected.some(slot => {
        const virus = slot.viruses[0]
        return Object.entries(state.playerStates).some(([id, ps]) => id !== aiId && Object.values(ps.body).some(s => getOrganState(s) !== 'IMMUNIZED' && colorsCompatible(virus.color, s.organCard.color)))
      })
      return hasTarget ? { type: 'PLAY_TREATMENT', card } : null
    }
    case 'LATEX_GLOVE': {
      const humanHandSize = humanPs?.hand.length ?? 0
      return humanHandSize >= 3 ? { type: 'PLAY_TREATMENT', card } : null
    }
    default: return null
  }
}

function discardWorst(hand: Card[], _myPs: PlayerGameState, humanPs: PlayerGameState | undefined): GameAction {
  const uselessVirus = hand.filter(c => c.type === 'VIRUS').find(virus =>
    !humanPs || !Object.values(humanPs.body).some(s => getOrganState(s) !== 'IMMUNIZED' && colorsCompatible(virus.color, s.organCard.color))
  )
  const toDiscard = uselessVirus ?? hand.find(c => c.type === 'TREATMENT') ?? hand.find(c => c.type === 'VIRUS') ?? hand[0]
  return { type: 'DISCARD_CARDS', cards: [toDiscard] }
}
