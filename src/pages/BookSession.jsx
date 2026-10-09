import { useState, useEffect, useMemo } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { doc, getDoc } from 'firebase/firestore'
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
import { ArrowLeft, AlertTriangle } from 'lucide-react'
import { isBefore } from 'date-fns'
import toast from 'react-hot-toast'
import { emailBookingRequest } from '../lib/emailjs'
import {
  DHAKA_TIME_ZONE,
  formatDhaka,
  formatDhakaDateInput,
  getDhakaScheduleTime,
  parseDhakaDateTime,
  validateDhakaBookingTime,
} from '../lib/dhakaTime'

export default function BookSession() {
  const { consultantId }        = useParams()
  const navigate                = useNavigate()
  const { firebaseUser, userDoc, isVerified } = useAuth()

  const [consultant, setConsultant] = useState(null)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [now, setNow] = useState(() => Date.now())
  const [form, setForm]         = useState({
    course: [], topic: '', date: '', time: '', duration: 30,
  })
  const [errors, setErrors]     = useState({})
  const offeredCourses = Array.isArray(consultant?.courses) ? consultant.courses : []

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  useEffect(() => {
    getDoc(doc(db, 'consultants', consultantId))
      .then(snap => {
        if (snap.exists()) {
          setConsultant({ id: snap.id, ...snap.data() })
          setForm(form => ({ ...form, course: [] }))
        }
      })
      .finally(() => setLoading(false))
  }, [consultantId])

  const selectedDay = form.date
    ? getDhakaScheduleTime(parseDhakaDateTime(form.date, '12:00')).day
    : null
  const dayRanges = selectedDay ? consultant?.availability?.[selectedDay] || [] : []
  const availableTimes = useMemo(() => {
    if (!consultant || !form.date) return []
    const times = []
    for (let minuteOfDay = 0; minuteOfDay < 24 * 60; minuteOfDay += 30) {
      const time = `${String(Math.floor(minuteOfDay / 60)).padStart(2, '0')}:${String(minuteOfDay % 60).padStart(2, '0')}`
      const start = parseDhakaDateTime(form.date, time)
      if (start.getTime() <= now) continue
      if (validateDhakaBookingTime(consultant, start, form.duration).valid) times.push(time)
    }
    return times
  }, [consultant, form.date, form.duration, now])

  const calcPrice = () => {
    if (!consultant || !consultant.price30min) return null
    const extra = Math.max(0, Math.ceil(form.duration / 30) - 1)
    return consultant.price30min + extra * (consultant.priceExtra30min || 0)
  }

  const validate = () => {
    const e = {}
    if (!offeredCourses.includes(form.course[0])) e.course = 'Select a course this consultant offers'
    if (!form.topic.trim())                e.topic    = 'Describe your topic'
    if (!form.date)                        e.date     = 'Pick a date'
    if (!availableTimes.includes(form.time)) e.time = availableTimes.length
      ? 'Choose one of the available start times'
      : 'No start times are available for this date and duration'
    if (form.duration < 30)               e.duration = 'Minimum 30 minutes'
    if (form.date && form.time) {
      const dateTime = parseDhakaDateTime(form.date, form.time)
      if (Number.isNaN(dateTime.getTime()) || isBefore(dateTime, new Date())) {
        e.date = 'Choose a valid future date and time (Bangladesh time)'
      }
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
      const startUtc = parseDhakaDateTime(form.date, form.time)
      const slotValidation = validateDhakaBookingTime(consultant, startUtc, form.duration)
      if (!slotValidation.valid) {
        toast.error(slotValidation.reason)
        return
      }

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
        date: formatDhaka(startUtc, { dateStyle: 'medium' }),
        time: formatDhaka(startUtc, { timeStyle: 'short' }),
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
  const today   = formatDhakaDateInput()

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
                    options={offeredCourses}
                    single
                    label="Course"
                    placeholder={offeredCourses.length
                      ? "Pick a course this consultant offers…"
                      : 'This consultant has not listed any courses'}
                    error={errors.course}
                  />
                  {offeredCourses.length > 0 ? (
                    <p className="mt-2 font-bold text-xs text-black/50">
                      Choose from this consultant’s {offeredCourses.length} listed course{offeredCourses.length === 1 ? '' : 's'}.
                    </p>
                  ) : (
                    <p className="mt-2 font-bold text-xs text-neo-accent">
                      This consultant has no listed courses and cannot receive a booking yet.
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
                    label="Date (Bangladesh time)"
                    type="date"
                    min={today}
                    value={form.date}
                    onChange={e => setForm(f => ({ ...f, date: e.target.value, time: '' }))}
                    error={errors.date}
                  />
                  <div>
                    <label className="label" htmlFor="booking-time">
                      Start Time ({DHAKA_TIME_ZONE}, UTC+6)
                    </label>
                    <select
                      id="booking-time"
                      className="select"
                      value={form.time}
                      disabled={!form.date || availableTimes.length === 0}
                      onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                    >
                      <option value="">Choose an available time</option>
                      {availableTimes.map(time => (
                        <option key={time} value={time}>
                          {formatDhaka(parseDhakaDateTime(form.date, time), {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </option>
                      ))}
                    </select>
                    {errors.time && (
                      <p className="mt-1 text-xs font-black text-neo-accent uppercase tracking-wide">
                        {errors.time}
                      </p>
                    )}
                  </div>
                </div>
                {form.date && dayRanges.length > 0 && (
                  <p className="mb-4 font-bold text-xs text-black/60">
                    Consultant’s {selectedDay} hours: {dayRanges.map(range => `${range.start}–${range.end}`).join(', ')} Bangladesh time.
                    Available starts are filtered by the selected session duration.
                  </p>
                )}
                {form.date && dayRanges.length === 0 && (
                  <p className="mb-4 font-bold text-xs text-black/60">
                    No weekly hours are set for {selectedDay}; any future 30-minute start time that fits the selected duration is allowed, unless the consultant is manually busy.
                  </p>
                )}
                {consultant.manualBusy?.until?.toMillis?.() > now && (
                  <p className="mb-4 font-black text-xs text-neo-accent">
                    This consultant is marked busy until {formatDhaka(
                      new Date(consultant.manualBusy.until.toMillis()),
                      { dateStyle: 'medium', timeStyle: 'short' },
                    )} Bangladesh time. Only later times can be requested.
                  </p>
                )}
                {form.date && availableTimes.length === 0 && (
                  <p className="mb-4 font-black text-xs text-neo-accent">
                    No available start times for this date and duration. Try another date or a shorter session.
                  </p>
                )}
                <div>
                  <label className="label">Duration</label>
                  <select
                    className="select"
                    value={form.duration}
                    onChange={e => setForm(f => ({
                      ...f,
                      duration: Number(e.target.value),
                      time: '',
                    }))}
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
