import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { sendPasswordResetEmail } from 'firebase/auth'
import { auth } from '../../lib/firebase'
import PageLayout from '../../components/layout/PageLayout'
import Input from '../../components/ui/Input'
import Button from '../../components/ui/Button'
import { ArrowLeft, Mail } from 'lucide-react'
import toast from 'react-hot-toast'

export default function ResetPassword() {
  const [email, setEmail]   = useState('')
  const [loading, setLoading] = useState(false)
  const [sent, setSent]     = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email.includes('@')) { toast.error('Enter a valid email'); return }
    setLoading(true)
    try {
      await sendPasswordResetEmail(auth, email.trim())
      setSent(true)
    } catch (err) {
      toast.error(err.message)
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
            <div className="bg-neo-muted border-b-4 border-black px-8 py-6">
              <div className="w-12 h-12 bg-white border-4 border-black shadow-neo-sm font-black text-neo-accent text-2xl flex items-center justify-center mb-4">
                G.
              </div>
              <h1 className="font-black text-2xl uppercase tracking-tight">Reset Password</h1>
              <p className="font-bold text-sm text-black/60 mt-1">
                We'll send a reset link to your email.
              </p>
            </div>

            <div className="px-8 py-6">
              {sent ? (
                <motion.div
                  initial={{ scale: 0.95, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="text-center py-6"
                >
                  <div className="w-16 h-16 bg-neo-green border-4 border-black shadow-neo-sm mx-auto flex items-center justify-center mb-4">
                    <Mail className="h-8 w-8" strokeWidth={3} />
                  </div>
                  <h2 className="font-black text-xl uppercase mb-2">Check Your Email</h2>
                  <p className="font-bold text-sm text-black/60 mb-6">
                    Reset link sent to <strong className="text-black">{email}</strong>. Check your inbox (and spam).
                  </p>
                  <Link to="/login" className="btn btn-primary btn-full">
                    Back to Login
                  </Link>
                </motion.div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="you@university.edu"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  <Button type="submit" variant="primary" full loading={loading}>
                    Send Reset Link
                  </Button>
                  <Link to="/login" className="flex items-center justify-center gap-2 font-black text-xs uppercase tracking-wide hover:text-neo-accent transition-colors mt-4">
                    <ArrowLeft className="h-4 w-4" strokeWidth={3} /> Back to Login
                  </Link>
                </form>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </PageLayout>
  )
}
