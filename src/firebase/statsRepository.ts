import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { db } from './config'

export interface UserStats {
  gamesPlayed: number
  gamesWon: number
  gamesLost: number
  currentStreak: number
  maxStreak: number
}

const defaultStats = (): UserStats => ({
  gamesPlayed: 0,
  gamesWon: 0,
  gamesLost: 0,
  currentStreak: 0,
  maxStreak: 0,
})

export async function getStats(userId: string): Promise<UserStats> {
  const ref = doc(db, 'users', userId)
  const snap = await getDoc(ref)
  return snap.exists() ? (snap.data() as UserStats) : defaultStats()
}

export async function recordGameResult(userId: string, won: boolean): Promise<void> {
  const ref = doc(db, 'users', userId)
  await runTransaction(db, async tx => {
    const snap = await tx.get(ref)
    const prev: UserStats = snap.exists() ? (snap.data() as UserStats) : defaultStats()
    const currentStreak = won ? prev.currentStreak + 1 : 0
    const updated: UserStats = {
      gamesPlayed: prev.gamesPlayed + 1,
      gamesWon: prev.gamesWon + (won ? 1 : 0),
      gamesLost: prev.gamesLost + (won ? 0 : 1),
      currentStreak,
      maxStreak: Math.max(prev.maxStreak, currentStreak),
    }
    tx.set(ref, updated)
  })
}
