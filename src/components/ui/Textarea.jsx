import { forwardRef } from 'react'

const Textarea = forwardRef(function Textarea(
  { label, error, className = '', rows = 4, ...props },
  ref
) {
  return (
    <div className="w-full">
      {label && <label className="label">{label}</label>}
      <textarea
        ref={ref}
        rows={rows}
        className={`textarea ${error ? 'border-neo-accent' : ''} ${className}`}
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

export default Textarea
