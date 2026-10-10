import {
  doc, getDoc, increment, serverTimestamp, setDoc,
} from 'firebase/firestore'
import { db } from './firebase'
import { DHAKA_TIME_ZONE } from './dhakaTime'

export const DEFAULT_EMAIL_LIMIT = { monthlyLimit: 200, resetDay: 1 }

export const EMAIL_COUNTER_FIELDS = {
  request: 'sent_request',
  accepted: 'sent_accepted',
  rejected: 'sent_rejected',
  cancelled: 'sent_cancelled',
  autoCancelled: 'sent_autoCancelled',
  completed: 'sent_completed',
}

export const EMAIL_COUNTER_LABELS = {
  sent_request: 'New booking requests',
  sent_accepted: 'Accepted bookings',
  sent_rejected: 'Rejected bookings',
  sent_cancelled: 'Cancelled bookings',
  sent_autoCancelled: 'Automatic cancellations',
  sent_completed: 'Completion / review requests',
}

export const EMAIL_COUNTER_KEYS = Object.values(EMAIL_COUNTER_FIELDS)

let settingsCache = null
let settingsCacheUntil = 0

function validSetting(value, fallback, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : fallback
}

export function invalidateEmailLimitCache() {
  settingsCache = null
  settingsCacheUntil = 0
}

export async function getEmailLimitSettings({ force = false } = {}) {
  if (!force && settingsCache && Date.now() < settingsCacheUntil) return settingsCache

  const snapshot = await getDoc(doc(db, 'config', 'settings'))
  const saved = snapshot.data()?.emailLimit || {}
  settingsCache = {
    monthlyLimit: validSetting(saved.monthlyLimit, DEFAULT_EMAIL_LIMIT.monthlyLimit, 1, 1000000),
    resetDay: validSetting(saved.resetDay, DEFAULT_EMAIL_LIMIT.resetDay, 1, 31),
  }
  settingsCacheUntil = Date.now() + 60_000
  return settingsCache
}

function getDhakaDateParts(date) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIME_ZONE,
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
  }).formatToParts(date)
  return Object.fromEntries(parts.map(part => [part.type, Number(part.value)]))
}

function monthLength(year, month) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate()
}

function shiftMonth(year, month, amount) {
  const shifted = new Date(Date.UTC(year, month - 1 + amount, 1))
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth() + 1 }
}

function dateString(year, month, day) {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}

export function getEmailUsagePeriod(date = new Date(), resetDay = DEFAULT_EMAIL_LIMIT.resetDay) {
  const current = getDhakaDateParts(date)
  const currentResetDay = Math.min(resetDay, monthLength(current.year, current.month))
  const startsThisMonth = current.day >= currentResetDay
  const startMonth = startsThisMonth
    ? { year: current.year, month: current.month }
    : shiftMonth(current.year, current.month, -1)
  const nextMonth = shiftMonth(startMonth.year, startMonth.month, 1)
  const startDay = Math.min(resetDay, monthLength(startMonth.year, startMonth.month))
  const nextResetDay = Math.min(resetDay, monthLength(nextMonth.year, nextMonth.month))

  return {
    key: `${startMonth.year}-${String(startMonth.month).padStart(2, '0')}`,
    startDate: dateString(startMonth.year, startMonth.month, startDay),
    nextResetDate: dateString(nextMonth.year, nextMonth.month, nextResetDay),
  }
}

export async function recordSuccessfulEmail(type) {
  const field = EMAIL_COUNTER_FIELDS[type]
  if (!field) throw new Error(`Unknown email usage type: ${type}`)

  const settings = await getEmailLimitSettings()
  const period = getEmailUsagePeriod(new Date(), settings.resetDay)
  await setDoc(doc(db, 'emailUsage', period.key), {
    count: increment(1),
    [field]: increment(1),
    updatedAt: serverTimestamp(),
  }, { merge: true })
}
