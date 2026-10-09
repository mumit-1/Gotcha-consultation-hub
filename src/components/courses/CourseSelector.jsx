import { useState, useMemo, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, X, ChevronDown } from 'lucide-react'
import COURSES from '../../data/courses'

/**
 * CourseSelector — Reusable searchable multi-select (or single-select) for courses.
 *
 * Props:
 *   selected:   string[]    – currently selected codes
 *   onChange:   fn(codes)   – called with new array
 *   single:     bool        – single-select mode (for booking form)
 *   placeholder: string
 *   maxVisible: number      – max chips shown before "+N more"
 */
export default function CourseSelector({
  selected = [],
  onChange,
  options = COURSES,
  single = false,
  placeholder = 'Search courses (e.g. CSE221)…',
  maxVisible = 5,
  label,
  error,
}) {
  const [query, setQuery]   = useState('')
  const [open, setOpen]     = useState(false)
  const containerRef        = useRef(null)

  // Filter courses by query
  const filtered = useMemo(() => {
    const q = query.trim().toUpperCase()
    if (!q) return options.slice(0, 80) // show first 80 when no query
    return options.filter(c => c.toUpperCase().includes(q)).slice(0, 60)
  }, [options, query])

  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false)
        setQuery('')
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggle = (code) => {
    if (single) {
      onChange([code])
      setOpen(false)
      setQuery('')
      return
    }
    if (selected.includes(code)) {
      onChange(selected.filter(c => c !== code))
    } else {
      onChange([...selected, code])
    }
  }

  const remove = (code, e) => {
    e.stopPropagation()
    onChange(selected.filter(c => c !== code))
  }

  const visibleChips = selected.slice(0, maxVisible)
  const hiddenCount  = selected.length - maxVisible

  return (
    <div className="w-full" ref={containerRef}>
      {label && <label className="label">{label}</label>}

      {/* Trigger */}
      <div
        role="combobox"
        aria-expanded={open}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setOpen(o => !o)}
        onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') setOpen(o => !o) }}
        className={`
          min-h-14 border-4 bg-white px-3 py-2 cursor-pointer
          flex flex-wrap items-center gap-2 transition-all duration-100
          ${error   ? 'border-neo-accent' : 'border-black'}
          ${open    ? 'bg-neo-secondary shadow-neo-sm' : 'hover:bg-neo-bg'}
        `}
      >
        {/* Selected chips */}
        {visibleChips.map(code => (
          <motion.span
            key={code}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.8, opacity: 0 }}
            className="flex items-center gap-1 bg-neo-muted border-3 border-black px-2 py-0.5 font-black text-xs uppercase tracking-wide"
          >
            {code}
            {!single && (
              <button
                type="button"
                onClick={e => remove(code, e)}
                className="hover:text-neo-accent transition-colors"
                aria-label={`Remove ${code}`}
              >
                <X className="h-3 w-3" strokeWidth={3} />
              </button>
            )}
          </motion.span>
        ))}
        {hiddenCount > 0 && (
          <span className="badge-black badge text-[10px]">+{hiddenCount} more</span>
        )}

        {/* Placeholder */}
        {selected.length === 0 && (
          <span className="font-bold text-black/40 text-sm select-none flex-1">
            {placeholder}
          </span>
        )}

        <ChevronDown
          className={`ml-auto h-5 w-5 transition-transform duration-150 flex-shrink-0 ${open ? 'rotate-180' : ''}`}
          strokeWidth={3}
        />
      </div>

      {/* Dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.12 }}
            className="absolute z-50 w-full mt-1 bg-white border-4 border-black shadow-neo-lg"
            style={{ maxWidth: 'inherit' }}
          >
            {/* Search input */}
            <div className="flex items-center gap-2 border-b-4 border-black px-3 py-2">
              <Search className="h-4 w-4 flex-shrink-0" strokeWidth={3} />
              <input
                autoFocus
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder="Type to search..."
                className="flex-1 bg-transparent font-bold text-sm outline-none placeholder:text-black/40"
                onClick={e => e.stopPropagation()}
              />
              {query && (
                <button type="button" onClick={() => setQuery('')} aria-label="Clear search">
                  <X className="h-4 w-4" strokeWidth={3} />
                </button>
              )}
            </div>

            {/* Options */}
            <div className="max-h-56 overflow-y-auto" role="listbox">
              {filtered.length === 0 ? (
                <p className="px-4 py-3 font-bold text-sm text-black/50 uppercase">No courses found</p>
              ) : (
                filtered.map(code => {
                  const isSelected = selected.includes(code)
                  return (
                    <button
                      key={code}
                      type="button"
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => toggle(code)}
                      className={`
                        w-full text-left px-4 py-2 font-bold text-sm uppercase tracking-wide
                        flex items-center justify-between transition-colors duration-75
                        ${isSelected
                          ? 'bg-neo-muted border-b-2 border-black/10'
                          : 'hover:bg-neo-secondary border-b-2 border-black/10'
                        }
                      `}
                    >
                      {code}
                      {isSelected && <span className="text-xs font-black">✓</span>}
                    </button>
                  )
                })
              )}
            </div>

            {/* Footer count */}
            {!single && selected.length > 0 && (
              <div className="border-t-4 border-black px-4 py-2 bg-neo-bg flex items-center justify-between">
                <span className="font-black text-xs uppercase tracking-widest">
                  {selected.length} selected
                </span>
                <button
                  type="button"
                  onClick={() => onChange([])}
                  className="font-black text-xs uppercase text-neo-accent hover:underline"
                >
                  Clear all
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <p className="mt-1 text-xs font-black text-neo-accent uppercase tracking-wide">{error}</p>
      )}
    </div>
  )
}
