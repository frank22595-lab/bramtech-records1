import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { collection, onSnapshot, query, where } from 'firebase/firestore'
import { ClipboardList, Star, FileText, TrendingUp } from 'lucide-react'
import { Card, Spinner } from '../../../components/ui'
import { getFirebase } from '../../../config/firebase'

export default function OverviewTab({ term }) {
  const { db } = getFirebase()
  const { termId } = useParams()
  const nav = useNavigate()
  const [students, setStudents] = useState([])
  const [reportCards, setReportCards] = useState([])
  const [scoreCount, setScoreCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(query(collection(db, 'students'), where('active', '==', true)), snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [db])

  useEffect(() => {
    return onSnapshot(query(collection(db, 'reportCards'), where('termId', '==', termId)), snap => {
      setReportCards(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
  }, [db, termId])

  useEffect(() => {
    return onSnapshot(query(collection(db, 'results'), where('termId', '==', termId)), snap => {
      setScoreCount(snap.size)
    })
  }, [db, termId])

  const totalStudents = students.length
  const published = reportCards.filter(r => r.status === 'published').length
  const drafts = reportCards.filter(r => r.status === 'draft').length
  const notStarted = Math.max(0, totalStudents - published - drafts)
  const publishPct = totalStudents > 0 ? Math.round((published / totalStudents) * 100) : 0

  if (loading) return <Spinner />

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Students" value={totalStudents} />
        <StatCard label="Scores entered" value={scoreCount} />
        <StatCard label="Report cards published" value={`${published} / ${totalStudents}`} accent="emerald" />
        <StatCard label="Progress" value={`${publishPct}%`} accent="brand" />
      </div>

      <Card className="p-5">
        <h3 className="font-medium mb-3">Report card status</h3>
        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden mb-3">
          <div className="flex h-full">
            <div className="bg-emerald-500 h-full" style={{ width: `${(published / Math.max(totalStudents, 1)) * 100}%` }}></div>
            <div className="bg-amber-400 h-full" style={{ width: `${(drafts / Math.max(totalStudents, 1)) * 100}%` }}></div>
          </div>
        </div>
        <div className="flex gap-4 text-sm flex-wrap">
          <span><span className="inline-block w-2 h-2 rounded-full bg-emerald-500 mr-1.5"></span>{published} Published</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-amber-400 mr-1.5"></span>{drafts} Draft</span>
          <span><span className="inline-block w-2 h-2 rounded-full bg-slate-300 mr-1.5"></span>{notStarted} Not started</span>
        </div>
      </Card>

      <Card className="p-5">
        <h3 className="font-medium mb-3">Quick actions</h3>
        <div className="grid sm:grid-cols-2 gap-2">
          <QuickAction icon={ClipboardList} label="Enter results" onClick={() => nav(`/terms/${termId}/scores`)} />
          <QuickAction icon={Star} label="Fill traits & comments" onClick={() => nav(`/terms/${termId}/traits`)} />
          <QuickAction icon={FileText} label="Review & publish report cards" onClick={() => nav(`/terms/${termId}/reports`)} />
          <QuickAction icon={TrendingUp} label="View roster" onClick={() => nav(`/terms/${termId}/roster`)} />
        </div>
      </Card>

      {(term.startDate || term.closingDate || term.resumesOn) && (
        <Card className="p-5">
          <h3 className="font-medium mb-3">Key dates</h3>
          <div className="grid sm:grid-cols-3 gap-3 text-sm">
            {term.startDate && <div><div className="text-ink-soft text-xs">Started</div>{term.startDate}</div>}
            {term.closingDate && <div><div className="text-ink-soft text-xs">Closing</div>{term.closingDate}</div>}
            {term.resumesOn && <div><div className="text-ink-soft text-xs">Next term begins</div>{term.resumesOn}</div>}
          </div>
        </Card>
      )}
    </div>
  )
}

function StatCard({ label, value, accent }) {
  const accentClass = accent === 'brand' ? 'text-brand-700' : accent === 'emerald' ? 'text-emerald-700' : ''
  return (
    <Card className="p-4">
      <div className="text-xs text-ink-soft">{label}</div>
      <div className={`text-xl font-semibold mt-1 ${accentClass}`}>{value}</div>
    </Card>
  )
}

function QuickAction({ icon: Icon, label, onClick }) {
  return (
    <button onClick={onClick}
      className="flex items-center gap-3 p-3 rounded-lg border border-slate-200 hover:border-brand-300 hover:bg-brand-50/40 transition-colors text-left">
      <Icon className="w-5 h-5 text-brand-600 flex-shrink-0" />
      <span className="text-sm font-medium">{label}</span>
    </button>
  )
}
