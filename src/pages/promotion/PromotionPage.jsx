import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, doc, onSnapshot, orderBy, query, writeBatch, serverTimestamp, where } from 'firebase/firestore'
import {
  GraduationCap, ArrowRight, Users, AlertCircle, Sparkles,
  Check, Trophy, Info, Loader2, ChevronDown, ChevronRight,
} from 'lucide-react'
import { Card, Button, Spinner, Badge, Alert, BackButton } from '../../components/ui'
import { getFirebase } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'
import { useSchool } from '../../contexts/SchoolContext'
import { usePermissions } from '../../hooks/usePermissions'

/**
 * PromotionPage
 *
 * End-of-session flow: move active students up one class, and graduate students
 * in the terminal (highest-order) class.
 *
 * Terminal class detection: whichever active class has the highest `order`.
 * If a school wants a different mapping later, we can add an explicit
 * `nextClassId` field to class docs and honor it here.
 *
 * Individual students can be excluded ("held back") from promotion. Excluded
 * students stay in their current class.
 *
 * On confirmation, students are moved in a single writeBatch. Graduated
 * students are marked inactive with a `graduatedAt` timestamp so they can be
 * shown in a "Past students" view later.
 */
export default function PromotionPage() {
  const { db } = getFirebase()
  const nav = useNavigate()
  const { profile } = useAuth()
  const { school } = useSchool()
  const { isAdminOrDirector } = usePermissions()

  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState({})       // classId -> boolean
  const [excluded, setExcluded] = useState(new Set())// studentIds to hold back
  const [processing, setProcessing] = useState(false)
  const [done, setDone] = useState(null)             // { promoted, graduated, held }
  const [error, setError] = useState('')

  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, 'classes'), orderBy('order')),
        snap => {
          setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.active !== false))
        }
      ),
      onSnapshot(
        query(collection(db, 'students'), where('active', '==', true)),
        snap => {
          setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
          setLoading(false)
        }
      ),
    ]
    return () => unsubs.forEach(u => u())
  }, [db])

  // Ordered class list — [c1, c2, c3, ...] where c(n+1) is next after c(n).
  // Last item is the terminal class (graduation destination).
  const orderedClasses = useMemo(
    () => [...classes].sort((a, b) => (a.order || 0) - (b.order || 0)),
    [classes]
  )

  // Build the plan: for each class, what happens to each student
  const plan = useMemo(() => {
    return orderedClasses.map((cls, i) => {
      const nextClass = orderedClasses[i + 1] || null  // null = terminal (graduate)
      const inClass = students
        .filter(s => s.classId === cls.id)
        .sort((a, b) => a.fullName.localeCompare(b.fullName))
      const promoting = inClass.filter(s => !excluded.has(s.id))
      const holding = inClass.filter(s => excluded.has(s.id))
      return {
        cls,
        nextClass,
        isTerminal: !nextClass,
        students: inClass,
        promoting,
        holding,
      }
    })
  }, [orderedClasses, students, excluded])

  const totals = useMemo(() => {
    return plan.reduce((acc, row) => {
      if (row.isTerminal) {
        acc.graduating += row.promoting.length
      } else {
        acc.promoting += row.promoting.length
      }
      acc.holding += row.holding.length
      return acc
    }, { promoting: 0, graduating: 0, holding: 0 })
  }, [plan])

  const toggleExcluded = (studentId) => {
    setExcluded(prev => {
      const next = new Set(prev)
      if (next.has(studentId)) next.delete(studentId)
      else next.add(studentId)
      return next
    })
  }

  const toggleAllInClass = (classId, hold) => {
    setExcluded(prev => {
      const next = new Set(prev)
      const inClass = students.filter(s => s.classId === classId)
      inClass.forEach(s => {
        if (hold) next.add(s.id)
        else next.delete(s.id)
      })
      return next
    })
  }

  const executePromotion = async () => {
    if (!isAdminOrDirector) return

    const total = totals.promoting + totals.graduating
    if (total === 0) {
      setError('No students to promote.')
      return
    }

    const confirmMsg =
      `You are about to:\n\n` +
      `• Promote ${totals.promoting} student${totals.promoting === 1 ? '' : 's'} to the next class\n` +
      `• Graduate ${totals.graduating} student${totals.graduating === 1 ? '' : 's'} from the school\n` +
      `• Hold back ${totals.holding} student${totals.holding === 1 ? '' : 's'} in their current class\n\n` +
      `This cannot be easily reversed. Continue?`

    if (!confirm(confirmMsg)) return

    setProcessing(true)
    setError('')
    try {
      const batch = writeBatch(db)
      let promoted = 0
      let graduated = 0

      for (const row of plan) {
        for (const student of row.promoting) {
          const ref = doc(db, 'students', student.id)
          if (row.isTerminal) {
            // Graduate
            batch.update(ref, {
              active: false,
              status: 'graduated',
              graduatedAt: serverTimestamp(),
              graduatedFromClassId: row.cls.id,
              graduatedFromClassName: row.cls.name,
              graduatedBy: profile?.id || null,
              updatedAt: serverTimestamp(),
            })
            graduated++
          } else {
            // Move up one class
            batch.update(ref, {
              classId: row.nextClass.id,
              className: row.nextClass.name,
              previousClassId: row.cls.id,
              previousClassName: row.cls.name,
              promotedAt: serverTimestamp(),
              promotedBy: profile?.id || null,
              updatedAt: serverTimestamp(),
            })
            promoted++
          }
        }
      }

      await batch.commit()
      setDone({ promoted, graduated, held: totals.holding })
    } catch (err) {
      console.error('Promotion error:', err)
      setError('Promotion failed: ' + err.message)
    } finally {
      setProcessing(false)
    }
  }

  if (!isAdminOrDirector) {
    return (
      <div className="p-6 md:p-8 max-w-3xl">
        <BackButton to="/dashboard" />
        <Card className="p-6 bg-red-50 border-red-200">
          <p className="text-sm text-red-900">Only directors and admins can promote students.</p>
        </Card>
      </div>
    )
  }

  if (loading) return <div className="p-8"><Spinner /></div>

  // Success state
  if (done) {
    return (
      <div className="p-6 md:p-8 max-w-3xl">
        <Card className="p-8 text-center">
          <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-ink mb-2">Promotion complete!</h1>
          <p className="text-ink-soft mb-6">Students have been moved successfully.</p>
          <div className="grid grid-cols-3 gap-3 max-w-md mx-auto mb-6">
            <SummaryStat label="Promoted" value={done.promoted} tone="brand" />
            <SummaryStat label="Graduated" value={done.graduated} tone="amber" />
            <SummaryStat label="Held back" value={done.held} tone="slate" />
          </div>
          <div className="flex gap-2 justify-center flex-wrap">
            <Button variant="secondary" onClick={() => nav('/school/students')}>
              View students
            </Button>
            <Button onClick={() => nav('/dashboard')}>
              Back to dashboard
            </Button>
          </div>
        </Card>
      </div>
    )
  }

  // Empty state
  if (orderedClasses.length === 0 || students.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-3xl">
        <BackButton to="/dashboard" />
        <Card className="p-12 text-center">
          <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">No active students to promote.</p>
        </Card>
      </div>
    )
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl">
      <BackButton to="/dashboard" />

      <div className="mb-6">
        <div className="flex items-center gap-2 mb-2">
          <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h1 className="text-2xl md:text-3xl font-bold">Promote students</h1>
        </div>
        <p className="text-ink-soft text-sm max-w-2xl">
          End-of-session promotion. Move every student up one class. Students in the
          highest class ({orderedClasses.at(-1)?.name}) will be graduated. Hold back individual students by ticking their box.
        </p>
      </div>

      <Alert tone="warning" className="mb-4">
        <strong>This is a session-end action.</strong> Only do this after all report cards for the final term are published. This action cannot be easily reversed.
      </Alert>

      {/* Summary at top */}
      <Card className="p-4 mb-6">
        <div className="grid grid-cols-3 gap-3">
          <SummaryStat label="To promote" value={totals.promoting} tone="brand" icon={ArrowRight} />
          <SummaryStat label="To graduate" value={totals.graduating} tone="amber" icon={Trophy} />
          <SummaryStat label="Held back" value={totals.holding} tone="slate" icon={Users} />
        </div>
      </Card>

      {/* Per-class breakdown */}
      <div className="space-y-3 mb-6">
        {plan.map(row => (
          <ClassCard
            key={row.cls.id}
            row={row}
            isExpanded={!!expanded[row.cls.id]}
            onToggle={() => setExpanded(e => ({ ...e, [row.cls.id]: !e[row.cls.id] }))}
            excluded={excluded}
            onToggleStudent={toggleExcluded}
            onHoldAll={() => toggleAllInClass(row.cls.id, true)}
            onIncludeAll={() => toggleAllInClass(row.cls.id, false)}
          />
        ))}
      </div>

      {/* Action bar */}
      <Card className="p-4 sticky bottom-4 shadow-lg border-brand-200">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="text-sm text-ink">
            <strong>{totals.promoting + totals.graduating}</strong> students will be moved.
            {totals.holding > 0 && <span className="text-ink-soft"> ({totals.holding} held back)</span>}
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => nav('/dashboard')}>Cancel</Button>
            <Button
              onClick={executePromotion}
              disabled={processing || (totals.promoting + totals.graduating === 0)}
            >
              {processing ? (
                <><Loader2 className="w-4 h-4 animate-spin" /> Promoting…</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Promote all</>
              )}
            </Button>
          </div>
        </div>
        {error && (
          <div className="mt-3 text-sm text-red-600 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
            <span>{error}</span>
          </div>
        )}
      </Card>
    </div>
  )
}

