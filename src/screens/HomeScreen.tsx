import { useState } from 'react'
import type { User } from 'firebase/auth'
import { useHome } from '../hooks/useHome'

interface Props {
  user: User
  onRoomCreated: (code: string) => void
  onRoomJoined: (code: string) => void
  onSinglePlayer: () => void
  onStats: () => void
  onSignOut: () => void
}

export default function HomeScreen({ user, onRoomCreated, onRoomJoined, onSinglePlayer, onStats, onSignOut }: Props) {
  const { isLoading, error, joinCode, setJoinCode, handleCreateRoom, handleJoinRoom, clearError } = useHome(user)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const firstName = user.displayName?.split(' ')[0] ?? 'Jugador'

  const create = async () => {
    const room = await handleCreateRoom()
    if (room) onRoomCreated(room.code)
  }

  const join = async () => {
    const room = await handleJoinRoom()
    if (room) { setShowJoinModal(false); onRoomJoined(room.code) }
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A2E] to-[#0F3460] flex flex-col p-6">
      {/* Top bar */}
      <div className="flex items-center justify-between mb-auto">
        <div>
          <p className="text-white font-bold text-lg">Hola, {firstName}! 👋</p>
          <p className="text-white/60 text-sm">¿Listo para jugar?</p>
        </div>
        <button onClick={onSignOut} className="text-white/60 hover:text-white text-sm transition-colors">Salir →</button>
      </div>

      {/* Logo */}
      <div className="flex flex-col items-center my-auto py-8">
        <span className="text-6xl">🦠</span>
        <h1 className="text-4xl font-extrabold text-purple-500 tracking-widest mt-2">VIRUS!</h1>
      </div>

      {/* Buttons */}
      <div className="flex flex-col gap-3 mt-auto">
        <button onClick={create} disabled={isLoading}
          className="w-full h-14 bg-purple-800 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-full text-base transition-colors">
          {isLoading ? '...' : '🎮 Crear partida multijugador'}
        </button>
        <button onClick={() => setShowJoinModal(true)}
          className="w-full h-14 border-2 border-emerald-400 text-emerald-400 hover:bg-emerald-400/10 font-bold rounded-full text-base transition-colors">
          🔗 Unirse a una partida
        </button>
        <button onClick={onSinglePlayer}
          className="w-full h-14 border-2 border-indigo-400 text-indigo-400 hover:bg-indigo-400/10 font-bold rounded-full text-base transition-colors">
          🤖 Jugar vs IA
        </button>
        <button onClick={onStats}
          className="w-full h-12 text-white/50 hover:text-white/80 font-medium text-sm transition-colors">
          📊 Ver mis estadísticas
        </button>
      </div>

      {error && <p className="text-red-300 text-sm text-center mt-3">{error}</p>}
      <p className="text-white/30 text-xs text-center mt-4">JB Games • Versión Online</p>

      {/* Join modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/70 flex items-end sm:items-center justify-center z-50 p-4">
          <div className="bg-[#1A1A2E] rounded-2xl p-6 w-full max-w-sm flex flex-col gap-4">
            <h2 className="text-white font-bold text-lg text-center">Unirse a una partida</h2>
            <input
              type="number"
              placeholder="Código de 8 dígitos"
              value={joinCode}
              onChange={e => { setJoinCode(e.target.value.slice(0, 8)); clearError() }}
              className="w-full bg-white/10 border border-white/30 rounded-xl px-4 py-3 text-white placeholder-white/40 text-center text-lg tracking-widest focus:outline-none focus:border-emerald-400"
            />
            <button onClick={join} disabled={joinCode.length !== 8 || isLoading}
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold rounded-full transition-colors">
              {isLoading ? '...' : 'Unirse'}
            </button>
            {error && <p className="text-red-300 text-sm text-center">{error}</p>}
            <button onClick={() => { setShowJoinModal(false); clearError() }} className="text-white/50 text-sm text-center hover:text-white/80">Cancelar</button>
          </div>
        </div>
      )}
    </div>
  )
}
