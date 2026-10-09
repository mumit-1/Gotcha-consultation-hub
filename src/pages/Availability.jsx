import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { doc, getDoc, setDoc, serverTimestamp, updateDoc, Timestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import Button from '../components/ui/Button'
import Input from '../components/ui/Input'
import { Plus, Trash2, Clock, ToggleLeft, ToggleRight, Save } from 'lucide-react'
import toast from 'react-hot-toast'

const DAYS = ['monday','tuesday','wednesday','thursday','friday','saturday','sunday']

const DEFAULT_RANGE = { start: '09:00', end: '17:00' }

export default function Availability() {
  const { firebaseUser, userDoc } = useAuth()
  const [weekly, setWeekly]   = useState(() => Object.fromEntries(DAYS.map(d => [d, []])))
  const [manualBusy, setManualBusy] = useState(null)
  const [busyUntil, setBusyUntil] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving]   = useState(false)

  useEffect(() => {
    if (!firebaseUser) return
    getDoc(doc(db, 'consultants', firebaseUser.uid)).then(snap => {
      if (snap.exists()) {
        const d = snap.data()
        setWeekly(d.availability || Object.fromEntries(DAYS.map(day => [day, []])))
        setManualBusy(d.manualBusy || null)
      }
      setLoading(false)
    })
  }, [firebaseUser])

  const addRange = (day) => {
    setWeekly(prev => ({
      ...prev,
      [day]: [...(prev[day] || []), { ...DEFAULT_RANGE }]
    }))
  }

  const removeRange = (day, idx) => {
    setWeekly(prev => ({
      ...prev,
      [day]: prev[day].filter((_, i) => i !== idx)
    }))
  }

  const updateRange = (day, idx, field, value) => {
    setWeekly(prev => ({
      ...prev,
      [day]: prev[day].map((r, i) => i === idx ? { ...r, [field]: value } : r)
    }))
  }

  const save = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'consultants', firebaseUser.uid), {
        availability: weekly,
        manualBusy: manualBusy,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      toast.success('Availability saved!')
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  const toggleManualBusy = async () => {
    if (manualBusy) {
      setManualBusy(null)
      await setDoc(doc(db, 'consultants', firebaseUser.uid), { manualBusy: null, updatedAt: serverTimestamp() }, { merge: true })
      toast.success('You are no longer manually busy')
    } else {
      if (!busyUntil) { toast.error('Set a "busy until" time first'); return }
      const until = Timestamp.fromDate(new Date(busyUntil))
      setManualBusy({ until })
      await setDoc(doc(db, 'consultants', firebaseUser.uid), { manualBusy: { until }, updatedAt: serverTimestamp() }, { merge: true })
      toast.success('Set as busy until ' + busyUntil)
    }
  }

  if (loading) return <PageLayout><div className="page-container py-20 text-center font-black uppercase">Loading…</div></PageLayout>

  const isBusy = manualBusy && manualBusy.until?.toMillis() > Date.now()

  return (
    <PageLayout>
      <EmailVerificationBanner />
      <div className="border-b-4 border-black bg-neo-secondary">
        <div className="page-container py-8">
          <h1 className="font-black text-4xl uppercase tracking-tight">Availability</h1>
          <p className="font-bold text-black/70 text-sm mt-1">Set your weekly schedule (UTC). Clients will see Available/Busy/Offline.</p>
        </div>
      </div>

      <div className="page-container py-8 max-w-2xl">
        {/* Manual busy toggle */}
        <div className="card p-5 shadow-neo-md mb-6">
          <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Quick Busy Toggle</h2>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="flex-1">
              <Input
                label="Mark yourself busy until"
                type="datetime-local"
                value={busyUntil}
                onChange={e => setBusyUntil(e.target.value)}
              />
            </div>
            <Button
              onClick={toggleManualBusy}
              variant={isBusy ? 'danger' : 'secondary'}
              className="flex items-center gap-2 self-end"
            >
              {isBusy ? <ToggleRight className="h-4 w-4" strokeWidth={3} /> : <ToggleLeft className="h-4 w-4" strokeWidth={3} />}
              {isBusy ? 'Remove Busy' : 'Set Busy'}
            </Button>
          </div>
          {isBusy && (
            <p className="mt-2 font-black text-xs uppercase text-neo-accent">
              You are currently busy until {manualBusy.until?.toDate?.().toLocaleString()}
            </p>
          )}
        </div>

        {/* Weekly schedule */}
        <div className="space-y-4">
          {DAYS.map(day => (
            <motion.div key={day} layout className="card shadow-neo-sm overflow-hidden">
              <div className={`border-b-4 border-black px-4 py-3 flex items-center justify-between ${weekly[day]?.length > 0 ? 'bg-neo-green' : 'bg-neo-bg'}`}>
                <h3 className="font-black text-sm uppercase tracking-wide">
                  {day.charAt(0).toUpperCase() + day.slice(1)}
                  <span className="ml-2 font-bold text-xs text-black/50">UTC</span>
                </h3>
                <button
                  onClick={() => addRange(day)}
                  className="flex items-center gap-1 btn btn-outline btn-sm"
                >
                  <Plus className="h-3 w-3" strokeWidth={3} /> Add Range
                </button>
              </div>

              {weekly[day]?.length === 0 ? (
                <p className="px-4 py-3 font-bold text-xs text-black/40 uppercase">Offline this day</p>
              ) : (
                <div className="p-4 space-y-2">
                  <AnimatePresence>
                    {weekly[day].map((range, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className="flex items-center gap-3"
                      >
                        <Clock className="h-4 w-4 flex-shrink-0" strokeWidth={3} />
                        <input
                          type="time"
                          value={range.start}
                          onChange={e => updateRange(day, idx, 'start', e.target.value)}
                          className="input h-10 text-sm w-28"
                        />
                        <span className="font-black text-xs">TO</span>
                        <input
                          type="time"
                          value={range.end}
                          onChange={e => updateRange(day, idx, 'end', e.target.value)}
                          className="input h-10 text-sm w-28"
                        />
                        <button
                          onClick={() => removeRange(day, idx)}
                          className="btn btn-sm btn-outline text-neo-accent border-neo-accent hover:bg-neo-accent hover:text-white ml-auto"
                          aria-label="Remove"
                        >
                          <Trash2 className="h-3 w-3" strokeWidth={3} />
                        </button>
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        <div className="mt-6">
          <Button variant="primary" full onClick={save} loading={saving} className="btn-lg">
            <Save className="h-4 w-4" strokeWidth={3} /> Save Availability
          </Button>
        </div>
      </div>
    </PageLayout>
  )
}
