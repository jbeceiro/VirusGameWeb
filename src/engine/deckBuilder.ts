import type { Card, CardColor } from './types'

export function buildShuffledDeck(): Card[] {
  const cards: Card[] = []
  let id = 0
  const nextId = () => `card_${id++}`
  const organColors: CardColor[] = ['RED', 'YELLOW', 'BLUE', 'GREEN']

  for (const color of organColors) {
    for (let i = 0; i < 4; i++) cards.push({ id: nextId(), type: 'ORGAN', color })
  }
  cards.push({ id: nextId(), type: 'ORGAN', color: 'MULTICOLOR' })

  for (const color of organColors) {
    for (let i = 0; i < 4; i++) cards.push({ id: nextId(), type: 'VIRUS', color })
  }
  cards.push({ id: nextId(), type: 'VIRUS', color: 'MULTICOLOR' })

  for (const color of organColors) {
    for (let i = 0; i < 4; i++) cards.push({ id: nextId(), type: 'MEDICINE', color })
  }
  for (let i = 0; i < 4; i++) cards.push({ id: nextId(), type: 'MEDICINE', color: 'MULTICOLOR' })

  for (let i = 0; i < 2; i++) cards.push({ id: nextId(), type: 'TREATMENT', color: 'MULTICOLOR', treatmentType: 'TRANSPLANT' })
  for (let i = 0; i < 3; i++) cards.push({ id: nextId(), type: 'TREATMENT', color: 'MULTICOLOR', treatmentType: 'ORGAN_THIEF' })
  for (let i = 0; i < 3; i++) cards.push({ id: nextId(), type: 'TREATMENT', color: 'MULTICOLOR', treatmentType: 'CONTAGION' })
  cards.push({ id: nextId(), type: 'TREATMENT', color: 'MULTICOLOR', treatmentType: 'LATEX_GLOVE' })
  cards.push({ id: nextId(), type: 'TREATMENT', color: 'MULTICOLOR', treatmentType: 'MEDICAL_ERROR' })

  return shuffle(cards)
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
