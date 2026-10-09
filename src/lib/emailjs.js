import emailjs from '@emailjs/browser'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

const TEMPLATES = {
  request:       import.meta.env.VITE_EMAILJS_TEMPLATE_REQUEST,
  accepted:      import.meta.env.VITE_EMAILJS_TEMPLATE_ACCEPTED,
  rejected:      import.meta.env.VITE_EMAILJS_TEMPLATE_REJECTED,
  cancelled:     import.meta.env.VITE_EMAILJS_TEMPLATE_CANCELLED,
  autoCancelled: import.meta.env.VITE_EMAILJS_TEMPLATE_AUTOCANCELLED,
  completed:     import.meta.env.VITE_EMAILJS_TEMPLATE_COMPLETED,
}

// Simple in-memory throttle: max 5 emails per hour per user session
const sentLog = []
const MAX_PER_HOUR = 5

function isThrottled() {
  const now = Date.now()
  const recent = sentLog.filter(t => now - t < 3_600_000)
  if (recent.length >= MAX_PER_HOUR) return true
  sentLog.push(now)
  // prune old entries
  sentLog.splice(0, sentLog.length - 20)
  return false
}

async function send(templateId, params) {
  if (!SERVICE_ID || !PUBLIC_KEY || !templateId) {
    console.warn('[EmailJS] Missing config — skipping email')
    return { skipped: true }
  }
  if (isThrottled()) {
    console.warn('[EmailJS] Throttled — too many emails this hour')
    return { throttled: true }
  }
  try {
    await emailjs.send(SERVICE_ID, templateId, params, PUBLIC_KEY)
    return { sent: true }
  } catch (err) {
    console.error('[EmailJS] Send failed:', err)
    return { error: err.message }
  }
}

/** Booking request submitted — notify consultant */
export function emailBookingRequest({ consultantEmail, consultantName, clientName, course, topic, date, time, duration, price, bookingId }) {
  return send(TEMPLATES.request, {
    to_email: consultantEmail, to_name: consultantName,
    from_name: clientName, course, topic, date, time, duration,
    price: price === 0 ? 'FREE' : `${price} (estimated)`,
    booking_id: bookingId,
  })
}

/** Booking accepted — notify client with WhatsApp link */
export function emailBookingAccepted({ clientEmail, clientName, consultantName, course, topic, date, time, duration, price, whatsapp, bookingId }) {
  const waLink = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : 'Contact via platform'
  return send(TEMPLATES.accepted, {
    to_email: clientEmail, to_name: clientName,
    consultant_name: consultantName, course, topic, date, time, duration,
    price: price === 0 ? 'FREE' : `${price}`,
    whatsapp_link: waLink, booking_id: bookingId,
  })
}

/** Booking rejected — notify client */
export function emailBookingRejected({ clientEmail, clientName, consultantName, course, date, time, bookingId }) {
  return send(TEMPLATES.rejected, {
    to_email: clientEmail, to_name: clientName,
    consultant_name: consultantName, course, date, time, booking_id: bookingId,
  })
}

/** Booking cancelled — notify the other party */
export function emailBookingCancelled({ toEmail, toName, byName, course, date, time, reason, bookingId }) {
  return send(TEMPLATES.cancelled, {
    to_email: toEmail, to_name: toName,
    cancelled_by: byName, course, date, time,
    reason: reason || 'No reason given', booking_id: bookingId,
  })
}

/** Auto-cancelled (expired PENDING) */
export function emailAutoCancel({ toEmail, toName, otherName, course, date, time, bookingId }) {
  return send(TEMPLATES.autoCancelled, {
    to_email: toEmail, to_name: toName,
    other_name: otherName, course, date, time, booking_id: bookingId,
    reason: 'Request was not accepted before the session time passed.',
  })
}

/** Session completed — request reviews */
export function emailCompleted({ toEmail, toName, otherName, course, date, bookingId }) {
  return send(TEMPLATES.completed, {
    to_email: toEmail, to_name: toName,
    other_name: otherName, course, date, booking_id: bookingId,
  })
}
