import type { OrganSlot } from '../engine/types'
import { getOrganState } from '../engine/types'
import CardView from './CardView'

interface Props {
  slot: OrganSlot | null
  isSmall?: boolean
  isHighlighted?: boolean
  isFirstTarget?: boolean
  onClick?: () => void
  onLongClick?: () => void
}

export default function OrganSlotView({ slot, isSmall, isHighlighted, isFirstTarget, onClick, onLongClick }: Props) {
  const w = isSmall ? 'w-14' : 'w-[70px]'
  const h = isSmall ? 'h-20' : 'h-[100px]'
  const highlightClass = isFirstTarget
    ? 'ring-4 ring-yellow-400 ring-offset-1'
    : isHighlighted ? 'ring-4 ring-cyan-400 ring-offset-1' : ''

  if (!slot) {
    return (
      <div
        className={`${w} ${h} border border-white/20 rounded-lg bg-white/5 flex items-center justify-center cursor-pointer
          ${isHighlighted ? 'border-cyan-400 bg-cyan-400/10 ring-2 ring-cyan-400' : ''}
          ${highlightClass}
        `}
        onClick={onClick}
      >
        <span className={`text-2xl ${isHighlighted ? 'text-cyan-400' : 'text-white/30'}`}>+</span>
      </div>
    )
  }

  const state = getOrganState(slot)
  return (
    <div className={`relative ${highlightClass} rounded-lg`} onClick={onClick} onContextMenu={e => { e.preventDefault(); onLongClick?.() }}>
      <CardView card={slot.organCard} isSmall={isSmall} />
      {/* Virus badges */}
      <div className="absolute top-1 right-1 flex flex-col gap-0.5">
        {slot.viruses.map((_, i) => (
          <div key={i} className="w-4 h-4 bg-red-800 rounded-full flex items-center justify-center text-[8px]">🦠</div>
        ))}
        {slot.medicines.map((_, i) => (
          <div key={i} className="w-4 h-4 bg-green-800 rounded-full flex items-center justify-center text-[8px]">💊</div>
        ))}
      </div>
      {/* Immunized glow */}
      {state === 'IMMUNIZED' && (
        <div className="absolute inset-0 rounded-lg border-2 border-yellow-400 pointer-events-none flex items-end justify-center pb-0.5">
          <span className="text-[10px]">🛡️</span>
        </div>
      )}
    </div>
  )
}
