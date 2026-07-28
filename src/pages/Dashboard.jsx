import { useEffect, useState } from 'react'
import { collection, doc, onSnapshot } from 'firebase/firestore'
import { Users, BookOpen, GraduationCap, ClipboardList } from 'lucide-react'
import { Card } from '../components/ui'
import { getFirebase } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useSchool } from '../contexts/SchoolContext'

export default function Dashboard() {
  const { db } = getFirebase()
  const { profile } = useAuth()
  const { school } = useSchool()
  const [counts, setCounts] = useState({ students: 0, classes: 0, subjects: 0 })
  const [currentTerm, setCurrentTerm] = useState(null)

  useEffect(() => {
    const unsubs = [
      onSnapshot(collection(db, 'students'), s => setCounts(c => ({ ...c, students: s.size }))),
      onSnapshot(collection(db, 'classes'), s => setCounts(c => ({ ...c, classes: s.size }))),
      onSnapshot(collection(db, 'subjects'), s => setCounts(c => ({ ...c, subjects: s.size }))),
    ]
    return () => unsubs.forEach(u => u())
  }, [db])

  useEffect(() => {
    if (!school?.currentTermId) { setCurrentTerm(null); return }
    return onSnapshot(doc(db, 'terms', school.currentTermId), snap => {
      setCurrentTerm(snap.exists() ? { id: snap.id, ...snap.data() } : null)
    })
  }, [db, school?.currentTermId])

  const termLabel = currentTerm ? `${currentTerm.academicYear} · ${currentTerm.name}` : 'Not set'
  const termNote = currentTerm ? null : 'Add one in Settings → Terms'

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold">Welcome, {profile?.fullName?.split(' ')[0]}</h1>
        <p className="text-ink-soft text-sm mt-1">{school?.name}</p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard icon={Users} label="Students" value={counts.students} />
        <StatCard icon={GraduationCap} label="Classes" value={counts.classes} />
        <StatCard icon={BookOpen} label="Subjects" value={counts.subjects} />
        <StatCard icon={ClipboardList} label="Current term" value={termLabel} note={termNote} small />
      </div>

      <Card className="p-6">
        <h2 className="font-semibold mb-4">Getting started</h2>
        <ol className="space-y-3 text-sm">
          <Step done={counts.classes > 0} label="Set up classes, subjects and grade scale" />
          <Step done={counts.students > 0} label="Add students to their classes" />
          <Step done={!!currentTerm} label="Set a current academic term" />
          <Step done={false} label="Add teachers and assign them to classes" />
          <Step done={false} label="Teachers enter scores in Result entry" />
          <Step done={false} label="Compile and publish report cards" />
        </ol>
      </Card>
    </div>
  )
}

function StatCard({ icon: Icon, label, value, note, small }) {
  return (
    <Card className="p-5">
      <Icon className="w-5 h-5 text-brand-600 mb-3" />
      <div className={small ? 'text-base font-semibold' : 'text-2xl font-semibold'}>{value}</div>
      <div className="text-sm text-ink-soft">{label}</div>
      {note && <div className="text-xs text-ink-soft mt-1">{note}</div>}
    </Card>
  )
}

function Step({ done, label }) {
  return (
    <li className="flex items-start gap-3">
      <span className={`mt-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${done ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-ink-soft'}`}>
        {done ? '✓' : ''}
      </span>
      <span className={done ? 'text-ink-soft line-through' : ''}>{label}</span>
    </li>
  )
}
