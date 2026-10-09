import {
  collection, doc, getDoc, getDocs, addDoc, updateDoc, deleteDoc,
  writeBatch, runTransaction, query, where, serverTimestamp, Timestamp,
} from 'firebase/firestore'
import { db } from './firebase'
import {
  emailBookingAccepted, emailBookingCancelled, emailBookingRejected, emailAutoCancel,
} from './emailjs'
import { format } from 'date-fns'

// ─── Helpers ───────────────────────────────────────────────────────────────

function slotLockId(consultantId, startUtcMs) {
  return `${consultantId}_${startUtcMs}`
}
function userLockId(clientId, startUtcMs) {
  return `${clientId}_${startUtcMs}`
}

/** All 30-min block timestamps that a booking occupies */
function getBlocks(startUtcMs, durationMin) {
  const blocks = []
  for (let i = 0; i < durationMin / 30; i++) {
    blocks.push(startUtcMs + i * 30 * 60 * 1000)
  }
  return blocks
}

function fmt(ts) {
  const d = ts instanceof Timestamp ? ts.toDate() : new Date(ts)
  return {
    date: format(d, 'MMM d, yyyy'),
    time: format(d, 'h:mm a'),
  }
}

// ─── createBooking ─────────────────────────────────────────────────────────

export async function createBooking({
  consultantId, consultantName, consultantEmail,
  clientId, clientName, clientEmail,
  course, topic, startUtc, durationMin, price,
}) {
  const endUtc = new Date(startUtc.getTime() + durationMin * 60 * 1000)

  const ref = await addDoc(collection(db, 'bookings'), {
    consultantId, clientId, course, topic,
    startUtc: Timestamp.fromDate(startUtc),
    endUtc:   Timestamp.fromDate(endUtc),
    durationMin, price,
    status: 'PENDING',
    whatsappNumber: null,
    cancelledBy: null, cancelReason: null, cancelledAt: null,
    clientRating: null, consultantRating: null,
    createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
  })

  // Create in-app notification for consultant
  await addDoc(collection(db, 'notifications', consultantId, 'items'), {
    type: 'new_request',
    message: `${clientName} wants to book you for ${course}`,
    bookingId: ref.id,
    read: false,
    createdAt: serverTimestamp(),
  })

  return ref.id
}

// ─── acceptBooking ─────────────────────────────────────────────────────────

export async function acceptBooking(bookingId, consultantWhatsapp) {
  const bookingRef = doc(db, 'bookings', bookingId)

  await runTransaction(db, async (tx) => {
    const snap = await tx.get(bookingRef)
    if (!snap.exists()) throw new Error('Booking not found')
    const b = snap.data()
    if (b.status !== 'PENDING') throw new Error('Booking is no longer pending')

    const startMs   = b.startUtc.toMillis()
    const blocks    = getBlocks(startMs, b.durationMin)
    const slotLockRefs = blocks.map(ms =>
      doc(db, 'slotLocks', slotLockId(b.consultantId, ms)),
    )
    const userLockRefs = blocks.map(ms =>
      doc(db, 'userLocks', userLockId(b.clientId, ms)),
    )

    const slotLockSnaps = await Promise.all(slotLockRefs.map(ref => tx.get(ref)))
    if (slotLockSnaps.some(snap => snap.exists())) {
      throw new Error('This time slot was just taken by another booking')
    }

    const userLockSnaps = await Promise.all(userLockRefs.map(ref => tx.get(ref)))
    if (userLockSnaps.some(snap => snap.exists())) {
      throw new Error('Client already has a booking at this time')
    }

    blocks.forEach((ms, index) => {
      tx.set(slotLockRefs[index], {
        consultantId: b.consultantId, bookingId,
        startUtc: Timestamp.fromMillis(ms),
        endUtc: Timestamp.fromMillis(ms + 30 * 60 * 1000),
        createdAt: serverTimestamp(),
      })
      tx.set(userLockRefs[index], {
        clientId: b.clientId, bookingId,
        startUtc: Timestamp.fromMillis(ms),
        endUtc: Timestamp.fromMillis(ms + 30 * 60 * 1000),
        createdAt: serverTimestamp(),
      })
    })

    // Accept the booking, write WhatsApp number
    tx.update(bookingRef, {
      status: 'ACCEPTED',
      whatsappNumber: consultantWhatsapp || null,
      updatedAt: serverTimestamp(),
    })
  })

  // After transaction: fetch booking for email + notification
  const snap  = await getDoc(bookingRef)
  const b     = snap.data()
  const { date, time } = fmt(b.startUtc)

  // Notify client in-app
  await addDoc(collection(db, 'notifications', b.clientId, 'items'), {
    type: 'accepted',
    message: `Your booking for ${b.course} was accepted!`,
    bookingId,
    read: false,
    createdAt: serverTimestamp(),
  })

  // Fetch client + consultant names for emails
  const [clientDoc, consultantDoc] = await Promise.all([
    getDoc(doc(db, 'users', b.clientId)),
    getDoc(doc(db, 'users', b.consultantId)),
  ])
  const clientData     = clientDoc.data()     || {}
  const consultantData = consultantDoc.data() || {}

  // Email client
  await emailBookingAccepted({
    clientEmail: clientData.email, clientName: clientData.name,
    consultantName: consultantData.name,
    course: b.course, topic: b.topic, date, time,
    duration: `${b.durationMin} min`, price: b.price,
    whatsapp: b.whatsappNumber, bookingId,
  })

  // Auto-cancel other overlapping PENDING bookings for the same consultant
  await _cancelOverlappingPending(b.consultantId, b.startUtc.toMillis(), b.endUtc.toMillis(), bookingId, consultantData.name)
}

