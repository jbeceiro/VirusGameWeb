import { useState, useEffect, useRef } from 'react'
import type { User } from 'firebase/auth'
import { applyAction, endTurn } from '../engine/gameEngine'
import { decideTurn } from '../engine/aiPlayer'
import { initGame } from '../engine/gameEngine'
import { recordGameResult } from '../firebase/statsRepository'
import type { GameState, Card, GameAction } from '../engine/types'
import type { GameUiState } from './useGame'

const AI_ID = 'ai_opponent'
const AI_NAME = 'Oponente virtual'

export function useSinglePlayer(user: User) {
  const [ui, setUi] = useState<GameUiState>({
    gameState: null, playerNames: {}, selectedCard: null, showDiscardMode: false,
    cardsToDiscard: [], gameOver: false, winnerName: null, error: null, transplantFirstTarget: null,
  })
  const startedRef = useRef(false)
  const statsRecordedRef = useRef(false)

  const myId = user.uid
  const myName = user.displayName ?? 'Jugador'

  const startGame = () => {
    if (startedRef.current) return
    startedRef.current = true
    const gs = initGame('single_player', [{ id: myId, name: myName }, { id: AI_ID, name: AI_NAME }])
    setUi(prev => ({ ...prev, gameState: gs, playerNames: { [myId]: myName, [AI_ID]: AI_NAME } }))
  }

  const reset = () => {
    startedRef.current = false
    statsRecordedRef.current = false
    setUi({ gameState: null, playerNames: {}, selectedCard: null, showDiscardMode: false, cardsToDiscard: [], gameOver: false, winnerName: null, error: null, transplantFirstTarget: null })
  }

  useEffect(() => {
    if (ui.winnerName && !statsRecordedRef.current) {
      statsRecordedRef.current = true
      recordGameResult(myId, ui.winnerName === myId)
    }
  }, [ui.winnerName])

  useEffect(() => {
    const gs = ui.gameState
    if (!gs || gs.winner) return
    const currentId = gs.playerOrder[gs.currentPlayerIndex]
    if (currentId !== AI_ID) return
    const timer = setTimeout(() => {
      setUi(prev => {
        const currentGs = prev.gameState
        if (!currentGs || currentGs.winner) return prev
        if (currentGs.playerOrder[currentGs.currentPlayerIndex] !== AI_ID) return prev
        const action = decideTurn(currentGs, AI_ID)
        return applyAiAction(prev, currentGs, action)
      })
    }, 3000)
    return () => clearTimeout(timer)
  }, [ui.gameState?.currentPlayerIndex, ui.gameState?.turnNumber])

  function applyAiAction(prev: GameUiState, gs: GameState, action: GameAction): GameUiState {
    const result = applyAction(gs, AI_ID, action)
    if (!result.ok) {
      const hand = gs.playerStates[AI_ID]?.hand
      if (hand && hand.length > 0 && !gs.winner) {
        const fallback = applyAction(gs, AI_ID, { type: 'DISCARD_CARDS', cards: [hand[0]] })
        if (fallback.ok) return applyAiFinalize(prev, fallback.newState)
      }
      return prev
    }
    return applyAiFinalize(prev, result.newState)
  }

  function applyAiFinalize(prev: GameUiState, stateAfter: GameState): GameUiState {
    const finalState = stateAfter.hasPlayedOrDiscarded
      ? (() => {
          const end = endTurn(stateAfter, AI_ID)
          return end.ok ? { ...end.newState, lastActionLog: stateAfter.lastActionLog } : stateAfter
        })()
      : stateAfter
    return { ...prev, gameState: finalState, gameOver: !!finalState.winner, winnerName: finalState.winner ?? null }
  }

  const isMyTurn = () => ui.gameState?.playerOrder[ui.gameState.currentPlayerIndex] === myId

  const applyPlayerAction = (action: GameAction) => {
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
    setUi(prev => ({ ...prev, gameState: finalState, gameOver: !!finalState.winner, winnerName: finalState.winner ?? null, selectedCard: null, transplantFirstTarget: null, showDiscardMode: false, cardsToDiscard: [] }))
  }

  const selectCard = (card: Card) => {
    if (!isMyTurn() || ui.gameState?.hasPlayedOrDiscarded) return
    setUi(prev => ({ ...prev, selectedCard: prev.selectedCard?.id === card.id ? null : card, showDiscardMode: false, transplantFirstTarget: null }))
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
    if (action) applyPlayerAction(action)
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
  const confirmDiscard = () => { if (ui.cardsToDiscard.length === 0) return; applyPlayerAction({ type: 'DISCARD_CARDS', cards: ui.cardsToDiscard }) }
  const dismissTargetDialog = () => setUi(prev => ({ ...prev, selectedCard: null, transplantFirstTarget: null }))
  const clearError = () => setUi(prev => ({ ...prev, error: null }))

  return { ui, myId, isMyTurn, startGame, reset, selectCard, playSelectedCard, onTransplantTarget, toggleDiscardMode, toggleCardForDiscard, confirmDiscard, dismissTargetDialog, clearError }
}
