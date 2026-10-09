/**
 * Avatar — shows photo or initials fallback in neo-brutalist style
 * size: 'sm' | 'md' | 'lg' | 'xl'
 */
export default function Avatar({ src, name = '?', size = 'md', className = '' }) {
  const sizes = {
    sm:  'w-8 h-8 text-xs',
    md:  'w-12 h-12 text-sm',
    lg:  'w-16 h-16 text-base',
    xl:  'w-24 h-24 text-xl',
    '2xl': 'w-32 h-32 text-2xl',
  }

  const initials = name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(n => n[0].toUpperCase())
    .join('')

  // Color based on first char code for variety
  const colors = [
    'bg-neo-accent text-white',
    'bg-neo-secondary text-black',
    'bg-neo-muted text-black',
    'bg-neo-green text-black',
  ]
  const colorIdx = name.charCodeAt(0) % colors.length
  const colorClass = colors[colorIdx]

  if (src) {
    return (
      <img
        src={src}
        alt={name}
        className={`border-4 border-black object-cover flex-shrink-0 ${sizes[size] || sizes.md} ${className}`}
      />
    )
  }

  return (
    <div
      className={`border-4 border-black flex-shrink-0 flex items-center justify-center font-black ${colorClass} ${sizes[size] || sizes.md} ${className}`}
      aria-label={name}
    >
      {initials || '?'}
    </div>
  )
}
