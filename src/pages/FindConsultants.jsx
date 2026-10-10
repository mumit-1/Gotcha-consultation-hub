import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/useAuth'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import CourseSelector from '../components/courses/CourseSelector'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { AvailabilityBadge } from '../components/ui/Badge'
import AnimatedSection from '../components/ui/AnimatedSection'
import { Star, Search, X, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { computeDhakaAvailabilityStatus } from '../lib/dhakaTime'
import { getCachedData } from '../lib/dataCache'
import { bracuDepartments } from '../constants/departments'
import ConsultantTierBadge from '../components/ui/ConsultantTierBadge'

const PAGE_SIZE = 12

function ConsultantCard({ c, currentUid }) {
  const rating = c.ratingCount > 0 ? (c.ratingSum / c.ratingCount).toFixed(1) : null
  const isFree = !c.price30min || c.price30min === 0
  const isOwnProfile = currentUid === c.uid

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '12px 12px 0px 0px #000' }}
      transition={{ duration: 0.15 }}
      className="card flex h-full min-h-[20rem] flex-col"
      style={{ boxShadow: '8px 8px 0px 0px #000' }}
    >
      {/* Header */}
      <div className="flex min-h-[6.5rem] items-center gap-3 border-b-4 border-black bg-neo-bg p-4">
        <Avatar src={c.photoURL} name={c.name} size="lg" className="h-16 w-16 shrink-0" />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-black text-base uppercase" title={c.name}>{c.name}</h3>
          <div className="mt-1 whitespace-nowrap">
            <AvailabilityBadge status={c.computedStatus} />
          </div>
        </div>
        <div className={`badge shrink-0 whitespace-nowrap text-sm font-black ${isFree ? 'badge-green' : 'badge-yellow'}`}>
          {isFree ? 'FREE' : `${c.price30min}+`}
        </div>
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col gap-3 p-4">
        <p className="min-h-10 break-words font-bold text-sm leading-5 text-black/70 line-clamp-2">
          {c.bio || ''}
        </p>

        {/* Courses */}
        <div className="flex h-8 min-w-0 flex-nowrap items-start gap-1 overflow-hidden" aria-label="Courses offered">
          {(c.courses || []).slice(0, 3).map(code => (
            <span key={code} className="badge badge-muted shrink-0 whitespace-nowrap text-[10px]">{code}</span>
          ))}
          {(c.courses?.length || 0) > 3 && (
            <span className="badge badge-black shrink-0 whitespace-nowrap text-[10px]">+{c.courses.length - 3} more</span>
          )}
        </div>
      </div>

      {/* Ratings, completed sessions, and actions stay anchored at the bottom. */}
      <div className="mt-auto border-t-4 border-black p-3">
        <div className="flex min-h-8 min-w-0 items-center gap-2 border-b-2 border-black/10 pb-2">
          {rating ? (
            <div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
              <Star className="h-4 w-4 shrink-0 fill-neo-secondary" strokeWidth={0} />
              <span className="font-black text-sm">{rating}</span>
              <span className="font-bold text-xs text-black/50">({c.ratingCount})</span>
            </div>
          ) : (
            <span className="truncate font-bold text-xs uppercase text-black/40">No reviews yet</span>
          )}
          <span className="ml-auto shrink-0 whitespace-nowrap font-bold text-xs text-black/50">
            {c.completedCount || 0} sessions
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 py-2">
          <ConsultantTierBadge completedCount={c.completedCount || 0} />
          {c.department && <span className="badge badge-muted text-[10px]">{c.department}</span>}
        </div>
        <div className="flex gap-2 pt-3">
          <Link
            to={`/consultant/${c.uid}`}
            className="btn btn-outline btn-sm flex h-10 min-w-0 flex-1 items-center justify-center whitespace-nowrap text-center"
          >
            View Profile
          </Link>
          {!isOwnProfile && (
            <Link
              to={`/book/${c.uid}`}
              className="btn btn-primary btn-sm flex h-10 min-w-0 flex-1 items-center justify-center whitespace-nowrap text-center"
            >
              Book <ChevronRight className="h-3 w-3 shrink-0" strokeWidth={3} />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  )
}

