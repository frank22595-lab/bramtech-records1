import { collection, doc, getDocs, query, where, writeBatch, serverTimestamp } from 'firebase/firestore'

/**
 * seedDemoData — creates demo students + full score/traits/comments data
 * for the current term so the app has a realistic dataset immediately.
 *
 * Only writes to ACTIVE classes. `active: true` (boolean), not a string.
 */

const NAMES = {
  male: ['Emeka Obi','David Okonkwo','Chidi Nwosu','Kelechi Anyanwu','Ifeanyi Eze','Chibuzo Adigwe','Uche Nnaji','Okechukwu Iwu','Somtochukwu Nnamani','Ikenna Ojiaku','Nnamdi Igbokwe','Chukwuemeka Anigbogu','Chinedu Ozor','Ebuka Nwafor','Onyeka Onwuka','Ikemefuna Chukwu','Chike Okoli','Uzochukwu Ibe','Chibueze Onwuchekwa','Chimezie Onyekachi','Kanayo Nwadike','Obinna Okoye','Chinonso Uzodinma','Ike Nwokocha','Chidiebere Nwosu','Nonso Ejikeme','Chibuike Nnamdi','Osita Anaba','Chukwudi Okwuosa','Uchenna Ibekwe'],
  female: ['Adaeze Okoro','Chinelo Nwoko','Ngozi Okafor','Ijeoma Umeh','Amaka Iheanacho','Nkechi Onyema','Chiamaka Ekweme','Onyinye Odum','Uzoamaka Chukwu','Chidinma Ilochonwu','Ifeoma Nwokolo','Adaobi Uzoegwu','Blessing Okon','Chinyere Ezenwa','Ogechi Anichebe','Nneka Okoye','Chidera Uzoma','Sochima Egwuatu','Kosisochukwu Adigwe','Zainab Musa','Ifeoma Nwadike','Chiwendu Anagor','Adannaya Nwafor','Chidera Onyeje','Chinaza Uzo','Ngozika Emeka','Uche Nkemdirim','Nnenna Onyekwelu','Kelechi Onyeka','Chimamanda Nnodim'],
}
const PARENT_FIRST = ['Ifeanyi','Chinelo','Peter','Mary','James','Sarah','Emmanuel','Grace','Joseph','Rebecca','John','Ann','Michael','Ruth']
const SURNAMES_FOR_PARENTS = ['Okoro','Nwosu','Umeh','Okafor','Ilochonwu','Adigwe','Nnamdi','Ejikeme']
const SAMPLE_ATTENDANCE_COMMENTS = ['Bright and focused', 'A hardworking student. Keep it up.', 'Improvement noted. Aim higher.', 'Very promising. Push more in Mathematics.']
const HEAD_COMMENTS = ['An excellent result. Congratulations.', 'A good performance. Do more next term.', 'You can do better. Work harder.', 'A very good result. Well done.']

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function num(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min }
function admissionNo(year, i) { return `DEMO/${year}/${String(i).padStart(4, '0')}` }
function dob(minAge, maxAge) {
  const now = new Date()
  const y = now.getFullYear() - num(minAge, maxAge)
  const m = String(num(1, 12)).padStart(2, '0')
  const d = String(num(1, 28)).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export async function seedDemoData({ db, profile, school, opts = {} }) {
  const perClass = opts.studentsPerClass || 15
  const yearShort = new Date().getFullYear()

  // Fetch active classes only
  const classSnap = await getDocs(query(collection(db, 'classes'), where('active', '==', true)))
  const classes = classSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  if (classes.length === 0) throw new Error('No active classes found. Add at least one class first.')

  // Fetch subjects, assessments, term
  const subjSnap = await getDocs(collection(db, 'subjects'))
  const subjects = subjSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const assessSnap = await getDocs(query(collection(db, 'assessments'), where('active', '==', true)))
  const assessments = assessSnap.docs.map(d => ({ id: d.id, ...d.data() }))
  const termId = school?.currentTermId
  if (!termId) throw new Error('No current term set. Set one in Terms.')
  const termSnap = await getDocs(collection(db, 'terms'))
  const term = termSnap.docs.find(d => d.id === termId)?.data()

  const cfg = school?.reportCardConfig || {}
  const psychomotorList = cfg.psychomotorSkills || cfg.skills || []
  const affectiveList = cfg.affectiveTraits || []

  // Batches — Firestore caps at 500 writes each
  const batches = []
  let batch = writeBatch(db)
  let count = 0
  const commit = async () => { await batch.commit(); batch = writeBatch(db); count = 0 }
  const put = (ref, data) => { batch.set(ref, data); count++; if (count >= 450) batches.push(commit()) }

  let studentIndex = 1
  const createdStudentIds = []

  for (const cls of classes) {
    const classSubjects = subjects.filter(s => (s.classIds || []).includes(cls.id) && s.active !== false)
    if (classSubjects.length === 0) continue

    for (let i = 0; i < perClass; i++) {
      const isMale = Math.random() > 0.5
      const gender = isMale ? 'male' : 'female'
      const name = pick(NAMES[gender])
      const studentId = `demo_stu_${cls.id}_${i}_${Date.now().toString(36)}`
      createdStudentIds.push(studentId)

      // Student
      put(doc(db, 'students', studentId), {
        fullName: name,
        admissionNumber: admissionNo(yearShort, studentIndex++),
        classId: cls.id,
        className: cls.name,
        gender,
        dateOfBirth: dob(cls.level === 'sss' ? 14 : cls.level === 'jss' ? 10 : 4, cls.level === 'sss' ? 18 : cls.level === 'jss' ? 14 : 10),
        parentName: `${pick(PARENT_FIRST)} ${pick(SURNAMES_FOR_PARENTS)}`,
        parentPhone: `080${num(10000000, 99999999)}`,
        parentEmail: `parent${studentIndex}@demo.local`,
        active: true,          // ← boolean, not string
        status: 'active',      // belt & braces
        photoUrl: null,
        isDemo: true,
        createdBy: profile?.id || null,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })

      // Results per subject per assessment
      for (const s of classSubjects) {
        for (const a of assessments) {
          const resultId = `demo_res_${studentId}_${s.id}_${a.id}`
          const score = num(Math.max(0, Math.floor(a.maxScore * 0.4)), a.maxScore)
          put(doc(db, 'results', resultId), {
            studentId, classId: cls.id, subjectId: s.id, assessmentId: a.id, termId,
            score, maxScore: a.maxScore,
            isDemo: true,
            enteredBy: profile?.id || null,
            createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
          })
        }
      }

      // Report card doc with traits + comments (~60% chance filled, 30% draft, 10% published)
      const roll = Math.random()
      const state = roll < 0.5 ? 'filled_draft' : (roll < 0.8 ? 'partial' : 'published')
      const cardId = `${studentId}_${termId}`
      const hasTraits = state !== 'partial'
      const hasComments = state !== 'partial'
      const timesOpened = term?.timesOpened || 120
      const daysPresent = num(Math.floor(timesOpened * 0.75), timesOpened)
      const daysAbsent = timesOpened - daysPresent

      put(doc(db, 'reportCards', cardId), {
        studentId, studentName: name, admissionNumber: admissionNo(yearShort, studentIndex - 1),
        classId: cls.id, className: cls.name,
        termId, termName: term?.name || '', academicYear: term?.academicYear || '',
        attendance: {
          daysPresent, daysAbsent, daysTotal: timesOpened, timesOpened,
          percentage: Math.round((daysPresent / timesOpened) * 100),
        },
        psychomotor: hasTraits ? psychomotorList.map(n => ({ name: n, rating: num(3, 5) })) : [],
        affective: hasTraits ? affectiveList.map(n => ({ name: n, rating: num(3, 5) })) : [],
        classTeacherComment: hasComments ? pick(SAMPLE_ATTENDANCE_COMMENTS) : null,
        classTeacherName: hasComments ? 'Demo Teacher' : null,
        headTeacherComment: hasComments ? pick(HEAD_COMMENTS) : null,
        headTeacherName: hasComments ? (school?.principalName || 'Demo Principal') : null,
        headTeacherTitle: hasComments ? (school?.principalTitle || 'Principal') : null,
        status: state === 'published' ? 'published' : 'draft',
        publishedAt: state === 'published' ? serverTimestamp() : null,
        isDemo: true,
        createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
      })
    }
  }

  // Commit remaining
  if (count > 0) batches.push(batch.commit())
  await Promise.all(batches)

  return { studentsCreated: createdStudentIds.length, classesUsed: classes.length }
}

export async function clearDemoData({ db }) {
  const collections = ['students', 'results', 'reportCards']
  let deleted = 0
  for (const coll of collections) {
    const snap = await getDocs(query(collection(db, coll), where('isDemo', '==', true)))
    const chunks = []
    let batch = writeBatch(db); let count = 0
    snap.docs.forEach(d => {
      batch.delete(d.ref); count++
      if (count >= 450) { chunks.push(batch.commit()); batch = writeBatch(db); count = 0 }
    })
    if (count > 0) chunks.push(batch.commit())
    await Promise.all(chunks)
    deleted += snap.size
  }
  return { deleted }
}
