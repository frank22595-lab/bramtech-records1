import { useState, useEffect, useMemo } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { ChevronRight, CheckCircle2, Clock, Circle, Users, Filter } from 'lucide-react'
import { Card, Select, Spinner, Badge } from '../../../components/ui'
import { getFirebase } from '../../../config/firebase'
import { useAuth } from '../../../contexts/AuthContext'
import { useSchool } from '../../../contexts/SchoolContext'
import ReportCardView from '../../reports/ReportCardView'
import { computeClassReports } from '../../../lib/reportCardCompute'

export default function ReportCardsTab({ term, readOnly }) {
  const { db } = getFirebase()
  const { profile } = useAuth()
  const { school } = useSchool()
  const [classes, setClasses] = useState([])
  const [subjects, setSubjects] = useState([])
  const [assessments, setAssessments] = useState([])
  const [students, setStudents] = useState([])
  const [results, setResults] = useState([])
  const [reportCards, setReportCards] = useState([])
  const [classId, setClassId] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [viewingStudentId, setViewingStudentId] = useState(null)
  const [loading, setLoading] = useState(true)

  const isAdmin = profile?.role === 'director' || profile?.role === 'admin'

  useEffect(() => {
    const unsubs = [
      onSnapshot(query(collection(db, 'classes'), orderBy('order')), snap =>
        setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.active))),
      onSnapshot(query(collection(db, 'subjects'), orderBy('order')), snap =>
        setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() })))),
      onSnapshot(query(collection(db, 'assessments'), orderBy('order')), snap => {
        setAssessments(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => a.active))
        setLoading(false)
      }),
    ]
    return () => unsubs.forEach(u => u())
  }, [db])

  useEffect(() => {
    if (!classId) { setStudents([]); return }
    return onSnapshot(query(collection(db, 'students'), where('classId', '==', classId), where('active', '==', true)), snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.fullName.localeCompare(b.fullName)))
    })
  }, [db, classId])

  useEffect(() => {
    if (!classId || !term?.id) { setResults([]); return }
    return onSnapshot(query(collection(db, 'results'), where('classId', '==', classId), where('termId', '==', term.id)), snap => {
      setResults(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [db, classId, term?.id])

  useEffect(() => {
    if (!classId || !term?.id) { setReportCards([]); return }
    return onSnapshot(query(collection(db, 'reportCards'), where('classId', '==', classId), where('termId', '==', term.id)), snap => {
      setReportCards(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [db, classId, term?.id])

  const computedReports = useMemo(() => {
    if (!classId || !term?.id || students.length === 0) return new Map()
    const classSubjects = subjects.filter(s => (s.classIds || []).includes(classId) && s.active !== false)
    return computeClassReports({
      students, subjects: classSubjects, assessments, results,
      gradingScale: school?.gradingScale || [],
    })
  }, [students, subjects, assessments, results, classId, term?.id, school])

  const selectedClass = classes.find(c => c.id === classId)

  const rows = useMemo(() => {
    return students.map(s => {
      const card = reportCards.find(r => r.studentId === s.id)
      const computed = computedReports.get(s.id)
      const scoresIn = results.some(r => r.studentId === s.id)
      const traitsIn = !!(card?.psychomotor?.length || card?.affective?.length)
      const commentsIn = !!(card?.classTeacherComment || card?.headTeacherComment)
      const attendanceIn = !!card?.attendance
      const ready = scoresIn && traitsIn && commentsIn
      const status = card?.status === 'published' ? 'published' : card?.status === 'draft' ? 'draft' : 'notStarted'
      return { student: s, card, computed, scoresIn, traitsIn, commentsIn, attendanceIn, ready, status }
    }).filter(r => statusFilter === 'all' || r.status === statusFilter)
  }, [students, reportCards, computedReports, results, statusFilter])

  if (loading) return <Spinner />

  return (
    <div>
      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-2 gap-3">
          <Select label="Class" value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">— pick a class —</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          {classId && (
            <Select label="Filter" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
              <option value="all">All students</option>
              <option value="published">Published only</option>
              <option value="draft">Drafts</option>
              <option value="notStarted">Not started</option>
            </Select>
          )}
        </div>
      </Card>

      {!classId ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">Pick a class to view its report cards.</p>
        </Card>
      ) : rows.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-ink-soft">No students match this filter.</p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {rows.map((row, i) => (
            <Card key={row.student.id} className="p-3 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => setViewingStudentId(row.student.id)}>
              <div className="w-8 text-center text-ink-soft text-sm">{i + 1}</div>
              <StatusDot status={row.status} />
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{row.student.fullName}</div>
                <div className="text-xs text-ink-soft mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>{row.student.admissionNumber || '—'}</span>
                  {row.computed && (
                    <>
                      <span>·</span>
                      <span>{row.computed.percentageAverage}% · Grade {row.computed.overallGrade}</span>
                      {row.computed.overallPosition && <><span>·</span><span>Pos {row.computed.overallPosition}</span></>}
                    </>
                  )}
                </div>
              </div>
              <div className="hidden md:flex items-center gap-1 text-xs text-ink-soft">
                <Chip label="scores" done={row.scoresIn} />
                <Chip label="traits" done={row.traitsIn} />
                <Chip label="comments" done={row.commentsIn} />
              </div>
              {row.card?.status === 'published' && <Badge tone="success">Published</Badge>}
              {row.card?.status === 'draft' && <Badge tone="warning">Draft</Badge>}
              <ChevronRight className="w-4 h-4 text-ink-soft" />
            </Card>
          ))}
        </div>
      )}

      {viewingStudentId && (
        <ReportCardView
          studentId={viewingStudentId}
          student={students.find(s => s.id === viewingStudentId)}
          className={selectedClass?.name || ''}
          classId={classId}
          term={term}
          computedReport={computedReports.get(viewingStudentId)}
          existingSnapshot={reportCards.find(r => r.studentId === viewingStudentId)}
          onClose={() => setViewingStudentId(null)}
          readOnly={readOnly}
        />
      )}
    </div>
  )
}

function StatusDot({ status }) {
  if (status === 'published') return <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
  if (status === 'draft') return <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
  return <Circle className="w-5 h-5 text-slate-300 flex-shrink-0" />
}
function Chip({ label, done }) {
  return (
    <span className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded ${done ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
      {label}
    </span>
  )
}
