import { useCallback, useEffect, useRef } from 'react'
import {
  collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/useAuth'
import { cancelBooking, completeBooking } from '../lib/bookingService'

const INTERVAL_MS = 60 * 1000

export function useSweeper() {
  const { firebaseUser } = useAuth()
  const bookingsRef = useRef(new Map())
  const sweepInProgress = useRef(false)

  const sweep = useCallback(async () => {
    if (!firebaseUser || sweepInProgress.current) return
    sweepInProgress.current = true
    try {
      const bookings = [...bookingsRef.current.values()]
      const now = Date.now()

      for (const booking of bookings) {
        try {
          if (
            booking.status === 'PENDING' &&
            booking.startUtc?.toMillis?.() <= now
          ) {
            await cancelBooking(booking.id, firebaseUser.uid, 'Not accepted in time')
            continue
          }
          if (
            booking.status === 'ACCEPTED' &&
            booking.consultantId === firebaseUser.uid &&
            booking.startUtc?.toMillis?.() <= now &&
            booking.endUtc?.toMillis?.() > now
          ) {
            await updateDoc(doc(db, 'bookings', booking.id), {
              status: 'IN_PROGRESS',
              updatedAt: serverTimestamp(),
            })
          }
          if (
            ['ACCEPTED', 'IN_PROGRESS', 'COMPLETED'].includes(booking.status) &&
            booking.completedCounted !== true &&
            booking.endUtc?.toMillis?.() < now
          ) {
            await completeBooking(booking.id)
          }
        } catch (error) {
          console.error('[Sweeper] Could not process booking', {
            bookingId: booking.id,
            code: error?.code || 'unknown',
            message: error?.message || String(error),
          })
        }
      }

      const pendingClient = bookings.filter(item =>
        item.clientId === firebaseUser.uid && item.status === 'PENDING',
      )
      const acceptedClient = bookings.filter(item =>
        item.clientId === firebaseUser.uid && ['ACCEPTED', 'IN_PROGRESS'].includes(item.status),
      )
      for (const pending of pendingClient) {
        const pendingStart = pending.startUtc?.toMillis?.()
        const pendingEnd = pending.endUtc?.toMillis?.()
        const overlaps = acceptedClient.some(accepted =>
          accepted.id !== pending.id &&
          pendingStart < accepted.endUtc?.toMillis?.() &&
          pendingEnd > accepted.startUtc?.toMillis?.(),
        )
        if (overlaps) {
          try {
            await cancelBooking(pending.id, firebaseUser.uid, 'User booked elsewhere')
          } catch (error) {
            console.error('[Sweeper] Could not cancel overlapping request', {
              bookingId: pending.id,
              code: error?.code || 'unknown',
              message: error?.message || String(error),
            })
          }
        }
      }
    } finally {
      sweepInProgress.current = false
    }
  }, [firebaseUser])

  useEffect(() => {
    if (!firebaseUser) {
      bookingsRef.current.clear()
      return undefined
    }

    const statuses = ['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED']
    const listen = (field) => onSnapshot(
      query(
        collection(db, 'bookings'),
        where(field, '==', firebaseUser.uid),
        where('status', 'in', statuses),
      ),
      snapshot => {
        const otherFieldBookings = [...bookingsRef.current.values()].filter(
          booking => booking[field === 'clientId' ? 'consultantId' : 'clientId'] === firebaseUser.uid,
        )
        const current = snapshot.docs.map(item => ({ id: item.id, ...item.data() }))
        bookingsRef.current = new Map(
          [...otherFieldBookings, ...current].map(booking => [booking.id, booking]),
        )
        sweep()
      },
      error => console.error('[Sweeper] Booking listener failed', {
        code: error?.code || 'unknown',
        message: error?.message || String(error),
      }),
    )

    const unsubClient = listen('clientId')
    const unsubConsultant = listen('consultantId')
    const onFocus = () => {
      if (document.visibilityState === 'visible') sweep()
    }
    const timer = setInterval(sweep, INTERVAL_MS)
    window.addEventListener('focus', onFocus)
    return () => {
      unsubClient()
      unsubConsultant()
      clearInterval(timer)
      window.removeEventListener('focus', onFocus)
      bookingsRef.current.clear()
    }
  }, [firebaseUser, sweep])
}
