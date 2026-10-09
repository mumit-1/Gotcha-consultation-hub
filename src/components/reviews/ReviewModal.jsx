import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  doc, runTransaction, serverTimestamp,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReviewModal({ booking, currentUid, onClose }) {
  const isConsultant  = booking.consultantId === currentUid
  const reviewField   = isConsultant ? 'consultantReview' : 'clientReview'

  const [stars, setStars] = useState(0)
  const [hover, setHover] = useState(0)
  const [text, setText]   = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (stars === 0) { toast.error('Select a star rating'); return }

    setLoading(true)
    try {
      const bookingRef = doc(db, 'bookings', booking.id)
      const reviewRef = doc(db, 'reviews', booking.id)
      const consultantRef = doc(db, 'consultants', booking.consultantId)
      const review = { stars, review: text.trim(), createdAt: serverTimestamp() }

      await runTransaction(db, async (tx) => {
        const [bookingSnap, reviewSnap] = await Promise.all([
          tx.get(bookingRef),
          tx.get(reviewRef),
        ])
        const consultantSnap = isConsultant ? null : await tx.get(consultantRef)

        if (!bookingSnap.exists() || bookingSnap.data().status !== 'COMPLETED') {
          throw new Error('Only completed sessions can be reviewed')
        }
        const bookingData = bookingSnap.data()
        if (
          bookingData.clientId !== booking.clientId ||
          bookingData.consultantId !== booking.consultantId
        ) {
          throw new Error('Booking participants do not match')
        }
        if (!isConsultant && !consultantSnap.exists()) {
          throw new Error('Consultant profile not found')
        }

        const reviewData = reviewSnap.exists() ? reviewSnap.data() : {}
        if (reviewData[reviewField]) {
          throw new Error('You have already reviewed this session')
        }

        if (reviewSnap.exists()) {
          tx.update(reviewRef, {
            [reviewField]: review,
            ...(!isConsultant && { ratingCounted: true }),
          })
        } else {
          tx.set(reviewRef, {
            consultantId: bookingData.consultantId,
            clientId: bookingData.clientId,
            [reviewField]: review,
            ...(!isConsultant && { ratingCounted: true }),
          })
        }

        tx.update(bookingRef, {
          [reviewField]: review,
          updatedAt: serverTimestamp(),
        })

        if (!isConsultant) {
          const consultantData = consultantSnap.data()
          tx.update(consultantRef, {
            ratingSum: (consultantData.ratingSum || 0) + stars,
            ratingCount: (consultantData.ratingCount || 0) + 1,
            lastRatedReviewId: booking.id,
            updatedAt: serverTimestamp(),
          })
        }
      })

      toast.success('Review submitted! Thank you.')
      onClose()
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={onClose} title="Leave a Review">
      <form onSubmit={handleSubmit} className="space-y-5">
        <p className="font-bold text-sm text-black/70">
          Rate your session for <strong className="text-black">{booking.course}</strong>
        </p>

        {/* Star picker */}
        <div className="flex items-center gap-2">
          {[1,2,3,4,5].map(i => (
            <motion.button
              key={i}
              type="button"
              whileHover={{ scale: 1.2 }}
              whileTap={{ scale: 0.9 }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(0)}
              onClick={() => setStars(i)}
              aria-label={`Rate ${i} star${i > 1 ? 's' : ''}`}
            >
              <Star
                className="h-8 w-8 transition-colors duration-75"
                fill={(hover || stars) >= i ? '#FFD93D' : 'none'}
                strokeWidth={2}
              />
            </motion.button>
          ))}
          {stars > 0 && (
            <span className="font-black text-lg ml-2">{stars}/5</span>
          )}
        </div>

        <Textarea
          label="Comments (optional)"
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="What went well? What could be improved?"
          rows={3}
        />

        <div className="flex gap-3">
          <Button type="button" variant="outline" onClick={onClose} full>Cancel</Button>
          <Button type="submit" variant="secondary" loading={loading} full>Submit Review</Button>
        </div>
      </form>
    </Modal>
  )
}
