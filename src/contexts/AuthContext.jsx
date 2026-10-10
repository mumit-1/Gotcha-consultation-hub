import { useEffect, useRef, useState } from 'react'
import {
  onAuthStateChanged, signOut, sendEmailVerification, reload,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { invalidateCachedData } from '../lib/dataCache'
import { AuthContext } from './AuthContextValue.js'

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined) // undefined = loading
  const [verifiedState, setVerifiedState] = useState(false)
  const [userDoc, setUserDoc]           = useState(null)
  const [isAdmin, setIsAdmin]           = useState(false)
  const [authResolved, setAuthResolved] = useState(false)
  const [userDocResolved, setUserDocResolved] = useState(false)
  const [adminResolved, setAdminResolved] = useState(false)
  const [resendCooldown, setResendCooldown] = useState(0)

  // Keep ref to the inner user-doc unsubscribe so we can clean it up properly
  const unsubUserRef = useRef(null)

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      // Tear down previous user-doc listener whenever auth state changes
      if (unsubUserRef.current) {
        unsubUserRef.current()
        unsubUserRef.current = null
      }

      setFirebaseUser(user)
      setVerifiedState(user?.emailVerified ?? false)
      setAuthResolved(true)
      setUserDocResolved(false)
      setAdminResolved(false)

      if (!user) {
        setUserDoc(null)
        setIsAdmin(false)
        setUserDocResolved(true)
        setAdminResolved(true)
        return
      }

      // ── 1. Listen to user's own document (tiny, safe onSnapshot) ──────
      const userRef = doc(db, 'users', user.uid)
      unsubUserRef.current = onSnapshot(userRef, (snap) => {
        setUserDoc(snap.exists() ? { id: snap.id, ...snap.data() } : null)
        setUserDocResolved(true)
      }, (err) => {
        console.error('[Auth] Could not load user document', {
          code: err?.code || 'unknown',
          message: err?.message || String(err),
          step: 'load user doc',
        })
        setUserDocResolved(true)
      })

      // ── 2. Check admin status (one-time read) ──────────────────────────
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid))
        setIsAdmin(adminSnap.exists())
      } catch (err) {
        // Rules not deployed yet or offline — default to false
        console.warn('[Auth] Could not check admin status:', err.message)
        setIsAdmin(false)
      } finally {
        setAdminResolved(true)
      }
    })

    // Cleanup: unsubscribe both auth listener and user-doc listener
    return () => {
      unsubAuth()
      if (unsubUserRef.current) {
        unsubUserRef.current()
        unsubUserRef.current = null
      }
    }
  }, [])

  const logout = async () => {
    invalidateCachedData()
    await signOut(auth)
  }

  useEffect(() => {
    if (!resendCooldown) return undefined
    const timer = setTimeout(() => setResendCooldown(value => Math.max(0, value - 1)), 1000)
    return () => clearTimeout(timer)
  }, [resendCooldown])

  const resendVerification = async () => {
    if (!firebaseUser || firebaseUser.emailVerified || resendCooldown > 0) return
    await sendEmailVerification(firebaseUser)
    setResendCooldown(60)
  }

  const startResendCooldown = () => setResendCooldown(60)

  const refreshVerification = async () => {
    if (!auth.currentUser) return false
    await reload(auth.currentUser)
    await auth.currentUser.getIdToken(true)
    setFirebaseUser(auth.currentUser)
    setVerifiedState(auth.currentUser.emailVerified)
    return auth.currentUser.emailVerified
  }

  const loading = !authResolved ||
    (firebaseUser !== null && firebaseUser !== undefined && (!userDocResolved || !adminResolved))
  const value = {
    firebaseUser,
    userDoc,
    isAdmin,
    loading,
    isLoggedIn: !!firebaseUser,
    isVerified: verifiedState,
    logout,
    resendVerification,
    resendCooldown,
    startResendCooldown,
    refreshVerification,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
