import { motion } from 'framer-motion'
import { AlertTriangle, RefreshCw } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '../../contexts/AuthContext'
import toast from 'react-hot-toast'

export default function EmailVerificationBanner() {
  const { firebaseUser, resendVerification } = useAuth()
  const [sending, setSending] = useState(false)

  if (!firebaseUser || firebaseUser.emailVerified) return null

  const handleResend = async () => {
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
            Please verify your email to book sessions or become a consultant.
          </p>
        </div>
        <button
          onClick={handleResend}
          disabled={sending}
          className="flex items-center gap-2 btn btn-black btn-sm flex-shrink-0"
        >
          <RefreshCw className={`h-4 w-4 ${sending ? 'animate-spin' : ''}`} strokeWidth={3} />
          {sending ? 'Sending…' : 'Resend Email'}
        </button>
      </div>
    </motion.div>
  )
}
