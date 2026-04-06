import { useState, useEffect } from 'react'
import type { User } from 'firebase/auth'
import { getStats, type UserStats } from '../firebase/statsRepository'

export function useStats(user: User) {
  const [stats, setStats] = useState<UserStats | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStats(user.uid)
      .then(setStats)
      .finally(() => setLoading(false))
  }, [user.uid])

  return { stats, loading }
}
