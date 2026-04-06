import { useState } from 'react'
import { useAuth } from './hooks/useAuth'
import LoginScreen from './screens/LoginScreen'
import HomeScreen from './screens/HomeScreen'
import LobbyScreen from './screens/LobbyScreen'
import GameScreen from './screens/GameScreen'
import SinglePlayerGameScreen from './screens/SinglePlayerGameScreen'
import StatsScreen from './screens/StatsScreen'

type Screen =
  | { name: 'LOGIN' }
  | { name: 'HOME' }
  | { name: 'LOBBY'; code: string }
  | { name: 'GAME'; code: string }
  | { name: 'SINGLE_PLAYER' }
  | { name: 'STATS' }

export default function App() {
  const { user, loading, signInWithGoogle, signOutUser } = useAuth()
  const [screen, setScreen] = useState<Screen>({ name: 'LOGIN' })

  if (loading) {
    return (
      <div className="min-h-screen bg-[#1A1A2E] flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!user) {
    return <LoginScreen onSignIn={signInWithGoogle} />
  }

  if (screen.name === 'LOBBY') {
    return (
      <LobbyScreen
        code={screen.code}
        user={user}
        onGameStarted={() => setScreen({ name: 'GAME', code: (screen as { name: 'LOBBY'; code: string }).code })}
        onLeave={() => setScreen({ name: 'HOME' })}
      />
    )
  }

  if (screen.name === 'GAME') {
    return (
      <GameScreen
        roomCode={(screen as { name: 'GAME'; code: string }).code}
        user={user}
        onGameEnd={() => setScreen({ name: 'HOME' })}
      />
    )
  }

  if (screen.name === 'SINGLE_PLAYER') {
    return (
      <SinglePlayerGameScreen
        user={user}
        onGameEnd={() => setScreen({ name: 'HOME' })}
      />
    )
  }

  if (screen.name === 'STATS') {
    return (
      <StatsScreen
        user={user}
        onBack={() => setScreen({ name: 'HOME' })}
      />
    )
  }

  return (
    <HomeScreen
      user={user}
      onRoomCreated={code => setScreen({ name: 'LOBBY', code })}
      onRoomJoined={code => setScreen({ name: 'LOBBY', code })}
      onSinglePlayer={() => setScreen({ name: 'SINGLE_PLAYER' })}
      onStats={() => setScreen({ name: 'STATS' })}
      onSignOut={async () => { await signOutUser(); setScreen({ name: 'LOGIN' }) }}
    />
  )
}