function ConsultantCardSkeleton() {
  return (
    <div aria-hidden="true" className="card flex h-full min-h-[20rem] animate-pulse flex-col">
      <div className="flex min-h-[6.5rem] items-center gap-3 border-b-4 border-black bg-neo-bg p-4">
        <div className="h-16 w-16 shrink-0 border-4 border-black bg-neo-muted" />
        <div className="min-w-0 flex-1 space-y-2">
          <div className="h-4 w-3/4 border-2 border-black bg-neo-bg" />
          <div className="h-6 w-24 border-3 border-black bg-neo-green" />
        </div>
        <div className="h-8 w-16 shrink-0 border-3 border-black bg-neo-secondary" />
      </div>
      <div className="flex flex-1 flex-col gap-3 p-4">
        <div className="min-h-10 space-y-2 pt-1">
          <div className="h-3 w-full bg-black/10" />
          <div className="h-3 w-2/3 bg-black/10" />
        </div>
        <div className="flex h-8 gap-1 overflow-hidden">
          <div className="h-6 w-16 border-3 border-black bg-neo-muted" />
          <div className="h-6 w-16 border-3 border-black bg-neo-muted" />
          <div className="h-6 w-16 border-3 border-black bg-neo-muted" />
          <div className="h-6 w-12 border-3 border-black bg-black" />
        </div>
      </div>
      <div className="mt-auto border-t-4 border-black p-3">
        <div className="flex h-8 items-center justify-between border-b-2 border-black/10 pb-2">
          <div className="h-4 w-24 bg-black/10" />
          <div className="h-4 w-20 bg-black/10" />
        </div>
        <div className="flex gap-2 pt-3">
          <div className="h-10 flex-1 border-4 border-black bg-white" />
          <div className="h-10 flex-1 border-4 border-black bg-neo-accent" />
        </div>
      </div>
    </div>
  )
}

