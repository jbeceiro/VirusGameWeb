import { useState, useEffect, useRef } from 'react'
import type { User } from 'firebase/auth'
import { observeRoom, observeGameState, updateGameState, leaveRoom, type GameRoom } from '../firebase/gameRepository'
import { recordGameResult } from '../firebase/statsRepository'
import { applyAction, endTurn } from '../engine/gameEngine'
import type { GameState, Card, GameAction } from '../engine/types'

export interface GameUiState {
  gameState: GameState | null
  playerNames: Record<string, string>
  selectedCard: Card | null
  showDiscardMode: boolean
  cardsToDiscard: Card[]
  gameOver: boolean
  winnerName: string | null
  error: string | null
  transplantFirstTarget: { playerId: string; colorKey: string } | null
}

export function useGame(roomCode: string, user: User) {
  const [ui, setUi] = useState<GameUiState>({
    gameState: null, playerNames: {}, selectedCard: null, showDiscardMode: false,
    cardsToDiscard: [], gameOver: false, winnerName: null, error: null, transplantFirstTarget: null,
  })
  const statsRecordedRef = useRef(false)

  useEffect(() => {
    const unsub1 = observeRoom(roomCode, (room: GameRoom | null) => {
      if (room) setUi(prev => ({ ...prev, playerNames: Object.fromEntries(room.players.map(p => [p.id, p.name])) }))
    })
    const unsub2 = observeGameState(roomCode, gs => {
      if (gs) {
        if (gs.winner && !statsRecordedRef.current) {
          statsRecordedRef.current = true
          recordGameResult(user.uid, gs.winner === user.uid)
        }
        setUi(prev => ({ ...prev, gameState: gs, gameOver: !!gs.winner, winnerName: gs.winner ?? null }))
      }
    })
    return () => { unsub1(); unsub2() }
  }, [roomCode])

  const myId = user.uid
  const isMyTurn = () => ui.gameState?.playerOrder[ui.gameState.currentPlayerIndex] === myId

  const selectCard = (card: Card) => {
    if (!isMyTurn() || ui.gameState?.hasPlayedOrDiscarded) return
    setUi(prev => ({
      ...prev,
      selectedCard: prev.selectedCard?.id === card.id ? null : card,
      showDiscardMode: false,
      transplantFirstTarget: null,
    }))
  }

  const executeAction = async (action: GameAction) => {
    const gs = ui.gameState
    if (!gs) return
    const result = applyAction(gs, myId, action)
    if (!result.ok) { setUi(prev => ({ ...prev, error: result.message })); return }
    const stateAfter = result.newState
    const finalState = stateAfter.hasPlayedOrDiscarded
      ? (() => {
          const end = endTurn(stateAfter, myId)
          return end.ok ? { ...end.newState, lastActionLog: stateAfter.lastActionLog } : stateAfter
        })()
      : stateAfter
    await updateGameState(roomCode, finalState)
    setUi(prev => ({ ...prev, selectedCard: null, transplantFirstTarget: null, showDiscardMode: false, cardsToDiscard: [] }))
  }

  const playSelectedCard = (targetPlayerId?: string, targetOrganColor?: string, secondTargetPlayerId?: string, secondTargetOrganColor?: string) => {
    const card = ui.selectedCard
    if (!card) return
    let action: GameAction | null = null
    switch (card.type) {
      case 'ORGAN':
        if (card.color === 'MULTICOLOR' && !targetOrganColor) return
        action = { type: 'PLAY_ORGAN', card, targetOrganColor }
        break
      case 'VIRUS':
        if (!targetPlayerId || !targetOrganColor) return
        action = { type: 'PLAY_VIRUS', card, targetPlayerId, targetOrganColor }
        break
      case 'MEDICINE':
        if (!targetOrganColor) return
        action = { type: 'PLAY_MEDICINE', card, targetOrganColor }
        break
      case 'TREATMENT': {
        const t = card.treatmentType
        if (t === 'ORGAN_THIEF' && (!targetPlayerId || !targetOrganColor)) return
        if (t === 'MEDICAL_ERROR' && !targetPlayerId) return
        if (t === 'TRANSPLANT' && (!targetPlayerId || !targetOrganColor)) return
        action = { type: 'PLAY_TREATMENT', card, targetPlayerId, targetOrganColor, secondTargetPlayerId, secondTargetOrganColor }
        break
      }
    }
    if (action) executeAction(action)
  }

  const onTransplantTarget = (playerId: string, colorKey: string) => {
    const first = ui.transplantFirstTarget
    if (!first) { setUi(prev => ({ ...prev, transplantFirstTarget: { playerId, colorKey } })); return }
    if (first.playerId === playerId && first.colorKey === colorKey) { setUi(prev => ({ ...prev, transplantFirstTarget: null })); return }
    playSelectedCard(first.playerId, first.colorKey, playerId, colorKey)
    setUi(prev => ({ ...prev, transplantFirstTarget: null }))
  }

  const toggleDiscardMode = () => setUi(prev => ({ ...prev, showDiscardMode: !prev.showDiscardMode, cardsToDiscard: [], selectedCard: null, transplantFirstTarget: null }))
  const toggleCardForDiscard = (card: Card) => setUi(prev => ({ ...prev, cardsToDiscard: prev.cardsToDiscard.find(c => c.id === card.id) ? prev.cardsToDiscard.filter(c => c.id !== card.id) : [...prev.cardsToDiscard, card] }))
  const confirmDiscard = () => { if (ui.cardsToDiscard.length === 0) return; executeAction({ type: 'DISCARD_CARDS', cards: ui.cardsToDiscard }) }
  const dismissTargetDialog = () => setUi(prev => ({ ...prev, selectedCard: null, transplantFirstTarget: null }))
  const clearError = () => setUi(prev => ({ ...prev, error: null }))
  const handleLeave = () => leaveRoom(roomCode, myId)

  return { ui, myId, isMyTurn, selectCard, playSelectedCard, onTransplantTarget, toggleDiscardMode, toggleCardForDiscard, confirmDiscard, dismissTargetDialog, clearError, handleLeave }
}
