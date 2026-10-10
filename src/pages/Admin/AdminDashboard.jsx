import { useState, useEffect, useCallback } from 'react'
import {
  collection, query, orderBy, limit, getDocs, getCountFromServer, where, getDoc,
  updateDoc, doc, serverTimestamp, startAfter, setDoc, documentId,
} from 'firebase/firestore'
import { db } from '../../lib/firebase'
import ConsultantTierBadge from '../../components/ui/ConsultantTierBadge'
import PageLayout from '../../components/layout/PageLayout'
import { StatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import AnimatedSection from '../../components/ui/AnimatedSection'
import {
  Users, BookOpen, Flag, Shield, Settings,
  CheckCircle, XCircle,
} from 'lucide-react'
import toast from 'react-hot-toast'
import COURSES from '../../data/courses'
import Modal from '../../components/ui/Modal'
import {
  DEFAULT_EMAIL_LIMIT, EMAIL_COUNTER_KEYS, EMAIL_COUNTER_LABELS,
  getEmailLimitSettings, getEmailUsagePeriod, invalidateEmailLimitCache,
} from '../../lib/emailUsage'

const PAGE_SIZE = 20
const EMPTY_EMAIL_USAGE = Object.fromEntries(EMAIL_COUNTER_KEYS.map(key => [key, 0]))

async function readEmailUsage(emailLimit) {
  const period = getEmailUsagePeriod(new Date(), emailLimit.resetDay)
  const [currentSnapshot, historySnapshot] = await Promise.all([
    getDoc(doc(db, 'emailUsage', period.key)),
    getDocs(query(
      collection(db, 'emailUsage'),
      orderBy(documentId(), 'desc'),
      limit(7),
    )),
  ])
  return {
    period,
    usage: {
      ...EMPTY_EMAIL_USAGE,
      ...(currentSnapshot.exists() ? currentSnapshot.data() : {}),
      count: currentSnapshot.data()?.count || 0,
    },
    history: historySnapshot.docs
      .filter(item => item.id !== period.key)
      .slice(0, 6)
      .map(item => ({ id: item.id, ...EMPTY_EMAIL_USAGE, ...item.data() })),
  }
}

function EmailUsageCard() {
  const [settings, setSettings] = useState(DEFAULT_EMAIL_LIMIT)
  const [period, setPeriod] = useState(null)
  const [usage, setUsage] = useState({ ...EMPTY_EMAIL_USAGE, count: 0 })
  const [history, setHistory] = useState([])
  const [monthlyLimitInput, setMonthlyLimitInput] = useState(String(DEFAULT_EMAIL_LIMIT.monthlyLimit))
  const [resetDayInput, setResetDayInput] = useState(String(DEFAULT_EMAIL_LIMIT.resetDay))
  const [adjustInput, setAdjustInput] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showResetConfirm, setShowResetConfirm] = useState(false)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const emailLimit = await getEmailLimitSettings({ force: true })
        if (!active) return
        setSettings(emailLimit)
        setMonthlyLimitInput(String(emailLimit.monthlyLimit))
        setResetDayInput(String(emailLimit.resetDay))
        const usageData = await readEmailUsage(emailLimit)
        if (!active) return
        setPeriod(usageData.period)
        setUsage(usageData.usage)
        setHistory(usageData.history)
      } catch (loadError) {
        console.error('[Admin] Could not load email usage', {
          code: loadError?.code || 'unknown',
          message: loadError?.message || String(loadError),
        })
        if (active) setError(loadError.message || 'Could not load email usage.')
      } finally {
        if (active) setLoading(false)
      }
    }
    load()
    return () => { active = false }
  }, [])

  const saveSettings = async (event) => {
    event.preventDefault()
    const monthlyLimit = Number(monthlyLimitInput)
    const resetDay = Number(resetDayInput)
    if (!Number.isInteger(monthlyLimit) || monthlyLimit < 1) {
      toast.error('Monthly email limit must be a whole number above zero.')
      return
    }
    if (!Number.isInteger(resetDay) || resetDay < 1 || resetDay > 31) {
      toast.error('Reset day must be a whole number from 1 to 31.')
      return
    }
    setSaving(true)
    try {
      await setDoc(doc(db, 'config', 'settings'), {
        emailLimit: { monthlyLimit, resetDay },
        updatedAt: serverTimestamp(),
      }, { merge: true })
      const nextSettings = { monthlyLimit, resetDay }
      invalidateEmailLimitCache()
      setSettings(nextSettings)
      const usageData = await readEmailUsage(nextSettings)
      setPeriod(usageData.period)
      setUsage(usageData.usage)
      setHistory(usageData.history)
      toast.success('Email limit settings saved.')
    } catch (saveError) {
      console.error('[Admin] Could not save email limit settings', {
        code: saveError?.code || 'unknown',
        message: saveError?.message || String(saveError),
      })
      toast.error(`Could not save email settings: ${saveError.message}`)
    } finally {
      setSaving(false)
    }
  }

  const adjustCount = async (event) => {
    event.preventDefault()
    const count = Number(adjustInput)
    if (!Number.isInteger(count) || count < 0) {
      toast.error('Enter a whole number zero or higher.')
      return
    }
    setSaving(true)
    try {
      await setDoc(doc(db, 'emailUsage', period.key), {
        count,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setUsage(current => ({ ...current, count }))
      setAdjustInput('')
      toast.success('Current email total adjusted.')
    } catch (adjustError) {
      console.error('[Admin] Could not adjust email usage count', {
        code: adjustError?.code || 'unknown',
        message: adjustError?.message || String(adjustError),
      })
      toast.error(`Could not adjust the count: ${adjustError.message}`)
    } finally {
      setSaving(false)
    }
  }

  const resetPeriod = async () => {
    setSaving(true)
    try {
      await setDoc(doc(db, 'emailUsage', period.key), {
        count: 0,
        ...Object.fromEntries(EMAIL_COUNTER_KEYS.map(key => [key, 0])),
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setUsage({ ...EMPTY_EMAIL_USAGE, count: 0 })
      setShowResetConfirm(false)
      toast.success('Email usage for this period was reset.')
    } catch (resetError) {
      console.error('[Admin] Could not reset email usage', {
        code: resetError?.code || 'unknown',
        message: resetError?.message || String(resetError),
      })
      toast.error(`Could not reset email usage: ${resetError.message}`)
    } finally {
      setSaving(false)
    }
  }

  const count = Number(usage.count) || 0
  const percent = settings.monthlyLimit > 0 ? (count / settings.monthlyLimit) * 100 : 0
  const remaining = Math.max(0, settings.monthlyLimit - count)
  const progressColor = percent < 70 ? 'bg-neo-green' : percent <= 90 ? 'bg-neo-secondary' : 'bg-neo-accent'

  return (
    <section className="card mb-8 p-5 shadow-neo-md sm:p-6">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3 border-b-4 border-black pb-4">
        <div>
          <h3 className="font-black text-xl uppercase">EmailJS usage</h3>
          <p className="mt-1 text-sm font-bold text-black/60">
            {period ? `${period.startDate} → ${period.nextResetDate}` : 'Loading period…'}
          </p>
        </div>
        <span className="badge badge-black">Current period</span>
      </div>

      {error && (
        <div role="alert" className="mb-4 border-4 border-black bg-neo-accent p-3 font-bold text-sm text-white">
          Could not load email usage: {error}
        </div>
      )}

      {!error && !loading && percent >= 95 && (
        <div role="status" className="mb-4 border-4 border-black bg-neo-accent p-3 font-black text-sm uppercase text-white">
          Email limit nearly reached or exceeded. Review usage in EmailJS.
        </div>
      )}
      {!error && !loading && percent >= 80 && percent < 95 && (
        <div role="status" className="mb-4 border-4 border-black bg-neo-secondary p-3 font-black text-sm uppercase">
          Email usage has reached 80% of the configured monthly limit.
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="border-4 border-black bg-neo-bg p-4 md:col-span-2">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-black text-3xl">{loading ? '—' : `${count} / ${settings.monthlyLimit}`}</p>
            <p className="font-black text-sm uppercase">{loading ? '' : `${remaining} remaining`}</p>
          </div>
          <div
            className="mt-3 h-5 border-4 border-black bg-white"
            role="progressbar"
            aria-label="Email quota used"
            aria-valuemin={0}
            aria-valuemax={settings.monthlyLimit}
            aria-valuenow={count}
          >
            <div className={`h-full ${progressColor}`} style={{ width: `${Math.min(percent, 100)}%` }} />
          </div>
          <p className="mt-2 font-black text-xs uppercase">{loading ? '' : `${percent.toFixed(1)}% used`}</p>
        </div>
        <div className="border-4 border-black bg-neo-secondary p-4">
          <p className="font-black text-xs uppercase tracking-widest">Limit</p>
          <p className="mt-2 font-black text-3xl">{settings.monthlyLimit}</p>
          <p className="mt-1 text-sm font-bold">emails per cycle</p>
          <p className="mt-3 border-t-2 border-black pt-2 text-xs font-black uppercase">
            Reset day: {settings.resetDay}
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="border-4 border-black p-4">
          <h4 className="mb-3 font-black text-sm uppercase tracking-widest">Current period breakdown</h4>
          <div className="space-y-2">
            {EMAIL_COUNTER_KEYS.map(key => (
              <div key={key} className="flex items-start justify-between gap-4 border-t-2 border-black/10 pt-2 text-sm">
                <span className="font-bold">{EMAIL_COUNTER_LABELS[key]}</span>
                <span className="shrink-0 font-black">{loading ? '—' : usage[key] || 0}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="border-4 border-black p-4">
          <h4 className="mb-3 font-black text-sm uppercase tracking-widest">Recent periods</h4>
          {loading ? <p className="text-sm font-bold">Loading history…</p>
            : history.length === 0 ? <p className="text-sm font-bold text-black/60">No previous period totals yet.</p>
              : (
                <ul className="space-y-2">
                  {history.map(item => (
                    <li key={item.id} className="flex items-center justify-between gap-4 border-t-2 border-black/10 pt-2">
                      <span className="font-black">{item.id}</span>
                      <span className="font-black">{item.count || 0} emails</span>
                    </li>
                  ))}
                </ul>
              )}
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-2">
        <form onSubmit={saveSettings} className="space-y-3 border-4 border-black bg-neo-bg p-4">
          <h4 className="font-black text-sm uppercase tracking-widest">Cycle settings</h4>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Input
              label="Monthly limit"
              type="number"
              min={1}
              step={1}
              value={monthlyLimitInput}
              onChange={event => setMonthlyLimitInput(event.target.value)}
              required
            />
            <Input
              label="Reset day (1–31)"
              type="number"
              min={1}
              max={31}
              step={1}
              value={resetDayInput}
              onChange={event => setResetDayInput(event.target.value)}
              required
            />
          </div>
          <Button type="submit" variant="secondary" loading={saving} disabled={loading}>Save email settings</Button>
        </form>

        <div className="space-y-4 border-4 border-black p-4">
          <form onSubmit={adjustCount} className="space-y-3">
            <h4 className="font-black text-sm uppercase tracking-widest">Adjust total</h4>
            <p className="text-xs font-bold text-black/60">Set the total to match the EmailJS dashboard. Type breakdowns remain unchanged.</p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Input
                label="Actual emails used"
                type="number"
                min={0}
                step={1}
                value={adjustInput}
                onChange={event => setAdjustInput(event.target.value)}
                required
              />
              <Button type="submit" variant="outline" loading={saving} disabled={loading || !period} className="sm:mt-6">Adjust count</Button>
            </div>
          </form>
          <div className="border-t-4 border-black pt-4">
            <Button variant="danger" loading={saving} disabled={loading || !period} onClick={() => setShowResetConfirm(true)}>
              Reset this period
            </Button>
          </div>
        </div>
      </div>

      <p className="mt-5 border-2 border-black bg-neo-bg p-3 text-xs font-bold">
        This is an estimate counted by Gotcha. Check the EmailJS dashboard for the exact number.
      </p>
      <p className="mt-3 text-xs font-bold text-black/60">
        Tracking only: the global pre-send quota guard is disabled because usage documents are admin-readable only.
      </p>

      <Modal open={showResetConfirm} onClose={() => setShowResetConfirm(false)} title="Reset this email period?">
        <p className="font-bold">
          This sets the current period total and every type counter to zero. It does not change the monthly limit or reset day.
        </p>
        <div className="mt-6 flex flex-wrap justify-end gap-3">
          <Button variant="outline" disabled={saving} onClick={() => setShowResetConfirm(false)}>Keep counts</Button>
          <Button variant="danger" loading={saving} onClick={resetPeriod}>Reset counts</Button>
        </div>
      </Modal>
    </section>
  )
}

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
  const [counts, setCounts] = useState(null)
  const [countsError, setCountsError] = useState('')
  const [loading, setLoading] = useState(true)
  const [lastDoc, setLastDoc] = useState(null)
  const [cursorStack, setCursorStack] = useState([])
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [selectedUser, setSelectedUser] = useState(null)
  const [userDetails, setUserDetails] = useState(null)
  const [detailsLoading, setDetailsLoading] = useState(false)

  const loadUsers = useCallback(async (cursor = null, reset = false) => {
    setLoading(true)
    try {
      const constraints = []
      const term = search.trim()
      if (statusFilter) constraints.push(where('status', '==', statusFilter))
      if (term.includes('@')) {
        constraints.push(where('email', '==', term))
        constraints.push(limit(PAGE_SIZE + 1))
      } else if (term) {
        constraints.push(
          where('name', '>=', term),
          where('name', '<=', `${term}\uf8ff`),
          orderBy('name', 'asc'),
          limit(PAGE_SIZE + 1),
        )
      } else {
        constraints.push(orderBy('createdAt', 'desc'), limit(PAGE_SIZE + 1))
      }
      if (cursor) constraints.push(startAfter(cursor))
      const snap = await getDocs(query(collection(db, 'users'), ...constraints))
      setUsers(snap.docs.slice(0, PAGE_SIZE).map(item => ({ id: item.id, ...item.data() })))
      setLastDoc(snap.docs.length > PAGE_SIZE ? snap.docs[PAGE_SIZE - 1] : null)
      if (reset) setCursorStack([])
    } catch (error) {
      toast.error(`Could not load users: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [search, statusFilter])

  useEffect(() => {
    void Promise.resolve().then(() => loadUsers(null, true))
  }, [loadUsers])

  useEffect(() => {
    let active = true
    Promise.all([
      getCountFromServer(collection(db, 'users')),
      getCountFromServer(collection(db, 'consultants')),
    ]).then(([userCount, consultantCount]) => {
      if (active) {
        setCounts({
          users: userCount.data().count,
          consultants: consultantCount.data().count,
        })
      }
    }).catch(error => {
      console.error('[Admin] Could not load aggregate user counts', {
        code: error?.code || 'unknown',
        message: error?.message || String(error),
      })
      if (active) setCountsError(error.message || 'Could not load aggregate counts.')
    })
    return () => { active = false }
  }, [])

  const nextPage = async () => {
    if (!lastDoc) return
    setCursorStack(stack => [...stack, lastDoc])
    await loadUsers(lastDoc)
  }

  const previousPage = async () => {
    if (cursorStack.length < 2) {
      setCursorStack([])
      await loadUsers(null)
      return
    }
    const priorCursor = cursorStack[cursorStack.length - 2]
    setCursorStack(stack => stack.slice(0, -1))
    await loadUsers(priorCursor)
  }

  const openUserDetails = async (user) => {
    setSelectedUser(user)
    setUserDetails(null)
    setDetailsLoading(true)
    try {
      const [consultantSnap, clientBookings, consultantBookings, reports, clientReviews, consultantReviews] = await Promise.all([
        getDoc(doc(db, 'consultants', user.id)),
        getDocs(query(collection(db, 'bookings'), where('clientId', '==', user.id), orderBy('createdAt', 'desc'), limit(20))),
        getDocs(query(collection(db, 'bookings'), where('consultantId', '==', user.id), orderBy('createdAt', 'desc'), limit(20))),
        getDocs(query(collection(db, 'reports'), where('targetId', '==', user.id), orderBy('createdAt', 'desc'), limit(20))),
        getDocs(query(collection(db, 'reviews'), where('clientId', '==', user.id), limit(20))),
        getDocs(query(collection(db, 'reviews'), where('consultantId', '==', user.id), limit(20))),
      ])
      setUserDetails({
        consultant: consultantSnap.exists() ? consultantSnap.data() : null,
        bookings: [...new Map([
          ...clientBookings.docs.map(item => ({ id: item.id, ...item.data() })),
          ...consultantBookings.docs.map(item => ({ id: item.id, ...item.data() })),
        ].map(item => [item.id, item])).values()],
        reports: reports.docs.map(item => ({ id: item.id, ...item.data() })),
        reviews: [...new Map([
          ...clientReviews.docs.map(item => ({ id: item.id, ...item.data() })),
          ...consultantReviews.docs.map(item => ({ id: item.id, ...item.data() })),
        ].map(item => [item.id, item])).values()],
      })
    } catch (error) {
      toast.error(`Could not load user details: ${error.message}`)
    } finally {
      setDetailsLoading(false)
    }
  }

  const setStatus = async (uid, status) => {
    await updateDoc(doc(db, 'users', uid), { status, updatedAt: serverTimestamp() })
    setUsers(prev => prev.map(u => u.id === uid ? { ...u, status } : u))
    toast.success(`User ${status}`)
  }

  return (
    <div>
      <h2 className="font-black text-xl uppercase mb-4">Users</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <div className="card bg-neo-secondary p-4 shadow-neo-sm">
          <p className="text-xs font-black uppercase tracking-widest">Registered users</p>
          <p className="mt-1 font-black text-3xl">{counts?.users?.toLocaleString() ?? '—'}</p>
        </div>
        <div className="card bg-neo-muted p-4 shadow-neo-sm">
          <p className="text-xs font-black uppercase tracking-widest">Consultants</p>
          <p className="mt-1 font-black text-3xl">{counts?.consultants?.toLocaleString() ?? '—'}</p>
        </div>
      </div>
      {countsError && (
        <p role="alert" className="mb-4 border-4 border-black bg-neo-accent p-3 text-sm font-bold text-white">
          Could not load totals: {countsError}
        </p>
      )}
      <div className="mb-4 grid gap-3 sm:grid-cols-2">
        <Input label="Search by name prefix or exact email" value={search} onChange={event => {
          setCursorStack([])
          setSearch(event.target.value)
        }} />
        <div>
          <label className="label">Status</label>
          <select className="select" value={statusFilter} onChange={event => {
            setCursorStack([])
            setStatusFilter(event.target.value)
          }}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>
        </div>
      </div>
      {loading ? <p className="font-bold animate-pulse">Loading…</p> : (
        <div className="space-y-2">
          {users.filter(u => !statusFilter || u.status === statusFilter).map(u => (
            <div key={u.id} className="card p-4 shadow-neo-sm flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <button className="flex-1 min-w-0 text-left" onClick={() => openUserDetails(u)}>
                <p className="font-black text-sm uppercase truncate">{u.name}</p>
                <p className="font-bold text-xs text-black/60 truncate">{u.email}</p>
                <div className="flex gap-2 mt-1">
                  <span className={`badge text-[10px] ${u.status === 'active' ? 'badge-green' : 'badge-accent'}`}>{u.status}</span>
                  {u.isConsultant && <span className="badge badge-muted text-[10px]">Consultant</span>}
              </div>
              </button>
              <div className="flex gap-2 flex-wrap">
                {u.status !== 'active'     && <Button size="sm" variant="primary"  onClick={() => setStatus(u.id, 'active')}>Unblock</Button>}
                {u.status !== 'suspended'  && <Button size="sm" variant="outline"  onClick={() => setStatus(u.id, 'suspended')}>Suspend</Button>}
                {u.status !== 'banned'     && <Button size="sm" variant="danger"   onClick={() => setStatus(u.id, 'banned')}>Ban</Button>}
              </div>
            </div>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-between">
        <Button variant="outline" disabled={!cursorStack.length || loading} onClick={previousPage}>Previous</Button>
        <Button variant="outline" disabled={!lastDoc || loading} onClick={nextPage}>Next</Button>
      </div>
      <Modal open={Boolean(selectedUser)} onClose={() => setSelectedUser(null)} title="User details" maxWidth="max-w-4xl">
        {detailsLoading || !userDetails ? <p className="font-bold">Loading user details…</p> : (
          <div className="max-h-[70vh] space-y-5 overflow-y-auto">
            <section className="grid gap-2 border-4 border-black bg-neo-bg p-4 sm:grid-cols-2">
              <p><strong>Name:</strong> {selectedUser.name || 'Deleted user'}</p>
              <p><strong>Email:</strong> {selectedUser.email || '—'}</p>
              <p><strong>Photo:</strong> {selectedUser.photoURL
                ? <a className="underline" href={selectedUser.photoURL} target="_blank" rel="noreferrer">Open photo</a>
                : '—'}</p>
              <p><strong>Department:</strong> {selectedUser.department || '—'}</p>
              <p><strong>Timezone:</strong> {selectedUser.timezone || '—'}</p>
              <p><strong>Status:</strong> {selectedUser.status}</p>
              <p><strong>Consultant:</strong> {selectedUser.isConsultant ? 'Yes' : 'No'}</p>
              <p><strong>Created:</strong> {selectedUser.createdAt?.toDate?.().toLocaleString() || '—'}</p>
              <p><strong>Blocked users:</strong> {(selectedUser.blockedUsers || []).join(', ') || 'None'}</p>
              <p className="sm:col-span-2"><strong>Bio:</strong> {selectedUser.bio || '—'}</p>
            </section>
            {userDetails.consultant && (
              <section className="border-4 border-black p-4">
                <h3 className="mb-2 font-black uppercase">Consultant profile</h3>
                <p>Courses: {userDetails.consultant.courses?.join(', ') || '—'}</p>
                <p>Skills: {userDetails.consultant.skills || '—'}</p>
                <p>Experience: {userDetails.consultant.experience || '—'}</p>
                <p>Prices: {userDetails.consultant.price30min} / {userDetails.consultant.priceExtra30min}</p>
                <p>Rating: {userDetails.consultant.ratingSum || 0} / {userDetails.consultant.ratingCount || 0}</p>
                <p className="flex items-center gap-2">Completed: {userDetails.consultant.completedCount || 0}<ConsultantTierBadge completedCount={userDetails.consultant.completedCount || 0} /></p>
                <p>Availability: {JSON.stringify(userDetails.consultant.availability || {})}</p>
              </section>
            )}
            <section>
              <h3 className="mb-2 font-black uppercase">Recent bookings</h3>
              {userDetails.bookings.map(booking => (
                <p key={booking.id} className="border-t-2 border-black/10 py-2 text-sm font-bold">
                  {booking.clientName || 'Deleted user'} → {booking.consultantName || 'Deleted user'} · {booking.course} · {booking.status}
                  {' · '}{booking.startUtc?.toDate?.().toLocaleString() || '—'} · {booking.durationMin || '—'} min
                </p>
              ))}
            </section>
            <section>
              <h3 className="mb-2 font-black uppercase">Reports against user</h3>
              {userDetails.reports.map(report => <p key={report.id} className="border-t-2 border-black/10 py-2 text-sm">{report.type}: {report.description}</p>)}
            </section>
            <section>
              <h3 className="mb-2 font-black uppercase">Reviews</h3>
              {userDetails.reviews.map(review => <p key={review.id} className="border-t-2 border-black/10 py-2 text-sm">{review.consultantReview?.review || review.clientReview?.review || 'Rating only'}</p>)}
            </section>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Reports panel ────────────────────────────────────────────
function ReportsPanel() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  useEffect(() => {
    getDocs(query(collection(db, 'reports'), where('status', '==', 'pending'), orderBy('createdAt', 'desc'), limit(50)))
      .then(snap => {
        setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      })
      .catch(error => {
        console.error('[Admin] Could not load reports', {
          code: error?.code || 'unknown',
          message: error?.message || String(error),
        })
        setLoadError(error.message || 'Could not load reports.')
      })
      .finally(() => setLoading(false))
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
        : loadError ? (
          <div role="alert" className="card border-neo-accent bg-neo-secondary p-4 shadow-neo-sm">
            <p className="font-black text-sm uppercase">Could not load reports</p>
            <p className="mt-2 break-words text-sm font-bold">{loadError}</p>
            {loadError.includes('index') && (
              <p className="mt-2 text-sm font-bold">
                Deploy the Firestore indexes from <code>firestore.indexes.json</code>, then refresh this page.
              </p>
            )}
          </div>
        )
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
  const [lastDoc, setLastDoc] = useState(null)
  const [cursorStack, setCursorStack] = useState([])
  const [statusFilter, setStatusFilter] = useState('')
  const [userSearch, setUserSearch] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')
  const [sortOrder, setSortOrder] = useState('newest')
  const [selectedBooking, setSelectedBooking] = useState(null)

  const loadBookings = useCallback(async (cursor = null) => {
    setLoading(true)
    try {
      const constraints = []
      if (statusFilter) constraints.push(where('status', '==', statusFilter))
      constraints.push(orderBy('createdAt', 'desc'), limit(PAGE_SIZE + 1))
      if (cursor) constraints.push(startAfter(cursor))
      const snap = await getDocs(query(collection(db, 'bookings'), ...constraints))
      const pageDocs = snap.docs.slice(0, PAGE_SIZE)
      const missingUserIds = [...new Set(pageDocs.flatMap(item => {
        const booking = item.data()
        return [
          ...(!booking.clientEmail ? [booking.clientId] : []),
          ...(!booking.consultantEmail ? [booking.consultantId] : []),
        ]
      }))]
      const userChunks = []
      for (let index = 0; index < missingUserIds.length; index += 30) {
        userChunks.push(missingUserIds.slice(index, index + 30))
      }
      const userSnapshots = await Promise.all(userChunks.map(ids => getDocs(query(
        collection(db, 'users'),
        where(documentId(), 'in', ids),
      ))))
      const userById = new Map(userSnapshots.flatMap(page => page.docs.map(item => [item.id, item.data()])))
      setBookings(pageDocs.map(item => {
        const booking = item.data()
        const client = userById.get(booking.clientId)
        const consultant = userById.get(booking.consultantId)
        return {
          id: item.id,
          ...booking,
          clientName: booking.clientName || client?.name || 'Deleted user',
          clientEmail: booking.clientEmail || client?.email || '—',
          consultantName: booking.consultantName || consultant?.name || 'Deleted user',
          consultantEmail: booking.consultantEmail || consultant?.email || '—',
        }
      }))
      setLastDoc(snap.docs.length > PAGE_SIZE ? snap.docs[PAGE_SIZE - 1] : null)
    } catch (error) {
      toast.error(`Could not load bookings: ${error.message}`)
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    void Promise.resolve().then(() => loadBookings())
  }, [loadBookings])

  return (
    <div>
      <h2 className="font-black text-xl uppercase mb-4">Bookings</h2>
      <div className="mb-4 grid gap-3 sm:grid-cols-4">
        <div>
          <label className="label">Status</label>
          <select className="select" value={statusFilter} onChange={event => {
            setCursorStack([])
            setStatusFilter(event.target.value)
          }}>
            <option value="">All statuses</option>
            {['PENDING', 'ACCEPTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'REJECTED'].map(status => <option key={status}>{status}</option>)}
          </select>
        </div>
        <Input label="From date" type="date" value={startDate} onChange={event => setStartDate(event.target.value)} />
        <Input label="To date" type="date" value={endDate} onChange={event => setEndDate(event.target.value)} />
        <Input label="Search user on this page" value={userSearch} onChange={event => setUserSearch(event.target.value)} />
        <div>
          <label className="label">Sort this page</label>
          <select className="select" value={sortOrder} onChange={event => setSortOrder(event.target.value)}>
            <option value="newest">Newest start first</option>
            <option value="oldest">Oldest start first</option>
          </select>
        </div>
      </div>
      {loading ? <p className="font-bold animate-pulse">Loading…</p> : (
        <div className="space-y-2">
          {bookings.filter(b => {
            const date = b.startUtc?.toDate?.()
            if (startDate && date && date < new Date(`${startDate}T00:00:00`)) return false
            if (endDate && date && date > new Date(`${endDate}T23:59:59`)) return false
            return `${b.clientName || ''} ${b.clientEmail || ''} ${b.consultantName || ''} ${b.consultantEmail || ''}`.toLowerCase().includes(userSearch.trim().toLowerCase())
          }).sort((a, b) => {
            const direction = sortOrder === 'oldest' ? 1 : -1
            return direction * ((a.startUtc?.toMillis?.() || 0) - (b.startUtc?.toMillis?.() || 0))
          }).map(b => (
            <button key={b.id} onClick={() => setSelectedBooking(b)} className="card flex w-full flex-col items-start gap-3 p-4 text-left shadow-neo-sm sm:flex-row sm:items-center">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="badge badge-muted text-[10px]">{b.course}</span>
                  <StatusBadge status={b.status} />
                </div>
                <p className="font-bold text-xs text-black/60 truncate">
                  From: {b.clientName || 'Deleted user'} · {b.clientEmail || '—'}<br />
                  To: {b.consultantName || 'Deleted user'} · {b.consultantEmail || '—'}
                </p>
                <p className="font-bold text-xs text-black/60">
                  {b.startUtc ? b.startUtc.toDate().toLocaleString() : '—'} · {b.durationMin} min
                </p>
              </div>
              <span className="font-black text-xs">{b.price === 0 ? 'FREE' : b.price}</span>
            </button>
          ))}
        </div>
      )}
      <div className="mt-4 flex justify-between">
        <Button variant="outline" disabled={!cursorStack.length || loading} onClick={async () => {
          if (cursorStack.length <= 1) {
            setCursorStack([])
            await loadBookings()
          } else {
            const cursor = cursorStack[cursorStack.length - 2]
            setCursorStack(stack => stack.slice(0, -1))
            await loadBookings(cursor)
          }
        }}>Previous</Button>
        <Button variant="outline" disabled={!lastDoc || loading} onClick={async () => {
          setCursorStack(stack => [...stack, lastDoc])
          await loadBookings(lastDoc)
        }}>Next</Button>
      </div>
      <Modal open={Boolean(selectedBooking)} onClose={() => setSelectedBooking(null)} title="Booking details">
        {selectedBooking && (
          <div className="space-y-2 font-bold">
            <p>From: {selectedBooking.clientName || 'Deleted user'} · {selectedBooking.clientEmail || '—'}</p>
            <p>To: {selectedBooking.consultantName || 'Deleted user'} · {selectedBooking.consultantEmail || '—'}</p>
            <p>Course: {selectedBooking.course}</p>
            <p>Topic: {selectedBooking.topic}</p>
            <p>Start: {selectedBooking.startUtc ? selectedBooking.startUtc.toDate().toLocaleString() : '—'}</p>
            <p>End: {selectedBooking.endUtc ? selectedBooking.endUtc.toDate().toLocaleString() : '—'}</p>
            <p>Duration: {selectedBooking.durationMin} minutes</p>
            <p>Status: {selectedBooking.status}</p>
            <p>Cancelled by: {selectedBooking.cancelledBy || '—'}</p>
            <p>Cancellation reason: {selectedBooking.cancelReason || '—'}</p>
          </div>
        )}
      </Modal>
    </div>
  )
}

// ── Settings panel ───────────────────────────────────────────
function SettingsPanel() {
  const [seeding, setSeeding] = useState(false)
  const [courseCheck, setCourseCheck] = useState(null)

  const seedCourses = async () => {
    setSeeding(true)
    try {
      const ref = doc(db, 'config', 'courses')
      const snap = await getDoc(ref)
      const currentCodes = snap.exists() && Array.isArray(snap.data().codes)
        ? snap.data().codes
        : []
      const currentSet = new Set(currentCodes)
      const missing = COURSES.filter(code => !currentSet.has(code))
      const extra = currentCodes.filter(code => !COURSES.includes(code))
      await setDoc(ref, { codes: COURSES, updatedAt: serverTimestamp() }, { merge: true })
      const seededSnap = await getDoc(ref)
      const savedCodes = seededSnap.data()?.codes
      const savedSet = new Set(Array.isArray(savedCodes) ? savedCodes : [])
      const missingAfterSeed = COURSES.filter(code => !savedSet.has(code))
      const extraAfterSeed = [...savedSet].filter(code => !COURSES.includes(code))
      if (missingAfterSeed.length || extraAfterSeed.length) {
        throw new Error('The saved course list did not exactly match the app catalog.')
      }
      setCourseCheck({
        total: COURSES.length,
        missingBeforeSeed: missing.length,
        extraBeforeSeed: extra.length,
        verified: true,
      })
      toast.success(`Seeded ${COURSES.length} course codes to config/courses.`)
    } catch (error) {
      console.error('[Firestore] seed course catalog failed', {
        code: error?.code || 'unknown',
        message: error?.message || String(error),
        step: 'seed config/courses',
      })
      toast.error(`Could not seed courses: ${error.message}`)
    } finally {
      setSeeding(false)
    }
  }

  return (
    <div>
      <h2 className="font-black text-xl uppercase mb-4">Platform Settings</h2>
      <EmailUsageCard />
      <div className="card p-6 shadow-neo-md">
        <p className="font-bold text-sm text-black/60">
          Settings are stored in <code className="bg-neo-bg px-1 border border-black">config/settings</code> in Firestore.
          Edit directly in the Firebase console for now, or extend this panel.
        </p>
        <div className="mt-6 border-t-4 border-black pt-5">
          <h3 className="font-black text-sm uppercase tracking-wide mb-2">Course Catalog</h3>
          <p className="font-bold text-sm text-black/60 mb-4">
            Compare the saved <code>config/courses.codes</code> array against the {COURSES.length} codes in the app catalog, then replace it with the central catalog.
          </p>
          <Button variant="secondary" loading={seeding} onClick={seedCourses}>
            Seed {COURSES.length} Courses
          </Button>
          {courseCheck && (
            <p className="mt-3 font-bold text-xs">
              Seeded and verified against the local catalog. Before seeding, {courseCheck.missingBeforeSeed} codes were missing and {courseCheck.extraBeforeSeed} extra codes were present.
            </p>
          )}
        </div>
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
