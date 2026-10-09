import { forwardRef } from 'react'

/**
 * Neo-brutalist Input
 * Turns yellow on focus (neo-brutalism pattern).
 */
const Input = forwardRef(function Input(
  { label, error, className = '', ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <input
        ref={ref}
        className={`input ${error ? 'border-neo-accent' : ''} ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-xs font-black text-neo-accent uppercase tracking-wide">
          {error}
        </p>
      )}
    </div>
  )
})

export default Input
