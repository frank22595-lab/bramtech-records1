import { useState, useEffect, useMemo } from 'react'
import { collection, doc, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { BookOpen, ChevronRight, AlertCircle, Users } from 'lucide-react'
import { Card, Select, Spinner, Badge } from '../../components/ui'
import { getFirebase } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useSchool } from '../../contexts/SchoolContext'
import ReportCardView from './ReportCardView'
import { computeClassReports } from '../../lib/reportCardCompute'

export default function ReportsBrowse() {
  const { db } = getFirebase()
  const { profile } = useAuth()
  const { school } = useSchool()

  const [terms, setTerms] = useState([])
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [assessments, setAssessments] = useState([])
  const [students, setStudents] = useState([])
  const [results, setResults] = useState([])
  const [reportCards, setReportCards] = useState([])
  const [loading, setLoading] = useState(true)
  const [termId, setTermId] = useState('')
  const [classId, setClassId] = useState('')
  const [viewingStudentId, setViewingStudentId] = useState(null)

  const isAdmin = profile?.role === 'director' || profile?.role === 'admin'
  const isTeacher = profile?.role === 'teacher'
  const isParent = profile?.role === 'parent'

  useEffect(() => {
    if (school?.currentTermId && !termId) setTermId(school.currentTermId)
  }, [school, termId])

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'terms'), orderBy('academicYear', 'desc')), snap =>
        setTerms(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'classes'), orderBy('order')), snap =>
        setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'subjects'), orderBy('order')), snap =>
        setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'assessments'), orderBy('order')), snap => {
        setAssessments(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => a.active))
        setLoading(false)
      }),
    ]
    return () => unsubs.forEach(u => u())
  }, [db])

  const availableClasses = useMemo(() => {
    const active = classes.filter(c => c.active)
    if (isAdmin) return active
    if (isTeacher) {
      const assigned = profile?.assignedClasses || []
      return active.filter(c => assigned.includes(c.id))
    }
    return active
  }, [classes, isAdmin, isTeacher, profile])

  useEffect(() => {
    if (!classId) { setStudents([]); return }
    return onSnapshot(query(collection(db, 'students'), where('classId', '==', classId), where('active', '==', true)), snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.fullName.localeCompare(b.fullName)))
    })
  }, [db, classId])

  useEffect(() => {
    if (!classId || !termId) { setResults([]); return }
    return onSnapshot(query(collection(db, 'results'), where('classId', '==', classId), where('termId', '==', termId)), snap => {
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [db, classId, termId])

  useEffect(() => {
    if (!classId || !termId) { setReportCards([]); return }
    return onSnapshot(query(collection(db, 'reportCards'), where('classId', '==', classId), where('termId', '==', termId)), snap => {
      setReportCards(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [db, classId, termId])

  const computedReports = useMemo(() => {
    if (!classId || !termId || students.length === 0) return new Map()
    const classSubjects = subjects.filter(s => (s.classIds || []).includes(classId) && s.active !== false)
    return computeClassReports({
      students, subjects: classSubjects, assessments, results,
      gradingScale: school?.gradingScale || [],
    })
  }, [students, subjects, assessments, results, classId, termId, school])

  const selectedTerm = terms.find(t => t.id === termId)
  const selectedClass = classes.find(c => c.id === classId)

  if (loading) return <Spinner />

  if (isParent) return <ParentView db={db} profile={profile} school={school} terms={terms} />

  return (
    <div>
      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Select label="Term" value={termId} onChange={e => setTermId(e.target.value)}>
            <option value="">— select —</option>
            {terms.map(t => (
              <option key={t.id} value={t.id}>
                {t.academicYear} — {t.name}{t.id === school?.currentTermId ? ' (current)' : ''}
              </option>
            ))}
          </Select>
          <Select label="Class" value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">— select —</option>
            {availableClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
      </Card>

      {!termId || !classId ? (
        <Card className="p-12 text-center">
          <BookOpen className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">Pick a term and class to view report cards.</p>
        </Card>
      ) : students.length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">No students in this class.</p>
        </Card>
      ) : (
        <>
          <div className="mb-3 text-sm text-ink-soft">
            <strong className="text-ink">{selectedClass?.name}</strong> · <strong className="text-ink">{selectedTerm?.name}</strong> · {students.length} students
          </div>
          <div className="grid gap-2">
            {students.map((s, i) => {
              const snapshot = reportCards.find(r => r.studentId === s.id)
              const computed = computedReports.get(s.id)
              const initials = (s.fullName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
              return (
                <Card key={s.id} className="p-3 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => setViewingStudentId(s.id)}>
                  <div className="w-8 text-center text-ink-soft text-sm">{i + 1}</div>
                  <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 font-medium flex items-center justify-center flex-shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.fullName}</div>
                    <div className="text-xs text-ink-soft flex items-center gap-2 mt-0.5">
                      <span>{s.admissionNumber || '—'}</span>
                      {computed && (
                        <>
                          <span>·</span>
                          <span>Total: {computed.totalObtained}/{computed.totalPossible} ({computed.percentageAverage}%)</span>
                          {computed.overallPosition && <>
                            <span>·</span><span>Position: {computed.overallPosition}</span>
                          </>}
                        </>
                      )}
                    </div>
                  </div>
                  {snapshot?.status === 'published' && <Badge tone="success">Published</Badge>}
                  {snapshot?.status === 'draft' && <Badge tone="warning">Draft</Badge>}
                  <ChevronRight className="w-4 h-4 text-ink-soft" />
                </Card>
              )
            })}
          </div>
        </>
      )}

      {viewingStudentId && (
        <ReportCardView
          studentId={viewingStudentId}
          student={students.find(s => s.id === viewingStudentId)}
          className={selectedClass?.name || ''}
          classId={classId}
          term={selectedTerm}
          computedReport={computedReports.get(viewingStudentId)}
          existingSnapshot={reportCards.find(r => r.studentId === viewingStudentId)}
          onClose={() => setViewingStudentId(null)}
        />
      )}
    </div>
  )
}

// Parent view (unchanged from your original)
function ParentView({ db, profile, school, terms }) {
  const linkedStudents = profile?.linkedStudents || []
  const [students, setStudents] = useState([])
  const [reportCards, setReportCards] = useState([])
  const [viewing, setViewing] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (linkedStudents.length === 0) { setLoading(false); return }
    const unsubs = linkedStudents.map(sid =>
      onSnapshot(doc(db, 'students', sid), snap => {
        if (snap.exists()) {
          setStudents(prev => {
            const others = prev.filter(s => s.id !== sid)
            return [...others, { id: sid, ...snap.data() }]
          })
        }
      })
    )
    setLoading(false)
    return () => unsubs.forEach(u => u())
  }, [db, linkedStudents.join(',')])

  useEffect(() => {
    if (linkedStudents.length === 0) return
    const q = query(collection(db, 'reportCards'),
      where('studentId', 'in', linkedStudents.slice(0, 10)),
      where('status', '==', 'published'))
    return onSnapshot(q, snap => setReportCards(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
  }, [db, linkedStudents.join(',')])

  if (loading) return <Spinner />
  if (linkedStudents.length === 0) {
    return (
      <Card className="p-12 text-center">
        <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
        <p className="text-ink-soft mb-1">No students linked to your account yet.</p>
        <p className="text-sm text-ink-soft">Please contact the school office.</p>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {students.map(s => {
        const reports = reportCards.filter(r => r.studentId === s.id)
          .sort((a, b) => (b.termId || '').localeCompare(a.termId || ''))
        return (
          <Card key={s.id} className="p-6">
            <div className="mb-4">
              <div className="font-semibold text-lg">{s.fullName}</div>
              <div className="text-sm text-ink-soft">{s.className} · {s.admissionNumber}</div>
            </div>
            {reports.length === 0 ? (
              <p className="text-sm text-ink-soft">No published report cards yet.</p>
            ) : (
              <div className="space-y-2">
                {reports.map(r => (
                  <button key={r.id} onClick={() => setViewing({ report: r, student: s })}
                    className="w-full text-left p-3 bg-slate-50 hover:bg-brand-50 rounded-lg flex items-center justify-between">
                    <div>
                      <div className="font-medium">{r.termName || r.termId}</div>
                      <div className="text-xs text-ink-soft">
                        {r.percentageAverage}% · Grade {r.overallGrade}
                        {r.overallPosition && ` · Position ${r.overallPosition} of ${r.classSize}`}
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-ink-soft" />
                  </button>
                ))}
              </div>
            )}
          </Card>
        )
      })}
      {viewing && (
        <ReportCardView
          studentId={viewing.student.id}
          student={viewing.student}
          className={viewing.student.className}
          classId={viewing.student.classId}
          term={terms.find(t => t.id === viewing.report.termId)}
          computedReport={null}
          existingSnapshot={viewing.report}
          onClose={() => setViewing(null)}
          readOnly
        />
      )}
    </div>
  )
}
