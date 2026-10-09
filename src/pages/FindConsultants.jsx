import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, doc, getDoc,
} from 'firebase/firestore'
import { db } from '../lib/firebase'
import { useAuth } from '../contexts/AuthContext'
import PageLayout from '../components/layout/PageLayout'
import EmailVerificationBanner from '../components/auth/EmailVerificationBanner'
import CourseSelector from '../components/courses/CourseSelector'
import Avatar from '../components/ui/Avatar'
import Button from '../components/ui/Button'
import { AvailabilityBadge, StatusBadge } from '../components/ui/Badge'
import AnimatedSection from '../components/ui/AnimatedSection'
import { Star, Search, X, Filter, ChevronRight, SlidersHorizontal } from 'lucide-react'
import { Link } from 'react-router-dom'
import { computeDhakaAvailabilityStatus } from '../lib/dhakaTime'

const PAGE_SIZE = 12

function ConsultantCard({ c, currentUid }) {
  const rating = c.ratingCount > 0 ? (c.ratingSum / c.ratingCount).toFixed(1) : null
  const isFree = !c.price30min || c.price30min === 0
  const isOwnProfile = currentUid === c.uid

  return (
    <motion.div
      whileHover={{ y: -4, boxShadow: '12px 12px 0px 0px #000' }}
      transition={{ duration: 0.15 }}
      className="card flex flex-col"
      style={{ boxShadow: '8px 8px 0px 0px #000' }}
    >
      {/* Header */}
      <div className="border-b-4 border-black p-4 bg-neo-bg flex items-center gap-3">
        <Avatar src={c.photoURL} name={c.name} size="md" />
        <div className="min-w-0 flex-1">
          <h3 className="font-black text-base uppercase truncate">{c.name}</h3>
          <AvailabilityBadge status={c.computedStatus} />
        </div>
        <div className={`badge text-sm font-black ${isFree ? 'badge-green' : 'badge-yellow'}`}>
          {isFree ? 'FREE' : `${c.price30min}+`}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 flex-1 flex flex-col gap-3">
        {c.bio && (
          <p className="font-bold text-sm text-black/70 line-clamp-2 leading-relaxed">{c.bio}</p>
        )}

        {/* Courses */}
        {c.courses?.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {c.courses.slice(0, 5).map(code => (
              <span key={code} className="badge badge-muted text-[10px]">{code}</span>
            ))}
            {c.courses.length > 5 && (
              <span className="badge badge-black text-[10px]">+{c.courses.length - 5}</span>
            )}
          </div>
        )}

        {/* Rating + completed */}
        <div className="flex items-center gap-3 mt-auto pt-2 border-t-2 border-black/10">
          {rating ? (
            <div className="flex items-center gap-1">
              <Star className="h-4 w-4 fill-neo-secondary" strokeWidth={0} />
              <span className="font-black text-sm">{rating}</span>
              <span className="font-bold text-xs text-black/50">({c.ratingCount})</span>
            </div>
          ) : (
            <span className="font-bold text-xs text-black/40 uppercase">No reviews yet</span>
          )}
          {c.completedCount > 0 && (
            <span className="font-bold text-xs text-black/50 ml-auto">{c.completedCount} sessions</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="border-t-4 border-black p-3 flex gap-2">
        <Link
          to={`/consultant/${c.uid}`}
          className="btn btn-outline btn-sm flex-1 text-center"
        >
          View Profile
        </Link>
        {!isOwnProfile && (
          <Link
            to={`/book/${c.uid}`}
            className="btn btn-primary btn-sm flex-1 text-center"
          >
            Book <ChevronRight className="h-3 w-3" strokeWidth={3} />
          </Link>
        )}
      </div>
    </motion.div>
  )
}

export default function FindConsultants() {
  const { firebaseUser } = useAuth()
  const [filters, setFilters] = useState({
    courses: [], nameSearch: '', sortBy: 'rating', availability: 'all',
  })
  const [showFilters, setShowFilters] = useState(false)
  const [consultants, setConsultants] = useState([])
  const [lastDoc, setLastDoc]         = useState(null)
  const [hasMore, setHasMore]         = useState(false)
  const [loading, setLoading]         = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError]             = useState(null)

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

    if (filters.sortBy === 'rating') {
      constraints.push(orderBy('ratingSum', 'desc'))
    } else if (filters.sortBy === 'price_asc') {
      constraints.push(orderBy('price30min', 'asc'))
    }

    constraints.push(limit(PAGE_SIZE + 1))
    if (afterDoc) constraints.push(startAfter(afterDoc))

    return query(q, ...constraints)
  }, [filters.courses, filters.sortBy])

  const fetchConsultants = useCallback(async (afterDoc = null) => {
    try {
      const q = buildQuery(afterDoc)
      const snap = await getDocs(q)
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
    } catch (err) {
      throw err
    }
  }, [buildQuery, filters.nameSearch, filters.availability])

  useEffect(() => {
    setLoading(true)
    setLastDoc(null)
    fetchConsultants()
      .then(({ results, lastSnap, hasMore }) => {
        setConsultants(results)
        setLastDoc(lastSnap)
        setHasMore(hasMore)
        setError(null)
      })
      .catch(err => setError(err.message))
      .finally(() => setLoading(false))
  }, [fetchConsultants])

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

  const clearFilters = () => setFilters({ courses: [], nameSearch: '', sortBy: 'rating', availability: 'all' })
  const hasActiveFilters = filters.courses.length > 0 || filters.nameSearch || filters.availability !== 'all'

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
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="card p-6 shadow-neo-md mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="relative md:col-span-1">
                    <CourseSelector
                      selected={filters.courses}
                      onChange={codes => setFilters(f => ({ ...f, courses: codes }))}
                      label="Filter by courses"
                      placeholder="Any course…"
                    />
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card shadow-neo-md h-64 bg-neo-bg animate-pulse" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {consultants.map((c, i) => (
                <AnimatedSection key={c.id} delay={i * 0.04} once>
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
