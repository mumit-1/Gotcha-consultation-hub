import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { createUserWithEmailAndPassword, sendEmailVerification, updateProfile } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import PageLayout from '../../components/layout/PageLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

const UNIVERSITY_EMAIL_REGEX = /^[A-Z0-9._%+-]+@g\.bracu\.ac\.bd$/i

export default function Register() {
  const [form, setForm]       = useState({ name: '', email: '', password: '', confirm: '' })
  const [errors, setErrors]   = useState({})
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const navigate              = useNavigate()

  const validate = () => {
    const e = {}
    if (!form.name.trim())                         e.name     = 'Name is required'
    if (!UNIVERSITY_EMAIL_REGEX.test(form.email.trim())) {
      e.email = 'Use your university email ending in @g.bracu.ac.bd'
    }
    if (form.password.length < 8)                 e.password = 'At least 8 characters'
    if (form.password !== form.confirm)            e.confirm  = 'Passwords do not match'
    return e
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length) { setErrors(errs); return }
    setLoading(true)
    try {
      const cred = await createUserWithEmailAndPassword(auth, form.email.trim(), form.password)
      await updateProfile(cred.user, { displayName: form.name.trim() })
      await sendEmailVerification(cred.user)
      toast.success('Account created! Check your email to verify.')
      navigate('/dashboard')
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'This email is already registered.'
        : err.message
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout noFooter>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          {/* Card */}
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="card shadow-neo-xl"
          >
            {/* Header */}
            <div className="bg-neo-secondary border-b-4 border-black px-8 py-6">
              <Link to="/" className="inline-flex items-center justify-center w-12 h-12 bg-neo-accent border-4 border-black shadow-neo-sm font-black text-white text-2xl mb-4 hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-100">
                G.
              </Link>
              <h1 className="font-black text-2xl uppercase tracking-tight">Create Account</h1>
              <p className="font-bold text-sm text-black/60 mt-1">Free forever. No credit card needed.</p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
              <Input
                label="Full Name"
                placeholder="Your name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                error={errors.name}
                autoComplete="name"
              />
              <Input
                label="Email Address"
                type="email"
                placeholder="you@g.bracu.ac.bd"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                error={errors.email}
                autoComplete="email"
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="At least 8 characters"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  error={errors.password}
                  autoComplete="new-password"
                  className="pr-14"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  className="absolute right-4 top-[38px] p-1 hover:text-neo-accent transition-colors"
                  aria-label="Toggle password visibility"
                >
                  {showPw ? <EyeOff className="h-5 w-5" strokeWidth={3} /> : <Eye className="h-5 w-5" strokeWidth={3} />}
                </button>
              </div>
              <Input
                label="Confirm Password"
                type={showPw ? 'text' : 'password'}
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
                error={errors.confirm}
                autoComplete="new-password"
              />

              <Button type="submit" variant="primary" full loading={loading} className="mt-2">
                Create Account <ArrowRight className="h-4 w-4" strokeWidth={3} />
              </Button>

              <p className="text-center font-bold text-sm text-black/60">
                Already have an account?{' '}
                <Link to="/login" className="font-black underline hover:text-neo-accent transition-colors">
                  Log In
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  )
}
