/**
 * Admission number generator.
 *
 * Format: {ACRONYM}/{YEAR}/{SERIAL}
 * Example: YKI/2026/001, YKI/2026/002, YKI/2027/046
 *
 * The serial counter NEVER RESETS — it keeps incrementing forever across
 * all years. Year in the format is the year of admission (stays with the
 * student for life).
 *
 * Counter is stored at school/root/counters/admissionSerial and updated
 * via a Firestore transaction so two admins adding students at the same
 * time never get the same number.
 */

import { doc, getDoc, runTransaction } from 'firebase/firestore'
import { getFirebase } from '../config/firebase'

const COUNTER_PATH = ['school', 'root', 'counters', 'admissionSerial']

function sanitizeAcronym(acronym) {
  return String(acronym || 'STU').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'STU'
}

/**
 * Reserve the next admission number by incrementing the counter atomically.
 * Call this when actually creating the student. Returns something like
 * "YKI/2026/046".
 */
export async function generateAdmissionNumber(schoolAcronym) {
  const { db } = getFirebase()
  const counterRef = doc(db, ...COUNTER_PATH)
  const acronym = sanitizeAcronym(schoolAcronym)
  const year = new Date().getFullYear()

  const nextSerial = await runTransaction(db, async (tx) => {
    const snap = await tx.get(counterRef)
    const current = snap.exists() ? (snap.data().value || 0) : 0
    const next = current + 1
    tx.set(counterRef, {
      value: next,
      updatedAt: new Date().toISOString(),
    })
    return next
  })

  return `${acronym}/${year}/${String(nextSerial).padStart(3, '0')}`
}

/**
 * Peek at what the next admission number would be WITHOUT reserving it.
 * Use this as placeholder text in the Add Student form so admin sees
 * what number the new student will get.
 */
export async function previewNextAdmissionNumber(schoolAcronym) {
  const { db } = getFirebase()
  const counterRef = doc(db, ...COUNTER_PATH)
  const snap = await getDoc(counterRef)
  const current = snap.exists() ? (snap.data().value || 0) : 0
  const next = current + 1
  const acronym = sanitizeAcronym(schoolAcronym)
  const year = new Date().getFullYear()
  return `${acronym}/${year}/${String(next).padStart(3, '0')}`
}

/**
 * Validate that a string looks like an admission number.
 * Accepts any format {ACRONYM}/{YEAR}/{SERIAL} - not tied to a specific acronym.
 */
export function isValidAdmissionNumberFormat(str) {
  return /^[A-Z0-9]+\/\d{4}\/\d{3,}$/i.test(String(str || '').trim())
}
