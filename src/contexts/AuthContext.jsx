import { createContext, useContext, useEffect, useRef, useState } from 'react'
import {
  onAuthStateChanged, signOut, sendEmailVerification,
} from 'firebase/auth'
import { doc, getDoc, onSnapshot, setDoc, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '../lib/firebase'
import { DHAKA_TIME_ZONE } from '../lib/dhakaTime'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [firebaseUser, setFirebaseUser] = useState(undefined) // undefined = loading
  const [userDoc, setUserDoc]           = useState(null)
  const [isAdmin, setIsAdmin]           = useState(false)

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

      if (!user) {
        setUserDoc(null)
        setIsAdmin(false)
        return
      }

      // ── 1. Listen to user's own document (tiny, safe onSnapshot) ──────
      const userRef = doc(db, 'users', user.uid)
      unsubUserRef.current = onSnapshot(userRef, (snap) => {
        if (snap.exists()) {
          setUserDoc({ id: snap.id, ...snap.data() })
        } else {
          // First-ever login — create the user document
          const newUser = {
            uid:          user.uid,
            name:         user.displayName || user.email.split('@')[0],
            email:        user.email,
            photoURL:     user.photoURL || null,
            bio:          '',
            timezone:     DHAKA_TIME_ZONE,
            status:       'active',
            isConsultant: false,
            blockedUsers: [],
            createdAt:    serverTimestamp(),
            updatedAt:    serverTimestamp(),
          }
          setDoc(userRef, newUser).catch(console.error)
        }
      })

      // ── 2. Check admin status (one-time read) ──────────────────────────
      try {
        const adminSnap = await getDoc(doc(db, 'admins', user.uid))
        setIsAdmin(adminSnap.exists())
      } catch (err) {
        // Rules not deployed yet or offline — default to false
        console.warn('[Auth] Could not check admin status:', err.message)
        setIsAdmin(false)
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

  const logout = () => signOut(auth)

  const resendVerification = () => {
    if (firebaseUser && !firebaseUser.emailVerified) {
      return sendEmailVerification(firebaseUser)
    }
  }

  const value = {
    firebaseUser,
    userDoc,
    isAdmin,
    loading:    firebaseUser === undefined,
    isLoggedIn: !!firebaseUser,
    isVerified: firebaseUser?.emailVerified ?? false,
    logout,
    resendVerification,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
