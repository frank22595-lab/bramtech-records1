import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  query,
  where,
  orderBy,
  limit,
} from "firebase/firestore";
import {
  Users,
  BookOpen,
  GraduationCap,
  ClipboardList,
  UserPlus,
  FileText,
  KeyRound,
  CalendarCheck,
  ArrowRight,
  CheckCircle2,
  Clock,
  Star,
  UserCheck,
  Sparkles,
  TrendingUp,
  Trophy,
  AlertCircle,
} from "lucide-react";
import { Card } from "../components/ui";
import { getFirebase } from "../config/firebase";
import { useAuth } from "../contexts/AuthContext";
import { useSchool } from "../contexts/SchoolContext";
import { usePermissions } from "../hooks/usePermissions";

export default function Dashboard() {
  const { db } = getFirebase();
  const { profile } = useAuth();
  const { school } = useSchool();
  const { isAdminOrDirector, isTeacher, assignedClasses, classTeacherOf } =
    usePermissions();

  const [counts, setCounts] = useState({
    students: 0,
    activeStudents: 0,
    classes: 0,
    subjects: 0,
    teachers: 0,
  });
  const [currentTerm, setCurrentTerm] = useState(null);
  const [recentReports, setRecentReports] = useState([]);
  const [pendingStaff, setPendingStaff] = useState([]);
  const [reportStatus, setReportStatus] = useState({
    published: 0,
    draft: 0,
    notStarted: 0,
  });
  const [myClasses, setMyClasses] = useState([]);
  const [myStudentCount, setMyStudentCount] = useState(0);

  useEffect(() => {
    if (!school?.currentTermId) {
      setCurrentTerm(null);
      return;
    }
    return onSnapshot(doc(db, "terms", school.currentTermId), (snap) => {
      setCurrentTerm(snap.exists() ? { id: snap.id, ...snap.data() } : null);
    });
  }, [db, school?.currentTermId]);

  useEffect(() => {
    const unsubs = [];
    unsubs.push(
      onSnapshot(collection(db, "students"), (s) => {
        const active = s.docs.filter((d) => d.data().active !== false).length;
        setCounts((c) => ({ ...c, students: s.size, activeStudents: active }));
      }),
    );
    if (isAdminOrDirector) {
      unsubs.push(
        onSnapshot(collection(db, "classes"), (s) =>
          setCounts((c) => ({
            ...c,
            classes: s.docs.filter((d) => d.data().active).length,
          })),
        ),
        onSnapshot(collection(db, "subjects"), (s) =>
          setCounts((c) => ({
            ...c,
            subjects: s.docs.filter((d) => d.data().active).length,
          })),
        ),
        onSnapshot(
          query(collection(db, "users"), where("role", "==", "teacher")),
          (s) =>
            setCounts((c) => ({
              ...c,
              teachers: s.docs.filter((d) => d.data().status === "active")
                .length,
            })),
        ),
        onSnapshot(
          query(collection(db, "users"), where("status", "==", "pending")),
          (snap) =>
            setPendingStaff(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
        ),
      );
    }
    return () => unsubs.forEach((u) => u());
  }, [db, isAdminOrDirector]);

  useEffect(() => {
    if (!isAdminOrDirector || !currentTerm?.id) return;
    return onSnapshot(
      query(
        collection(db, "reportCards"),
        where("termId", "==", currentTerm.id),
      ),
      (snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        const published = all.filter((r) => r.status === "published");
        const draft = all.filter((r) => r.status === "draft");
        setReportStatus({
          published: published.length,
          draft: draft.length,
          notStarted: Math.max(
            0,
            counts.activeStudents - published.length - draft.length,
          ),
        });
        const recent = [...published]
          .sort((a, b) => {
            const ta = a.publishedAt?.toMillis?.() || 0;
            const tb = b.publishedAt?.toMillis?.() || 0;
            return tb - ta;
          })
          .slice(0, 5);
        setRecentReports(recent);
      },
    );
  }, [db, isAdminOrDirector, currentTerm?.id, counts.activeStudents]);

  useEffect(() => {
    if (!isTeacher) return;
    const classList = [
      ...new Set([classTeacherOf, ...assignedClasses].filter(Boolean)),
    ];
    if (classList.length === 0) {
      setMyClasses([]);
      setMyStudentCount(0);
      return;
    }

    const unsubs = [
      onSnapshot(collection(db, "classes"), (snap) => {
        const mine = snap.docs
          .filter((d) => classList.includes(d.id) && d.data().active !== false)
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.order || 0) - (b.order || 0));
        setMyClasses(mine);
      }),
      onSnapshot(
        query(collection(db, "students"), where("active", "==", true)),
        (snap) => {
          const count = snap.docs.filter((d) =>
            classList.includes(d.data().classId),
          ).length;
          setMyStudentCount(count);
        },
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [db, isTeacher, classTeacherOf, assignedClasses]);

  const firstName = profile?.fullName?.split(" ")[0] || "there";
  const greeting = getGreeting();

  // Session-end signal: last term of the year is fully published
  const allPublished =
    reportStatus.published > 0 &&
    reportStatus.published >= counts.activeStudents &&
    counts.activeStudents > 0;
  const showPromotionCTA = isAdminOrDirector && allPublished;

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <p className="text-sm text-ink-soft">{greeting},</p>
        <h1 className="text-2xl md:text-3xl font-bold text-ink mt-0.5">
          {firstName}!
        </h1>
        <div className="flex items-center gap-2 mt-2 text-sm text-ink-soft flex-wrap">
          <span>{school?.name}</span>
          {currentTerm && (
            <>
              <span className="w-1 h-1 rounded-full bg-slate-300" />
              <span className="inline-flex items-center gap-1">
                <CalendarCheck className="w-3.5 h-3.5" />
                {currentTerm.academicYear} · {currentTerm.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Attention banners */}
      {isAdminOrDirector && pendingStaff.length > 0 && (
        <AttentionBanner
          icon={UserCheck}
          title={`${pendingStaff.length} staff member${pendingStaff.length === 1 ? "" : "s"} waiting for approval`}
          description="Review their details and assign classes."
          actionLabel="Review now"
          actionTo="/school/staff"
        />
      )}
      {isAdminOrDirector && !currentTerm && (
        <AttentionBanner
          tone="warning"
          icon={AlertCircle}
          title="No current academic term set"
          description="Set the active term so teachers can enter scores."
          actionLabel="Set current term"
          actionTo="/settings"
        />
      )}
      {showPromotionCTA && (
        <AttentionBanner
          tone="warning"
          icon={GraduationCap}
          title="All report cards are published — ready for promotion?"
          description="Promote students to the next class and graduate the terminal class."
          actionLabel="Open promotion"
          actionTo="/promotion"
        />
      )}

      {/* Quick actions */}
      {isAdminOrDirector && <DirectorQuickActions />}
      {isTeacher && <TeacherQuickActions myClasses={myClasses} />}

      {/* Stats */}
      {isAdminOrDirector && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6">
          <StatCard
            icon={Users}
            label="Students"
            value={counts.activeStudents}
            to="/school/students"
            tone="brand"
          />
          <StatCard
            icon={GraduationCap}
            label="Classes"
            value={counts.classes}
            to="/school/classes"
            tone="emerald"
          />
          <StatCard
            icon={BookOpen}
            label="Subjects"
            value={counts.subjects}
            to="/school/subjects"
            tone="amber"
          />
          <StatCard
            icon={UserCheck}
            label="Teachers"
            value={counts.teachers}
            to="/school/teachers"
            tone="violet"
          />
        </div>
      )}

      {isTeacher && (
        <div className="grid grid-cols-2 gap-3 md:gap-4 mb-6">
          <StatCard
            icon={GraduationCap}
            label={myClasses.length === 1 ? "My class" : "My classes"}
            value={myClasses.length}
            tone="brand"
          />
          <StatCard
            icon={Users}
            label="Students"
            value={myStudentCount}
            to="/school/students"
            tone="emerald"
          />
        </div>
      )}

      {/* Director: report progress + recent published */}
      {isAdminOrDirector && currentTerm && (
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          <ReportProgressCard
            status={reportStatus}
            totalActive={counts.activeStudents}
          />
          <RecentPublishedCard reports={recentReports} />
        </div>
      )}

      {/* Teacher: my classes list */}
      {isTeacher && myClasses.length > 0 && (
        <MyClassesCard myClasses={myClasses} />
      )}

      {isTeacher && myClasses.length === 0 && (
        <Card className="p-6 mb-6 bg-amber-50 border-amber-200">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-900">
                Waiting on class assignment
              </p>
              <p className="text-sm text-amber-800 mt-1">
                Your director hasn't assigned you to any classes yet. You'll see
                your classes here once they do.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* Getting started — director only, only if incomplete */}
      {isAdminOrDirector && (
        <GettingStarted
          counts={counts}
          currentTerm={currentTerm}
          pendingStaff={pendingStaff}
        />
      )}

      {/* Session tools card — director only, subtle */}
      {isAdminOrDirector && counts.activeStudents > 0 && (
        <Card className="p-5 mt-6 bg-gradient-to-br from-slate-50 to-white">
          <div className="flex items-start gap-4 flex-wrap">
            <div className="w-10 h-10 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center flex-shrink-0">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-ink">End-of-session tools</h3>
              <p className="text-sm text-ink-soft mt-0.5">
                Promote students to the next class and graduate students in the
                terminal class at the end of the academic year.
              </p>
            </div>
            <Link
              to="/promotion"
              className="text-sm font-medium text-brand-700 hover:text-brand-800 flex items-center gap-1 flex-shrink-0"
            >
              Open promotion <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

function AttentionBanner({
  icon: Icon,
  title,
  description,
  actionLabel,
  actionTo,
  tone = "info",
}) {
  const colors =
    tone === "warning"
      ? {
          bg: "bg-amber-50",
          border: "border-amber-200",
          text: "text-amber-900",
          ring: "text-amber-600",
        }
      : {
          bg: "bg-blue-50",
          border: "border-blue-200",
          text: "text-blue-900",
          ring: "text-blue-600",
        };
  return (
    <Link
      to={actionTo}
      className={`block ${colors.bg} ${colors.border} border rounded-xl p-4 mb-4 hover:shadow-sm transition-shadow`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-10 h-10 rounded-full bg-white/60 flex items-center justify-center ${colors.ring} flex-shrink-0`}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className={`text-sm font-semibold ${colors.text}`}>{title}</p>
          {description && (
            <p className={`text-xs mt-0.5 opacity-80 ${colors.text}`}>
              {description}
            </p>
          )}
        </div>
        <div
          className={`text-sm font-medium ${colors.text} flex items-center gap-1 flex-shrink-0`}
        >
          {actionLabel} <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </Link>
  );
}

function DirectorQuickActions() {
  const actions = [
    {
      icon: UserPlus,
      label: "Add student",
      to: "/school/students",
      tone: "brand",
    },
    {
      icon: ClipboardList,
      label: "Enter results",
      to: "/terms",
      tone: "emerald",
    },
    { icon: FileText, label: "Report cards", to: "/terms", tone: "violet" },
    {
      icon: KeyRound,
      label: "Access codes",
      to: "/school/students",
      tone: "amber",
    },
  ];
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
        Quick actions
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((a) => (
          <QuickAction key={a.label} {...a} />
        ))}
      </div>
    </div>
  );
}

function TeacherQuickActions({ myClasses }) {
  const actions = [
    {
      icon: ClipboardList,
      label: "Enter results",
      to: "/terms",
      tone: "brand",
    },
    { icon: Star, label: "Traits & comments", to: "/terms", tone: "violet" },
    { icon: CalendarCheck, label: "Attendance", to: "/terms", tone: "emerald" },
    { icon: Users, label: "Students", to: "/school/students", tone: "amber" },
  ];
  if (myClasses.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
        Quick actions
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {actions.map((a) => (
          <QuickAction key={a.label} {...a} />
        ))}
      </div>
    </div>
  );
}

function QuickAction({ icon: Icon, label, to, tone }) {
  const toneClasses = {
    brand: "bg-brand-50 text-brand-700 hover:bg-brand-100",
    emerald: "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    violet: "bg-violet-50 text-violet-700 hover:bg-violet-100",
    amber: "bg-amber-50 text-amber-700 hover:bg-amber-100",
  };
  return (
    <Link
      to={to}
      className={`
        ${toneClasses[tone] || toneClasses.brand}
        rounded-xl px-4 py-4 md:py-5 flex md:flex-col items-center md:items-start gap-3 md:gap-2
        transition-all duration-150 hover:-translate-y-0.5 hover:shadow-sm
        active:scale-[0.98]
      `}
    >
      <Icon className="w-5 h-5 flex-shrink-0" />
      <span className="text-sm font-semibold">{label}</span>
    </Link>
  );
}

function StatCard({ icon: Icon, label, value, note, to, tone = "brand" }) {
  const iconBg = {
    brand: "bg-brand-100 text-brand-700",
    emerald: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
    violet: "bg-violet-100 text-violet-700",
    slate: "bg-slate-100 text-slate-700",
  };
  const inner = (
    <Card
      className={`p-4 md:p-5 ${to ? "hover:shadow-md hover:border-slate-300 hover:-translate-y-0.5 cursor-pointer transition-all duration-150" : ""}`}
    >
      <div
        className={`w-9 h-9 rounded-lg ${iconBg[tone] || iconBg.brand} flex items-center justify-center mb-3`}
      >
        <Icon className="w-4 h-4" />
      </div>
      <div className="text-2xl md:text-3xl font-bold text-ink leading-none">
        {value}
      </div>
      <div className="text-xs md:text-sm text-ink-soft mt-1.5">{label}</div>
      {note && <div className="text-xs text-ink-soft mt-1">{note}</div>}
    </Card>
  );
  return to ? (
    <Link to={to} className="block">
      {inner}
    </Link>
  ) : (
    inner
  );
}

function ReportProgressCard({ status, totalActive }) {
  const total =
    totalActive || status.published + status.draft + status.notStarted;
  const pct = total > 0 ? Math.round((status.published / total) * 100) : 0;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide">
            Report cards this term
          </div>
          <div className="text-2xl font-bold text-ink mt-1">
            {pct}% published
          </div>
        </div>
        <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
          <TrendingUp className="w-5 h-5" />
        </div>
      </div>
      <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
        <div
          className="h-full bg-emerald-500 rounded-full transition-all duration-500"
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex items-center gap-4 text-xs text-ink-soft flex-wrap">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />{" "}
          {status.published} published
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-amber-500" /> {status.draft}{" "}
          draft
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-slate-300" />{" "}
          {status.notStarted} not started
        </span>
      </div>
      <Link
        to="/terms"
        className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-brand-700 hover:text-brand-800"
      >
        Manage report cards <ArrowRight className="w-3.5 h-3.5" />
      </Link>
    </Card>
  );
}

function RecentPublishedCard({ reports }) {
  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-4 h-4 text-amber-600" />
        <h3 className="font-semibold text-ink">Recently published</h3>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-ink-soft py-2">
          No reports published yet this term.
        </p>
      ) : (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li
              key={r.id}
              className="flex items-center justify-between gap-2 py-1.5"
            >
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ink truncate">
                  {r.studentName}
                </div>
                <div className="text-xs text-ink-soft truncate">
                  {r.className}
                  {r.percentageAverage != null && ` · ${r.percentageAverage}%`}
                  {r.overallGrade && ` · Grade ${r.overallGrade}`}
                </div>
              </div>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function MyClassesCard({ myClasses }) {
  return (
    <Card className="p-5 mb-6">
      <h3 className="font-semibold text-ink mb-3 flex items-center gap-2">
        <GraduationCap className="w-4 h-4 text-brand-600" />
        My classes
      </h3>
      <div className="grid gap-2">
        {myClasses.map((c) => (
          <Link
            key={c.id}
            to="/school/students"
            className="flex items-center justify-between p-3 rounded-lg border border-slate-200 hover:border-brand-400 hover:bg-brand-50 transition-colors"
          >
            <span className="font-medium text-sm">{c.name}</span>
            <ArrowRight className="w-4 h-4 text-slate-400" />
          </Link>
        ))}
      </div>
    </Card>
  );
}

function GettingStarted({ counts, currentTerm, pendingStaff }) {
  const steps = [
    {
      done: counts.classes > 0,
      label: "Set up classes, subjects and grade scale",
      to: "/school/classes",
    },
    {
      done: counts.students > 0,
      label: "Add students to their classes",
      to: "/school/students",
    },
    {
      done: !!currentTerm,
      label: "Set a current academic term",
      to: "/settings",
    },
    {
      done: counts.teachers > 0,
      label: "Approve teachers and assign them to classes",
      to: "/school/staff",
    },
  ];
  const allDone = steps.every((s) => s.done);
  if (allDone) return null;

  return (
    <Card className="p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-4 h-4 text-brand-600" />
        <h3 className="font-semibold text-ink">Getting started</h3>
      </div>
      <p className="text-xs text-ink-soft mb-4">
        Complete these to fully set up your portal.
      </p>
      <ol className="space-y-2">
        {steps.map((s, i) => (
          <li key={i}>
            <Link
              to={s.to}
              className={`flex items-center gap-3 p-2 -mx-2 rounded-lg hover:bg-slate-50 ${s.done ? "opacity-60" : ""}`}
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs flex-shrink-0 ${
                  s.done
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-slate-100 text-ink-soft border border-slate-200"
                }`}
              >
                {s.done ? "✓" : i + 1}
              </span>
              <span
                className={`text-sm flex-1 ${s.done ? "text-ink-soft line-through" : "text-ink"}`}
              >
                {s.label}
              </span>
              {!s.done && <ArrowRight className="w-4 h-4 text-slate-300" />}
            </Link>
          </li>
        ))}
      </ol>
    </Card>
  );
}