// ─── rejectBooking ─────────────────────────────────────────────────────────

export async function rejectBooking(bookingId) {
  const bookingRef = doc(db, 'bookings', bookingId)
  const snap       = await getDoc(bookingRef)
  if (!snap.exists()) throw new Error('Booking not found')
  const b = snap.data()

  await updateDoc(bookingRef, { status: 'REJECTED', updatedAt: serverTimestamp() })

  const { date, time } = fmt(b.startUtc)
  const [clientDoc, consultantDoc] = await Promise.all([
    getDoc(doc(db, 'users', b.clientId)),
    getDoc(doc(db, 'users', b.consultantId)),
  ])
  const clientData     = clientDoc.data()     || {}
  const consultantData = consultantDoc.data() || {}

  await addDoc(collection(db, 'notifications', b.clientId, 'items'), {
    type: 'rejected',
    message: `Your booking for ${b.course} was not accepted.`,
    bookingId, read: false, createdAt: serverTimestamp(),
  })

  await emailBookingRejected({
    clientEmail: clientData.email, clientName: clientData.name,
    consultantName: consultantData.name,
    course: b.course, date, time, bookingId,
  })
}

// ─── cancelBooking ─────────────────────────────────────────────────────────

export async function cancelBooking(bookingId, cancelledByUid, reason) {
  const bookingRef = doc(db, 'bookings', bookingId)
  const snap       = await getDoc(bookingRef)
  if (!snap.exists()) throw new Error('Booking not found')
  const b = snap.data()

  const wasAccepted = b.status === 'ACCEPTED'

  await updateDoc(bookingRef, {
    status: 'CANCELLED', cancelledBy: cancelledByUid,
    cancelReason: reason || null, cancelledAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  // Release slot locks if it was ACCEPTED
  if (wasAccepted) {
    const blocks = getBlocks(b.startUtc.toMillis(), b.durationMin)
    const batch  = writeBatch(db)
    for (const ms of blocks) {
      batch.delete(doc(db, 'slotLocks', slotLockId(b.consultantId, ms)))
      batch.delete(doc(db, 'userLocks', userLockId(b.clientId, ms)))
    }
    await batch.commit()
  }

  const { date, time } = fmt(b.startUtc)
  const [clientDoc, consultantDoc] = await Promise.all([
    getDoc(doc(db, 'users', b.clientId)),
    getDoc(doc(db, 'users', b.consultantId)),
  ])
  const clientData     = clientDoc.data()     || {}
  const consultantData = consultantDoc.data() || {}

  const isClient     = cancelledByUid === b.clientId
  const notifyUid    = isClient ? b.consultantId : b.clientId
  const notifyName   = isClient ? consultantData.name : clientData.name
  const notifyEmail  = isClient ? consultantData.email : clientData.email
  const cancellerName = isClient ? clientData.name : consultantData.name

  await addDoc(collection(db, 'notifications', notifyUid, 'items'), {
    type: 'cancelled',
    message: `${cancellerName} cancelled the ${b.course} booking.`,
    bookingId, read: false, createdAt: serverTimestamp(),
  })

  await emailBookingCancelled({
    toEmail: notifyEmail, toName: notifyName,
    byName: cancellerName, course: b.course, date, time,
    reason, bookingId,
  })
}

// ─── Internal helpers ──────────────────────────────────────────────────────

async function _cancelOverlappingPending(consultantId, startMs, endMs, excludeBookingId, consultantName) {
  const q = query(
    collection(db, 'bookings'),
    where('consultantId', '==', consultantId),
    where('status', '==', 'PENDING'),
  )
  const snaps = await getDocs(q)
  const toCancel = snaps.docs.filter(d => {
    if (d.id === excludeBookingId) return false
    const s = d.data().startUtc.toMillis()
    const e = d.data().endUtc.toMillis()
    return s < endMs && e > startMs // overlaps
  })

  for (const d of toCancel) {
    const b = d.data()
    await updateDoc(doc(db, 'bookings', d.id), {
      status: 'CANCELLED', cancelledBy: consultantId,
      cancelReason: 'Another booking was accepted for this slot',
      cancelledAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    const { date, time } = fmt(b.startUtc)
    const clientDoc  = await getDoc(doc(db, 'users', b.clientId))
    const clientData = clientDoc.data() || {}
    await addDoc(collection(db, 'notifications', b.clientId, 'items'), {
      type: 'cancelled', message: `Your ${b.course} booking was auto-cancelled (slot taken).`,
      bookingId: d.id, read: false, createdAt: serverTimestamp(),
    })
    await emailAutoCancel({ toEmail: clientData.email, toName: clientData.name, otherName: consultantName, course: b.course, date, time, bookingId: d.id })
  }
}
