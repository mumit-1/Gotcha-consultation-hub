import { getBadge } from '../../lib/consultantBadges'

export default function ConsultantTierBadge({ completedCount = 0, className = '' }) {
  const badge = getBadge(completedCount)
  return (
    <span className={`inline-flex border-4 border-black px-2 py-1 text-[10px] font-black uppercase tracking-wide shadow-neo-sm ${badge.color} ${className}`}>
      {badge.name}
    </span>
  )
}
