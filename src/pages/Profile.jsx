import { useState, useEffect } from 'react'
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from 'firebase/auth'
import { motion } from 'framer-motion'
import {
  collection, doc, getDoc, getDocs, limit, orderBy, query,
  serverTimestamp, startAfter, updateDoc, where, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { auth } from '../lib/firebase'
import { emailBookingCancelled } from '../lib/emailjs'
import { formatDhaka } from '../lib/dhakaTime'
import { useAuth } from '../contexts/useAuth'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import PhotoUpload from '../components/profile/PhotoUpload'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'
import Button from '../components/ui/Button'
import { Save } from 'lucide-react'
import toast from 'react-hot-toast'
import { DHAKA_TIME_ZONE } from '../lib/dhakaTime'
import ConsultantTierBadge from '../components/ui/ConsultantTierBadge'
import { Link, useNavigate } from 'react-router-dom'
import Modal from '../components/ui/Modal'

export default function Profile() {
  const { userDoc, firebaseUser } = useAuth()
  const [form, setForm] = useState(() => ({
    name: userDoc?.name || '',
    bio: userDoc?.bio || '',
    timezone: DHAKA_TIME_ZONE,
  }))
  const [loading, setLoading] = useState(false)
  const [consultantState, setConsultantState] = useState({ uid: null, data: null })
  const [deleteProfileOpen, setDeleteProfileOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deletePassword, setDeletePassword] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const navigate = useNavigate()

  const consultant = userDoc?.isConsultant && consultantState.uid === firebaseUser?.uid
    ? consultantState.data
    : null

  useEffect(() => {
    if (!userDoc?.isConsultant || !firebaseUser) return
    getDoc(doc(db, 'consultants', firebaseUser.uid))
      .then(snap => setConsultantState({
        uid: firebaseUser.uid,
        data: snap.exists() ? snap.data() : null,
      }))
      .catch(error => toast.error(`Could not load consultant profile: ${error.message}`))
  }, [firebaseUser, userDoc?.isConsultant])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) { toast.error('Name is required'); return }
    setLoading(true)
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        name: form.name.trim(),
        bio: form.bio.trim(),
        timezone: form.timezone,
        updatedAt: serverTimestamp(),
      })
      toast.success('Profile updated!')
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const handlePhotoUpload = async (url) => {
    await updateDoc(doc(db, 'users', firebaseUser.uid), {
      photoURL: url,
      updatedAt: serverTimestamp(),
    })
  }

  const loadActiveBookings = async ({ consultantOnly = false } = {}) => {
    const loadAll = async (field) => {
      const bookings = []
      let cursor = null
      while (true) {
        const constraints = [
          where(field, '==', firebaseUser.uid),
          where('status', 'in', ['PENDING', 'ACCEPTED']),
          orderBy('createdAt', 'desc'),
          limit(100),
        ]
        if (cursor) constraints.push(startAfter(cursor))
        const page = await getDocs(query(collection(db, 'bookings'), ...constraints))
        bookings.push(...page.docs.map(item => ({ id: item.id, ...item.data() })))
        if (page.docs.length < 100) break
        cursor = page.docs[page.docs.length - 1]
      }
      return bookings
    }
    const [asClient, asConsultant] = consultantOnly
      ? [[], await loadAll('consultantId')]
      : await Promise.all([loadAll('clientId'), loadAll('consultantId')])
    return [...new Map([...asClient, ...asConsultant].map(booking => [booking.id, booking])).values()]
  }

  const cancelOutstandingBookings = async ({
    consultantOnly = false,
    reason = 'Account deleted',
  } = {}) => {
    const now = Date.now()
    const bookings = await loadActiveBookings({ consultantOnly })
    const outstanding = bookings.filter(booking =>
      (consultantOnly ? booking.consultantId === firebaseUser.uid : true) &&
      (booking.status === 'PENDING' ||
        (booking.status === 'ACCEPTED' && booking.endUtc?.toMillis?.() > now)),
    )
    const accepted = outstanding.filter(booking => booking.status === 'ACCEPTED')
    const lockRefs = accepted.flatMap(booking => {
      const start = booking.startUtc.toMillis()
      const blocks = Math.ceil(booking.durationMin / 30)
      return Array.from({ length: blocks }, (_, index) => {
        const millis = start + index * 30 * 60 * 1000
        return [
          doc(db, 'slotLocks', `${booking.consultantId}_${millis}`),
          doc(db, 'userLocks', `${booking.clientId}_${millis}`),
        ]
      }).flat()
    })
    if (outstanding.length * 2 > 450) {
      throw new Error('Too many active bookings to cancel safely in one operation. Contact support before deleting.')
    }

    const cancellations = []
    for (let offset = 0; offset < outstanding.length; offset += 8) {
      const batch = writeBatch(db)
      for (const booking of outstanding.slice(offset, offset + 8)) {
        const isClient = booking.clientId === firebaseUser.uid
        const recipientId = isClient ? booking.consultantId : booking.clientId
        const actorName = isClient ? booking.clientName : booking.consultantName
        const notificationRef = doc(collection(db, 'notifications', recipientId, 'items'))
        batch.update(doc(db, 'bookings', booking.id), {
          status: 'CANCELLED',
          cancelledBy: firebaseUser.uid,
          cancelReason: reason,
          cancelledAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
        batch.set(notificationRef, {
          type: 'cancelled',
          message: `${actorName || 'A Gotcha user'} cancelled the ${booking.course} booking.`,
          bookingId: booking.id,
          read: false,
          createdAt: serverTimestamp(),
        })
        cancellations.push({ booking, recipientId })
      }
      await batch.commit()
    }

    for (let offset = 0; offset < lockRefs.length; offset += 450) {
      const lockBatch = writeBatch(db)
      lockRefs.slice(offset, offset + 450).forEach(ref => lockBatch.delete(ref))
      await lockBatch.commit()
    }

    await Promise.all(cancellations.map(async ({ booking, recipientId }) => {
      try {
        const receiver = await getDoc(doc(db, 'users', recipientId))
        const receiverData = receiver.data() || {}
        const start = booking.startUtc.toDate()
        await emailBookingCancelled({
          toEmail: receiverData.email,
          toName: receiverData.name,
          byName: booking.clientId === firebaseUser.uid
            ? booking.clientName || userDoc?.name || 'The client'
            : booking.consultantName || userDoc?.name || 'The consultant',
          course: booking.course,
          date: formatDhaka(start, { dateStyle: 'medium' }),
          time: formatDhaka(start, { timeStyle: 'short' }),
          reason,
          bookingId: booking.id,
        })
      } catch (error) {
        console.error('[Profile] Cancellation email could not be sent', {
          code: error?.code || 'unknown',
          message: error?.message || String(error),
          step: 'send cancellation email',
        })
      }
    }))
  }

  const removeConsultantData = async ({ deleteUserDocument = false } = {}) => {
    const batch = writeBatch(db)
    const consultantRef = doc(db, 'consultants', firebaseUser.uid)
    const userRef = doc(db, 'users', firebaseUser.uid)
    const contactRef = doc(db, 'consultants', firebaseUser.uid, 'private', 'contact')
    const legacyContactRef = doc(db, 'users', firebaseUser.uid, 'private', 'contact')
    const consultantSnap = await getDoc(consultantRef)
    const contactSnap = await getDoc(contactRef)
    const legacyContactSnap = await getDoc(legacyContactRef)
    if (consultantSnap.exists()) batch.delete(consultantRef)
    if (contactSnap.exists()) batch.delete(contactRef)
    if (legacyContactSnap.exists()) batch.delete(legacyContactRef)
    if (!deleteUserDocument) {
      batch.update(userRef, { isConsultant: false, updatedAt: serverTimestamp() })
    }
    await batch.commit()
  }

  const deleteConsultantProfile = async () => {
    setDeleteBusy(true)
    try {
      await cancelOutstandingBookings({
        consultantOnly: true,
        reason: 'Consultant profile removed',
      })
      await removeConsultantData()
      setConsultantState({ uid: firebaseUser.uid, data: null })
      setDeleteProfileOpen(false)
      toast.success('Consultant profile removed. Your account and completed history remain.')
    } catch (error) {
      console.error('[Profile] Consultant profile deletion failed', {
        code: error?.code || 'unknown',
        message: error?.message || String(error),
      })
      toast.error(`Could not finish removing the consultant profile: ${error.message}`)
    } finally {
      setDeleteBusy(false)
    }
  }

  const deleteAccount = async (event) => {
    event.preventDefault()
    if (deleteConfirmation !== 'DELETE') {
      toast.error('Type DELETE exactly to confirm.')
      return
    }
    if (!deletePassword) {
      toast.error('Enter your password to re-authenticate.')
      return
    }
    setDeleteBusy(true)
    try {
      const credential = EmailAuthProvider.credential(firebaseUser.email, deletePassword)
      await reauthenticateWithCredential(auth.currentUser, credential)
      const notificationSnapshot = await getDocs(query(
        collection(db, 'notifications', firebaseUser.uid, 'items'),
        limit(450),
      ))
      if (notificationSnapshot.size >= 450) {
        throw new Error('This account has too many notifications for safe deletion in one operation. Contact support for help.')
      }
      await cancelOutstandingBookings({ reason: 'Account deleted' })
      if (userDoc?.isConsultant) await removeConsultantData()

      const batch = writeBatch(db)
      notificationSnapshot.docs.forEach(item => batch.delete(item.ref))
      const privateRef = doc(db, 'users', firebaseUser.uid, 'private', 'contact')
      const privateSnap = await getDoc(privateRef)
      if (privateSnap.exists()) batch.delete(privateRef)
      batch.delete(doc(db, 'users', firebaseUser.uid))
      await batch.commit()
      await deleteUser(auth.currentUser)
      navigate('/login', { replace: true })
      toast.success('Your Gotcha account has been deleted.')
    } catch (error) {
      console.error('[Profile] Account deletion failed before Auth cleanup', {
        code: error?.code || 'unknown',
        message: error?.message || String(error),
      })
      toast.error(`Account deletion stopped: ${error.message}`)
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <PageLayout>
      <EmailVerificationBanner />
      <div className="page-container py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <h1 className="font-black text-4xl uppercase tracking-tight mb-8">
            My <span className="bg-neo-secondary px-2 border-4 border-black">Profile</span>
          </h1>
          {consultant && (
            <section className="card mb-6 flex flex-wrap items-center justify-between gap-4 p-5 shadow-neo-md">
              <div>
                <h2 className="font-black uppercase">Consultant profile</h2>
                <p className="mt-2 font-bold text-sm">
                  {consultant.department || userDoc?.department || 'Department not set'}
                </p>
                <div className="mt-2">
                  <ConsultantTierBadge completedCount={consultant.completedCount || 0} />
                </div>
              </div>
              <Link to="/become-consultant" className="btn btn-primary btn-sm">
                Update your consultancy profile
              </Link>
            </section>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Photo */}
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Profile Photo</h2>
              <PhotoUpload
                currentUrl={userDoc?.photoURL}
                name={userDoc?.name || 'U'}
                onUpload={handlePhotoUpload}
              />
            </div>

            {/* Basic info */}
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Basic Info</h2>
              <div className="space-y-4">
                <Input
                  label="Full Name"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="Your name"
                />
                <Textarea
                  label="Bio"
                  value={form.bio}
                  onChange={e => setForm(f => ({ ...f, bio: e.target.value }))}
                  placeholder="Tell others about yourself…"
                  rows={3}
                />
                <div>
                  <label className="label">Site Timezone</label>
                  <p className="font-bold text-sm">Bangladesh time ({DHAKA_TIME_ZONE}, UTC+6)</p>
                </div>
              </div>
            </div>

            {/* Account info (read-only) */}
            <div className="card p-6 shadow-neo-md bg-neo-bg">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Account</h2>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-widest text-black/60">Email</span>
                  <span className="font-bold text-sm">{firebaseUser?.email}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-widest text-black/60">Verified</span>
                  <span className={`badge ${firebaseUser?.emailVerified ? 'badge-green' : 'badge-accent'}`}>
                    {firebaseUser?.emailVerified ? 'Yes' : 'No'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="font-black text-xs uppercase tracking-widest text-black/60">Account Status</span>
                  <span className="badge badge-green">{userDoc?.status || 'active'}</span>
                </div>
              </div>
            </div>

            <Button type="submit" variant="primary" full loading={loading} className="btn-lg">
              <Save className="h-4 w-4" strokeWidth={3} /> Save Changes
            </Button>
          </form>
          <section className="mt-8 space-y-4 border-t-4 border-black pt-6">
            {consultant && (
              <div className="card border-neo-accent p-5 shadow-neo-sm">
                <h2 className="font-black uppercase">Remove consultant profile</h2>
                <p className="mt-2 text-sm font-bold">
                  Upcoming requests and sessions will be cancelled and clients notified. Completed bookings and reviews will remain.
                </p>
                <Button className="mt-4" variant="danger" onClick={() => setDeleteProfileOpen(true)}>
                  Delete consultant profile
                </Button>
              </div>
            )}
            <div className="card border-neo-accent p-5 shadow-neo-sm">
              <h2 className="font-black uppercase">Delete my account</h2>
              <p className="mt-2 text-sm font-bold">
                This permanently removes your account. Completed bookings and reviews remain, with your saved name on newer bookings.
              </p>
              <Button className="mt-4" variant="danger" onClick={() => setDeleteAccountOpen(true)}>
                Delete my account
              </Button>
            </div>
          </section>
        </motion.div>
      </div>
      <Modal open={deleteProfileOpen} onClose={() => setDeleteProfileOpen(false)} title="Delete consultant profile?">
        <p className="font-bold">
          Pending requests and upcoming accepted sessions will be cancelled with reason “Consultant profile removed.” Your account and completed booking/review history stay.
        </p>
        <div className="mt-6 flex gap-3">
          <Button variant="outline" full disabled={deleteBusy} onClick={() => setDeleteProfileOpen(false)}>Keep profile</Button>
          <Button variant="danger" full loading={deleteBusy} onClick={deleteConsultantProfile}>Delete profile</Button>
        </div>
      </Modal>
      <Modal open={deleteAccountOpen} onClose={() => setDeleteAccountOpen(false)} title="Delete account permanently?">
        <form onSubmit={deleteAccount} className="space-y-4">
          <p className="font-bold">
            We will re-authenticate first, cancel pending/upcoming bookings, remove consultant data and notifications, then delete your Firebase account. Completed bookings and reviews stay.
          </p>
          <Input
            label='Type "DELETE" to confirm'
            value={deleteConfirmation}
            onChange={event => setDeleteConfirmation(event.target.value)}
            required
          />
          <Input
            label="Current password"
            type="password"
            autoComplete="current-password"
            value={deletePassword}
            onChange={event => setDeletePassword(event.target.value)}
            required
          />
          <div className="flex gap-3">
            <Button type="button" variant="outline" full disabled={deleteBusy} onClick={() => setDeleteAccountOpen(false)}>Keep account</Button>
            <Button type="submit" variant="danger" full loading={deleteBusy}>Delete permanently</Button>
          </div>
        </form>
      </Modal>
    </PageLayout>
  )
}
