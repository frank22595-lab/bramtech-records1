import { useNavigate, useParams, Navigate } from "react-router-dom";
import {
  Users,
  GraduationCap,
  Layers,
  BookOpen,
  UserCheck,
} from "lucide-react";
import { TabBar } from "../../components/Layout";
import { usePermissions } from "../../hooks/usePermissions";
import StudentsTab from "./StudentsTab";
import TeachersTab from "./TeachersTab";
import ClassesTab from "./ClassesTab";
import SubjectsTab from "./SubjectsTab";
import StaffTab from "./StaffTab";

/**
 * The School page — tabs filtered by role.
 *
 * Directors and admins see all tabs (Students, Staff, Teachers, Classes, Subjects).
 * Teachers see only the Students tab.
 */
export default function SchoolPage() {
  const nav = useNavigate();
  const { tab } = useParams();
  const { isAdminOrDirector, isTeacher } = usePermissions();

  // All possible tabs — director/admin see all of these
  const allTabs = [
    { id: "students", label: "Students", icon: Users, forEveryone: true },
    { id: "staff", label: "Staff", icon: UserCheck, adminOnly: true },
    { id: "teachers", label: "Teachers", icon: GraduationCap, adminOnly: true },
    { id: "classes", label: "Classes", icon: Layers, adminOnly: true },
    { id: "subjects", label: "Subjects", icon: BookOpen, adminOnly: true },
  ];

  const visibleTabs = allTabs.filter((t) => {
    if (t.forEveryone) return true;
    if (t.adminOnly && isAdminOrDirector) return true;
    return false;
  });

  const activeTab = tab || visibleTabs[0]?.id || "students";

  // If teacher tries to visit a hidden tab, redirect to students
  const activeTabConfig = allTabs.find((t) => t.id === activeTab);
  if (activeTabConfig?.adminOnly && !isAdminOrDirector) {
    return <Navigate to="/school/students" replace />;
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">School</h1>
        <p className="text-sm text-ink-soft mt-0.5">
          {isTeacher
            ? "Manage students in your assigned classes."
            : "Manage students, staff, classes, and subjects."}
        </p>
      </div>
      <TabBar
        tabs={visibleTabs}
        activeTab={activeTab}
        onSelect={(id) => nav(`/school/${id}`)}
      />
      {activeTab === "students" && <StudentsTab />}
      {activeTab === "staff" && isAdminOrDirector && <StaffTab />}
      {activeTab === "teachers" && isAdminOrDirector && <TeachersTab />}
      {activeTab === "classes" && isAdminOrDirector && <ClassesTab />}
      {activeTab === "subjects" && isAdminOrDirector && <SubjectsTab />}
    </div>
  );
}
