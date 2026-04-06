import type { User } from 'firebase/auth'
import { useStats } from '../hooks/useStats'

interface Props {
  user: User
  onBack: () => void
}

interface StatCardProps {
  label: string
  value: number | string
  emoji: string
  highlight?: boolean
}

function StatCard({ label, value, emoji, highlight }: StatCardProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-1 rounded-2xl p-5 ${highlight ? 'bg-purple-800/60 border border-purple-500' : 'bg-white/5 border border-white/10'}`}>
      <span className="text-3xl">{emoji}</span>
      <span className="text-3xl font-extrabold text-white">{value}</span>
      <span className="text-xs text-white/50 text-center leading-tight">{label}</span>
    </div>
  )
}

export default function StatsScreen({ user, onBack }: Props) {
  const { stats, loading } = useStats(user)
  const firstName = user.displayName?.split(' ')[0] ?? 'Jugador'
  const winRate = stats && stats.gamesPlayed > 0
    ? Math.round((stats.gamesWon / stats.gamesPlayed) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1A2E] to-[#0F3460] flex flex-col p-6">
      <div className="flex items-center gap-3 mb-8">
        <button onClick={onBack} className="text-white/60 hover:text-white text-xl transition-colors">←</button>
        <h1 className="text-white font-bold text-xl">Estadísticas de {firstName}</h1>
      </div>

      {loading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !stats || stats.gamesPlayed === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <span className="text-6xl">🎮</span>
          <p className="text-white font-semibold text-lg">Aún no jugaste ninguna partida</p>
          <p className="text-white/40 text-sm">Jugá tu primera partida para ver tus estadísticas</p>
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 gap-3">
            <StatCard emoji="🎮" label="Partidas jugadas" value={stats.gamesPlayed} />
            <StatCard emoji="🏆" label="Partidas ganadas" value={stats.gamesWon} highlight />
            <StatCard emoji="💀" label="Partidas perdidas" value={stats.gamesLost} />
            <StatCard emoji="🔥" label="Racha actual" value={stats.currentStreak} highlight={stats.currentStreak > 0} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <StatCard emoji="⭐" label="Mejor racha" value={stats.maxStreak} />
            <StatCard emoji="📊" label="% victorias" value={`${winRate}%`} />
          </div>
        </div>
      )}
    </div>
  )
}
