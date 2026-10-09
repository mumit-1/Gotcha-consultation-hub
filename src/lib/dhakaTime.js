export const DHAKA_TIME_ZONE = 'Asia/Dhaka'

const DHAKA_OFFSET_MS = 6 * 60 * 60 * 1000

export function formatDhaka(date, options) {
  return new Intl.DateTimeFormat('en-BD', {
    timeZone: DHAKA_TIME_ZONE,
    ...options,
  }).format(date)
}

export function formatDhakaDateInput(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return `${values.year}-${values.month}-${values.day}`
}

export function isSameDhakaDate(first, second) {
  return formatDhakaDateInput(first) === formatDhakaDateInput(second)
}

export function parseDhakaDateTime(date, time) {
  const dateMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date)
  const timeMatch = /^(\d{2}):(\d{2})$/.exec(time)
  if (!dateMatch || !timeMatch) return new Date(NaN)

  const [, year, month, day] = dateMatch
  const [, hour, minute] = timeMatch
  if (
    Number(month) < 1 || Number(month) > 12 ||
    Number(day) < 1 || Number(day) > 31 ||
    Number(hour) > 23 || Number(minute) > 59
  ) return new Date(NaN)

  const timestamp = Date.UTC(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  ) - DHAKA_OFFSET_MS
  const localDate = new Date(timestamp + DHAKA_OFFSET_MS)
  if (
    localDate.getUTCFullYear() !== Number(year) ||
    localDate.getUTCMonth() !== Number(month) - 1 ||
    localDate.getUTCDate() !== Number(day)
  ) return new Date(NaN)
  return new Date(timestamp)
}

export function parseDhakaDateTimeInput(value) {
  const [date, time] = value.split('T')
  return parseDhakaDateTime(date, time)
}

export function getDhakaScheduleTime(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIME_ZONE,
    weekday: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date)
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]))
  return {
    day: values.weekday.toLowerCase(),
    time: `${values.hour}:${values.minute}`,
  }
}

export function computeDhakaAvailabilityStatus(consultant, now = Date.now()) {
  if (consultant.manualBusy?.until?.toMillis?.() > now) return 'busy'

  const { day, time } = getDhakaScheduleTime(new Date(now))
  const ranges = consultant.availability?.[day] || []
  if (!ranges.length) return 'offline'
  return ranges.some(range => time >= range.start && time < range.end)
    ? 'available'
    : 'offline'
}
