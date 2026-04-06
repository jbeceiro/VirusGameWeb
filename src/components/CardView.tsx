import type { Card, CardColor, TreatmentType } from '../engine/types'
import { colorDisplayName, treatmentDisplayName } from '../engine/types'

function StomachIcon({ size = 28 }: { size?: number }) {
  const w = size, h = size
  const body = `
    M ${w*0.34} ${h*0.24}
    C ${w*0.32} ${h*0.10}, ${w*0.36} ${h*0.01}, ${w*0.46} ${h*0.01}
    L ${w*0.56} ${h*0.01}
    C ${w*0.66} ${h*0.01}, ${w*0.68} ${h*0.10}, ${w*0.66} ${h*0.24}
    C ${w*0.66} ${h*0.31}, ${w*0.84} ${h*0.30}, ${w*0.92} ${h*0.43}
    C ${w*0.98} ${h*0.56}, ${w*0.92} ${h*0.70}, ${w*0.78} ${h*0.76}
    C ${w*0.70} ${h*0.80}, ${w*0.66} ${h*0.84}, ${w*0.68} ${h*0.88}
    C ${w*0.72} ${h*0.93}, ${w*0.84} ${h*0.96}, ${w*0.86} ${h*0.99}
    C ${w*0.80} ${h*1.00}, ${w*0.66} ${h*0.99}, ${w*0.58} ${h*0.94}
    C ${w*0.44} ${h*0.90}, ${w*0.24} ${h*0.92}, ${w*0.14} ${h*0.83}
    C ${w*0.05} ${h*0.74}, ${w*0.03} ${h*0.60}, ${w*0.06} ${h*0.48}
    C ${w*0.09} ${h*0.36}, ${w*0.18} ${h*0.26}, ${w*0.28} ${h*0.24}
    Z
  `
  const inner = `
    M ${w*0.54} ${h*0.26}
    C ${w*0.62} ${h*0.38}, ${w*0.62} ${h*0.56}, ${w*0.54} ${h*0.70}
  `
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none">
      <path d={body} fill="rgba(255,255,255,0.20)" stroke="white" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      <path d={inner} stroke="rgba(255,255,255,0.45)" strokeWidth="1.4" strokeLinecap="round" fill="none" />
    </svg>
  )
}

interface CardViewProps {
  card: Card
  isSelected?: boolean
  isPlayable?: boolean
  isSmall?: boolean
  onClick?: () => void
  onLongClick?: () => void
}

const colorConfig: Record<CardColor, { border: string; bg: string; emoji: string }> = {
  RED:        { border: 'border-red-500',    bg: 'bg-red-900',    emoji: '❤️' },
  YELLOW:     { border: 'border-yellow-400', bg: 'bg-yellow-800', emoji: '🫃' },
  BLUE:       { border: 'border-blue-400',   bg: 'bg-blue-900',   emoji: '🧠' },
  GREEN:      { border: 'border-green-400',  bg: 'bg-green-900',  emoji: '🦴' },
  MULTICOLOR: { border: 'border-purple-400', bg: 'bg-purple-900', emoji: '🌈' },
}

const treatmentEmoji: Record<TreatmentType, string> = {
  TRANSPLANT: '🔀', ORGAN_THIEF: '🦹', CONTAGION: '☣️',
  LATEX_GLOVE: '🧤', MEDICAL_ERROR: '⚠️', BLANK: '📄',
}

export default function CardView({ card, isSelected, isPlayable, isSmall, onClick, onLongClick }: CardViewProps) {
  const cfg = colorConfig[card.color]
  const w = isSmall ? 'w-14' : 'w-[70px]'
  const h = isSmall ? 'h-20' : 'h-[100px]'
  const fontSize = isSmall ? 'text-[9px]' : 'text-[11px]'
  const iconSize = isSmall ? 'text-xl' : 'text-2xl'

  const label = card.type === 'TREATMENT'
    ? treatmentDisplayName(card.treatmentType!)
    : card.type === 'ORGAN' ? 'Órgano'
    : card.type === 'VIRUS' ? 'Virus'
    : 'Medicina'

  const emoji = card.type === 'TREATMENT'
    ? treatmentEmoji[card.treatmentType!]
    : card.type === 'VIRUS' ? '🦠'
    : card.type === 'MEDICINE' ? '💊'
    : cfg.emoji

  return (
    <div
      className={`${w} ${h} ${cfg.bg} ${cfg.border} border-2 rounded-lg flex flex-col items-center justify-center gap-1 p-1 cursor-pointer select-none transition-all
        ${isSelected ? 'ring-2 ring-white scale-105 -translate-y-2' : ''}
        ${isPlayable && !isSelected ? 'hover:scale-105 hover:-translate-y-1' : ''}
        ${!isPlayable ? 'opacity-70' : ''}
      `}
      onClick={onClick}
      onContextMenu={e => { e.preventDefault(); onLongClick?.() }}
    >
      {card.type === 'ORGAN' && card.color === 'YELLOW'
        ? <StomachIcon size={isSmall ? 22 : 28} />
        : <span className={iconSize}>{emoji}</span>
      }
      <span className={`${fontSize} text-white text-center font-semibold leading-tight`}>{label}</span>
      {card.type !== 'TREATMENT' && (
        <span className={`${fontSize} text-white/60 text-center leading-tight`}>{colorDisplayName(card.color)}</span>
      )}
    </div>
  )
}
