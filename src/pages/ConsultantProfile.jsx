import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { doc, getDoc, collection, getDocs, query, where, orderBy, limit } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import Avatar from '../components/ui/Avatar'
import { AvailabilityBadge } from '../components/ui/Badge'
import { computeDhakaAvailabilityStatus, formatDhaka } from '../lib/dhakaTime'
import AnimatedSection from '../components/ui/AnimatedSection'
import { Star, MessageCircle, BookOpen, Award, ChevronRight } from 'lucide-react'
import ReportModal from '../components/reports/ReportModal'

function StarRatingDisplay({ rating, count }) {
  const rounded = Math.round(rating * 2) / 2
  return (
    <div className="flex items-center gap-1.5">
      {[1,2,3,4,5].map(i => (
        <Star
          key={i}
          className="h-5 w-5"
          strokeWidth={2}
          fill={i <= rounded ? '#FFD93D' : 'none'}
        />
      ))}
      <span className="font-black text-lg">{rating.toFixed(1)}</span>
      <span className="font-bold text-sm text-black/50">({count} review{count !== 1 ? 's' : ''})</span>
    </div>
  )
}

export default function ConsultantProfile() {
  const { uid }                 = useParams()
  const { firebaseUser, userDoc, isVerified } = useAuth()
  const [consultant, setConsultant] = useState(null)
  const [reviews, setReviews]   = useState([])
  const [loading, setLoading]   = useState(true)
  const [showReport, setShowReport] = useState(false)
  const [whatsapp, setWhatsapp] = useState(null)

  useEffect(() => {
    const load = async () => {
      const [cSnap] = await Promise.all([
        getDoc(doc(db, 'consultants', uid)),
      ])
      if (cSnap.exists()) setConsultant({ id: cSnap.id, ...cSnap.data() })

      // Load reviews (public)
      const rSnap = await getDocs(
        query(collection(db, 'reviews'), where('consultantId', '==', uid), orderBy('createdAt', 'desc'), limit(20))
      )
      setReviews(rSnap.docs.map(d => ({ id: d.id, ...d.data() })))

      // Check if current user has an accepted booking → show WhatsApp
      if (firebaseUser) {
        const bSnap = await getDocs(
          query(
            collection(db, 'bookings'),
            where('clientId', '==', firebaseUser.uid),
            where('consultantId', '==', uid),
            where('status', '==', 'ACCEPTED')
          )
        )
        if (!bSnap.empty) {
          setWhatsapp(bSnap.docs[0].data().whatsappNumber || '')
        }
      }

      setLoading(false)
    }
    load()
  }, [uid, firebaseUser])

  if (loading) return <PageLayout><div className="page-container py-20 text-center font-black uppercase">Loading…</div></PageLayout>
  if (!consultant) return <PageLayout><div className="page-container py-20 text-center"><h1 className="font-black text-3xl uppercase">Consultant not found</h1></div></PageLayout>

  const isFree = !consultant.price30min || consultant.price30min === 0
  const rating = consultant.ratingCount > 0 ? consultant.ratingSum / consultant.ratingCount : null

  return (
    <PageLayout>
      <EmailVerificationBanner />

      {/* Hero band */}
      <div className="border-b-4 border-black bg-neo-bg">
        <div className="page-container py-10">
          <div className="flex flex-col md:flex-row items-start gap-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.3 }}
            >
              <Avatar src={consultant.photoURL} name={consultant.name} size="2xl" />
            </motion.div>

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-3 mb-2">
                <h1 className="font-black text-4xl uppercase tracking-tight">{consultant.name}</h1>
                {consultant.isVerified && (
                  <span className="badge badge-green flex items-center gap-1">
                    <Award className="h-3 w-3" strokeWidth={3} /> Verified
                  </span>
                )}
                <AvailabilityBadge status={computeDhakaAvailabilityStatus(consultant)} />
              </div>

              {rating && <div className="mb-3"><StarRatingDisplay rating={rating} count={consultant.ratingCount} /></div>}

              {consultant.bio && (
                <p className="font-bold text-black/70 leading-relaxed mb-4 max-w-2xl">{consultant.bio}</p>
              )}

              <div className="flex flex-wrap gap-3">
                <div className={`badge text-base font-black ${isFree ? 'badge-green' : 'badge-yellow'}`}>
                  {isFree ? '★ FREE' : `From ${consultant.price30min}`}
                </div>
                {consultant.completedCount > 0 && (
                  <div className="badge badge-muted">
                    <BookOpen className="h-3 w-3" strokeWidth={3} />
                    {consultant.completedCount} sessions
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-3 flex-shrink-0">
              {firebaseUser?.uid !== uid && (
                <Link to={`/book/${uid}`} className="btn btn-primary btn-lg">
                  Book Session <ChevronRight className="h-5 w-5" strokeWidth={3} />
                </Link>
              )}
              {whatsapp && (
                <a
                  href={`https://wa.me/${whatsapp.replace(/\D/g,'')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-outline flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" strokeWidth={3} />
                  WhatsApp
                </a>
              )}
              {firebaseUser && firebaseUser.uid !== uid && (
                <button
                  onClick={() => setShowReport(true)}
                  className="btn btn-outline btn-sm text-black/50 border-black/30 hover:border-neo-accent hover:text-neo-accent"
                >
                  Report
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="page-container py-8 grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Courses */}
          <AnimatedSection>
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Courses</h2>
              <div className="flex flex-wrap gap-2">
                {consultant.courses?.map(code => (
                  <span key={code} className="badge badge-muted">{code}</span>
                ))}
              </div>
            </div>
          </AnimatedSection>

          {/* Skills + experience */}
          {(consultant.skills || consultant.experience) && (
            <AnimatedSection delay={0.05}>
              <div className="card p-6 shadow-neo-md">
                <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Background</h2>
                {consultant.skills && (
                  <div className="mb-3">
                    <p className="font-black text-xs uppercase tracking-widest text-black/60 mb-1">Skills</p>
                    <p className="font-bold text-sm leading-relaxed">{consultant.skills}</p>
                  </div>
                )}
                {consultant.experience && (
                  <div>
                    <p className="font-black text-xs uppercase tracking-widest text-black/60 mb-1">Experience</p>
                    <p className="font-bold text-sm leading-relaxed">{consultant.experience}</p>
                  </div>
                )}
              </div>
            </AnimatedSection>
          )}

          {/* Reviews */}
          <AnimatedSection delay={0.1}>
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">
                Reviews ({reviews.length})
              </h2>
              {reviews.length === 0 ? (
                <p className="font-bold text-sm text-black/50">No reviews yet. Be the first!</p>
              ) : (
                <div className="space-y-4">
                  {reviews.map(r => {
                    const review = r.clientReview
                    if (!review) return null
                    return (
                      <div key={r.id} className="border-4 border-black p-4 bg-neo-bg">
                        <div className="flex items-center gap-2 mb-2">
                          <div className="flex">
                            {[1,2,3,4,5].map(i => (
                              <Star key={i} className="h-4 w-4" fill={i <= review.stars ? '#FFD93D' : 'none'} strokeWidth={2} />
                            ))}
                          </div>
                          <span className="font-black text-xs uppercase tracking-wide">{review.stars}/5</span>
                          <span className="ml-auto font-bold text-xs text-black/50">
                            {review.createdAt?.toDate
                              ? formatDhaka(review.createdAt.toDate(), { dateStyle: 'medium' })
                              : ''}
                          </span>
                        </div>
                        {review.review && (
                          <p className="font-bold text-sm leading-relaxed">{review.review}</p>
                        )}
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </AnimatedSection>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <AnimatedSection direction="left">
            <div className="card p-5 shadow-neo-md bg-neo-secondary">
              <h3 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-3">Pricing</h3>
              {isFree ? (
                <p className="font-black text-3xl uppercase">FREE</p>
              ) : (
                <div className="space-y-2">
                  <div className="flex justify-between font-bold text-sm">
                    <span>First 30 min</span>
                    <span className="font-black">{consultant.price30min}</span>
                  </div>
                  {consultant.priceExtra30min > 0 && (
                    <div className="flex justify-between font-bold text-sm">
                      <span>Each extra 30 min</span>
                      <span className="font-black">{consultant.priceExtra30min}</span>
                    </div>
                  )}
                </div>
              )}
              {firebaseUser?.uid !== uid && (
                <Link to={`/book/${uid}`} className="btn btn-primary btn-full mt-4">
                  Book Now →
                </Link>
              )}
            </div>
          </AnimatedSection>
        </div>
      </div>

      <ReportModal
        open={showReport}
        onClose={() => setShowReport(false)}
        targetId={uid}
        targetName={consultant.name}
      />
    </PageLayout>
  )
}
