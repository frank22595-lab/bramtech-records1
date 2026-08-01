import { useState, useEffect, useMemo } from 'react'
import { collection, onSnapshot, doc, setDoc, updateDoc, serverTimestamp, query, where, orderBy } from 'firebase/firestore'
import { Users, Save, CheckCircle2, Lock, Info } from 'lucide-react'
import { Card, Select, Spinner, Button, Input } from '../../../components/ui'
import { getFirebase } from '../../../config/firebase'
import { useAuth } from '../../../contexts/AuthContext'
import { usePermissions } from '../../../hooks/usePermissions'

/**
 * Attendance tab — per-student totals per term.
 *
 * Teacher picks a class, sets "Days school opened this term" (defaults from term.timesOpened),
 * then enters days absent per student. Days present is computed automatically.
 *
 * Saved to reportCards/{studentId}_{termId}.attendance field, which is what the
 * PDF template and parent portal already read from.
 */
export default function AttendanceTab({ term, readOnly }) {
  const { db } = getFirebase()
  const { profile } = useAuth()
  const { isAdminOrDirector, isTeacher, canAccessClass } = usePermissions()

  const [classes, setClasses] = useState([])
  const [classId, setClassId] = useState('')
  const [students, setStudents] = useState([])
  const [reports, setReports] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  const [absentDays, setAbsentDays] = useState({})
  const [timesOpened, setTimesOpened] = useState(term?.timesOpened || 0)

  useEffect(() => {
    return onSnapshot(
      query(collection(db, 'classes'), orderBy('order')),
      snap => {
        setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.active))
        setLoading(false)
      }
    )
  }, [db])

  const visibleClasses = useMemo(() => {
    if (isAdminOrDirector) return classes
    return classes.filter(c => canAccessClass(c.id))
  }, [classes, isAdminOrDirector, profile])

  useEffect(() => {
    if (isTeacher && !classId && visibleClasses.length === 1) {
      setClassId(visibleClasses[0].id)
    }
  }, [isTeacher, visibleClasses, classId])

  useEffect(() => {
    if (!classId) { setStudents([]); return }
    return onSnapshot(
      query(collection(db, 'students'), where('classId', '==', classId), where('active', '==', true)),
      snap => {
        setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.fullName.localeCompare(b.fullName)))
      }
    )
  }, [db, classId])

  useEffect(() => {
    if (!classId || !term?.id) { setReports({}); return }
    return onSnapshot(
      query(collection(db, 'reportCards'), where('classId', '==', classId), where('termId', '==', term.id)),
      snap => {
        const map = {}
        snap.docs.forEach(d => { map[d.data().studentId] = { id: d.id, ...d.data() } })
        setReports(map)
      }
    )
  }, [db, classId, term?.id])

  useEffect(() => {
    const init = {}
    Object.entries(reports).forEach(([sid, r]) => {
      init[sid] = r.attendance?.daysAbsent ?? ''
    })
    setAbsentDays(init)
  }, [reports])

  useEffect(() => {
    if (term?.timesOpened != null) setTimesOpened(term.timesOpened)
  }, [term?.timesOpened])

  const setAbsent = (studentId, value) => {
    const num = value.replace(/[^0-9]/g, '')
    setAbsentDays(prev => ({ ...prev, [studentId]: num }))
  }

  const saveAll = async () => {
    if (Number(timesOpened) <= 0) {
      setMsg('Please enter how many days school opened this term.')
      return
    }
    setSaving(true)
    setMsg('')
    try {
      if (Number(timesOpened) !== (term?.timesOpened || 0)) {
        await updateDoc(doc(db, 'terms', term.id), {
          timesOpened: Number(timesOpened),
          updatedAt: serverTimestamp(),
        })
      }

      const opened = Number(timesOpened)
      for (const student of students) {
        const daysAbsent = Number(absentDays[student.id] || 0)
        const daysPresent = Math.max(0, opened - daysAbsent)
        const percentage = opened > 0
          ? Math.round((daysPresent / opened) * 100 * 10) / 10
          : 0

        const reportId = `${student.id}_${term.id}`
        await setDoc(doc(db, 'reportCards', reportId), {
          studentId: student.id,
          studentName: student.fullName,
          termId: term.id,
          termName: term.name || '',
          academicYear: term.academicYear || '',
          classId,
          className: classes.find(c => c.id === classId)?.name || '',
          attendance: {
            timesOpened: opened,
            daysPresent,
            daysAbsent,
            percentage,
            daysTotal: opened,
          },
          updatedAt: serverTimestamp(),
        }, { merge: true })
      }

      setMsg('Attendance saved ✓')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) {
      setMsg('Save failed: ' + err.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <Spinner />

  if (isTeacher && visibleClasses.length === 0) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">No classes assigned</p>
            <p className="text-sm text-amber-800 mt-1">
              Your director hasn't assigned you to any classes yet. Ask them to assign you a class so you can record attendance.
            </p>
          </div>
        </div>
      </Card>
    )
  }

  return (
    <div>
      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-2 gap-3">
          <Select label="Class" value={classId} onChange={e => setClassId(e.target.value)}>
            <option value="">— pick a class —</option>
            {visibleClasses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Input
            label="Days school opened this term"
            type="number"
            min="0"
            value={timesOpened}
            onChange={e => setTimesOpened(e.target.value)}
            placeholder="e.g. 188"
          />
        </div>
      </Card>

      {!classId ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">Pick a class to record attendance.</p>
        </Card>
      ) : students.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-ink-soft">No students in this class.</p>
        </Card>
      ) : (
        <>
          <Card className="p-3 mb-3 bg-slate-50 text-xs text-ink-soft flex items-start gap-2">
            <Info className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>
              Enter each student's days absent this term. Days present is auto-calculated as
              <strong> {timesOpened || '?'} </strong> minus days absent.
            </span>
          </Card>

          <div className="border border-slate-200 rounded overflow-hidden">
            <div className="grid grid-cols-[1fr_90px_90px_60px] gap-2 bg-slate-100 p-3 text-xs font-semibold">
              <div>Student</div>
              <div className="text-center">Absent</div>
              <div className="text-center">Present</div>
              <div className="text-center">%</div>
            </div>
            {students.map((s, i) => {
              const absent = Number(absentDays[s.id] || 0)
              const opened = Number(timesOpened || 0)
              const present = Math.max(0, opened - absent)
              const pct = opened > 0 ? Math.round((present / opened) * 100 * 10) / 10 : 0
              return (
                <div key={s.id} className={`grid grid-cols-[1fr_90px_90px_60px] gap-2 p-2.5 items-center ${i % 2 ? 'bg-slate-50' : 'bg-white'}`}>
                  <div className="text-sm truncate">{s.fullName}</div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max={opened}
                      value={absentDays[s.id] ?? ''}
                      onChange={e => setAbsent(s.id, e.target.value)}
                      disabled={readOnly}
                      className="w-full text-center py-1.5 border border-slate-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                    />
                  </div>
                  <div className="text-center text-sm font-medium text-emerald-700">{present}</div>
                  <div className="text-center text-xs text-slate-600">{pct}%</div>
                </div>
              )
            })}
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 flex-wrap">
            {msg && (
              <span className={`text-sm ${msg.includes('failed') || msg.includes('Please') ? 'text-red-600' : 'text-emerald-700'}`}>
                {msg}
              </span>
            )}
            <Button onClick={saveAll} disabled={saving || readOnly}>
              {saving ? 'Saving…' : <><Save className="w-4 h-4" /> Save attendance</>}
            </Button>
          </div>
        </>
      )}
    </div>
  )
}
