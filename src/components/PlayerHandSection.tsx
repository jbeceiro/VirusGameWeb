import type { Card, PlayerGameState } from '../engine/types'
import CardView from './CardView'

interface Props {
  playerState: PlayerGameState
  selectedCard: Card | null
  isMyTurn: boolean
  showDiscardMode: boolean
  cardsToDiscard: Card[]
  targetHint?: string | null
  onCardClick: (card: Card) => void
  onCardLongClick?: (card: Card) => void
  onPlayCard: () => void
  onToggleDiscard: () => void
  onConfirmDiscard: () => void
  onCancelCard?: () => void
}

export default function PlayerHandSection({ playerState, selectedCard, isMyTurn, showDiscardMode, cardsToDiscard, targetHint, onCardClick, onCardLongClick, onPlayCard, onToggleDiscard, onConfirmDiscard, onCancelCard }: Props) {
  return (
    <div className="bg-black/50 p-2">
      {/* Cards */}
      <div className="flex gap-2 justify-center flex-wrap mb-2">
        {playerState.hand.map(card => {
          const isSelected = selectedCard?.id === card.id
          const isMarked = cardsToDiscard.some(c => c.id === card.id)
          return (
            <div key={card.id} className="relative">
              <CardView
                card={card}
                isSelected={isSelected || isMarked}
                isPlayable={isMyTurn}
                onClick={isMyTurn ? () => onCardClick(card) : undefined}
                onLongClick={() => onCardLongClick?.(card)}
              />
              {isMarked && <span className="absolute inset-0 flex items-center justify-center text-red-500 text-3xl font-bold pointer-events-none">✕</span>}
            </div>
          )
        })}
      </div>

      {/* Action row */}
      <div className="flex gap-2 items-center min-h-[44px]">
        {!isMyTurn ? (
          <span className="text-white/50 text-sm flex-1">No es tu turno</span>
        ) : showDiscardMode ? (
          <>
            <button onClick={onConfirmDiscard} disabled={cardsToDiscard.length === 0}
              className="flex-1 h-11 bg-red-800 hover:bg-red-700 disabled:opacity-40 text-white text-sm font-bold rounded-full transition-colors">
              🗑 Descartar ({cardsToDiscard.length})
            </button>
            <button onClick={onToggleDiscard} className="h-11 px-4 border border-white/40 text-white rounded-full hover:bg-white/10">✕</button>
          </>
        ) : targetHint ? (
          <>
            <span className="flex-1 text-cyan-400 text-sm font-bold">👆 {targetHint}</span>
            <button onClick={onCancelCard} className="h-11 px-4 border border-white/40 text-white rounded-full hover:bg-white/10">✕</button>
          </>
        ) : (
          <>
            {selectedCard ? (
              <button onClick={onPlayCard} className="flex-1 h-11 bg-purple-800 hover:bg-purple-700 text-white text-sm font-bold rounded-full transition-colors">
                ▶ Jugar carta
              </button>
            ) : (
              <div className="flex-1" />
            )}
            <button onClick={onToggleDiscard} className="h-11 px-4 border border-white/40 text-white text-sm rounded-full hover:bg-white/10">🗑 Descartar</button>
          </>
        )}
      </div>
    </div>
  )
}
