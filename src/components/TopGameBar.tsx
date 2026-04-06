import type { GameState } from '../engine/types'

interface Props {
  gs: GameState
  myId: string
  playerNames: Record<string, string>
}

export default function TopGameBar({ gs, myId, playerNames }: Props) {
  const isMyTurn = gs.playerOrder[gs.currentPlayerIndex] === myId
  const currentName = playerNames[gs.playerOrder[gs.currentPlayerIndex]] ?? 'Jugador'
  return (
    <div className="bg-black/40 px-4 py-2 flex items-center justify-between">
      <span className={`text-sm font-bold ${isMyTurn ? 'text-yellow-400' : 'text-white'}`}>
        {isMyTurn ? '⚡ Tu turno!' : `⏳ Turno de: ${currentName}`}
      </span>
      <span className="text-white/50 text-xs">Turno {gs.turnNumber}</span>
    </div>
  )
}
