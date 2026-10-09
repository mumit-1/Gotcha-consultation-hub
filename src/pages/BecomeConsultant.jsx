import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import PhotoUpload from '../components/profile/PhotoUpload'
import CourseSelector from '../components/courses/CourseSelector'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'
import Button from '../components/ui/Button'
import { Save, Zap, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'

export default function BecomeConsultant() {
  const { firebaseUser, userDoc, isVerified } = useAuth()
  const [existing, setExisting] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [form, setForm]         = useState({
    bio: '', skills: '', experience: '',
    courses: [],
    price30min: 0, priceExtra30min: 0,
    whatsapp: '',
  })

  useEffect(() => {
    if (!firebaseUser) return
    const load = async () => {
      const [cSnap, wSnap] = await Promise.all([
        getDoc(doc(db, 'consultants', firebaseUser.uid)),
        getDoc(doc(db, 'users', firebaseUser.uid, 'private', 'contact')),
      ])
      if (cSnap.exists()) {
        const d = cSnap.data()
        setExisting(d)
        setForm({
          bio: d.bio || '',
          skills: d.skills || '',
          experience: d.experience || '',
          courses: d.courses || [],
          price30min: d.price30min ?? 0,
          priceExtra30min: d.priceExtra30min ?? 0,
          whatsapp: wSnap.exists() ? wSnap.data().whatsapp || '' : '',
        })
      } else if (wSnap.exists()) {
        setForm(f => ({ ...f, whatsapp: wSnap.data().whatsapp || '' }))
      }
      setFetching(false)
    }
    load()
  }, [firebaseUser])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!isVerified) { toast.error('Please verify your email first'); return }
    if (form.courses.length === 0) { toast.error('Select at least one course'); return }

    setLoading(true)
    try {
      const consultantData = {
        uid: firebaseUser.uid,
        name: userDoc?.name || '',
        photoURL: userDoc?.photoURL || null,
        bio: form.bio.trim(),
        skills: form.skills.trim(),
        experience: form.experience.trim(),
        courses: form.courses,
        price30min: Number(form.price30min) || 0,
        priceExtra30min: Number(form.priceExtra30min) || 0,
        ratingSum: existing?.ratingSum ?? 0,
        ratingCount: existing?.ratingCount ?? 0,
        completedCount: existing?.completedCount ?? 0,
        isVerified: existing?.isVerified ?? false,
        manualBusy: existing?.manualBusy ?? null,
        updatedAt: serverTimestamp(),
        ...(existing ? {} : { createdAt: serverTimestamp() }),
      }

      await setDoc(doc(db, 'consultants', firebaseUser.uid), consultantData, { merge: true })

      // Save WhatsApp to private subcollection
      if (form.whatsapp.trim()) {
        await setDoc(doc(db, 'users', firebaseUser.uid, 'private', 'contact'), {
          whatsapp: form.whatsapp.trim(),
        })
      }

      // Mark user as consultant
      await updateDoc(doc(db, 'users', firebaseUser.uid), {
        isConsultant: true,
        updatedAt: serverTimestamp(),
      })

      toast.success(existing ? 'Consultant profile updated!' : 'You are now a consultant! 🎉')
      setExisting(consultantData)
    } catch (err) {
      toast.error('Failed: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const calcPrice = (mins) => {
    const base = Number(form.price30min) || 0
    const extra = Number(form.priceExtra30min) || 0
    if (base === 0) return 'FREE'
    const extraBlocks = Math.max(0, Math.ceil(mins / 30) - 1)
    return `${base + extraBlocks * extra} BDT`
  }

  if (fetching) return <PageLayout><EmailVerificationBanner /><div className="page-container py-20 text-center font-black uppercase">Loading…</div></PageLayout>

  return (
    <PageLayout>
      <EmailVerificationBanner />
      <div className="page-container py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-2xl mx-auto"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="badge-yellow badge sticker-2">
              <Zap className="h-3 w-3" strokeWidth={3} fill="currentColor" />
              {existing ? 'Edit Profile' : 'New'}
            </div>
          </div>
          <h1 className="font-black text-4xl uppercase tracking-tight mb-2">
            {existing ? 'Your Consultant Profile' : 'Become a Consultant'}
          </h1>
          <p className="font-bold text-sm text-black/60 mb-8">
            Set your courses, availability, and pricing. Your profile appears in search results once saved.
          </p>

          {!isVerified && (
            <div className="card p-4 shadow-neo-sm bg-neo-secondary mb-6 border-neo-accent">
              <p className="font-black text-sm uppercase">You must verify your email before saving a consultant profile.</p>
            </div>
          )}

          <form onSubmit={handleSave} className="space-y-6">
            {/* Photo */}
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Profile Photo</h2>
              <PhotoUpload
                currentUrl={userDoc?.photoURL}
                name={userDoc?.name || 'U'}
                onUpload={async (url) => {
                  await updateDoc(doc(db, 'users', firebaseUser.uid), { photoURL: url })
                  if (existing) {
                    await updateDoc(doc(db, 'consultants', firebaseUser.uid), { photoURL: url, updatedAt: serverTimestamp() })
                  }
                  toast.success('Photo updated!')
                }}
              />
            </div>

            {/* About */}
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">About You</h2>
              <div className="space-y-4">
                <Textarea label="Bio" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="What can you help with? Why should students book you?" rows={3} />
                <Textarea label="Skills" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. Data Structures, Algorithms, Circuit Analysis" rows={2} />
                <Textarea label="Experience" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="e.g. 3rd year CSE, tutored 20+ students last semester" rows={2} />
              </div>
            </div>

            {/* Courses */}
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">Courses You Offer Help For</h2>
              <div className="relative">
                <CourseSelector
                  selected={form.courses}
                  onChange={codes => setForm(f => ({ ...f, courses: codes }))}
                  label="Select courses"
                  error={form.courses.length === 0 ? 'Select at least one course' : ''}
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">
                Pricing <span className="badge-yellow badge ml-2">Optional — Default FREE</span>
              </h2>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <Input
                  label="First 30 min (0 = FREE)"
                  type="number"
                  min={0}
                  value={form.price30min}
                  onChange={e => setForm(f => ({ ...f, price30min: e.target.value }))}
                />
                <Input
                  label="Each extra 30 min"
                  type="number"
                  min={0}
                  value={form.priceExtra30min}
                  onChange={e => setForm(f => ({ ...f, priceExtra30min: e.target.value }))}
                />
              </div>
              <div className="bg-neo-bg border-4 border-black p-4">
                <p className="font-black text-xs uppercase tracking-widest mb-2">Price Preview</p>
                <div className="grid grid-cols-3 gap-2">
                  {[30, 60, 90].map(min => (
                    <div key={min} className="text-center">
                      <p className="font-black text-lg">{calcPrice(min)}</p>
                      <p className="font-bold text-xs text-black/50">{min} min</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* WhatsApp */}
            <div className="card p-6 shadow-neo-md">
              <h2 className="font-black text-sm uppercase tracking-widest border-b-4 border-black pb-2 mb-4">
                WhatsApp Number <span className="badge-muted badge ml-2">Private</span>
              </h2>
              <Input
                label="WhatsApp (with country code)"
                placeholder="+8801XXXXXXXXX"
                value={form.whatsapp}
                onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
              />
              <p className="mt-2 font-bold text-xs text-black/50">
                Only shared with clients who have an accepted booking with you.
              </p>
            </div>

            <Button type="submit" variant="primary" full loading={loading} className="btn-lg" disabled={!isVerified}>
              <Save className="h-4 w-4" strokeWidth={3} />
              {existing ? 'Update Profile' : 'Activate Consultant Profile'}
            </Button>

            {existing && (
              <div className="flex gap-3">
                <Link to="/availability" className="btn btn-secondary btn-full">Manage Availability →</Link>
              </div>
            )}
          </form>
        </motion.div>
      </div>
    </PageLayout>
  )
}
