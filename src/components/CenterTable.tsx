import type { GameState } from '../engine/types'

export default function CenterTable({ gs }: { gs: GameState }) {
  return (
    <div className="flex justify-evenly items-center px-3 py-2">
      <div className="flex flex-col items-center">
        <div className="w-14 h-20 bg-gradient-to-b from-purple-700 to-purple-900 rounded-lg flex flex-col items-center justify-center gap-1">
          <span className="text-2xl">🃏</span>
          <span className="text-white font-bold text-sm">{gs.deck.length}</span>
        </div>
        <span className="text-white/60 text-[10px] mt-0.5">Mazo</span>
      </div>
      <div className="flex flex-col items-center">
        <div className="w-14 h-20 bg-white/5 rounded-lg border border-white/10 flex items-center justify-center">
          <span className="text-white/40 text-xl">{gs.discardPile.length > 0 ? gs.discardPile.length : '—'}</span>
        </div>
        <span className="text-white/60 text-[10px] mt-0.5">Descarte</span>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-3xl">👥</span>
        <span className="text-white font-bold text-base">{gs.playerOrder.length}</span>
        <span className="text-white/60 text-[10px]">jugadores</span>
      </div>
    </div>
  )
}
