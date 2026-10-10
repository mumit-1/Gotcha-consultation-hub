import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw, Check } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/useAuth'
import toast from 'react-hot-toast'

export default function EmailVerificationBanner() {
  const { firebaseUser, resendVerification, resendCooldown, refreshVerification } = useAuth()
  const [sending, setSending] = useState(false)
  const [checking, setChecking] = useState(false)

  if (!firebaseUser || firebaseUser.emailVerified) return null

  const handleResend = async () => {
    if (resendCooldown > 0) return
    setSending(true)
    try {
      await resendVerification()
      toast.success('Verification email sent! Check your inbox.')
    } catch {
      toast.error('Could not send email. Please wait a minute and try again.')
    } finally {
      setSending(false)
    }
  }

  const handleVerified = async () => {
    setChecking(true)
    try {
      if (await refreshVerification()) toast.success('Email verified. You are all set!')
      else toast.error('Your email is not verified yet. Check your inbox and spam folder.')
    } catch (error) {
      toast.error(`Could not refresh verification status: ${error.message}`)
    } finally {
      setChecking(false)
    }
  }

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-neo-secondary border-b-4 border-black"
    >
      <div className="page-container py-3 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-5 w-5 flex-shrink-0" strokeWidth={3} />
          <p className="font-bold text-sm uppercase tracking-wide">
            Your email is not verified. Check your spam folder to book sessions or become a consultant.
          </p>
        </div>
        <button
          onClick={handleResend}
          disabled={sending || resendCooldown > 0}
          className="flex items-center gap-2 btn btn-black btn-sm flex-shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${sending ? 'animate-spin' : ''}`} strokeWidth={3} />
          {sending ? 'Sending…' : resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend Email'}
        </button>
        <button
          onClick={handleVerified}
          disabled={checking}
          className="flex items-center gap-2 btn btn-outline btn-sm flex-shrink-0"
        >
          <Check className="h-4 w-4" strokeWidth={3} />
          {checking ? 'Checking…' : "I've verified"}
        </button>
      </div>
    </motion.div>
  )
}
