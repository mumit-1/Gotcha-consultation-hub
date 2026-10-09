import { forwardRef } from 'react'
import { ChevronDown } from 'lucide-react'

const Select = forwardRef(function Select(
  { label, error, children, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <div className="relative">
        <select
          ref={ref}
          className={`select ${error ? 'border-neo-accent' : ''} pr-10 ${className}`}
          {...props}
        >
          {children}
        </select>
        <ChevronDown
          className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5"
          strokeWidth={3}
        />
      </div>
      {error && (
        <p className="mt-1 text-xs font-black text-neo-accent uppercase tracking-wide">
          {error}
        </p>
      )}
    </div>
  )
})

export default Select
