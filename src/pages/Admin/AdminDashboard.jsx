import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  collection, query, orderBy, limit, getDocs, where,
  updateDoc, doc, serverTimestamp, startAfter,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import PageLayout from '../../components/layout/PageLayout'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import AnimatedSection from '../../components/ui/AnimatedSection'
import {
  Users, BookOpen, Flag, Shield, Settings,
  ChevronRight, CheckCircle, XCircle, AlertTriangle,
} from 'lucide-react'
import toast from 'react-hot-toast'

const PAGE_SIZE = 20

function AdminNav({ active, onChange }) {
  const tabs = [
    { id: 'users',     label: 'Users',    icon: <Users    className="h-4 w-4" strokeWidth={3} /> },
    { id: 'bookings',  label: 'Bookings', icon: <BookOpen className="h-4 w-4" strokeWidth={3} /> },
    { id: 'reports',   label: 'Reports',  icon: <Flag     className="h-4 w-4" strokeWidth={3} /> },
    { id: 'settings',  label: 'Settings', icon: <Settings className="h-4 w-4" strokeWidth={3} /> },
  ]
  return (
    <div className="flex gap-2 flex-wrap mb-8">
      {tabs.map(t => (
        <button
          key={t.id}
          onClick={() => onChange(t.id)}
          className={`btn btn-sm flex items-center gap-2 ${active === t.id ? 'btn-black' : 'btn-outline'}`}
        >
          {t.icon} {t.label}
        </button>
      ))}
    </div>
  )
}

// ── Users panel ─────────────────────────────────────────────
function UsersPanel() {
  const [users, setUsers]     = useState([])
  const [loading, setLoading] = useState(true)
  const [lastDoc, setLastDoc] = useState(null)

  useEffect(() => {
    getDocs(query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE + 1)))
      .then(snap => {
        setUsers(snap.docs.slice(0, PAGE_SIZE).map(d => ({ id: d.id, ...d.data() })))
        setLastDoc(snap.docs[PAGE_SIZE - 1] ?? null)
        setLoading(false)
      })
  }, [])

  const setStatus = async (uid, status) => {
    await updateDoc(doc(db, 'users', uid), { status, updatedAt: serverTimestamp() })
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, status } : u))
    toast.success(`User ${status}`)
  }

  return (
    <div>
      <h2 className="font-black text-xl uppercase mb-4">Users ({users.length}+)</h2>
      {loading ? <p className="font-bold animate-pulse">Loading…</p> : (
        <div className="space-y-2">
          {users.map(u => (
            <div key={u.id} className="card p-4 shadow-neo-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm uppercase truncate">{u.name}</p>
                <p className="font-bold text-xs text-black/60 truncate">{u.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`badge text-[10px] ${u.status === 'active' ? 'badge-green' : 'badge-accent'}`}>{u.status}</span>
                  {u.isConsultant && <span className="badge badge-muted text-[10px]">Consultant</span>}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                {u.status !== 'active'     && <Button size="sm" variant="primary"  onClick={() => setStatus(u.id, 'active')}>Unblock</Button>}
                {u.status !== 'suspended'  && <Button size="sm" variant="outline"  onClick={() => setStatus(u.id, 'suspended')}>Suspend</Button>}
                {u.status !== 'banned'     && <Button size="sm" variant="danger"   onClick={() => setStatus(u.id, 'banned')}>Ban</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Reports panel ────────────────────────────────────────────
function ReportsPanel() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(50)))
      .then(snap => {
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  const resolve = async (id, status) => {
    await updateDoc(doc(db, 'reports', id), { status, updatedAt: serverTimestamp() })
    setReports(prev => prev.filter(r => r.id !== id))
    toast.success(`Report ${status}`)
  }

  return (
    <div>
      <h2 className="font-black text-xl uppercase mb-4">Pending Reports ({reports.length})</h2>
      {loading ? <p className="font-bold animate-pulse">Loading…</p>
        : reports.length === 0 ? <p className="font-bold text-black/50">No pending reports.</p>
        : (
          <div className="space-y-3">
            {reports.map(r => (
              <div key={r.id} className="card p-4 shadow-neo-sm">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="badge badge-accent">{r.type}</span>
                  <span className="font-bold text-xs text-black/50">{r.targetId}</span>
                </div>
                <p className="font-bold text-sm mb-3">{r.description}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="primary"  onClick={() => resolve(r.id, 'resolved')}>
                    <CheckCircle className="h-3 w-3" strokeWidth={3} /> Resolve
                  </Button>
                  <Button size="sm" variant="outline"  onClick={() => resolve(r.id, 'dismissed')}>
                    <XCircle className="h-3 w-3" strokeWidth={3} /> Dismiss
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )
      }
    </div>
  )
}

// ── Bookings panel ───────────────────────────────────────────
function BookingsPanel() {
  const [bookings, setBookings] = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    getDocs(query(collection(db, 'bookings'), orderBy('createdAt', 'desc'), limit(PAGE_SIZE)))
      .then(snap => {
        setBookings(snap.docs.map(d => ({ id: d.id, ...d.data() })))
        setLoading(false)
      })
  }, [])

  return (
    <div>
      <h2 className="font-black text-xl uppercase mb-4">Recent Bookings</h2>
      {loading ? <p className="font-bold animate-pulse">Loading…</p> : (
        <div className="space-y-2">
          {bookings.map(b => (
            <div key={b.id} className="card p-4 shadow-neo-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-muted text-[10px]">{b.course}</span>
                  <StatusBadge status={b.status} />
                </div>
                <p className="font-bold text-xs text-black/60 truncate">
                  Client: {b.clientId?.slice(0,8)}… · Consultant: {b.consultantId?.slice(0,8)}…
                </p>
              </div>
              <span className="font-black text-xs">{b.price === 0 ? 'FREE' : b.price}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Settings panel ───────────────────────────────────────────
function SettingsPanel() {
  return (
    <div>
      <h2 className="font-black text-xl uppercase mb-4">Platform Settings</h2>
      <div className="card p-6 shadow-neo-md">
        <p className="font-bold text-sm text-black/60">
          Settings are stored in <code className="bg-neo-bg px-1 border border-black">config/settings</code> in Firestore.
          Edit directly in the Firebase console for now, or extend this panel.
        </p>
      </div>
    </div>
  )
}

// ── Main Admin Dashboard ─────────────────────────────────────
export default function AdminDashboard() {
  const [tab, setTab] = useState('users')

  return (
    <PageLayout>
      <div className="border-b-4 border-black bg-black text-white">
        <div className="page-container py-8 flex items-center gap-4">
          <Shield className="h-8 w-8" strokeWidth={3} />
          <div>
            <h1 className="font-black text-4xl uppercase tracking-tight">Admin Panel</h1>
            <p className="font-bold text-white/60 text-sm">Gotcha platform management</p>
          </div>
        </div>
      </div>

      <div className="page-container py-8">
        <AdminNav active={tab} onChange={setTab} />
        <AnimatedSection key={tab}>
          {tab === 'users'    && <UsersPanel />}
          {tab === 'bookings' && <BookingsPanel />}
          {tab === 'reports'  && <ReportsPanel />}
          {tab === 'settings' && <SettingsPanel />}
        </AnimatedSection>
      </div>
    </PageLayout>
  )
}