function ClassCard({ row, isExpanded, onToggle, excluded, onToggleStudent, onHoldAll, onIncludeAll }) {
  const { cls, nextClass, isTerminal, students, promoting, holding } = row

  return (
    <Card className="overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full p-4 flex items-center gap-3 hover:bg-slate-50 transition-colors"
      >
        {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}

        <div className="flex-1 flex items-center gap-3 flex-wrap min-w-0 text-left">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-semibold">{cls.name}</span>
              <span className="text-xs text-ink-soft">{students.length} student{students.length === 1 ? '' : 's'}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isTerminal ? (
              <Badge tone="warning"><Trophy className="w-3 h-3 inline mr-1" />Graduating</Badge>
            ) : (
              <span className="text-sm text-ink-soft flex items-center gap-1">
                <ArrowRight className="w-3.5 h-3.5" />
                <span className="font-medium text-ink">{nextClass?.name}</span>
              </span>
            )}
          </div>
        </div>

        <div className="text-xs text-ink-soft hidden sm:flex items-center gap-3">
          {promoting.length > 0 && <span className="text-emerald-700">{promoting.length} moving</span>}
          {holding.length > 0 && <span className="text-slate-500">{holding.length} held</span>}
        </div>
      </button>

      {isExpanded && (
        <div className="border-t border-slate-100">
          {students.length === 0 ? (
            <div className="p-4 text-sm text-ink-soft text-center">No active students in this class.</div>
          ) : (
            <>
              <div className="p-3 border-b border-slate-100 flex justify-end gap-2 flex-wrap">
                <button
                  onClick={onIncludeAll}
                  className="text-xs text-brand-700 hover:underline"
                >
                  Include all
                </button>
                <span className="text-slate-300">|</span>
                <button
                  onClick={onHoldAll}
                  className="text-xs text-slate-600 hover:underline"
                >
                  Hold back all
                </button>
              </div>
              <div className="divide-y divide-slate-100">
                {students.map(s => {
                  const isHeld = excluded.has(s.id)
                  return (
                    <label
                      key={s.id}
                      className="flex items-center gap-3 p-3 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={!isHeld}
                        onChange={() => onToggleStudent(s.id)}
                        className="w-4 h-4 accent-brand-600 flex-shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">{s.fullName}</div>
                        <div className="text-xs text-ink-soft">{s.admissionNumber || '—'}</div>
                      </div>
                      {isHeld ? (
                        <Badge tone="default">Held back</Badge>
                      ) : isTerminal ? (
                        <Badge tone="warning">Graduating</Badge>
                      ) : (
                        <span className="text-xs text-emerald-700 font-medium">→ {nextClass?.name}</span>
                      )}
                    </label>
                  )
                })}
              </div>
            </>
          )}
        </div>
      )}
    </Card>
  )
}

function SummaryStat({ icon: Icon, label, value, tone = 'brand' }) {
  const tones = {
    brand:   'text-brand-700',
    emerald: 'text-emerald-700',
    amber:   'text-amber-700',
    slate:   'text-slate-600',
  }
  return (
    <div className="text-center">
      <div className={`text-2xl md:text-3xl font-bold ${tones[tone]}`}>{value}</div>
      <div className="text-xs text-ink-soft mt-0.5 flex items-center justify-center gap-1">
        {Icon && <Icon className="w-3 h-3" />} {label}
      </div>
    </div>
  )
}
