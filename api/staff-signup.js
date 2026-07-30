/**
 * POST /api/staff-signup
 *
 * Called AFTER the teacher creates their Firebase Auth account (via client
 * SDK). This endpoint:
 *   1. Validates the staff join code against school/root.staffJoinCodeHash
 *   2. If invalid → deletes the Firebase Auth user, returns 401
 *   3. If valid → creates the user doc at users/{uid} with status='pending'
 *
 * Body: { code, uid, fullName, email, phone, subjects, classId, note }
 *
 * The teacher's account exists in Firebase Auth immediately but they can't
 * DO anything until the director approves them (Push 2).
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { getAuth } from 'firebase-admin/auth'
import crypto from 'crypto'

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  })
}

const db = getFirestore()
const auth = getAuth()

// Rate limit — 10 signups per hour per IP
const attempts = new Map()
function checkRateLimit(ip) {
  const now = Date.now()
  const hour = 60 * 60 * 1000
  const entries = (attempts.get(ip) || []).filter(t => now - t < hour)
  if (entries.length >= 10) return false
  entries.push(now)
  attempts.set(ip, entries)
  return true
}

function hashCode(code) {
  const normalized = String(code || '')
    .toUpperCase()
    .replace(/[-\s]/g, '')
    .replace(/^STAFF/, '')
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

/**
 * Delete a Firebase Auth user, ignoring errors (user may not exist).
 */
async function deleteAuthUser(uid) {
  try {
    await auth.deleteUser(uid)
  } catch (err) {
    console.warn('Could not delete auth user:', uid, err.message)
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket?.remoteAddress || 'unknown')
    .split(',')[0].trim()

  if (!checkRateLimit(ip)) {
    return res.status(429).json({ error: 'Too many signups from this address. Try later.' })
  }

  const {
    code, uid, fullName, email, phone,
    subjects, classId, note,
  } = req.body || {}

  if (!code) return res.status(400).json({ error: 'Staff join code is required.' })
  if (!uid) return res.status(400).json({ error: 'Auth account missing.' })
  if (!fullName?.trim()) return res.status(400).json({ error: 'Full name is required.' })
  if (!email?.trim()) return res.status(400).json({ error: 'Email is required.' })

  try {
    // 1. Load the school doc to get the current staff code hash
    const schoolSnap = await db.doc('school/root').get()
    if (!schoolSnap.exists) {
      await deleteAuthUser(uid)
      return res.status(404).json({ error: 'School not set up yet. Contact the director.' })
    }

    const school = schoolSnap.data()
    const storedHash = school.staffJoinCodeHash

    if (!storedHash) {
      await deleteAuthUser(uid)
      return res.status(403).json({
        error: 'Staff signups are not enabled. Ask the director to generate a join code.',
      })
    }

    // 2. Compare hashes
    const providedHash = hashCode(code)
    if (providedHash !== storedHash) {
      await deleteAuthUser(uid)
      return res.status(401).json({ error: 'Invalid staff join code.' })
    }

    // 3. Check user doc doesn't already exist
    const existingSnap = await db.doc(`users/${uid}`).get()
    if (existingSnap.exists) {
      return res.status(409).json({ error: 'Account already exists for this user.' })
    }

    // 4. Create the user doc — status = pending, director will approve
    await db.doc(`users/${uid}`).set({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || '').trim(),
      role: 'teacher',              // default; director can change to 'admin'
      status: 'pending',            // director must approve
      active: true,

      // Fields teacher declared during signup (their intent)
      proposedSubjects: Array.isArray(subjects) ? subjects : [],
      proposedClassTeacherOf: classId || null,

      // Fields director assigns after approval
      assignedClasses: [],
      assignedSubjects: [],
      classTeacherOf: null,
      permissions: {},

      signupNote: (note || '').trim(),

      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    })

    return res.status(200).json({ success: true, uid })
  } catch (err) {
    console.error('staff-signup error:', err)
    // Cleanup — try to remove the orphan auth account
    await deleteAuthUser(uid)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
