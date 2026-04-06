import { useState } from 'react'
import type { GameState } from '../engine/types'

interface Props {
  gs: GameState
  myId: string
  playerNames: Record<string, string>
  onLeave?: () => void
}

export default function TopGameBar({ gs, myId, playerNames, onLeave }: Props) {
  const [showConfirm, setShowConfirm] = useState(false)
  const isMyTurn = gs.playerOrder[gs.currentPlayerIndex] === myId
  const currentName = playerNames[gs.playerOrder[gs.currentPlayerIndex]] ?? 'Jugador'

  return (
    <>
      <div className="bg-black/40 px-4 py-2 flex items-center justify-between">
        <span className={`text-sm font-bold ${isMyTurn ? 'text-yellow-400' : 'text-white'}`}>
          {isMyTurn ? '⚡ Tu turno!' : `⏳ Turno de: ${currentName}`}
        </span>
        <div className="flex items-center gap-3">
          <span className="text-white/50 text-xs">Turno {gs.turnNumber}</span>
          {onLeave && (
            <button
              onClick={() => setShowConfirm(true)}
              className="text-white/40 hover:text-red-400 text-xs transition-colors"
            >
              ✕ Salir
            </button>
          )}
        </div>
      </div>

      {showConfirm && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-6">
          <div className="bg-[#1A1A2E] border border-white/10 rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="text-white font-bold text-lg">¿Abandonar partida?</h2>
            <p className="text-white/60 text-sm">Si salís ahora, la partida se contará como derrota.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 h-11 border border-white/20 text-white/70 rounded-full text-sm hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={onLeave}
                className="flex-1 h-11 bg-red-700 hover:bg-red-600 text-white font-bold rounded-full text-sm transition-colors"
              >
                Abandonar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
