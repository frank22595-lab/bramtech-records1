import { useNavigate, useLocation } from 'react-router-dom'
import { FileText, Palette } from 'lucide-react'
import { TabBar } from '../../components/Layout'
import ReportsBrowse from './ReportsBrowse'
import ReportDesignPage from './ReportDesignPage'

const TABS = [
  { id: 'browse', label: 'Browse',       icon: FileText },
  { id: 'design', label: 'Design',       icon: Palette },
]

export default function ReportsBrowsePage() {
  const nav = useNavigate()
  const loc = useLocation()
  const isDesign = loc.pathname === '/reports/design'
  const activeTab = isDesign ? 'design' : 'browse'
  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Reports</h1>
        <p className="text-sm text-ink-soft mt-0.5">Browse report cards or change how they look.</p>
      </div>
      <TabBar tabs={TABS} activeTab={activeTab} onSelect={(id) => nav(id === 'design' ? '/reports/design' : '/reports')} />
      {activeTab === 'browse' ? <ReportsBrowse /> : <ReportDesignPage embedded />}
    </div>
  )
}
