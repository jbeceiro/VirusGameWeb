import { useEffect } from 'react'
import type { User } from 'firebase/auth'
import { useGame } from '../hooks/useGame'
import { getOrganState, colorsCompatible } from '../engine/types'
import type { Card } from '../engine/types'
import TopGameBar from '../components/TopGameBar'
import CenterTable from '../components/CenterTable'
import PlayerBodyView from '../components/PlayerBodyView'
import PlayerHandSection from '../components/PlayerHandSection'
import GameOverDialog from '../components/GameOverDialog'
import ActionToast from '../components/ActionToast'

interface Props {
  roomCode: string
  user: User
  onGameEnd: () => void
}

function getTargetHint(card: Card | null, isMyTurn: boolean, transplantFirst: { playerId: string; colorKey: string } | null): string | null {
  if (!card || !isMyTurn) return null
  if (card.type === 'VIRUS') return 'Toca el órgano del oponente'
  if (card.type === 'MEDICINE') return 'Toca tu órgano a curar'
  if (card.type === 'ORGAN' && card.color === 'MULTICOLOR') return 'Toca el espacio vacío de tu cuerpo'
  if (card.treatmentType === 'ORGAN_THIEF') return 'Toca el órgano que quieres robar'
  if (card.treatmentType === 'MEDICAL_ERROR') return 'Toca el cuerpo del oponente'
  if (card.treatmentType === 'TRANSPLANT') return transplantFirst ? 'Toca el segundo órgano' : 'Toca el primer órgano a intercambiar'
  return null
}

