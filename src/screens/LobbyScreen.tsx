import type { User } from 'firebase/auth'
import { useLobby } from '../hooks/useLobby'

interface Props {
  code: string
  user: User
  onGameStarted: () => void
  onLeave: () => void
}

export default function LobbyScreen({ code, user, onGameStarted, onLeave }: Props) {
  const { room, isLoading, isHost, myPlayer, allReady, toggleReady, handleStart, handleLeave } = useLobby(code, user)

  if (!room) return (
    <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
    </div>
  )

  if (room.status === 'PLAYING') {
    onGameStarted()
    return null
  }

  const leave = async () => { await handleLeave(); onLeave() }
  const start = async () => { await handleStart(); onGameStarted() }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A2E] to-[#0F3460] flex flex-col p-6">
      <div className="flex items-center justify-between mb-6">
        <button onClick={leave} className="text-white/60 hover:text-white text-sm">← Salir</button>
        <div className="text-center">
          <p className="text-white/60 text-xs">Código de sala</p>
          <p className="text-white font-mono font-bold text-xl tracking-widest">{code}</p>
        </div>
        <div className="w-12" />
      </div>

      <div className="flex-1 flex flex-col gap-4">
        <h2 className="text-white font-bold text-lg text-center">Sala de espera</h2>
        <p className="text-white/50 text-sm text-center">
          {room.players.length}/6 jugadores • {isHost ? 'Eres el anfitrión' : 'Esperando al anfitrión'}
        </p>

        <div className="flex flex-col gap-2">
          {room.players.map(p => (
            <div key={p.id} className="bg-white/5 rounded-xl p-3 flex items-center justify-between">
              <span className="text-white font-medium">
                {p.name} {p.id === room.hostId && '👑'}
              </span>
              <span className={`text-sm font-semibold ${p.isReady ? 'text-green-400' : 'text-white/40'}`}>
                {p.isReady ? '✓ Listo' : 'Esperando'}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-6">
        <button onClick={toggleReady}
          className={`w-full h-14 font-bold rounded-full text-base transition-colors ${myPlayer?.isReady ? 'bg-white/10 border border-white/30 text-white' : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
          {myPlayer?.isReady ? 'Cancelar listo' : '✓ Estoy listo'}
        </button>
        {isHost && (
          <button onClick={start} disabled={!allReady || isLoading}
            className="w-full h-14 bg-purple-800 hover:bg-purple-700 disabled:opacity-40 text-white font-bold rounded-full text-base transition-colors">
            {isLoading ? '...' : '▶ Iniciar partida'}
          </button>
        )}
      </div>
    </div>
  )
}
