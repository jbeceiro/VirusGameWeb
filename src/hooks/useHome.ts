import { useState } from 'react'
import type { User } from 'firebase/auth'
import { createRoom, joinRoom, type GameRoom } from '../firebase/gameRepository'

export function useHome(user: User) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [joinCode, setJoinCode] = useState('')

  const handleCreateRoom = async (): Promise<GameRoom | null> => {
    setIsLoading(true)
    setError(null)
    try {
      return await createRoom(user.uid, user.displayName ?? 'Jugador')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al crear sala')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  const handleJoinRoom = async (): Promise<GameRoom | null> => {
    if (joinCode.length !== 8) { setError('El código debe tener 8 dígitos'); return null }
    setIsLoading(true)
    setError(null)
    try {
      return await joinRoom(joinCode, user.uid, user.displayName ?? 'Jugador')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error al unirse')
      return null
    } finally {
      setIsLoading(false)
    }
  }

  return { isLoading, error, joinCode, setJoinCode, handleCreateRoom, handleJoinRoom, clearError: () => setError(null) }
}
