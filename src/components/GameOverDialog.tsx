interface Props {
  winnerName: string
  isWinner: boolean
  onDismiss: () => void
}

export default function GameOverDialog({ winnerName, isWinner, onDismiss }: Props) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
      <div className="bg-[#1A1A2E] rounded-2xl p-8 max-w-sm w-full text-center flex flex-col items-center gap-4">
        <span className="text-6xl">{isWinner ? '🏆' : '😔'}</span>
        <h2 className={`text-3xl font-extrabold ${isWinner ? 'text-yellow-400' : 'text-white'}`}>
          {isWinner ? '¡Ganaste!' : '¡Fin del juego!'}
        </h2>
        <p className="text-white/80 text-base">Ganador: {winnerName}</p>
        <button onClick={onDismiss} className="w-full py-3 bg-purple-800 hover:bg-purple-700 text-white font-bold rounded-full transition-colors">
          Volver al inicio
        </button>
      </div>
    </div>
  )
}
