import { initializeApp, cert, getApps } from 'firebase-admin/app'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

try {
  const envPath = join(__dirname, '..', '.env.local')
  const envRaw = readFileSync(envPath, 'utf-8')
  envRaw.split('\n').forEach(line => {
    line = line.trim()
    if (!line || line.startsWith('#')) return
    const eq = line.indexOf('=')
    if (eq === -1) return
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = value
  })
} catch (err) {
  console.warn('Could not read .env.local')
}

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

const SCHOOL = {
  name: 'Yourkids&i Academy',
  shortName: 'YKI',
  motto: 'Where early learning meets home-grown values',
  email: 'yourkidsniacademy@gmail.com',
  phone: '08176358088',
  phoneSecondary: '08134763866',
  whatsapp: '+2348134763866',
  address: '166, Isawo Road, Okiki Bus-Stop, Agric, Ikorodu, Lagos State',
  state: 'Lagos',
  country: 'Nigeria',
  currentSession: '2026/2027',
  currentTermNumber: 1,
  setupComplete: true,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
}

const CLASSES = [
  { name: 'Pre-School 1', level: 'nursery', order: 1 },
  { name: 'Pre-School 2', level: 'nursery', order: 2 },
  { name: 'Nursery 1', level: 'nursery', order: 3 },
  { name: 'Nursery 2', level: 'nursery', order: 4 },
  { name: 'Primary 1', level: 'primary', order: 5 },
  { name: 'Primary 2', level: 'primary', order: 6 },
  { name: 'Primary 3', level: 'primary', order: 7, terminal: true },
]

const SUBJECTS = [
  { name: 'English Language', code: 'ENG', levels: ['nursery', 'primary'] },
  { name: 'Mathematics', code: 'MTH', levels: ['nursery', 'primary'] },
  { name: 'Creative Arts', code: 'ART', levels: ['nursery', 'primary'] },
  { name: 'Physical & Health Education', code: 'PHE', levels: ['nursery', 'primary'] },
  { name: 'Rhymes & Songs', code: 'RHY', levels: ['nursery'] },
  { name: 'Phonics', code: 'PHN', levels: ['nursery'] },
  { name: 'Handwriting', code: 'HWR', levels: ['nursery'] },
  { name: 'Social Habits', code: 'SHB', levels: ['nursery'] },
  { name: 'Basic Science', code: 'BSC', levels: ['primary'] },
  { name: 'Social Studies', code: 'SOS', levels: ['primary'] },
  { name: 'Verbal Reasoning', code: 'VBR', levels: ['primary'] },
  { name: 'Quantitative Reasoning', code: 'QTR', levels: ['primary'] },
  { name: 'Christian Religious Studies', code: 'CRS', levels: ['primary'] },
  { name: 'Civic Education', code: 'CIV', levels: ['primary'] },
  { name: 'Computer Studies', code: 'CMP', levels: ['primary'] },
  { name: 'Yoruba', code: 'YOR', levels: ['primary'] },
  { name: 'Cultural & Creative Arts', code: 'CCA', levels: ['primary'] },
]

const TERMS = [
  { academicYear: '2026/2027', termNumber: 1, name: 'First Term', current: true, status: 'active' },
  { academicYear: '2026/2027', termNumber: 2, name: 'Second Term', current: false, status: 'upcoming' },
  { academicYear: '2026/2027', termNumber: 3, name: 'Third Term', current: false, status: 'upcoming' },
]

const GRADING_SCALE = [
  { grade: 'A', minScore: 70, maxScore: 100, remark: 'Excellent' },
  { grade: 'B', minScore: 60, maxScore: 69, remark: 'Very Good' },
  { grade: 'C', minScore: 50, maxScore: 59, remark: 'Good' },
  { grade: 'D', minScore: 45, maxScore: 49, remark: 'Fair' },
  { grade: 'E', minScore: 40, maxScore: 44, remark: 'Pass' },
  { grade: 'F', minScore: 0, maxScore: 39, remark: 'Fail' },
]

async function seed() {
  console.log('\nSeeding Yourkids&i Academy...\n')
  console.log('  Writing school/root...')
  await db.doc('school/root').set({ ...SCHOOL, gradingScale: GRADING_SCALE })
  console.log('    OK: school/root created')

  console.log('\n  Writing classes...')
  const batchClasses = db.batch()
  CLASSES.forEach(cls => {
    const ref = db.collection('classes').doc()
    batchClasses.set(ref, { ...cls, id: ref.id, createdAt: FieldValue.serverTimestamp() })
  })
  await batchClasses.commit()
  console.log('    OK: ' + CLASSES.length + ' classes created')

  console.log('\n  Writing subjects...')
  const batchSubjects = db.batch()
  SUBJECTS.forEach(sub => {
    const ref = db.collection('subjects').doc()
    batchSubjects.set(ref, { ...sub, id: ref.id, createdAt: FieldValue.serverTimestamp() })
  })
  await batchSubjects.commit()
  console.log('    OK: ' + SUBJECTS.length + ' subjects created')

  console.log('\n  Writing terms...')
  const batchTerms = db.batch()
  TERMS.forEach(term => {
    const ref = db.collection('terms').doc()
    batchTerms.set(ref, { ...term, id: ref.id, createdAt: FieldValue.serverTimestamp() })
  })
  await batchTerms.commit()
  console.log('    OK: ' + TERMS.length + ' terms created for ' + TERMS[0].academicYear)

  console.log('\n  Initializing admission counter...')
  await db.doc('school/root/counters/admissionSerial').set({
    value: 0,
    updatedAt: FieldValue.serverTimestamp(),
  })
  console.log('    OK: Counter set to 0')

  console.log('\nSeed complete.')
  console.log('Log in at: https://bramtech-records1.vercel.app/dashboard?school=yourkidsni\n')
  process.exit(0)
}

seed().catch(err => {
  console.error('\nSeed failed:', err.message)
  console.error(err)
  process.exit(1)
})
