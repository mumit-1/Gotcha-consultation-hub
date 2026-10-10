const entries = new Map()

export async function getCachedData(key, ttlMs, load) {
  const cached = entries.get(key)
  if (cached && cached.expiresAt > Date.now()) return cached.value

  const pending = Promise.resolve().then(load)
  entries.set(key, { value: pending, expiresAt: Date.now() + ttlMs })
  try {
    const value = await pending
    entries.set(key, { value, expiresAt: Date.now() + ttlMs })
    return value
  } catch (error) {
    if (entries.get(key)?.value === pending) entries.delete(key)
    throw error
  }
}

export function invalidateCachedData(prefix = '') {
  for (const key of entries.keys()) {
    if (!prefix || key.startsWith(prefix)) entries.delete(key)
  }
}
