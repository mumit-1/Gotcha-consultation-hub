import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { signInWithEmailAndPassword, signOut } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth } from '../../lib/firebase'
import { db } from '../../lib/firebase'
import PageLayout from '../../components/layout/PageLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { ArrowRight, Eye, EyeOff } from 'lucide-react'
import toast from 'react-hot-toast'

export default function Login() {
  const [form, setForm]       = useState({ email: '', password: '' })
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw]   = useState(false)
  const navigate              = useNavigate()
  const location              = useLocation()
  const from                  = location.state?.from?.pathname || '/dashboard'

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.email || !form.password) return
    setLoading(true)
    try {
      const credential = await signInWithEmailAndPassword(auth, form.email.trim(), form.password)
      const userSnap = await getDoc(doc(db, 'users', credential.user.uid))
      if (!userSnap.exists()) {
        await signOut(auth)
        toast.error('No account found. Please sign up.')
        return
      }
      navigate(from, { replace: true })
    } catch (err) {
      const msg = {
        'auth/user-not-found':  'No account with that email.',
        'auth/wrong-password':  'Incorrect password.',
        'auth/invalid-credential': 'Invalid email or password.',
        'auth/too-many-requests': 'Too many attempts. Try again later.',
      }[err.code] || err.message
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <PageLayout noFooter>
      <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="card shadow-neo-xl"
          >
            <div className="bg-neo-accent border-b-4 border-black px-8 py-6">
              <Link to="/" className="inline-flex items-center justify-center w-12 h-12 bg-white border-4 border-black shadow-neo-sm font-black text-neo-accent text-2xl mb-4 hover:shadow-none hover:translate-x-1 hover:translate-y-1 transition-all duration-100">
                G.
              </Link>
              <h1 className="font-black text-2xl uppercase tracking-tight text-white">Welcome Back</h1>
              <p className="font-bold text-sm text-white/70 mt-1">Log in to book or consult.</p>
            </div>

            <form onSubmit={handleSubmit} className="px-8 py-6 space-y-4">
              <Input
                label="Email Address"
                type="email"
                placeholder="you@university.edu"
                value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                autoComplete="email"
              />
              <div className="relative">
                <Input
                  label="Password"
                  type={showPw ? 'text' : 'password'}
                  placeholder="Your password"
                  value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  autoComplete="current-password"
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

              <div className="flex justify-end">
                <Link to="/reset-password" className="font-black text-xs uppercase tracking-wide hover:text-neo-accent transition-colors">
                  Forgot password?
                </Link>
              </div>

              <Button type="submit" variant="primary" full loading={loading}>
                Log In <ArrowRight className="h-4 w-4" strokeWidth={3} />
              </Button>

              <p className="text-center font-bold text-sm text-black/60">
                New here?{' '}
                <Link to="/register" className="font-black underline hover:text-neo-accent transition-colors">
                  Create a free account
                </Link>
              </p>
            </form>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  )
}
