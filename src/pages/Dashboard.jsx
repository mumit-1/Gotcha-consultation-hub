import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, query, where, onSnapshot, orderBy,
  getDocs, updateDoc, doc, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useSweeper } from '../hooks/useSweeper'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import Avatar from '../components/ui/Avatar'
import { StatusBadge, AvailabilityBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import CancelBookingModal from '../components/booking/CancelBookingModal'
import AnimatedSection from '../components/ui/AnimatedSection'
import { Link } from 'react-router-dom'
import { acceptBooking, rejectBooking } from '../lib/bookingService'
import toast from 'react-hot-toast'
import { Clock, BookOpen, CheckCircle, XCircle, ChevronRight, Zap } from 'lucide-react'
import { formatDhaka, isSameDhakaDate } from '../lib/dhakaTime'

function BookingRow({ booking, onAccept, onReject, onRequestCancel, currentUid }) {
  const [acting, setActing] = useState(false)
  const isConsultant = booking.consultantId === currentUid
  const start = booking.startUtc?.toDate?.() ?? new Date(booking.startUtc)

  const act = async (fn, ...args) => {
    setActing(true)
    try { await fn(...args) } catch (err) { toast.error(err.message) } finally { setActing(false) }
  }

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="card p-4 shadow-neo-sm flex flex-col sm:flex-row items-start sm:items-center gap-4"
    >
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className="badge badge-muted text-[10px]">{booking.course}</span>
          <StatusBadge status={booking.status} />
        </div>
        <p className="font-bold text-sm truncate">{booking.topic}</p>
        <p className="font-bold text-xs text-black/50 mt-0.5">
          {formatDhaka(start, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })} Bangladesh time · {booking.durationMin} min
        </p>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Consultant: accept / reject PENDING */}
        {isConsultant && booking.status === 'PENDING' && (
          <>
            <Button
              variant="primary" size="sm"
              loading={acting}
              onClick={() => act(onAccept, booking.id)}
            >
              <CheckCircle className="h-3 w-3" strokeWidth={3} /> Accept
            </Button>
            <Button
              variant="outline" size="sm"
              loading={acting}
              onClick={() => act(onReject, booking.id)}
            >
              <XCircle className="h-3 w-3" strokeWidth={3} /> Reject
            </Button>
          </>
        )}
        {/* Either side: cancel */}
        {['PENDING','ACCEPTED'].includes(booking.status) && (
          <Button
            variant="outline" size="sm"
            onClick={() => onRequestCancel(booking)}
          >
            Cancel
          </Button>
        )}
        <Link to={`/my-consultations`} className="btn btn-outline btn-sm">
          View <ChevronRight className="h-3 w-3" strokeWidth={3} />
        </Link>
      </div>
    </motion.div>
  )
}

