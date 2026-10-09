import { useState } from 'react'
import { cancelBooking } from '../../lib/bookingService'
import Modal from '../ui/Modal'
import Button from '../ui/Button'
import Textarea from '../ui/Textarea'
import toast from 'react-hot-toast'
import { formatDhaka } from '../../lib/dhakaTime'

export default function CancelBookingModal({ booking, currentUid, onClose }) {
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  if (!booking) return null

  const start = booking.startUtc?.toDate?.() ?? new Date(booking.startUtc)

  const handleSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    try {
      await cancelBooking(booking.id, currentUid, reason.trim())
      toast.success('Consultation cancelled')
      onClose()
    } catch (error) {
      toast.error(`Could not cancel consultation: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal open onClose={loading ? () => {} : onClose} title="Cancel Consultation">
      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="border-3 border-black bg-neo-bg p-4">
          <p className="font-black uppercase">{booking.course}</p>
          <p className="font-bold text-sm text-black/60">
            {formatDhaka(start, {
              month: 'short',
              day: 'numeric',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })} Bangladesh time · {booking.durationMin} min
          </p>
        </div>

        <Textarea
          label="Reason (optional)"
          value={reason}
          onChange={event => setReason(event.target.value)}
          placeholder="Let the other person know why you’re cancelling…"
          maxLength={500}
          rows={4}
        />

        <div className="flex gap-3">
          <Button type="button" variant="outline" full disabled={loading} onClick={onClose}>
            Keep Consultation
          </Button>
          <Button type="submit" variant="danger" full loading={loading}>
            Confirm Cancellation
          </Button>
        </div>
      </form>
    </Modal>
  )
}
