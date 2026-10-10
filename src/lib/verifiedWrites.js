import { reload } from 'firebase/auth'
import {
  doc, getDoc, serverTimestamp, setDoc,
} from 'firebase/firestore'
import { auth, db } from './firebase'
import { DHAKA_TIME_ZONE } from './dhakaTime'

const UNIVERSITY_EMAIL_REGEX = /^[A-Z0-9._%+-]+@g\.bracu\.ac\.bd$/i
const pendingUserDocs = new Map()

async function createUserDocIfMissing(user) {
  if (!user) throw new Error('You must be signed in to continue.')
  if (!user.email || !UNIVERSITY_EMAIL_REGEX.test(user.email)) {
    throw new Error('Use your @g.bracu.ac.bd university email to continue.')
  }

  const userRef = doc(db, 'users', user.uid)
  let userSnap = await getDoc(userRef)

  if (!userSnap.exists()) {
    await setDoc(userRef, {
      uid: user.uid,
      name: user.displayName || user.email.split('@')[0],
      email: user.email,
      photoURL: user.photoURL || null,
      bio: '',
      timezone: DHAKA_TIME_ZONE,
      status: 'active',
      isConsultant: false,
      blockedUsers: [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    userSnap = await getDoc(userRef)
  }

  return { user, userData: userSnap.data() }
}

export function ensureUserDoc(user = auth.currentUser) {
  if (!user) return Promise.reject(new Error('You must be signed in to continue.'))
  const existing = pendingUserDocs.get(user.uid)
  if (existing) return existing

  const pending = createUserDocIfMissing(user)
    .catch(error => {
      console.error('[Firestore] ensure user doc failed', {
        code: error?.code || 'unknown',
        message: error?.message || String(error),
        step: 'ensure user doc',
      })
      throw error
    })
    .finally(() => pendingUserDocs.delete(user.uid))
  pendingUserDocs.set(user.uid, pending)
  return pending
}

export async function ensureFreshVerifiedUser() {
  const user = auth.currentUser
  if (!user) throw new Error('You must be signed in to continue.')

  await reload(user)
  await user.getIdToken(true)
  if (!auth.currentUser?.emailVerified) {
    throw new Error('Please verify your email, then try again.')
  }

  const result = await ensureUserDoc(auth.currentUser)
  if (result.userData.status !== 'active') {
    throw new Error(`Your account is ${result.userData.status || 'inactive'}. Contact an administrator.`)
  }
  return result
}

function isConnectionError(error) {
  return error?.code === 'unavailable' ||
    /network|failed to fetch|blocked by client|ERR_BLOCKED_BY_CLIENT/i.test(error?.message || '')
}

export async function runVerifiedWrite(step, operation) {
  try {
    const context = await ensureFreshVerifiedUser()
    return await operation(context)
  } catch (error) {
    console.error(`[Firestore] ${step} failed`, {
      code: error?.code || 'unknown',
      message: error?.message || String(error),
      step,
    })

    if (error?.code === 'permission-denied') {
      try {
        const context = await ensureFreshVerifiedUser()
        return await operation(context)
      } catch (retryError) {
        console.error(`[Firestore] ${step} retry failed`, {
          code: retryError?.code || 'unknown',
          message: retryError?.message || String(retryError),
          step,
        })
        if (retryError?.code === 'permission-denied') {
          throw new Error(
            'Could not save. Please verify your email, check your internet, and disable ad blockers for this site, then try again.',
            { cause: retryError },
          )
        }
        if (isConnectionError(retryError)) {
          throw new Error(
            'Connection blocked or unavailable. Check your internet connection and disable ad blockers for this site, then try again.',
            { cause: retryError },
          )
        }
        throw retryError
      }
    }

    if (isConnectionError(error)) {
      throw new Error(
        'Connection blocked or unavailable. Check your internet connection and disable ad blockers for this site, then try again.',
        { cause: error },
      )
    }
    throw error
  }
}
