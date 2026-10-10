export function getBadge(completedCount = 0) {
  const count = Math.max(0, Number(completedCount) || 0)
  if (count >= 30) return { name: 'GOAT', color: 'bg-neo-accent text-white' }
  if (count >= 25) return { name: 'Built Different', color: 'bg-cyan-300' }
  if (count >= 20) return { name: 'Legend', color: 'bg-orange-300' }
  if (count >= 15) return { name: 'OG', color: 'bg-pink-300' }
  if (count >= 10) return { name: 'Certified', color: 'bg-purple-300' }
  if (count >= 4) return { name: 'Locked In', color: 'bg-yellow-300' }
  if (count >= 2) return { name: 'Confident', color: 'bg-green-300' }
  if (count === 1) return { name: 'Rookie', color: 'bg-blue-300' }
  return { name: 'NPC', color: 'bg-gray-200' }
}
