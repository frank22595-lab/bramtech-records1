import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ArrowLeft, LayoutDashboard, ClipboardList, Star, FileText, Users, Settings, Archive, CalendarCheck } from 'lucide-react'
import { Button, Card, Spinner, Badge } from '../../components/ui'
import { TabBar } from '../../components/Layout'
import { getFirebase } from '../../config/firebase'
import { useSchool } from '../../contexts/SchoolContext'
import OverviewTab from './tabs/OverviewTab'
import ScoresTab from './tabs/ScoresTab'
import TraitsCommentsTab from './tabs/TraitsCommentsTab'
import ReportCardsTab from './tabs/ReportCardsTab'
import RosterTab from './tabs/RosterTab'
import TermSettingsTab from './tabs/TermSettingsTab'
import AttendanceTab from './tabs/AttendanceTab'

export default function TermWorkspace() {
  const { db } = getFirebase()
  const { school } = useSchool()
  const { termId, tab } = useParams()
  const nav = useNavigate()
  const activeTab = tab || 'overview'
  const [term, setTerm] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!termId) return
    return onSnapshot(doc(db, 'terms', termId), snap => {
      setTerm(snap.exists() ? { id: snap.id, ...snap.data() } : null)
      setLoading(false)
    })
  }, [db, termId])

  const setCurrent = async () => {
    await updateDoc(doc(db, 'school', 'root'), { currentTermId: termId, updatedAt: serverTimestamp() })
  }
  const archive = async () => {
    if (!confirm('Archive this term? It will become read-only. You can still view its report cards.')) return
    await updateDoc(doc(db, 'terms', termId), { status: 'archived', updatedAt: serverTimestamp() })
    nav('/terms')
  }

  if (loading) return <div className="p-8"><Spinner /></div>
  if (!term) return (
    <div className="p-8">
      <Card className="p-8 text-center">
        <p className="text-ink-soft mb-4">Term not found.</p>
        <Button onClick={() => nav('/terms')}>Back to Terms</Button>
      </Card>
    </div>
  )

  const isCurrent = term.id === school?.currentTermId
  const isArchived = term.status === 'archived'
  const TABS = [
    { id: 'overview',   label: 'Overview',          icon: LayoutDashboard },
    { id: 'scores',     label: 'Result entry',      icon: ClipboardList },
    { id: 'attendance', label: 'Attendance',        icon: CalendarCheck },
    { id: 'traits',     label: 'Traits & comments', icon: Star },
    { id: 'reports',    label: 'Report cards',      icon: FileText },
    { id: 'roster',     label: 'Roster',            icon: Users },
    { id: 'settings',   label: 'Settings',          icon: Settings },
  ]

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <button onClick={() => nav('/terms')} className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 mb-4">
        <ArrowLeft className="w-4 h-4" /> All terms
      </button>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-semibold">{term.academicYear} · {term.name}</h1>
            {isCurrent && <Badge tone="success">Current</Badge>}
            {isArchived && <Badge tone="default"><Archive className="w-3 h-3 inline mr-0.5" />Archived</Badge>}
          </div>
          <p className="text-sm text-ink-soft mt-1">
            {term.startDate && term.endDate ? `${term.startDate} → ${term.endDate}` : 'No dates set'}
            {term.timesOpened ? ` · ${term.timesOpened} days opened` : ''}
          </p>
        </div>
        <div className="flex gap-2">
          {!isCurrent && !isArchived && <Button variant="secondary" onClick={setCurrent}>Set as current</Button>}
          {!isArchived && <Button variant="secondary" onClick={archive}><Archive className="w-4 h-4" /> Archive</Button>}
        </div>
      </div>

      <TabBar tabs={TABS} activeTab={activeTab} onSelect={(id) => nav(`/terms/${termId}/${id}`)} />

      {isArchived && (
        <Card className="p-3 mb-4 bg-amber-50 border-amber-200 text-sm text-amber-900">
          This term is archived. Data is read-only.
        </Card>
      )}

      {activeTab === 'overview' && <OverviewTab term={term} />}
      {activeTab === 'scores' && <ScoresTab term={term} readOnly={isArchived} />}
      {activeTab === 'attendance' && <AttendanceTab term={term} readOnly={isArchived} />}
      {activeTab === 'traits' && <TraitsCommentsTab term={term} readOnly={isArchived} />}
      {activeTab === 'reports' && <ReportCardsTab term={term} readOnly={isArchived} />}
      {activeTab === 'roster' && <RosterTab term={term} />}
      {activeTab === 'settings' && <TermSettingsTab term={term} readOnly={isArchived} />}
    </div>
  )
}
