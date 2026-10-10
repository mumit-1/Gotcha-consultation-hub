import emailjs from '@emailjs/browser'
import { DHAKA_TIME_ZONE } from './dhakaTime'
import { recordSuccessfulEmail } from './emailUsage'

const SERVICE_ID  = import.meta.env.VITE_EMAILJS_SERVICE_ID
const PUBLIC_KEY  = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
const TEMPLATE_ID = import.meta.env.VITE_EMAILJS_TEMPLATE_ID // ONE template for all emails

// Simple in-memory throttle: max 5 emails per hour per user session
const sentLog = []
const MAX_PER_HOUR = 5

function isThrottled() {
  const now = Date.now()
  const recent = sentLog.filter(t => now - t < 3_600_000)
  if (recent.length >= MAX_PER_HOUR) return true
  sentLog.push(now)
  sentLog.splice(0, sentLog.length - 20)
  return false
}

// Sends one email through the single template: only to_email, to_name, subject, message
async function send({ toEmail, toName, subject, message, type }) {
  if (!SERVICE_ID || !PUBLIC_KEY || !TEMPLATE_ID) {
    console.warn('[EmailJS] Missing config — skipping email')
    return { skipped: true }
  }
  if (isThrottled()) {
    console.warn('[EmailJS] Throttled — too many emails this hour')
    return { throttled: true }
  }
  try {
    await emailjs.send(
      SERVICE_ID,
      TEMPLATE_ID,
      { to_email: toEmail, to_name: toName, subject, message },
      PUBLIC_KEY
    )
    void recordSuccessfulEmail(type).catch(err => {
      console.error('[EmailJS] Could not record successful email usage', {
        code: err?.code || 'unknown',
        message: err?.message || String(err),
        type,
      })
    })
    return { sent: true }
  } catch (err) {
    console.error('[EmailJS] Send failed:', err)
    return { error: err.message }
  }
}

const priceText = (price) => (price === 0 ? 'FREE' : `${price}`)

/** Booking request submitted — notify consultant */
export function emailBookingRequest({ consultantEmail, consultantName, clientName, course, topic, date, time, duration, price, bookingId }) {
  return send({
    type: 'request',
    toEmail: consultantEmail,
    toName: consultantName,
    subject: 'New consultation request on Gotcha',
    message:
`${clientName} wants a consultation with you.

Course: ${course}
Topic: ${topic}
Date: ${date}
time: ${time} (${DHAKA_TIME_ZONE}, UTC+6)
Duration: ${duration}
Price: ${price === 0 ? 'FREE' : `${price} (estimated)`}
Booking ID: ${bookingId}

Open Gotcha to accept or reject this request.`,
  })
}

/** Booking accepted — notify client with WhatsApp link */
export function emailBookingAccepted({ clientEmail, clientName, consultantName, course, topic, date, time, duration, price, whatsapp, bookingId }) {
  const waLink = whatsapp ? `https://wa.me/${whatsapp.replace(/\D/g, '')}` : 'Contact via platform'
  return send({
    type: 'accepted',
    toEmail: clientEmail,
    toName: clientName,
    subject: 'Your consultation is confirmed',
    message:
`${consultantName} accepted your request.

Course: ${course}
Topic: ${topic}
Date: ${date}
time: ${time} (${DHAKA_TIME_ZONE}, UTC+6)
Duration: ${duration}
Price: ${priceText(price)}
Booking ID: ${bookingId}

Contact on WhatsApp: ${waLink}`,
  })
}

/** Booking rejected — notify client */
export function emailBookingRejected({ clientEmail, clientName, consultantName, course, date, time, bookingId }) {
  return send({
    type: 'rejected',
    toEmail: clientEmail,
    toName: clientName,
    subject: 'Update on your consultation request',
    message:
`${consultantName} could not accept your request for ${course} on ${date} at ${time} (${DHAKA_TIME_ZONE}, UTC+6).
You can try another time or another consultant on Gotcha.

Booking ID: ${bookingId}`,
  })
}

/** Booking cancelled — notify the other party */
export function emailBookingCancelled({ toEmail, toName, byName, course, date, time, reason, bookingId }) {
  return send({
    type: 'cancelled',
    toEmail,
    toName,
    subject: 'A consultation was cancelled',
    message:
`${byName} cancelled the ${course} consultation on ${date} at ${time} (${DHAKA_TIME_ZONE}, UTC+6).
Reason: ${reason || 'No reason given'}

Booking ID: ${bookingId}`,
  })
}

/** Auto-cancelled (expired PENDING) */
export function emailAutoCancel({ toEmail, toName, otherName, course, date, time, bookingId }) {
  return send({
    type: 'autoCancelled',
    toEmail,
    toName,
    subject: 'Consultation request cancelled',
    message:
`Your ${course} request with ${otherName} on ${date} at ${time} (${DHAKA_TIME_ZONE}, UTC+6) was cancelled automatically.
Reason: The request was not accepted before the session time passed.

Booking ID: ${bookingId}`,
  })
}

/** Session completed — request reviews */
export function emailCompleted({ toEmail, toName, otherName, course, date, bookingId }) {
  return send({
    type: 'completed',
    toEmail,
    toName,
    subject: 'How was your consultation? Leave a review',
    message:
`Your ${course} consultation with ${otherName} on ${date} is complete.
Please open Gotcha and leave a short rating and review.

Booking ID: ${bookingId}`,
  })
}