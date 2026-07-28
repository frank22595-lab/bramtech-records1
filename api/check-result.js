/**
 * POST /api/check-result
 *
 * Public endpoint that validates admission number + access code, then
 * returns published report cards for that student.
 *
 * Security:
 *   - Rate-limited to 5 attempts per IP per hour (in-memory)
 *   - Access code compared as SHA-256 hash (never stored plaintext)
 *   - Uses Firebase Admin SDK (bypasses Firestore rules, but requires
 *     env vars to be set — hard to accidentally expose)
 *
 * Environment variables required in Vercel:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY  (with newlines as \n)
 */

import admin from 'firebase-admin'
import crypto from 'crypto'

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
    }),
  })
}

const db = admin.firestore()

// In-memory rate limiter. Resets on each cold-start of the function, but
// serverless functions typically stay warm long enough to enforce limits
// during any realistic brute-force attempt.
const attempts = new Map()

function checkRateLimit(ip) {
  const now = Date.now()
  const hour = 60 * 60 * 1000
  const entries = (attempts.get(ip) || []).filter(t => now - t < hour)
  if (entries.length >= 5) return false
  entries.push(now)
  attempts.set(ip, entries)
  return true
}

function hashCode(code) {
  const normalized = String(code || '').replace(/-/g, '').toUpperCase()
  return crypto.createHash('sha256').update(normalized).digest('hex')
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown').split(',')[0].trim()

  if (!checkRateLimit(ip)) {
    return res.status(429).json({
      error: 'Too many attempts. Please wait an hour and try again.',
    })
  }

  const { admissionNumber, accessCode } = req.body || {}

  if (!admissionNumber || !accessCode) {
    return res.status(400).json({ error: 'Admission number and access code are required.' })
  }

  const normalizedAdm = String(admissionNumber).trim().toUpperCase()
  const hashedCode = hashCode(accessCode)

  try {
    // 1. Find student by admission number
    const studentsSnap = await db.collection('students')
      .where('admissionNumber', '==', normalizedAdm)
      .limit(1)
      .get()

    if (studentsSnap.empty) {
      // Same error message whether admission missing or code wrong (don't leak info)
      return res.status(404).json({ error: 'Admission number or access code is incorrect.' })
    }

    const studentDoc = studentsSnap.docs[0]
    const student = studentDoc.data()

    // 2. Verify the access code hash
    if (!student.accessCodeHash || student.accessCodeHash !== hashedCode) {
      return res.status(404).json({ error: 'Admission number or access code is incorrect.' })
    }

    // 3. Get all PUBLISHED report cards for this student
    const reportsSnap = await db.collection('reportCards')
      .where('studentId', '==', studentDoc.id)
      .where('status', '==', 'published')
      .get()

    const reports = reportsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = new Date(a.publishedAt || a.createdAt || 0).getTime()
        const tb = new Date(b.publishedAt || b.createdAt || 0).getTime()
        return tb - ta
      })

    // 4. Get school info for header rendering
    const schoolSnap = await db.doc('school/root').get()
    const school = schoolSnap.exists ? schoolSnap.data() : {}

    return res.status(200).json({
      student: {
        id: studentDoc.id,
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        photoUrl: student.photoUrl || null,
        currentClass: student.class || student.currentClass || '',
        status: student.status || 'active',
        gender: student.gender || '',
        dateOfBirth: student.dateOfBirth || null,
      },
      school: {
        name: school.name || '',
        shortName: school.shortName || '',
        address: school.address || '',
        phone: school.phone || '',
        email: school.email || '',
        motto: school.motto || '',
        logoUrl: school.logoUrl || null,
      },
      reports,
    })
  } catch (err) {
    console.error('check-result error:', err)
    return res.status(500).json({ error: 'Something went wrong. Please try again.' })
  }
}
