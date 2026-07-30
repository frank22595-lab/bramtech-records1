/**
 * GET /api/school-info
 *
 * Public endpoint that returns school name, classes, and subjects.
 * Used by the staff signup form to populate class/subject dropdowns
 * BEFORE the teacher has an account.
 *
 * Returns only non-sensitive fields (names, IDs, order). No student or
 * financial data.
 */

import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore } from 'firebase-admin/firestore'

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

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  try {
    const [schoolSnap, classesSnap, subjectsSnap] = await Promise.all([
      db.doc('school/root').get(),
      db.collection('classes').orderBy('order').get(),
      db.collection('subjects').orderBy('order').get(),
    ])

    const school = schoolSnap.exists ? schoolSnap.data() : {}

    const classes = classesSnap.docs.map(d => ({
      id: d.id,
      name: d.data().name,
      order: d.data().order,
    }))

    const subjects = subjectsSnap.docs.map(d => ({
      id: d.id,
      name: d.data().name,
      code: d.data().code,
    }))

    return res.status(200).json({
      school: {
        name: school.name || '',
        shortName: school.shortName || '',
        motto: school.motto || '',
      },
      classes,
      subjects,
    })
  } catch (err) {
    console.error('school-info error:', err)
    return res.status(500).json({ error: 'Something went wrong.' })
  }
}
