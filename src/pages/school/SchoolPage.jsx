import { useNavigate, useParams } from 'react-router-dom'
import { Users, GraduationCap, Layers, BookOpen, UserCheck } from 'lucide-react'
import { TabBar } from '../../components/Layout'
import StudentsTab from './StudentsTab'
import TeachersTab from './TeachersTab'
import ClassesTab from './ClassesTab'
import SubjectsTab from './SubjectsTab'
import StaffTab from './StaffTab'

const TABS = [
  { id: 'students', label: 'Students', icon: Users },
  { id: 'staff',    label: 'Staff',    icon: UserCheck },
  { id: 'teachers', label: 'Teachers', icon: GraduationCap },
  { id: 'classes',  label: 'Classes',  icon: Layers },
  { id: 'subjects', label: 'Subjects', icon: BookOpen },
]

export default function SchoolPage() {
  const nav = useNavigate()
  const { tab } = useParams()
  const activeTab = tab || 'students'

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">School</h1>
        <p className="text-sm text-ink-soft mt-0.5">Manage students, staff, classes, and subjects.</p>
      </div>
      <TabBar tabs={TABS} activeTab={activeTab} onSelect={(id) => nav(`/school/${id}`)} />
      {activeTab === 'students' && <StudentsTab />}
      {activeTab === 'staff'    && <StaffTab />}
      {activeTab === 'teachers' && <TeachersTab />}
      {activeTab === 'classes'  && <ClassesTab />}
      {activeTab === 'subjects' && <SubjectsTab />}
    </div>
  )
}
