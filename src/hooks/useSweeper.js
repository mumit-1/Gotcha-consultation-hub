import { useEffect, useRef, useCallback } from 'react'
import {
  collection, query, where, getDocs, updateDoc, doc,
  serverTimestamp, addDoc, Timestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { emailAutoCancel } from '../lib/emailjs'
import { format } from 'date-fns'

const INTERVAL_MS  = 3 * 60 * 1000 // run every 3 minutes while app is open

export function useSweeper() {
  const { firebaseUser, userDoc } = useAuth()
  const timerRef = useRef(null)

  const sweep = useCallback(async () => {
    if (!firebaseUser) return
    const uid = firebaseUser.uid
    const now = Timestamp.now()

    try {
      // ── 1. Auto-cancel expired PENDING bookings where this user is client ──
      const pendingClientQ = query(
        collection(db, 'bookings'),
        where('clientId', '==', uid),
        where('status', '==', 'PENDING'),
      )
      const pendingClientSnaps = await getDocs(pendingClientQ)
      for (const d of pendingClientSnaps.docs) {
        const b = d.data()
        if (b.startUtc.toMillis() < now.toMillis()) {
          await updateDoc(doc(db, 'bookings', d.id), {
            status: 'CANCELLED',
            cancelledBy: uid,
            cancelReason: 'Not accepted in time',
            cancelledAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          // Notify consultant
          await addDoc(collection(db, 'notifications', b.consultantId, 'items'), {
            type: 'cancelled',
            message: `A pending ${b.course} request expired automatically.`,
            bookingId: d.id, read: false, createdAt: serverTimestamp(),
          })
        }
      }

      // ── 2. Auto-cancel expired PENDING bookings where this user is consultant ──
      const pendingConsQ = query(
        collection(db, 'bookings'),
        where('consultantId', '==', uid),
        where('status', '==', 'PENDING'),
      )
      const pendingConsSnaps = await getDocs(pendingConsQ)
      for (const d of pendingConsSnaps.docs) {
        const b = d.data()
        if (b.startUtc.toMillis() < now.toMillis()) {
          await updateDoc(doc(db, 'bookings', d.id), {
            status: 'CANCELLED',
            cancelledBy: uid,
            cancelReason: 'Not accepted in time',
            cancelledAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })
          await addDoc(collection(db, 'notifications', b.clientId, 'items'), {
            type: 'cancelled',
            message: `Your ${b.course} request was auto-cancelled (not accepted).`,
            bookingId: d.id, read: false, createdAt: serverTimestamp(),
          })
        }
      }

      // ── 3. Persist IN_PROGRESS / COMPLETED for ACCEPTED bookings ──────────
      const acceptedQ = query(
        collection(db, 'bookings'),
        where('consultantId', '==', uid),
        where('status', '==', 'ACCEPTED'),
      )
      const acceptedSnaps = await getDocs(acceptedQ)
      for (const d of acceptedSnaps.docs) {
        const b = d.data()
        const start = b.startUtc.toMillis()
        const end   = b.endUtc.toMillis()
        const ts    = now.toMillis()

        if (ts >= start && ts < end) {
          await updateDoc(doc(db, 'bookings', d.id), {
            status: 'IN_PROGRESS', updatedAt: serverTimestamp(),
          })
        } else if (ts >= end) {
          await updateDoc(doc(db, 'bookings', d.id), {
            status: 'COMPLETED', updatedAt: serverTimestamp(),
          })
        }
      }

    } catch (err) {
      // Sweeper is best-effort; never crash the app
      console.warn('[Sweeper] error:', err.message)
    }
  }, [firebaseUser])

  useEffect(() => {
    if (!firebaseUser) return
    // Run once immediately on mount
    sweep()
    // Then every 3 minutes
    timerRef.current = setInterval(sweep, INTERVAL_MS)
    return () => clearInterval(timerRef.current)
  }, [sweep, firebaseUser])
}
