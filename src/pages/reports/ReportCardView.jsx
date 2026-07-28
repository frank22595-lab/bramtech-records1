import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, query, where, setDoc, serverTimestamp } from 'firebase/firestore'
import { X, Download, Eye, CheckCircle2, Award, Loader2 } from 'lucide-react'
import { Button, Card, Badge } from '../../components/ui'
import { getFirebase } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useSchool } from '../../contexts/SchoolContext'
import { generateReportCardPDF } from '../../lib/pdfGenerator'
import { ordinal, calculateAge, attendancePercentage } from '../../lib/reportCardCompute'
import { buildPublishSnapshot } from '../../lib/publishSnapshot'
import PDFPreviewModal from './PDFPreviewModal'

export default function ReportCardView({
  studentId, student, className, classId, term,
  computedReport, existingSnapshot,
  onClose, readOnly = false,
}) {
  const { db } = getFirebase()
  const { profile } = useAuth()
  const { school } = useSchool()

  const isAdmin = profile?.role === 'director' || profile?.role === 'admin'
  const isPublished = existingSnapshot?.status === 'published'
  const config = school?.reportCardConfig || {}

  const [classTeacher, setClassTeacher] = useState(null)
  const [downloading, setDownloading] = useState(false)
  useEffect(() => {
    if (!classId) return
    return onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'teacher'), where('classTeacherOf', '==', classId)),
      snap => {
        const t = snap.docs[0]
        setClassTeacher(t ? { id: t.id, ...t.data() } : null)
      }
    )
  }, [db, classId])

  const frozen = isPublished && existingSnapshot?.publishSnapshot ? {
    ...existingSnapshot.publishSnapshot,
    studentName: existingSnapshot.studentName,
    termName: existingSnapshot.termName,
    academicYear: existingSnapshot.academicYear,
    className: existingSnapshot.className,
    classId: existingSnapshot.classId,
    termId: existingSnapshot.termId,
  } : null

  const source = frozen || (computedReport ? {
    ...computedReport,
    studentName: student.fullName,
    termName: term?.name,
    academicYear: term?.academicYear,
    className, classId, termId: term?.id,
  } : null)

  const [preview, setPreview] = useState(false)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const age = calculateAge(student?.dateOfBirth, term?.endDate ? new Date(term.endDate) : new Date())
  const timesOpened = term?.timesOpened || null
  const daysPresent = Number(existingSnapshot?.attendance?.daysPresent) || 0
  const daysAbsent = Number(existingSnapshot?.attendance?.daysAbsent) || 0
  const attendancePct = timesOpened ? attendancePercentage(daysPresent, timesOpened) : null
  const classTeacherName = existingSnapshot?.classTeacherName || classTeacher?.fullName || ''
  const principalName = school?.principalName || ''
  const principalTitle = school?.principalTitle || 'Principal'

  if (!source) {
    return (
      <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
        <Card className="max-w-md w-full" onClick={e => e.stopPropagation()}>
          <div className="p-4 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-base font-semibold">Report card unavailable</h2>
            <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
          </div>
          <div className="p-6 text-sm text-ink-soft space-y-2">
            <p><strong className="text-ink">{student?.fullName || 'This student'}</strong> has no scores entered yet for this term.</p>
            <p>Enter scores under <strong>Result entry</strong> first, then the report card will be available here.</p>
          </div>
          <div className="p-4 border-t border-slate-200 flex justify-end">
            <Button onClick={onClose}>Close</Button>
          </div>
        </Card>
      </div>
    )
  }

  const publish = async () => {
    setMsg(''); setSaving(true)
    try {
      const snapshot = buildPublishSnapshot({ report: source, subjects: source.subjects })
      const reportId = `${studentId}_${term?.id}`
      await setDoc(doc(db, 'reportCards', reportId), {
        studentId, studentName: student.fullName,
        admissionNumber: student.admissionNumber || null,
        dateOfBirth: student.dateOfBirth || null,
        age, gender: student.gender || null,
        termId: term?.id, termName: term?.name || '', academicYear: term?.academicYear || '',
        classId, className,
        publishSnapshot: snapshot,
        totalObtained: source.totalObtained, totalPossible: source.totalPossible,
        percentageAverage: source.percentageAverage,
        overallGrade: source.overallGrade, overallRemark: source.overallRemark,
        overallPosition: source.overallPosition || null,
        classSize: source.classSize,
        classAverage: source.classAverage,
        status: 'published',
        publishedAt: serverTimestamp(),
        publishedBy: profile.id,
        resumesOn: term?.resumesOn || null,
        closingDate: term?.closingDate || null,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setMsg('Published ✓')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) { setMsg('Publish failed: ' + err.message) } finally { setSaving(false) }
  }

  const unpublish = async () => {
    if (!confirm('Unpublish this report card? Parents will no longer see it.')) return
    setMsg(''); setSaving(true)
    try {
      const reportId = `${studentId}_${term?.id}`
      await setDoc(doc(db, 'reportCards', reportId), {
        status: 'draft',
        publishedAt: null,
        updatedAt: serverTimestamp(),
      }, { merge: true })
      setMsg('Unpublished')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) { setMsg('Failed: ' + err.message) } finally { setSaving(false) }
  }

  // ⚠️ buildPDF is now async — it fetches Cloudinary images before rendering
  const buildPDF = async () => {
    const subjectsForPDF = source.subjects.map(s => {
      const assessmentsObj = Array.isArray(s.assessments)
        ? Object.fromEntries(s.assessments.map(a => [a.assessmentId || a.code, {
            code: a.code, name: a.name, score: a.score, maxScore: a.maxScore
          }]))
        : s.assessments
      return { ...s, assessments: assessmentsObj }
    })
    return await generateReportCardPDF({
      school, student, className, term, age,
      report: { ...source, subjects: subjectsForPDF },
      attendance: existingSnapshot?.attendance || null,
      psychomotor: config.showPsychomotor !== false ? (existingSnapshot?.psychomotor || []) : null,
      affective: config.showAffective !== false ? (existingSnapshot?.affective || []) : null,
      classTeacher: existingSnapshot?.classTeacherComment ? {
        comment: existingSnapshot.classTeacherComment,
        name: classTeacherName,
      } : null,
      headTeacher: existingSnapshot?.headTeacherComment ? {
        comment: existingSnapshot.headTeacherComment,
        name: principalName,
        title: principalTitle,
      } : null,
      adviser: existingSnapshot?.adviserComment && config.showAdviserComment ? {
        comment: existingSnapshot.adviserComment,
        name: existingSnapshot.adviserName || 'Academic Adviser',
      } : null,
      config,
    })
  }

  const downloadPDF = async () => {
    setDownloading(true)
    try {
      const pdf = await buildPDF()
      const filename = `${student.fullName.replace(/\s+/g, '_')}_${term?.academicYear || ''}_${term?.name || ''}.pdf`.replace(/\s+/g, '_')
      pdf.save(filename)
    } catch (err) {
      alert('PDF generation failed: ' + err.message)
    } finally {
      setDownloading(false)
    }
  }
  const previewFilename = `${student.fullName.replace(/\s+/g, '_')}_${term?.academicYear || ''}_${term?.name || ''}.pdf`.replace(/\s+/g, '_')

  return (
    <>
      <div className="fixed inset-0 bg-black/40 flex items-start justify-center p-4 z-50 overflow-y-auto" onClick={onClose}>
        <Card className="max-w-5xl w-full my-4" onClick={e => e.stopPropagation()}>
          <div className="p-4 md:p-5 border-b border-slate-200 flex items-center justify-between gap-3 sticky top-0 bg-white z-10">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg md:text-xl font-semibold truncate">{student.fullName}</h2>
                {isPublished && <Badge tone="success">Published</Badge>}
                {existingSnapshot?.status === 'draft' && <Badge tone="warning">Draft</Badge>}
              </div>
              <p className="text-xs text-ink-soft">{className} · {term?.academicYear} {term?.name}</p>
            </div>
            <div className="flex gap-2 flex-shrink-0">
              <Button variant="secondary" onClick={() => setPreview(true)}><Eye className="w-4 h-4" /> Preview</Button>
              <Button variant="secondary" onClick={downloadPDF} disabled={downloading}>
                {downloading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {downloading ? 'Building…' : 'PDF'}
              </Button>
              <button onClick={onClose} className="p-2 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
            </div>
          </div>

          <div className="p-4 md:p-6 space-y-5">
            <div className="text-center border-b border-slate-200 pb-4">
              {school?.logoUrl && (
                <img src={school.logoUrl} alt="Logo" className="h-16 w-16 object-contain mx-auto mb-2" />
              )}
              <div className="font-bold text-lg">{(school?.name || '').toUpperCase()}</div>
              {school?.address && <div className="text-xs text-ink-soft">{school.address}</div>}
              {school?.motto && <div className="text-xs italic text-ink-soft">"{school.motto}"</div>}
            </div>

            <div className="text-center bg-slate-100 py-2 rounded text-sm font-semibold">
              {term?.academicYear} · {term?.name?.toUpperCase()} · REPORT SHEET
            </div>

            <div className="grid md:grid-cols-3 gap-3">
              <InfoPanel title="Student">
                {student.photoUrl && (
                  <img src={student.photoUrl} alt={student.fullName} className="w-20 h-20 rounded-full object-cover mx-auto mb-2" />
                )}
                <Row label="Name" value={student.fullName} />
                {config.showRegNumber !== false && <Row label="Adm #" value={student.admissionNumber || '—'} />}
                <Row label="Class" value={className} />
                <Row label="Gender" value={student.gender ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1) : '—'} />
                {student.dateOfBirth && <Row label="DOB" value={student.dateOfBirth} />}
                {config.showAge !== false && age !== null && <Row label="Age" value={`${age} years`} />}
                {config.showWeightHeight && student.weight && <Row label="Weight" value={`${student.weight} kg`} />}
                {config.showWeightHeight && student.height && <Row label="Height" value={`${student.height} cm`} />}
              </InfoPanel>
              <InfoPanel title="Class">
                <Row label="Class size" value={source.classSize} />
                {config.showPosition !== false && source.overallPosition && (
                  <Row label="Position" value={`${ordinal(source.overallPosition)} of ${source.classSize}`} />
                )}
                {config.showNoSubjects !== false && <Row label="Subjects" value={source.subjects.length} />}
                {classTeacherName && <Row label="Class teacher" value={classTeacherName} />}
                {term?.closingDate && <Row label="Term ended" value={term.closingDate} />}
              </InfoPanel>
              {existingSnapshot?.attendance && config.showAttendance !== false && (
                <InfoPanel title="Attendance">
                  {config.showTimesOpened !== false && timesOpened && <Row label="School opened" value={`${timesOpened} days`} />}
                  <Row label="Days present" value={daysPresent} />
                  <Row label="Days absent" value={daysAbsent} />
                  {config.showAttendancePercent !== false && attendancePct !== null && (
                    <Row label="Attendance" value={`${attendancePct}%`} />
                  )}
                </InfoPanel>
              )}
            </div>

            <div>
              <div className="text-sm font-semibold mb-2">Academic Performance</div>
              <div className="overflow-x-auto border border-slate-200 rounded">
                <table className="w-full text-xs">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="text-left px-2 py-1.5 font-semibold">Subject</th>
                      {getAssessmentCodes(source).map(code => (
                        <th key={code} className="px-2 py-1.5 text-center font-semibold whitespace-nowrap">{code}</th>
                      ))}
                      <th className="px-2 py-1.5 text-center font-semibold">Total</th>
                      <th className="px-2 py-1.5 text-center font-semibold">Grade</th>
                      {config.showSubjectPosition !== false && <th className="px-2 py-1.5 text-center font-semibold">Pos</th>}
                      {config.showClassAverage !== false && <th className="px-2 py-1.5 text-center font-semibold hidden md:table-cell">Avg</th>}
                      {config.showClassHighest !== false && <th className="px-2 py-1.5 text-center font-semibold hidden md:table-cell">High</th>}
                      {config.showClassLowest !== false && <th className="px-2 py-1.5 text-center font-semibold hidden md:table-cell">Low</th>}
                      <th className="px-2 py-1.5 text-left font-semibold hidden md:table-cell">Remark</th>
                    </tr>
                  </thead>
                  <tbody>
                    {source.subjects.map(s => {
                      const codes = getAssessmentCodes(source)
                      const arr = Array.isArray(s.assessments) ? s.assessments : Object.values(s.assessments)
                      return (
                        <tr key={s.subjectId} className="border-t border-slate-100">
                          <td className="px-2 py-1.5 font-medium">{s.subjectName}</td>
                          {codes.map(code => {
                            const a = arr.find(x => x.code === code)
                            return <td key={code} className="px-2 py-1.5 text-center">{a?.score ?? '—'}</td>
                          })}
                          <td className="px-2 py-1.5 text-center font-semibold">{s.total}</td>
                          <td className="px-2 py-1.5 text-center font-semibold">{s.grade}</td>
                          {config.showSubjectPosition !== false && <td className="px-2 py-1.5 text-center">{s.classPosition ? ordinal(s.classPosition) : '-'}</td>}
                          {config.showClassAverage !== false && <td className="px-2 py-1.5 text-center text-ink-soft hidden md:table-cell">{s.classAverage}</td>}
                          {config.showClassHighest !== false && <td className="px-2 py-1.5 text-center text-emerald-700 hidden md:table-cell">{s.classHighest}</td>}
                          {config.showClassLowest !== false && <td className="px-2 py-1.5 text-center text-red-600 hidden md:table-cell">{s.classLowest}</td>}
                          <td className="px-2 py-1.5 text-ink-soft hidden md:table-cell">{s.remark}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-3 bg-slate-50 rounded-lg p-4">
              {config.showMarksObtainable !== false && (<>
                <Stat label="Marks obtainable" value={source.totalPossible} />
                <Stat label="Marks obtained" value={source.totalObtained} />
              </>)}
              <Stat label="Percentage" value={`${source.percentageAverage}%`} />
              <Stat label="Grade" value={source.overallGrade} />
              {config.showPosition !== false && source.overallPosition && (
                <Stat label="Position" value={ordinal(source.overallPosition)} />
              )}
              <Stat label="Remark" value={source.overallRemark} />
            </div>

            {existingSnapshot?.adviserComment && config.showAdviserComment && (
              <div>
                <div className="text-sm font-semibold mb-1">Academic Adviser's Report</div>
                <div className="bg-slate-50 p-3 rounded text-sm">{existingSnapshot.adviserComment}</div>
                <div className="text-xs text-ink-soft mt-1">— {existingSnapshot.adviserName || 'Academic Adviser'}</div>
              </div>
            )}
            {existingSnapshot?.classTeacherComment && (
              <div>
                <div className="text-sm font-semibold mb-1">Class Teacher's Comment</div>
                <div className="bg-slate-50 p-3 rounded text-sm">{existingSnapshot.classTeacherComment}</div>
                <div className="text-xs text-ink-soft mt-1">— {classTeacherName || existingSnapshot.classTeacherName}</div>
              </div>
            )}
            {existingSnapshot?.headTeacherComment && (
              <div>
                <div className="text-sm font-semibold mb-1">{principalTitle}'s Comment</div>
                <div className="bg-slate-50 p-3 rounded text-sm">{existingSnapshot.headTeacherComment}</div>
                <div className="text-xs text-ink-soft mt-1 flex items-center gap-3 flex-wrap">
                  <span>— {principalName || existingSnapshot.headTeacherName} ({existingSnapshot.headTeacherTitle || principalTitle})</span>
                  {school?.principalSignatureUrl && (
                    <img src={school.principalSignatureUrl} alt="Signature" className="h-8 object-contain" />
                  )}
                  {school?.stampUrl && (
                    <img src={school.stampUrl} alt="Stamp" className="h-10 w-10 object-contain" />
                  )}
                </div>
              </div>
            )}
            {!existingSnapshot?.classTeacherComment && !existingSnapshot?.headTeacherComment && !readOnly && (
              <Card className="p-4 bg-amber-50 border-amber-200 text-sm">
                <p className="text-amber-900">No traits or comments yet. Fill them in from <strong>Terms → {term?.name} → Traits & comments</strong>.</p>
              </Card>
            )}
          </div>

          {isAdmin && !readOnly && (
            <div className="p-4 md:p-6 border-t border-slate-200 flex items-center justify-between gap-3 flex-wrap">
              {msg && <span className={`text-sm ${msg.includes('failed') || msg.includes('Failed') ? 'text-red-600' : 'text-emerald-700'}`}>{msg}</span>}
              <div className="flex gap-2 ml-auto">
                {isPublished ? (
                  <Button variant="secondary" onClick={unpublish} disabled={saving}>
                    {saving ? 'Working…' : 'Unpublish'}
                  </Button>
                ) : (
                  <Button onClick={publish} disabled={saving}>
                    <CheckCircle2 className="w-4 h-4" /> {saving ? 'Publishing…' : 'Publish'}
                  </Button>
                )}
              </div>
            </div>
          )}
          {isPublished && (
            <div className="p-4 md:p-6 border-t border-slate-200 text-center text-sm text-ink-soft bg-emerald-50">
              <Award className="w-4 h-4 inline mr-1 text-emerald-600" />
              This report card is published. Parents can view and download it.
            </div>
          )}
        </Card>
      </div>

      {preview && (
        <PDFPreviewModal
          pdfFactory={buildPDF}
          filename={previewFilename}
          onClose={() => setPreview(false)}
        />
      )}
    </>
  )
}

function InfoPanel({ title, children }) {
  return (
    <div className="border border-slate-200 rounded p-3 text-xs space-y-1">
      <div className="font-semibold text-sm mb-1.5">{title}</div>
      {children}
    </div>
  )
}
function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-2">
      <span className="text-ink-soft">{label}:</span>
      <span className="font-medium text-right">{value ?? '—'}</span>
    </div>
  )
}
function Stat({ label, value }) {
  return (
    <div>
      <div className="text-xs text-ink-soft">{label}</div>
      <div className="text-sm font-semibold mt-0.5">{value}</div>
    </div>
  )
}
function getAssessmentCodes(source) {
  if (!source?.subjects?.length) return []
  const first = source.subjects[0]
  if (Array.isArray(first.assessments)) return first.assessments.map(a => a.code)
  return Object.values(first.assessments).map(a => a.code)
}
