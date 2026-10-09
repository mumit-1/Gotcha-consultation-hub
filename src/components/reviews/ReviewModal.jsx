import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  doc, setDoc, updateDoc, runTransaction, serverTimestamp, getDoc,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import { useAuth } from '../../contexts/AuthContext'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'
import { Star } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ReviewModal({ booking, currentUid, onClose }) {
  const isConsultant  = booking.consultantId === currentUid
  const targetId      = isConsultant ? booking.clientId : booking.consultantId
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
      // Update the review doc (create if needed)
      const reviewRef = doc(db, 'reviews', booking.id)
      // Try to update; if the doc doesn't exist yet, create it
      try {
        await updateDoc(reviewRef, {
          [reviewField]: { stars, review: text.trim(), createdAt: serverTimestamp() },
          consultantId: booking.consultantId,
          clientId: booking.clientId,
        })
      } catch (err) {
        if (err.code === 'not-found') {
          await setDoc(reviewRef, {
            consultantId: booking.consultantId,
            clientId: booking.clientId,
            [reviewField]: { stars, review: text.trim(), createdAt: serverTimestamp() },
          })
        } else throw err
      }

      // Update ratingSum/ratingCount on consultant in a transaction (only for client reviews)
      if (!isConsultant) {
        const consultantRef = doc(db, 'consultants', booking.consultantId)
        await runTransaction(db, async (tx) => {
          const snap = await tx.get(consultantRef)
          if (!snap.exists()) return
          const d = snap.data()
          tx.update(consultantRef, {
            ratingSum:   (d.ratingSum   || 0) + stars,
            ratingCount: (d.ratingCount || 0) + 1,
            updatedAt: serverTimestamp(),
          })
        })
      }

      // Store review on booking doc too (for easy read)
      await updateDoc(doc(db, 'bookings', booking.id), {
        [reviewField]: { stars, review: text.trim(), createdAt: serverTimestamp() },
        updatedAt: serverTimestamp(),
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
