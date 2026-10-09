export default function Spinner({ size = 'md', className = '' }) {
  const sizes = { sm: 'w-4 h-4 border-2', md: 'w-8 h-8 border-4', lg: 'w-12 h-12 border-4' }
  return (
    <span
      className={`inline-block ${sizes[size] || sizes.md} border-black border-t-transparent rounded-full animate-spin ${className}`}
      role="status"
      aria-label="Loading"
    />
  )
}

export function PageSpinner() {
  return (
    <div className="min-h-screen bg-neo-bg flex items-center justify-center">
      <div className="text-center">
        <div className="inline-block w-16 h-16 border-8 border-black border-t-neo-accent rounded-full animate-spin mb-4" />
        <p className="font-black uppercase tracking-widest text-sm">Loading...</p>
      </div>
    </div>
  )
}
