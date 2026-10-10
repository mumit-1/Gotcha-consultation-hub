import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  doc, getDoc, serverTimestamp, writeBatch,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/useAuth'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import PhotoUpload from '../components/profile/PhotoUpload'
import CourseSelector from '../components/courses/CourseSelector'
import Input from '../components/ui/Input'
import Textarea from '../components/ui/Textarea'
import Button from '../components/ui/Button'
import {
  ArrowRight, BookOpen, Check, CircleDollarSign, Save, ShieldCheck, UserRound, Zap,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { Link } from 'react-router-dom'
import { runVerifiedWrite } from '../lib/verifiedWrites'
import Select from '../components/ui/Select'
import { bracuDepartments } from '../constants/departments'
import { getCachedData, invalidateCachedData } from '../lib/dataCache'

export default function BecomeConsultant() {
  const { firebaseUser, userDoc, isVerified } = useAuth()
  const [existing, setExisting] = useState(null)
  const [loading, setLoading]   = useState(false)
  const [fetching, setFetching] = useState(true)
  const [courseCatalog, setCourseCatalog] = useState(null)
  const [courseCatalogError, setCourseCatalogError] = useState('')
  const [form, setForm]         = useState({
    bio: '', skills: '', experience: '',
    department: userDoc?.department || '',
    courses: [],
    price30min: 0, priceExtra30min: 0,
    whatsapp: '',
  })

  useEffect(() => {
    if (!firebaseUser) return
    const load = async () => {
      try {
        const [cSnap, consultantContactSnap, legacyContactSnap, courseCatalogSnap] = await Promise.all([
          getDoc(doc(db, 'consultants', firebaseUser.uid)),
          getDoc(doc(db, 'consultants', firebaseUser.uid, 'private', 'contact')),
          getDoc(doc(db, 'users', firebaseUser.uid, 'private', 'contact')),
          getCachedData('courses:config', 60_000, () => getDoc(doc(db, 'config', 'courses'))),
        ])
        const courseCodes = courseCatalogSnap.data()?.codes
        if (
          !courseCatalogSnap.exists() ||
          !Array.isArray(courseCodes) ||
          courseCodes.length === 0 ||
          courseCodes.some(code => typeof code !== 'string')
        ) {
          setCourseCatalog(null)
          setCourseCatalogError(
            'The course catalog is missing or invalid. Ask an administrator to seed courses in Admin → Settings before saving a consultant profile.',
          )
        } else {
          setCourseCatalog(new Set(courseCodes))
          setCourseCatalogError('')
        }
        const contactSnap = consultantContactSnap.exists() ? consultantContactSnap : legacyContactSnap
        if (cSnap.exists()) {
          const d = cSnap.data()
          setExisting(d)
          setForm({
            bio: d.bio || '',
            skills: d.skills || '',
            experience: d.experience || '',
            department: d.department || userDoc?.department || '',
            courses: d.courses || [],
            price30min: d.price30min ?? 0,
            priceExtra30min: d.priceExtra30min ?? 0,
            whatsapp: contactSnap.exists() ? contactSnap.data().whatsapp || '' : '',
          })
        } else if (contactSnap.exists()) {
          setForm(f => ({ ...f, whatsapp: contactSnap.data().whatsapp || '' }))
        }
      } catch (err) {
        setCourseCatalog(null)
        setCourseCatalogError(`Could not load the course catalog: ${err.message}`)
        console.error('[Firestore] load consultant profile failed', {
          code: err?.code || 'unknown',
          message: err?.message || String(err),
          step: 'load consultant profile',
        })
        toast.error(`Could not load consultant profile: ${err.message}`)
      } finally {
        setFetching(false)
      }
    }
    load()
  }, [firebaseUser, userDoc?.department])

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.whatsapp.trim()) {
      toast.error('WhatsApp number is required')
      return
    }
    if (!bracuDepartments.includes(form.department)) {
      toast.error('Choose your BRACU department before saving.')
      return
    }
    if (!courseCatalog) {
      toast.error(courseCatalogError || 'The course catalog is unavailable. Ask an administrator to seed courses.')
      return
    }
    if (form.courses.length === 0) { toast.error('Select at least one course'); return }
    if (form.courses.length > 50) {
      toast.error('Select no more than 50 courses.')
      return
    }
    if (form.courses.some(code => !courseCatalog.has(code))) {
      toast.error('One or more selected courses are not in the current Firestore catalog. Refresh the page or ask an administrator to seed courses.')
      return
    }

    const price30min = Number(form.price30min)
    const priceExtra30min = Number(form.priceExtra30min)
    if (
      !Number.isFinite(price30min) || price30min < 0 ||
      !Number.isFinite(priceExtra30min) || priceExtra30min < 0
    ) {
      toast.error('Prices must be valid numbers greater than or equal to zero.')
      return
    }

    setLoading(true)
    try {
      const result = await runVerifiedWrite('save consultant profile, account role, and private contact', async ({ user, userData }) => {
        const catalogSnap = await getDoc(doc(db, 'config', 'courses'))
        const currentCodes = catalogSnap.data()?.codes
        if (
          !catalogSnap.exists() ||
          !Array.isArray(currentCodes) ||
          form.courses.some(code => !currentCodes.includes(code))
        ) {
          throw new Error('The course catalog is missing, invalid, or does not include every selected course. Ask an administrator to seed courses, then try again.')
        }
        const consultantRef = doc(db, 'consultants', user.uid)
        const userRef = doc(db, 'users', user.uid)
        const contactRef = doc(db, 'consultants', user.uid, 'private', 'contact')
        const consultantSnap = await getDoc(consultantRef)
        const isCreating = !consultantSnap.exists()
        const saved = consultantSnap.data() || {}
        const updatedAt = serverTimestamp()
        const profileFields = {
          name: userData.name || user.displayName || '',
          photoURL: userData.photoURL || user.photoURL || null,
          department: form.department,
          bio: form.bio.trim(),
          skills: form.skills.trim(),
          experience: form.experience.trim(),
          courses: [...new Set(form.courses)],
          price30min,
          priceExtra30min,
          updatedAt,
        }
        const batch = writeBatch(db)

        if (isCreating) {
          const emptyAvailability = Object.fromEntries(
            ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
              .map(day => [day, []]),
          )
          batch.set(consultantRef, {
            uid: user.uid,
            ...profileFields,
            ratingSum: 0,
            ratingCount: 0,
            completedCount: 0,
            isVerified: false,
            manualBusy: null,
            availability: emptyAvailability,
            createdAt: serverTimestamp(),
          })
        } else {
          batch.update(consultantRef, profileFields)
        }

        batch.set(contactRef, { whatsapp: form.whatsapp.trim() })
        batch.update(userRef, {
          department: form.department,
          isConsultant: true,
          updatedAt: serverTimestamp(),
        })
        await batch.commit()
        invalidateCachedData('consultants:find:')
        return {
          created: isCreating,
          profile: { ...saved, ...profileFields, uid: user.uid },
        }
      })
      toast.success(result.created ? 'You are now a consultant! 🎉' : 'Consultant profile updated!')
      setExisting(result.profile)
    } catch (err) {
      toast.error(`Could not save consultant profile: ${err.message}`)
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

  if (fetching) {
    return (
      <PageLayout>
        <EmailVerificationBanner />
        <div className="page-container py-20">
          <div role="status" className="mx-auto max-w-xl border-4 border-black bg-white p-8 text-center shadow-neo-md">
            <div className="mx-auto mb-4 h-10 w-10 animate-spin border-4 border-black border-t-neo-accent" />
            <p className="font-black uppercase tracking-widest">Loading your consultant profile…</p>
          </div>
        </div>
      </PageLayout>
    )
  }

  return (
    <PageLayout>
      <EmailVerificationBanner />
      <div className="page-container py-8 sm:py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-6xl"
        >
          <header className="relative mb-8 overflow-hidden border-4 border-black bg-neo-secondary p-6 shadow-neo-md sm:p-9">
            <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-1/3 bg-dots opacity-10 md:block" />
            <div className="relative max-w-3xl">
              <div className="mb-4 flex flex-wrap items-center gap-3">
                <span className="badge-black">
                  <Zap className="h-3 w-3" strokeWidth={3} fill="currentColor" />
                  {existing ? 'Profile editor' : 'Consultant signup'}
                </span>
                <span className="font-black text-xs uppercase tracking-widest">
                  {existing ? 'Keep your profile current' : 'Share what you know'}
                </span>
              </div>
              <h1 className="text-4xl font-black uppercase leading-none tracking-tighter sm:text-6xl">
                {existing ? <>Your consultant<br />profile<span className="text-neo-accent">.</span></> : <>Turn your<br />knowledge into help<span className="text-neo-accent">.</span></>}
              </h1>
              <p className="mt-5 max-w-xl text-base font-bold leading-relaxed sm:text-lg">
                Set the courses you can help with, your availability preferences, and optional pricing. You can update these details later.
              </p>
            </div>
            <span aria-hidden="true" className="absolute bottom-3 right-4 hidden rotate-6 text-7xl font-black leading-none text-black/10 md:block">
              GOTCHA
            </span>
          </header>

          {!isVerified && (
            <div role="status" className="mb-6 flex gap-3 border-4 border-black bg-neo-secondary p-4 shadow-neo-sm">
              <ShieldCheck className="mt-0.5 h-6 w-6 flex-shrink-0" strokeWidth={3} />
              <div>
                <p className="font-black text-sm uppercase">Email verification needed</p>
                <p className="mt-1 text-sm font-bold">
                  Verify your email before saving. If you just verified, try saving; the app refreshes your verification status first.
                </p>
              </div>
            </div>
          )}

          {courseCatalogError && (
            <div role="alert" className="mb-6 flex gap-3 border-4 border-black bg-neo-accent p-4 text-white shadow-neo-sm">
              <BookOpen className="mt-0.5 h-6 w-6 flex-shrink-0" strokeWidth={3} />
              <p className="font-bold text-sm">{courseCatalogError}</p>
            </div>
          )}

          <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1fr)_19rem]">
            <form onSubmit={handleSave} className="min-w-0 space-y-6">
              <section aria-labelledby="photo-heading" className="card p-5 sm:p-7">
                <div className="mb-5 flex items-start gap-4 border-b-4 border-black pb-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-4 border-black bg-neo-secondary font-black">01</span>
                  <div>
                    <h2 id="photo-heading" className="font-black text-lg uppercase tracking-wide">Profile photo</h2>
                    <p className="mt-1 text-sm font-bold text-black/60">Help students recognize you.</p>
                  </div>
                </div>
                <PhotoUpload
                  currentUrl={userDoc?.photoURL}
                  name={userDoc?.name || 'U'}
                  onUpload={async (url) => {
                    await runVerifiedWrite('update profile photo', async ({ user }) => {
                      const batch = writeBatch(db)
                      batch.update(doc(db, 'users', user.uid), {
                        photoURL: url,
                        updatedAt: serverTimestamp(),
                      })
                      if (existing) {
                        batch.update(doc(db, 'consultants', user.uid), {
                          photoURL: url,
                          updatedAt: serverTimestamp(),
                        })
                      }
                      await batch.commit()
                    })
                  }}
                />
              </section>

              <section aria-labelledby="about-heading" className="card p-5 sm:p-7">
                <div className="mb-5 flex items-start gap-4 border-b-4 border-black pb-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-4 border-black bg-neo-muted font-black">02</span>
                  <div>
                    <h2 id="about-heading" className="font-black text-lg uppercase tracking-wide">About you</h2>
                    <p className="mt-1 text-sm font-bold text-black/60">Give students a quick picture of how you can help.</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <Select
                    label="BRACU Department *"
                    required
                    value={form.department}
                    onChange={e => setForm(f => ({ ...f, department: e.target.value }))}
                  >
                    <option value="">Choose your department</option>
                    {bracuDepartments.map(department => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </Select>
                  <Textarea label="Bio" value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} placeholder="What can you help with? Why should students book you?" rows={3} />
                  <Textarea label="Skills" value={form.skills} onChange={e => setForm(f => ({ ...f, skills: e.target.value }))} placeholder="e.g. Data Structures, Algorithms, Circuit Analysis" rows={2} />
                  <Textarea label="Experience" value={form.experience} onChange={e => setForm(f => ({ ...f, experience: e.target.value }))} placeholder="e.g. 3rd year CSE, tutored 20+ students last semester" rows={2} />
                </div>
              </section>

              <section aria-labelledby="courses-heading" className="card p-5 sm:p-7">
                <div className="mb-5 flex items-start gap-4 border-b-4 border-black pb-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-4 border-black bg-neo-accent font-black text-white">03</span>
                  <div>
                    <h2 id="courses-heading" className="font-black text-lg uppercase tracking-wide">Courses you offer help for</h2>
                    <p className="mt-1 text-sm font-bold text-black/60">Pick the subjects you feel confident teaching.</p>
                  </div>
                </div>
                <div className="relative">
                  <CourseSelector
                    selected={form.courses}
                    onChange={codes => setForm(f => ({ ...f, courses: codes }))}
                    label="Select courses"
                    error={
                      form.courses.length === 0
                        ? 'Select at least one course'
                        : form.courses.length > 50
                          ? 'Select no more than 50 courses'
                          : ''
                    }
                  />
                  <p className="mt-2 font-bold text-xs text-black/60">Up to 50 selections from the 549-course catalog.</p>
                </div>
              </section>

              <section aria-labelledby="pricing-heading" className="card p-5 sm:p-7">
                <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b-4 border-black pb-4">
                  <div className="flex items-start gap-4">
                    <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-4 border-black bg-neo-secondary font-black">04</span>
                    <div>
                      <h2 id="pricing-heading" className="font-black text-lg uppercase tracking-wide">Consultation price</h2>
                      <p className="mt-1 text-sm font-bold text-black/60">Your price is optional. Keep it at zero to offer free help.</p>
                    </div>
                  </div>
                  <span className="badge-yellow">Optional</span>
                </div>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input
                    label="First 30 min (0 = free)"
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
                <div className="mt-5 grid grid-cols-3 border-4 border-black bg-neo-bg">
                  {[30, 60, 90].map(min => (
                    <div key={min} className="p-3 text-center [&+div]:border-l-4 [&+div]:border-black">
                      <p className="font-black text-lg sm:text-xl">{calcPrice(min)}</p>
                      <p className="mt-1 font-black text-xs uppercase tracking-widest">{min} min</p>
                    </div>
                  ))}
                </div>
              </section>

              <section aria-labelledby="whatsapp-heading" className="card p-5 sm:p-7">
                <div className="mb-5 flex items-start gap-4 border-b-4 border-black pb-4">
                  <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center border-4 border-black bg-neo-muted font-black">05</span>
                  <div>
                    <h2 id="whatsapp-heading" className="font-black text-lg uppercase tracking-wide">WhatsApp contact</h2>
                    <p className="mt-1 text-sm font-bold text-black/60">Required so clients can reach you after a booking is accepted.</p>
                  </div>
                </div>
                <Input
                  label="WhatsApp (with country code) *"
                  placeholder="+8801XXXXXXXXX"
                  type="tel"
                  autoComplete="tel"
                  required
                  value={form.whatsapp}
                  onChange={e => setForm(f => ({ ...f, whatsapp: e.target.value }))}
                />
                <p className="mt-3 inline-flex items-center gap-2 border-2 border-black bg-neo-bg px-3 py-2 text-xs font-black uppercase">
                  <ShieldCheck className="h-4 w-4" strokeWidth={3} />
                  Shared only after a booking is accepted
                </p>
              </section>

              <div className="space-y-3">
                <Button
                  type="submit"
                  variant="primary"
                  full
                  loading={loading}
                  disabled={loading || !courseCatalog}
                  className="btn-lg"
                >
                  <Save className="h-4 w-4" strokeWidth={3} />
                  {loading ? 'Saving your profile…' : existing ? 'Save profile changes' : 'Activate consultant profile'}
                </Button>
                {!courseCatalog && (
                  <p className="text-center text-xs font-black uppercase tracking-wide">
                    Saving is unavailable until the course catalog is ready.
                  </p>
                )}
              </div>

              {existing && (
                <Link
                  to="/availability"
                  className="btn btn-secondary btn-full min-h-14 focus-visible:ring-2 focus-visible:ring-black focus-visible:ring-offset-2"
                >
                  Manage availability <ArrowRight className="h-4 w-4" strokeWidth={3} />
                </Link>
              )}
            </form>

            <aside aria-label="Profile setup summary" className="space-y-6 lg:sticky lg:top-6">
              <section className="overflow-hidden border-4 border-black bg-white shadow-neo-md">
                <div className="flex items-center gap-3 border-b-4 border-black bg-black p-4 text-white">
                  <UserRound className="h-6 w-6" strokeWidth={3} />
                  <h2 className="font-black text-sm uppercase tracking-widest">Your setup</h2>
                </div>
                <div className="space-y-4 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-sm">Email</span>
                    <span className={`badge ${isVerified ? 'bg-neo-green' : 'bg-neo-secondary'}`}>
                      {isVerified ? <><Check className="h-3 w-3" strokeWidth={4} /> Verified</> : 'Verify'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-sm">Course catalog</span>
                    <span className={`badge ${courseCatalog ? 'bg-neo-green' : 'bg-neo-accent text-white'}`}>
                      {courseCatalog ? 'Ready' : 'Unavailable'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-bold text-sm">WhatsApp</span>
                    <span className={`badge ${form.whatsapp.trim() ? 'bg-neo-green' : 'bg-neo-muted'}`}>
                      {form.whatsapp.trim() ? 'Added' : 'Required'}
                    </span>
                  </div>
                  <div className="border-t-4 border-black pt-4">
                    <div className="mb-2 flex items-center justify-between gap-3">
                      <span className="font-black text-sm uppercase tracking-wide">Courses selected</span>
                      <span className="badge-yellow">{form.courses.length}/50</span>
                    </div>
                    <div className="h-3 border-2 border-black bg-neo-bg" role="progressbar" aria-label="Selected course limit" aria-valuemin={0} aria-valuemax={50} aria-valuenow={Math.min(form.courses.length, 50)}>
                      <div className="h-full bg-neo-accent" style={{ width: `${Math.min(form.courses.length / 50, 1) * 100}%` }} />
                    </div>
                    {form.courses.length > 0 ? (
                      <p className="mt-2 break-words text-xs font-bold text-black/60">
                        {form.courses.slice(0, 6).join(' · ')}
                        {form.courses.length > 6 ? ` +${form.courses.length - 6} more` : ''}
                      </p>
                    ) : (
                      <p className="mt-2 text-xs font-bold text-black/60">Your selected courses will appear here.</p>
                    )}
                  </div>
                </div>
              </section>

              <section className="border-4 border-black bg-neo-secondary p-5 shadow-neo-sm">
                <div className="mb-3 flex items-center gap-3">
                  <span className="flex h-10 w-10 items-center justify-center border-4 border-black bg-white">
                    <CircleDollarSign className="h-5 w-5" strokeWidth={3} />
                  </span>
                  <h2 className="font-black text-sm uppercase tracking-widest">Price preview</h2>
                </div>
                <p className="mb-4 text-sm font-bold">Pricing is your choice; free consultations stay free.</p>
                {[30, 60, 90].map(min => (
                  <div key={min} className="flex items-center justify-between border-t-2 border-black py-2">
                    <span className="font-black text-sm uppercase">{min} minutes</span>
                    <span className="font-black">{calcPrice(min)}</span>
                  </div>
                ))}
              </section>

            </aside>
          </div>
        </motion.div>
      </div>
    </PageLayout>
  )
}
