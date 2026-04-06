import { useState, useEffect } from 'react'
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from 'firebase/auth'
import { auth } from '../firebase/config'

export function useAuth() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onAuthStateChanged(auth, u => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  const signInWithGoogle = async () => {
    const provider = new GoogleAuthProvider()
    await signInWithPopup(auth, provider)
  }

  const signOutUser = () => signOut(auth)

  return { user, loading, signInWithGoogle, signOutUser }
}
