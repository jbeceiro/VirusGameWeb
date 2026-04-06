import { doc, getDoc, setDoc, onSnapshot, updateDoc, arrayUnion, deleteDoc } from 'firebase/firestore'
import { db } from './config'
import type { GameState, PlayerInfo } from '../engine/types'
import { gameStateFromFirestore, gameStateToFirestore } from '../engine/types'

export interface GameRoom {
  id: string
  code: string
  hostId: string
  hostName: string
  status: 'WAITING' | 'PLAYING' | 'FINISHED'
  players: PlayerInfo[]
  gameState?: GameState
}

function generateCode(): string {
  return Math.floor(10000000 + Math.random() * 90000000).toString()
}

export async function createRoom(hostId: string, hostName: string): Promise<GameRoom> {
  const code = generateCode()
  const room: GameRoom = {
    id: code,
    code,
    hostId,
    hostName,
    status: 'WAITING',
    players: [{ id: hostId, name: hostName, isReady: false }],
  }
  await setDoc(doc(db, 'rooms', code), room)
  return room
}

export async function joinRoom(code: string, playerId: string, playerName: string): Promise<GameRoom> {
  const ref = doc(db, 'rooms', code)
  const snap = await getDoc(ref)
  if (!snap.exists()) throw new Error('Sala no encontrada.')
  const room = snap.data() as GameRoom
  if (room.status !== 'WAITING') throw new Error('La partida ya comenzó.')
  if (room.players.find(p => p.id === playerId)) return room
  const newPlayer: PlayerInfo = { id: playerId, name: playerName, isReady: false }
  await updateDoc(ref, { players: arrayUnion(newPlayer) })
  return { ...room, players: [...room.players, newPlayer] }
}

export function observeRoom(code: string, callback: (room: GameRoom | null) => void): () => void {
  return onSnapshot(doc(db, 'rooms', code), snap => {
    callback(snap.exists() ? (snap.data() as GameRoom) : null)
  })
}

export async function setReady(code: string, playerId: string, _playerName: string, isReady: boolean): Promise<void> {
  const ref = doc(db, 'rooms', code)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const room = snap.data() as GameRoom
  const updatedPlayers = room.players.map(p => p.id === playerId ? { ...p, isReady } : p)
  await updateDoc(ref, { players: updatedPlayers })
}

export async function startGame(code: string, gameState: GameState): Promise<void> {
  await updateDoc(doc(db, 'rooms', code), {
    status: 'PLAYING',
    gameState: gameStateToFirestore(gameState),
  })
}

export function observeGameState(code: string, callback: (gs: GameState | null) => void): () => void {
  return onSnapshot(doc(db, 'rooms', code), snap => {
    if (!snap.exists()) { callback(null); return }
    const data = snap.data()
    callback(data?.gameState ? gameStateFromFirestore(data.gameState) : null)
  })
}

export async function updateGameState(code: string, gs: GameState): Promise<void> {
  const roomRef = doc(db, 'rooms', code)
  const update: Record<string, unknown> = { gameState: gameStateToFirestore(gs) }
  if (gs.winner) update.status = 'FINISHED'
  await updateDoc(roomRef, update)
}

export async function leaveRoom(code: string, playerId: string): Promise<void> {
  const ref = doc(db, 'rooms', code)
  const snap = await getDoc(ref)
  if (!snap.exists()) return
  const room = snap.data() as GameRoom
  const remaining = room.players.filter(p => p.id !== playerId)
  if (remaining.length === 0) {
    await deleteDoc(ref)
  } else {
    await updateDoc(ref, { players: remaining, hostId: remaining[0].id })
  }
}