export default function FindConsultants() {
  const { firebaseUser } = useAuth()
  const [filters, setFilters] = useState({
    courses: [], nameSearch: '', sortBy: 'rating', availability: 'all', department: '',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [consultants, setConsultants] = useState([])
  const [lastDoc, setLastDoc]         = useState(null)
  const [hasMore, setHasMore]         = useState(false)
  const [loadedFilterKey, setLoadedFilterKey] = useState('')
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)
  const currentFilterKey = `${filters.courses.join(',')}:${filters.department}:${filters.sortBy}:${filters.availability}:${filters.nameSearch.trim().toLowerCase()}`
  const loading = loadedFilterKey !== currentFilterKey

  const buildQuery = useCallback((afterDoc = null) => {
    let q = collection(db, 'consultants')
    const constraints = []

    if (filters.courses.length === 1) {
      constraints.push(where('courses', 'array-contains', filters.courses[0]))
    } else if (filters.courses.length > 1) {
      // array-contains-any max 30
      const chunk = filters.courses.slice(0, 30)
      constraints.push(where('courses', 'array-contains-any', chunk))
    }
    if (filters.department) constraints.push(where('department', '==', filters.department))

    if (filters.sortBy === 'rating') {
      constraints.push(orderBy('ratingSum', 'desc'))
    } else if (filters.sortBy === 'price_asc') {
      constraints.push(orderBy('price30min', 'asc'))
    }

    constraints.push(limit(PAGE_SIZE + 1))
    if (afterDoc) constraints.push(startAfter(afterDoc))

    return query(q, ...constraints)
  }, [filters.courses, filters.department, filters.sortBy])

  const fetchConsultants = useCallback(async (afterDoc = null) => {
    const q = buildQuery(afterDoc)
    const pageKey = `consultants:find:${filters.courses.join(',')}:${filters.department}:${filters.sortBy}:${afterDoc?.id || 'first'}`
    const snap = await getCachedData(pageKey, 60_000, () => getDocs(q))
    let docs = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Client-side name filter
      if (filters.nameSearch.trim()) {
        const search = filters.nameSearch.trim().toLowerCase()
        docs = docs.filter(c => c.name?.toLowerCase().includes(search))
      }

      // Compute availability status in browser
      const now = Date.now()
      docs = docs.map(c => ({
        ...c,
        computedStatus: computeDhakaAvailabilityStatus(c, now),
      }))

      // Filter by availability
      if (filters.availability !== 'all') {
        docs = docs.filter(c => c.computedStatus === filters.availability)
      }

    const hasNextPage = snap.docs.length > PAGE_SIZE
    const results = docs.slice(0, PAGE_SIZE)

    return { results, lastSnap: snap.docs[PAGE_SIZE - 1] ?? null, hasMore: hasNextPage }
  }, [
    buildQuery, filters.courses, filters.department, filters.sortBy,
    filters.nameSearch, filters.availability,
  ])

  useEffect(() => {
    let active = true
    fetchConsultants()
      .then(({ results, lastSnap, hasMore }) => {
        if (!active) return
        setConsultants(results)
        setLastDoc(lastSnap)
        setHasMore(hasMore)
        setError(null)
        setLoadedFilterKey(currentFilterKey)
      })
      .catch(err => {
        if (!active) return
        setError(err.message)
        setLoadedFilterKey(currentFilterKey)
      })
    return () => { active = false }
  }, [fetchConsultants, currentFilterKey])

  const loadMore = async () => {
    if (!lastDoc || loadingMore) return
    setLoadingMore(true)
    try {
      const { results, lastSnap, hasMore: more } = await fetchConsultants(lastDoc)
      setConsultants(prev => [...prev, ...results])
      setLastDoc(lastSnap)
      setHasMore(more)
    } finally {
      setLoadingMore(false)
    }
  }

  const clearFilters = () => setFilters({ courses: [], nameSearch: '', sortBy: 'rating', availability: 'all', department: '' })
  const hasActiveFilters = filters.courses.length > 0 || filters.nameSearch || filters.availability !== 'all' || filters.department

  return (
    <PageLayout>
      <EmailVerificationBanner />

      {/* Page header */}
      <div className="border-b-4 border-black bg-neo-secondary">
        <div className="page-container py-10">
          <AnimatedSection>
            <h1 className="font-black text-5xl uppercase tracking-tighter leading-none mb-2">
              Find a Consultant
            </h1>
            <p className="font-bold text-black/70">Browse free consultants by course code, availability, and rating.</p>
          </AnimatedSection>
        </div>
      </div>

      <div className="page-container py-8">
        {/* Search + filter toggle */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5" strokeWidth={3} />
            <input
              type="text"
              value={filters.nameSearch}
              onChange={e => setFilters(f => ({ ...f, nameSearch: e.target.value }))}
              placeholder="Search by name…"
              className="input pl-12"
            />
          </div>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`btn btn-outline flex items-center gap-2 ${showFilters ? 'bg-neo-secondary shadow-none translate-x-[3px] translate-y-[3px]' : ''}`}
          >
            <SlidersHorizontal className="h-4 w-4" strokeWidth={3} />
            Filters {hasActiveFilters && <span className="badge-accent badge text-[10px] py-0">!</span>}
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="btn btn-outline flex items-center gap-1">
              <X className="h-4 w-4" strokeWidth={3} /> Clear
            </button>
          )}
        </div>

        {/* Filter panel */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              <div className="card p-6 shadow-neo-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                  <div className="relative md:col-span-1">
                    <CourseSelector
                      selected={filters.courses}
                      onChange={codes => setFilters(f => ({ ...f, courses: codes }))}
                      label="Filter by courses"
                      placeholder="Any course…"
                    />
                  </div>
                  <div>
                    <label className="label">Department</label>
                    <select
                      className="select"
                      value={filters.department}
                      onChange={e => setFilters(f => ({ ...f, department: e.target.value }))}
                    >
                      <option value="">All departments</option>
                      {bracuDepartments.map(department => (
                        <option key={department} value={department}>{department}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Availability</label>
                    <select
                      className="select"
                      value={filters.availability}
                      onChange={e => setFilters(f => ({ ...f, availability: e.target.value }))}
                    >
                      <option value="all">All</option>
                      <option value="available">Available Now</option>
                      <option value="busy">Busy</option>
                      <option value="offline">Offline</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Sort By</label>
                    <select
                      className="select"
                      value={filters.sortBy}
                      onChange={e => setFilters(f => ({ ...f, sortBy: e.target.value }))}
                    >
                      <option value="rating">Top Rated</option>
                      <option value="price_asc">Price: Low to High</option>
                    </select>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        {loading ? (
          <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: PAGE_SIZE }).map((_, i) => (
              <ConsultantCardSkeleton key={i} />
            ))}
          </div>
        ) : error ? (
          <div className="card p-8 shadow-neo-md text-center">
            <p className="font-black text-neo-accent uppercase mb-4">{error}</p>
            <Button onClick={() => window.location.reload()} variant="outline">Retry</Button>
          </div>
        ) : consultants.length === 0 ? (
          <div className="card p-12 shadow-neo-md text-center">
            <p className="font-black text-3xl uppercase mb-4">No Results</p>
            <p className="font-bold text-black/60 mb-6">Try different filters or clear your search.</p>
            <Button onClick={clearFilters} variant="secondary">Clear Filters</Button>
          </div>
        ) : (
          <>
            <p className="font-black text-xs uppercase tracking-widest text-black/50 mb-4">
              {consultants.length} consultant{consultants.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid auto-rows-fr grid-cols-1 items-stretch gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {consultants.map((c, i) => (
                <AnimatedSection key={c.id} delay={i * 0.04} once className="h-full min-w-0">
                  <ConsultantCard c={c} currentUid={firebaseUser?.uid} />
                </AnimatedSection>
              ))}
            </div>

            {hasMore && (
              <div className="text-center mt-8">
                <Button onClick={loadMore} loading={loadingMore} variant="secondary" className="btn-lg">
                  Load More
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </PageLayout>
  )
}
