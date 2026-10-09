import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, query, orderBy, onSnapshot,
  updateDoc, doc, writeBatch, serverTimestamp, where,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useSweeper } from '../hooks/useSweeper'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import Button from '../components/ui/Button'
import { Bell, CheckCheck, BookOpen, Zap, X, Star, AlertTriangle, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'

const ICON_MAP = {
  new_request:  <Zap        className="h-4 w-4" strokeWidth={3} />,
  accepted:     <CheckCheck className="h-4 w-4" strokeWidth={3} />,
  rejected:     <X          className="h-4 w-4" strokeWidth={3} />,
  cancelled:    <X          className="h-4 w-4" strokeWidth={3} />,
  completed:    <BookOpen   className="h-4 w-4" strokeWidth={3} />,
  new_review:   <Star       className="h-4 w-4" strokeWidth={3} />,
  reminder:     <Clock      className="h-4 w-4" strokeWidth={3} />,
}
const COLOR_MAP = {
  new_request:  'bg-neo-secondary',
  accepted:     'bg-neo-green',
  rejected:     'bg-neo-accent text-white',
  cancelled:    'bg-neo-accent text-white',
  completed:    'bg-neo-muted',
  new_review:   'bg-neo-secondary',
  reminder:     'bg-white',
}

export default function Notifications() {
  useSweeper()
  const { firebaseUser } = useAuth()
  const [notifs, setNotifs]   = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!firebaseUser) return
    const q = query(
      collection(db, 'notifications', firebaseUser.uid, 'items'),
      orderBy('createdAt', 'desc'),
    )
    const unsub = onSnapshot(q, snap => {
      setNotifs(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return unsub
  }, [firebaseUser])

  const markRead = async (id) => {
    await updateDoc(doc(db, 'notifications', firebaseUser.uid, 'items', id), { read: true })
  }

  const markAllRead = async () => {
    const batch = writeBatch(db)
    notifs.filter(n => !n.read).forEach(n => {
      batch.update(doc(db, 'notifications', firebaseUser.uid, 'items', n.id), { read: true })
    })
    await batch.commit()
  }

  const unread = notifs.filter(n => !n.read).length

  return (
    <PageLayout>
      <EmailVerificationBanner />
      <div className="border-b-4 border-black bg-neo-muted">
        <div className="page-container py-8 flex items-end justify-between gap-4">
          <div>
            <h1 className="font-black text-4xl uppercase tracking-tight flex items-center gap-3">
              <Bell className="h-8 w-8" strokeWidth={3} />
              Notifications
            </h1>
            {unread > 0 && (
              <p className="font-bold text-sm mt-1">{unread} unread</p>
            )}
          </div>
          {unread > 0 && (
            <Button variant="outline" size="sm" onClick={markAllRead}>
              Mark all read
            </Button>
          )}
        </div>
      </div>

      <div className="page-container py-8 max-w-2xl">
        {loading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="card h-16 animate-pulse bg-neo-bg" />)}
          </div>
        ) : notifs.length === 0 ? (
          <div className="card p-12 text-center shadow-neo-md">
            <Bell className="h-12 w-12 mx-auto mb-4 opacity-30" strokeWidth={2} />
            <p className="font-black text-2xl uppercase">No Notifications</p>
            <p className="font-bold text-sm text-black/50 mt-2">You're all caught up!</p>
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {notifs.map(n => (
                <motion.div
                  key={n.id}
                  layout
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`card p-4 shadow-neo-sm flex items-start gap-3 cursor-pointer transition-opacity ${n.read ? 'opacity-60' : ''}`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 border-3 border-black flex items-center justify-center ${COLOR_MAP[n.type] || 'bg-white'}`}>
                    {ICON_MAP[n.type] || <Bell className="h-4 w-4" strokeWidth={3} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm leading-snug">{n.message}</p>
                    <p className="font-bold text-xs text-black/50 mt-0.5">
                      {n.createdAt?.toDate ? formatDistanceToNow(n.createdAt.toDate(), { addSuffix: true }) : ''}
                    </p>
                  </div>
                  {!n.read && (
                    <div className="flex-shrink-0 w-2.5 h-2.5 bg-neo-accent border-2 border-black rounded-full mt-1" />
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}
      </div>
    </PageLayout>
  )
}
