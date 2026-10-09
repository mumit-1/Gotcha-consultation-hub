import { useState, useEffect } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { doc, getDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { createBooking } from '../lib/bookingService'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import CourseSelector from '../components/courses/CourseSelector'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'
import AnimatedSection from '../components/ui/AnimatedSection'
import { ArrowLeft, Clock, DollarSign, AlertTriangle } from 'lucide-react'
import { addMinutes, format, isBefore, parseISO } from 'date-fns'
import toast from 'react-hot-toast'
import { emailBookingRequest } from '../lib/emailjs'

export default function BookSession() {
  const { consultantId }        = useParams()
  const navigate                = useNavigate()
  const { firebaseUser, userDoc, isVerified } = useAuth()

  const [consultant, setConsultant] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm]         = useState({
    course: [], topic: '', date: '', time: '', duration: 30,
  })
  const [errors, setErrors]     = useState({})

  useEffect(() => {
    getDoc(doc(db, 'consultants', consultantId))
      .then(snap => { if (snap.exists()) setConsultant({ id: snap.id, ...snap.data() }) })
      .finally(() => setLoading(false))
  }, [consultantId])

  const calcPrice = () => {
    if (!consultant || !consultant.price30min) return null
    const extra = Math.max(0, Math.ceil(form.duration / 30) - 1)
    return consultant.price30min + extra * (consultant.priceExtra30min || 0)
  }

  const validate = () => {
    const e = {}
    if (form.course.length === 0)          e.course   = 'Select a course'
    if (!form.topic.trim())                e.topic    = 'Describe your topic'
    if (!form.date)                        e.date     = 'Pick a date'
    if (!form.time)                        e.time     = 'Pick a time'
    if (form.duration < 30)               e.duration = 'Minimum 30 minutes'
    if (form.date && form.time) {
      const dt = new Date(`${form.date}T${form.time}`)
      if (isBefore(dt, new Date())) e.date = 'Cannot book in the past'
    }
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!isVerified) { toast.error('Please verify your email first'); return }
    if (userDoc?.status !== 'active') { toast.error('Your account is suspended'); return }

    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }

    setSubmitting(true)
    try {
      const startUtc = new Date(`${form.date}T${form.time}`)

      // Fetch consultant user doc for email
      const cUserSnap = await getDoc(doc(db, 'users', consultantId))
      const cUser = cUserSnap.data() || {}

      const bookingId = await createBooking({
        consultantId,
        consultantName: consultant.name,
        consultantEmail: cUser.email,
        clientId: firebaseUser.uid,
        clientName: userDoc?.name || '',
        clientEmail: firebaseUser.email,
        course: form.course[0],
        topic: form.topic.trim(),
        startUtc,
        durationMin: form.duration,
        price: calcPrice() ?? 0,
      })

      // Email consultant
      await emailBookingRequest({
        consultantEmail: cUser.email,
        consultantName: consultant.name,
        clientName: userDoc?.name || '',
        course: form.course[0],
        topic: form.topic.trim(),
        date: format(startUtc, 'MMM d, yyyy'),
        time: format(startUtc, 'h:mm a'),
        duration: `${form.duration} min`,
        price: calcPrice() ?? 0,
        bookingId,
      })

      toast.success('Booking request sent!')
      navigate('/my-consultations')
    } catch (err) {
      toast.error(err.message || 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <PageLayout><div className="page-container py-20 text-center font-black uppercase">Loading…</div></PageLayout>
  if (!consultant) return <PageLayout><div className="page-container py-20 text-center font-black uppercase">Consultant not found</div></PageLayout>
  if (firebaseUser?.uid === consultantId) {
    return (
      <PageLayout>
        <div className="page-container py-20 text-center">
          <h1 className="font-black text-3xl uppercase mb-4">You can’t book yourself</h1>
          <Link to={`/consultant/${consultantId}`} className="btn btn-outline">
            View your consultant profile
          </Link>
        </div>
      </PageLayout>
    )
  }

  const isFree  = !consultant.price30min || consultant.price30min === 0
  const price   = calcPrice()
  const today   = format(new Date(), 'yyyy-MM-dd')

  return (
    <PageLayout>
      <EmailVerificationBanner />
      <div className="page-container py-10">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 font-black text-sm uppercase hover:text-neo-accent transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" strokeWidth={3} /> Back
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Form */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2"
          >
            <h1 className="font-black text-4xl uppercase tracking-tight mb-6">
              Book <span className="bg-neo-secondary px-2 border-4 border-black">{consultant.name}</span>
            </h1>

            {!isVerified && (
              <div className="card p-4 shadow-neo-sm bg-neo-secondary border-neo-accent mb-6">
                <p className="font-black text-sm uppercase flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" strokeWidth={3} />
                  Verify your email before booking
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="card p-6 shadow-neo-md">
                <div className="relative mb-5">
                  <CourseSelector
                    selected={form.course}
                    onChange={codes => setForm(f => ({ ...f, course: codes }))}
                    single
                    label="Course"
                    placeholder="Pick one course from the consultant's list…"
                    error={errors.course}
                  />
                  {consultant.courses?.length > 0 && (
                    <p className="mt-2 font-bold text-xs text-black/50">
                      This consultant offers: {consultant.courses.join(', ')}
                    </p>
                  )}
                </div>

                <Textarea
                  label="Topic / What You Need Help With"
                  value={form.topic}
                  onChange={e => setForm(f => ({ ...f, topic: e.target.value }))}
                  placeholder="e.g. I'm struggling with linked list deletion and tree traversal…"
                  rows={3}
                  error={errors.topic}
                />
              </div>

              <div className="card p-6 shadow-neo-md">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <Input
                    label="Date"
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value }))}
                    error={errors.date}
                  />
                  <Input
                    label="Start Time"
                    type="time"
                    value={form.time}
                    onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    error={errors.time}
                  />
                </div>
                <div>
                  <label className="label">Duration</label>
                  <select
                    className="select"
                    value={form.duration}
                    onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) }))}
                  >
                    {[30, 60, 90, 120, 150, 180].map(m => (
                      <option key={m} value={m}>{m} min</option>
                    ))}
                  </select>
                </div>
              </div>

              <Button
                type="submit"
                variant="primary"
                full
                loading={submitting}
                disabled={!isVerified}
                className="btn-lg"
              >
                Send Request
              </Button>
            </form>
          </motion.div>

          {/* Summary sidebar */}
          <AnimatedSection direction="left">
            <div className="card p-5 shadow-neo-md bg-neo-secondary sticky top-20">
              <h3 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-3">Booking Summary</h3>
              <div className="flex items-center gap-3 mb-4">
                <Avatar src={consultant.photoURL} name={consultant.name} size="md" />
                <div>
                  <p className="font-black text-sm uppercase">{consultant.name}</p>
                  <p className="font-bold text-xs text-black/60">{form.course[0] || '—'}</p>
                </div>
              </div>
              <div className="space-y-2 border-t-4 border-black pt-3">
                <div className="flex justify-between font-bold text-sm">
                  <span>Duration</span><span>{form.duration} min</span>
                </div>
                {form.date && form.time && (
                  <div className="flex justify-between font-bold text-sm">
                    <span>Time</span>
                    <span>{form.date} {form.time}</span>
                  </div>
                )}
                <div className="flex justify-between font-black text-base border-t-4 border-black pt-2 mt-2">
                  <span>Total</span>
                  <span className={isFree ? 'text-neo-green' : ''}>
                    {isFree ? 'FREE' : price ?? '—'}
                  </span>
                </div>
              </div>
            </div>
          </AnimatedSection>
        </div>
      </div>
    </PageLayout>
  )
}
