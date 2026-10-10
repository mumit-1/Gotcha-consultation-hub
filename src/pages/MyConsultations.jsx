import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, query, where, onSnapshot, orderBy, limit,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/useAuth'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import { StatusBadge } from '../components/ui/Badge'
import Button from '../components/ui/Button'
import CancelBookingModal from '../components/booking/CancelBookingModal'
// import AnimatedSection from '../components/ui/AnimatedSection'
import { acceptBooking, rejectBooking, getEffectiveBookingStatus } from '../lib/bookingService'
import ReviewModal from '../components/reviews/ReviewModal'
import toast from 'react-hot-toast'
import { CheckCircle, XCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { formatDhaka } from '../lib/dhakaTime'

function BookingCard({ b, currentUid, onReview, onRequestCancel }) {
  const [expanded, setExpanded] = useState(false)
  const [acting, setActing]     = useState(false)
  const isConsultant = b.consultantId === currentUid
  const status = getEffectiveBookingStatus(b)
  const start = b.startUtc?.toDate?.() ?? new Date(b.startUtc)
  const canReview = status === 'COMPLETED' && (
    isConsultant ? !b.consultantReview : !b.clientReview
  )

  const act = async (fn, ...args) => {
    setActing(true)
    try { await fn(...args) } catch (err) { toast.error(err.message) }
    setActing(false)
  }

  return (
    <motion.div
      layout
      className="card shadow-neo-sm overflow-hidden"
    >
      <div
        className="flex items-center gap-3 p-4 cursor-pointer hover:bg-neo-bg transition-colors"
        onClick={() => setExpanded(v => !v)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <span className="badge badge-muted text-[10px]">{b.course}</span>
            <StatusBadge status={status} />
          </div>
          <p className="font-bold text-sm truncate">{b.topic}</p>
          <p className="font-bold text-xs text-black/50">
            {formatDhaka(start, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })} Bangladesh time · {b.durationMin} min
          </p>
        </div>
        {expanded ? <ChevronUp className="h-4 w-4" strokeWidth={3} /> : <ChevronDown className="h-4 w-4" strokeWidth={3} />}
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t-4 border-black p-4 bg-neo-bg space-y-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="font-black text-xs uppercase text-black/50">Role</p>
                  <p className="font-bold">{isConsultant ? 'Consultant' : 'Client'}</p>
                </div>
                <div>
                  <p className="font-black text-xs uppercase text-black/50">Price</p>
                  <p className="font-bold">{b.price === 0 ? 'FREE' : b.price}</p>
                </div>
                {b.cancelReason && (
                  <div className="col-span-2">
                    <p className="font-black text-xs uppercase text-black/50">Cancel reason</p>
                    <p className="font-bold">{b.cancelReason}</p>
                  </div>
                )}
                {b.whatsappNumber && ['ACCEPTED', 'IN_PROGRESS'].includes(status) && (
                  <div className="col-span-2">
                    <p className="font-black text-xs uppercase text-black/50">WhatsApp</p>
                    <a
                      href={`https://wa.me/${b.whatsappNumber.replace(/\D/g,'')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-bold text-neo-accent underline"
                    >
                      {b.whatsappNumber}
                    </a>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {isConsultant && status === 'PENDING' && (
                  <>
                    <Button size="sm" variant="primary" loading={acting}
                      onClick={() => act(acceptBooking, b.id)}
                    >
                      <CheckCircle className="h-3 w-3" strokeWidth={3} /> Accept
                    </Button>
                    <Button size="sm" variant="outline" loading={acting}
                      onClick={() => act(rejectBooking, b.id)}
                    >
                      <XCircle className="h-3 w-3" strokeWidth={3} /> Reject
                    </Button>
                  </>
                )}
                {['PENDING','ACCEPTED'].includes(status) && (
                  <Button size="sm" variant="outline" loading={acting}
                    onClick={() => onRequestCancel(b)}
                  >
                    Cancel
                  </Button>
                )}
                {canReview && (
                  <Button size="sm" variant="secondary" onClick={() => onReview(b)}>
                    Leave Review ★
                  </Button>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export default function MyConsultations() {
  const { firebaseUser } = useAuth()
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)
  const [filter, setFilter]     = useState('all')
  const [reviewTarget, setReviewTarget] = useState(null)
  const [cancelTarget, setCancelTarget] = useState(null)

  useEffect(() => {
    if (!firebaseUser) return
    const q1 = query(collection(db, 'bookings'), where('clientId', '==', firebaseUser.uid), orderBy('startUtc', 'desc'), limit(50))
    const q2 = query(collection(db, 'bookings'), where('consultantId', '==', firebaseUser.uid), orderBy('startUtc', 'desc'), limit(50))
    let d1 = [], d2 = [], r1 = false, r2 = false
    const merge = () => {
      if (!r1 || !r2) return
      const all = [...d1, ...d2]
      const uniq = Array.from(new Map(all.map(b => [b.id, b])).values())
      uniq.sort((a, b) => b.startUtc?.toMillis() - a.startUtc?.toMillis())
      setBookings(uniq)
      setLoading(false)
    }
    const u1 = onSnapshot(q1, s => { d1 = s.docs.map(d => ({ id: d.id, ...d.data() })); r1 = true; merge() })
    const u2 = onSnapshot(q2, s => { d2 = s.docs.map(d => ({ id: d.id, ...d.data() })); r2 = true; merge() })
    return () => { u1(); u2() }
  }, [firebaseUser])

  const FILTERS = ['all', 'PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED']
  const filtered = filter === 'all'
    ? bookings
    : bookings.filter(b => getEffectiveBookingStatus(b) === filter)

  return (
    <PageLayout>
      <EmailVerificationBanner />
      <div className="border-b-4 border-black bg-neo-muted">
        <div className="page-container py-8">
          <h1 className="font-black text-4xl uppercase tracking-tight">My Sessions</h1>
          <p className="font-bold text-black/70 text-sm mt-1">All your bookings as client and consultant.</p>
        </div>
      </div>
      <div className="page-container py-8">
        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {FILTERS.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`btn btn-sm ${filter === f ? 'btn-black' : 'btn-outline'}`}
            >
              {f === 'all' ? 'All' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card h-20 animate-pulse bg-neo-bg" />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="card p-12 text-center shadow-neo-md">
            <p className="font-black text-3xl uppercase mb-2">No Sessions</p>
            <p className="font-bold text-black/50 mb-6">You have no {filter !== 'all' ? filter.toLowerCase() : ''} bookings yet.</p>
            <a href="/find" className="btn btn-primary">Find a Consultant</a>
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence>
              {filtered.map(b => (
                <BookingCard
                  key={b.id}
                  b={b}
                  currentUid={firebaseUser.uid}
                  onReview={setReviewTarget}
                  onRequestCancel={setCancelTarget}
                />
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>

      {reviewTarget && (
        <ReviewModal
          booking={reviewTarget}
          currentUid={firebaseUser.uid}
          onClose={() => setReviewTarget(null)}
        />
      )}
      <CancelBookingModal
        key={cancelTarget?.id ?? 'closed'}
        booking={cancelTarget}
        currentUid={firebaseUser.uid}
        onClose={() => setCancelTarget(null)}
      />
    </PageLayout>
  )
}