export default function GameScreen({ roomCode, user, onGameEnd }: Props) {
  const { ui, myId, isMyTurn, selectCard, playSelectedCard, onTransplantTarget, toggleDiscardMode, toggleCardForDiscard, confirmDiscard, dismissTargetDialog, clearError, handleLeave } = useGame(roomCode, user)
  const { gameState: gs, playerNames, selectedCard, showDiscardMode, cardsToDiscard, gameOver, winnerName, error, transplantFirstTarget } = ui

  useEffect(() => { if (error) { const t = setTimeout(clearError, 3000); return () => clearTimeout(t) } }, [error])

  if (!gs) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  const myTurn = isMyTurn()
  const targetHint = getTargetHint(selectedCard, myTurn, transplantFirstTarget)
  const otherPlayers = gs.playerOrder.filter(id => id !== myId)
  const myState = gs.playerStates[myId]
  const displayLog = Object.entries(playerNames).reduce((log, [id, name]) => log.replaceAll(id, name), gs.lastActionLog)

  return (
    <div className="h-screen flex flex-col bg-gradient-to-b from-[#1A1A2E] via-green-900/70 to-green-900 overflow-hidden relative">
      {gameOver && (
        <GameOverDialog
          winnerName={playerNames[winnerName ?? ''] ?? winnerName ?? 'Desconocido'}
          isWinner={winnerName === myId}
          onDismiss={() => { handleLeave(); onGameEnd() }}
        />
      )}

      <TopGameBar gs={gs} myId={myId} playerNames={playerNames} onLeave={() => { handleLeave(); onGameEnd() }} />

      {/* Opponents */}
      <div className="flex gap-2 overflow-x-auto px-2 py-1">
        {otherPlayers.map(pid => {
          const pState = gs.playerStates[pid]
          if (!pState) return null
          const highlighted = new Set(
            selectedCard?.type === 'VIRUS' && myTurn
              ? Object.entries(pState.body).filter(([, s]) => getOrganState(s) !== 'IMMUNIZED' && colorsCompatible(selectedCard.color, s.organCard.color)).map(([k]) => k)
              : selectedCard?.treatmentType === 'ORGAN_THIEF' && myTurn
              ? Object.entries(pState.body).filter(([, s]) => getOrganState(s) !== 'IMMUNIZED').map(([k]) => k)
              : selectedCard?.treatmentType === 'TRANSPLANT' && myTurn
              ? Object.entries(pState.body).filter(([, s]) => getOrganState(s) !== 'IMMUNIZED').map(([k]) => k)
              : []
          )
          const firstTargetKey = transplantFirstTarget?.playerId === pid ? transplantFirstTarget.colorKey : null
          const onOrganClick = myTurn ? (
            selectedCard?.type === 'VIRUS' ? (k: string) => playSelectedCard(pid, k)
            : selectedCard?.treatmentType === 'ORGAN_THIEF' ? (k: string) => playSelectedCard(pid, k)
            : selectedCard?.treatmentType === 'TRANSPLANT' ? (k: string) => onTransplantTarget(pid, k)
            : undefined
          ) : undefined
          const onPlayerClick = selectedCard?.treatmentType === 'MEDICAL_ERROR' && myTurn ? () => playSelectedCard(pid) : undefined
          return (
            <PlayerBodyView
              key={pid}
              playerState={pState}
              playerName={playerNames[pid] ?? pid.slice(0, 8)}
              isCurrentTurn={gs.playerOrder[gs.currentPlayerIndex] === pid}
              isMe={false}
              highlightedColorKeys={highlighted}
              firstTargetColorKey={firstTargetKey}
              onOrganClick={onOrganClick}
              onPlayerClick={onPlayerClick}
            />
          )
        })}
      </div>

      <CenterTable gs={gs} />
      <div className="flex-1" />

      {/* My body */}
      {myState && (
        <div className="px-2 mb-2">
          {(() => {
            const myHighlighted = new Set(
              selectedCard?.type === 'MEDICINE' && myTurn
                ? Object.entries(myState.body).filter(([, s]) => getOrganState(s) !== 'IMMUNIZED' && colorsCompatible(selectedCard.color, s.organCard.color)).map(([k]) => k)
                : selectedCard?.type === 'ORGAN' && selectedCard.color === 'MULTICOLOR' && myTurn
                ? ['RED', 'YELLOW', 'BLUE', 'GREEN'].filter(c => !myState.body[c])
                : selectedCard?.treatmentType === 'TRANSPLANT' && myTurn
                ? Object.entries(myState.body).filter(([, s]) => getOrganState(s) !== 'IMMUNIZED').map(([k]) => k)
                : []
            )
            const myFirstKey = transplantFirstTarget?.playerId === myId ? transplantFirstTarget.colorKey : null
            const onMyOrganClick = myTurn ? (
              selectedCard?.type === 'MEDICINE' ? (k: string) => playSelectedCard(undefined, k)
              : selectedCard?.type === 'ORGAN' && selectedCard.color === 'MULTICOLOR' ? (k: string) => playSelectedCard(undefined, k)
              : selectedCard?.treatmentType === 'TRANSPLANT' ? (k: string) => onTransplantTarget(myId, k)
              : undefined
            ) : undefined
            return (
              <PlayerBodyView
                playerState={myState}
                playerName="Tú"
                isCurrentTurn={gs.playerOrder[gs.currentPlayerIndex] === myId}
                isMe={true}
                highlightedColorKeys={myHighlighted}
                firstTargetColorKey={myFirstKey}
                onOrganClick={onMyOrganClick}
              />
            )
          })()}
        </div>
      )}

      {myState && (
        <PlayerHandSection
          playerState={myState}
          selectedCard={selectedCard}
          isMyTurn={myTurn}
          showDiscardMode={showDiscardMode}
          cardsToDiscard={cardsToDiscard}
          targetHint={targetHint}
          onCardClick={card => showDiscardMode ? toggleCardForDiscard(card) : selectCard(card)}
          onPlayCard={() => playSelectedCard()}
          onToggleDiscard={toggleDiscardMode}
          onConfirmDiscard={confirmDiscard}
          onCancelCard={dismissTargetDialog}
        />
      )}

      {error && (
        <div className="bg-red-900/80 text-red-200 text-sm text-center py-1 px-4">{error}</div>
      )}

      <ActionToast message={displayLog} />
    </div>
  )
}
