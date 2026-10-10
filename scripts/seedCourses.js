/**
 * scripts/seedCourses.js
 *
 * Seeds the approved course list to Firestore config/courses.
 * Run ONCE after deploying security rules:
 *   node scripts/seedCourses.js
 *
 * Requires: npm install firebase-admin (or use the Firebase console)
 *
 * Since we use the free Spark plan, you can also seed manually:
 * 1. Open Firestore console
 * 2. Create collection: config
 * 3. Create document with ID: courses
 * 4. Add field: codes (array) and paste all course codes from src/data/courses.js
 */

import { initializeApp, cert } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'
import process from 'node:process'
import { COURSES } from '../src/data/courses.js'

// Set your service account key path
const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || '{}')

initializeApp({ credential: cert(serviceAccount) })
const db = getFirestore()

async function seed() {
  console.log(`Seeding ${COURSES.length} course codes to config/courses...`)
  await db.collection('config').doc('courses').set({ codes: COURSES })
  console.log('Done! config/courses seeded.')
  process.exit(0)
}

seed().catch(err => { console.error(err); process.exit(1) })
