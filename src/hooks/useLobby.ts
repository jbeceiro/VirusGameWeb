import { useState, useEffect } from 'react'
import type { User } from 'firebase/auth'
import { observeRoom, setReady, startGame, leaveRoom, type GameRoom } from '../firebase/gameRepository'
import { initGame } from '../engine/gameEngine'
import type { PlayerInfo } from '../engine/types'

export function useLobby(code: string, user: User) {
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  useEffect(() => {
    return observeRoom(code, setRoom)
  }, [code])

  const isHost = room?.hostId === user.uid
  const myPlayer = room?.players.find(p => p.id === user.uid)
  const allReady = (room?.players.length ?? 0) >= 2 && room?.players.every(p => p.isReady)

  const toggleReady = async () => {
    if (!myPlayer) return
    await setReady(code, user.uid, user.displayName ?? 'Jugador', !myPlayer.isReady)
  }

  const handleStart = async () => {
    if (!room || !isHost || !allReady) return
    setIsLoading(true)
    const playerInfos: PlayerInfo[] = room.players.map(p => ({ id: p.id, name: p.name }))
    const gs = initGame(code, playerInfos)
    await startGame(code, gs)
    setIsLoading(false)
  }

  const handleLeave = () => leaveRoom(code, user.uid)

  return { room, isLoading, isHost, myPlayer, allReady, toggleReady, handleStart, handleLeave }
}