export default function Dashboard() {
  useSweeper()
  const { firebaseUser, userDoc } = useAuth()
  const [bookings, setBookings]   = useState([])
  const [cancelTarget, setCancelTarget] = useState(null)
  const [loading, setLoading]     = useState(true)

  // Listen to user's own bookings (onSnapshot on small personal set — safe)
  useEffect(() => {
    if (!firebaseUser) return

    const q1 = query(
      collection(db, 'bookings'),
      where('clientId', '==', firebaseUser.uid),
      orderBy('startUtc', 'desc'),
    )
    const q2 = query(
      collection(db, 'bookings'),
      where('consultantId', '==', firebaseUser.uid),
      orderBy('startUtc', 'desc'),
    )

    let data1 = [], data2 = []
    let ready1 = false, ready2 = false

    const merge = () => {
      if (!ready1 || !ready2) return
      const all = [...data1, ...data2]
      const uniq = Array.from(new Map(all.map(b => [b.id, b])).values())
      uniq.sort((a, b) => b.startUtc?.toMillis() - a.startUtc?.toMillis())
      setBookings(uniq)
      setLoading(false)
    }

    const u1 = onSnapshot(q1, snap => { data1 = snap.docs.map(d => ({ id: d.id, ...d.data() })); ready1 = true; merge() })
    const u2 = onSnapshot(q2, snap => { data2 = snap.docs.map(d => ({ id: d.id, ...d.data() })); ready2 = true; merge() })

    return () => { u1(); u2() }
  }, [firebaseUser])

  // Partition bookings
  const now = Date.now()
  const todayBookings    = bookings.filter(b => b.startUtc && isSameDhakaDate(b.startUtc.toDate(), new Date(now)))
  const upcomingBookings = bookings.filter(b => b.startUtc && !isSameDhakaDate(b.startUtc.toDate(), new Date(now)) && b.startUtc.toMillis() > now && ['PENDING','ACCEPTED'].includes(b.status))
  const pendingRequests  = bookings.filter(b => b.status === 'PENDING' && b.consultantId === firebaseUser?.uid)

  return (
    <PageLayout>
      <EmailVerificationBanner />
      <div className="page-container py-10">
        {/* Header */}
        <AnimatedSection className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <h1 className="font-black text-5xl uppercase tracking-tighter leading-none">
                Hey,{' '}
                <span className="bg-neo-accent text-white px-2 border-4 border-black">
                  {userDoc?.name?.split(' ')[0] || 'there'}
                </span>
              </h1>
              <p className="font-bold text-black/60 mt-2">
                {formatDhaka(new Date(), { weekday: 'long', month: 'long', day: 'numeric' })} · Bangladesh time
              </p>
            </div>
            <div className="flex gap-3">
              <Link to="/find" className="btn btn-secondary btn-sm">Find Help</Link>
              {userDoc?.isConsultant
                ? <Link to="/availability" className="btn btn-outline btn-sm">Edit Availability</Link>
                : <Link to="/become-consultant" className="btn btn-outline btn-sm">Become Consultant</Link>
              }
            </div>
          </div>
        </AnimatedSection>

        {/* Pending requests (consultant view) */}
        {pendingRequests.length > 0 && (
          <AnimatedSection className="mb-8">
            <div className="card shadow-neo-lg overflow-hidden">
              <div className="border-b-4 border-black px-5 py-3 bg-neo-accent flex items-center gap-2">
                <Zap className="h-4 w-4 text-white" strokeWidth={3} fill="white" />
                <h2 className="font-black text-sm uppercase tracking-widest text-white">
                  {pendingRequests.length} Pending Request{pendingRequests.length > 1 ? 's' : ''}
                </h2>
              </div>
              <div className="p-4 space-y-3">
                <AnimatePresence>
                  {pendingRequests.map(b => (
                    <BookingRow
                      key={b.id}
                      booking={b}
                      currentUid={firebaseUser.uid}
                      onAccept={acceptBooking}
                      onReject={rejectBooking}
                      onRequestCancel={setCancelTarget}
                    />
                  ))}
                </AnimatePresence>
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Today */}
        <AnimatedSection delay={0.05} className="mb-8">
          <div className="card shadow-neo-md overflow-hidden">
            <div className="border-b-4 border-black px-5 py-3 bg-neo-secondary flex items-center gap-2">
              <Clock className="h-4 w-4" strokeWidth={3} />
              <h2 className="font-black text-sm uppercase tracking-widest">Today</h2>
            </div>
            <div className="p-4">
              {loading ? (
                <div className="space-y-2">
                  {[1,2].map(i => <div key={i} className="h-16 bg-neo-bg animate-pulse border-2 border-black" />)}
                </div>
              ) : todayBookings.length === 0 ? (
                <p className="font-bold text-sm text-black/50 py-4 text-center uppercase">Nothing scheduled for today.</p>
              ) : (
                <div className="space-y-3">
                  {todayBookings.map(b => (
                    <BookingRow key={b.id} booking={b} currentUid={firebaseUser.uid} onAccept={acceptBooking} onReject={rejectBooking} onRequestCancel={setCancelTarget} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </AnimatedSection>

        {/* Upcoming */}
        {upcomingBookings.length > 0 && (
          <AnimatedSection delay={0.1} className="mb-8">
            <div className="card shadow-neo-md overflow-hidden">
              <div className="border-b-4 border-black px-5 py-3 bg-neo-muted flex items-center gap-2">
                <BookOpen className="h-4 w-4" strokeWidth={3} />
                <h2 className="font-black text-sm uppercase tracking-widest">Upcoming</h2>
              </div>
              <div className="p-4 space-y-3">
                {upcomingBookings.slice(0, 5).map(b => (
                  <BookingRow key={b.id} booking={b} currentUid={firebaseUser.uid} onAccept={acceptBooking} onReject={rejectBooking} onRequestCancel={setCancelTarget} />
                ))}
              </div>
            </div>
          </AnimatedSection>
        )}

        {/* Quick links */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { to: '/my-consultations', label: 'All Sessions', color: 'bg-white' },
            { to: '/find',             label: 'Find Help',    color: 'bg-neo-secondary' },
            { to: '/notifications',   label: 'Notifications', color: 'bg-neo-muted' },
            { to: '/profile',          label: 'Profile',      color: 'bg-neo-bg' },
          ].map(({ to, label, color }) => (
            <Link key={to} to={to} className={`card ${color} p-4 shadow-neo-sm text-center font-black text-sm uppercase tracking-wide hover:-translate-y-1 hover:shadow-neo-md transition-all duration-200`}>
              {label} →
            </Link>
          ))}
        </div>
      </div>
      <CancelBookingModal
        key={cancelTarget?.id ?? 'closed'}
        booking={cancelTarget}
        currentUid={firebaseUser.uid}
        onClose={() => setCancelTarget(null)}
      />
    </PageLayout>
  )
}
