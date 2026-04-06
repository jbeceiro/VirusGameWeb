import type { PlayerGameState, Card } from '../engine/types'
import { isSlotHealthy } from '../engine/types'
import OrganSlotView from './OrganSlotView'

const COLORS = ['RED', 'YELLOW', 'BLUE', 'GREEN'] as const

interface Props {
  playerState: PlayerGameState
  playerName: string
  isCurrentTurn: boolean
  isMe: boolean
  isSmall?: boolean
  highlightedColorKeys?: Set<string>
  firstTargetColorKey?: string | null
  onOrganClick?: (colorKey: string) => void
  onOrganLongClick?: (card: Card) => void
  onPlayerClick?: () => void
}

export default function PlayerBodyView({ playerState, playerName, isCurrentTurn, isMe, isSmall, highlightedColorKeys = new Set(), firstTargetColorKey, onOrganClick, onOrganLongClick, onPlayerClick }: Props) {
  const healthyCount = Object.values(playerState.body).filter(s => isSlotHealthy(s)).length
  const totalCount = Object.values(playerState.body).length

  const bgClass = isMe ? 'bg-green-900/40 border-green-500' : isCurrentTurn ? 'bg-blue-900/40 border-blue-500' : 'bg-white/5 border-white/15'
  const clickable = onPlayerClick ? 'cursor-pointer border-red-500 border-2 hover:bg-red-900/20' : ''

  return (
    <div
      className={`rounded-xl border p-2 ${bgClass} ${clickable} transition-all`}
      onClick={onPlayerClick}
    >
      <div className="flex items-center gap-1 mb-2">
        {isCurrentTurn && <span className="text-blue-400 text-xs">▶</span>}
        <span className={`text-xs font-semibold text-white truncate ${isCurrentTurn ? 'text-blue-300' : ''}`}>
          {isMe ? `${playerName} (Tú)` : playerName}
          {isMe && <span className="ml-1">👤</span>}
        </span>
      </div>
      <div className={`flex gap-${isSmall ? '0.5' : '1.5'}`}>
        {COLORS.map(color => {
          const slot = playerState.body[color] ?? null
          return (
            <OrganSlotView
              key={color}
              slot={slot}
              isSmall={isSmall}
              isHighlighted={highlightedColorKeys.has(color)}
              isFirstTarget={firstTargetColorKey === color}
              onClick={onOrganClick ? () => onOrganClick(color) : undefined}
              onLongClick={onOrganLongClick && slot ? () => onOrganLongClick(slot.organCard) : undefined}
            />
          )
        })}
      </div>
      {!isSmall && (
        <div className="mt-1 text-center">
          <span className={`text-[10px] ${healthyCount >= 4 ? 'text-yellow-400 font-bold' : 'text-white/60'}`}>
            ♥ {healthyCount}/{totalCount} sanos
          </span>
        </div>
      )}
    </div>
  )
}
