/**
 * Neo-brutalist Badge
 * variant: 'accent' | 'yellow' | 'muted' | 'green' | 'black' | 'white'
 * pill: adds rounded-full
 */
export default function Badge({ variant = 'yellow', pill = false, rotate, children, className = '' }) {
  const variantClass = {
    accent:  'badge-accent',
    yellow:  'badge-yellow',
    muted:   'badge-muted',
    green:   'badge-green',
    black:   'badge-black',
    white:   'badge-white',
  }[variant] || 'badge-yellow'

  return (
    <span
      className={`
        ${variantClass}
        ${pill ? 'rounded-full' : ''}
        ${rotate ? `rotate-${rotate}` : ''}
        ${className}
      `.trim()}
    >
      {children}
    </span>
  )
}

/** Convenience: booking status → badge variant */
export function StatusBadge({ status }) {
  const map = {
    PENDING:     { variant: 'yellow',  label: 'Pending' },
    ACCEPTED:    { variant: 'green',   label: 'Accepted' },
    REJECTED:    { variant: 'accent',  label: 'Rejected' },
    CANCELLED:   { variant: 'white',   label: 'Cancelled' },
    IN_PROGRESS: { variant: 'muted',   label: 'In Progress' },
    COMPLETED:   { variant: 'black',   label: 'Completed' },
    NO_SHOW:     { variant: 'accent',  label: 'No-show' },
  }
  const { variant = 'white', label = status } = map[status] || {}
  return <Badge variant={variant}>{label}</Badge>
}

/** Consultant availability status badge */
export function AvailabilityBadge({ status }) {
  const map = {
    available: { cls: 'status-available', label: '● Available' },
    busy:      { cls: 'status-busy',      label: '● Busy' },
    offline:   { cls: 'status-offline',   label: '○ Offline' },
  }
  const { cls = 'status-offline', label = status } = map[status?.toLowerCase()] || {}
  return <span className={`badge ${cls}`}>{label}</span>
}
