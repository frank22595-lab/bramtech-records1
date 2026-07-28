import { useState } from "react";
import { doc, writeBatch, serverTimestamp } from "firebase/firestore";
import { GraduationCap, ChevronLeft, ChevronRight, Check } from "lucide-react";
import { Button, Card } from "../../components/ui";
import { getFirebase } from "../../config/firebase";
import { useSchool } from "../../contexts/SchoolContext";
import Step1School from "./Step1School";
import Step2Classes from "./Step2Classes";
import Step3Subjects from "./Step3Subjects";
import Step4GradeScale from "./Step4GradeScale";
import Step5Assessments from "./Step5Assessments";
import Step6Skills from "./Step6Skills";

const STEPS = [
  { id: "school", title: "School details", component: Step1School },
  { id: "classes", title: "Classes", component: Step2Classes },
  { id: "subjects", title: "Subjects", component: Step3Subjects },
  { id: "gradeScale", title: "Grade scale", component: Step4GradeScale },
  { id: "assessments", title: "Assessments", component: Step5Assessments },
  { id: "skills", title: "Skills & options", component: Step6Skills },
];

const DEFAULT_STATE = {
  school: {
    name: "",
    shortName: "",
    motto: "",
    address: "",
    phone: "",
    email: "",
    website: "",
    primaryColor: "#2563eb",
  },
  classes: [],
  subjects: [],
  gradeScale: [
    { min: 70, max: 100, grade: "A", remark: "Excellent" },
    { min: 60, max: 69, grade: "B", remark: "Very Good" },
    { min: 50, max: 59, grade: "C", remark: "Good" },
    { min: 40, max: 49, grade: "D", remark: "Fair" },
    { min: 0, max: 39, grade: "F", remark: "Fail" },
  ],
  assessments: [
    { name: "First CA", code: "CA1", maxScore: 20, order: 1 },
    { name: "Second CA", code: "CA2", maxScore: 20, order: 2 },
    { name: "Exam", code: "EXAM", maxScore: 60, order: 3 },
  ],
  skills: [
    "Punctuality",
    "Neatness",
    "Attentiveness",
    "Handwriting",
    "Sports",
    "Leadership",
    "Behavior",
  ],
  reportCardConfig: {
    showPhoto: true,
    showAttendance: true,
    showSkills: true,
    showClassAverage: true,
    showPosition: true,
    showTeacherComment: true,
    showHeadTeacherComment: true,
    prioritySubjects: [],
  },
};

export default function SetupWizard() {
  const { school } = useSchool();
  const [current, setCurrent] = useState(0);
  const [state, setState] = useState(() => ({
    ...DEFAULT_STATE,
    school: { ...DEFAULT_STATE.school, ...(school || {}) },
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const StepComponent = STEPS[current].component;
  const isLast = current === STEPS.length - 1;

  const patch = (partial) => setState((s) => ({ ...s, ...partial }));

  const canProceed = () => {
    const s = state;
    switch (STEPS[current].id) {
      case "school":
        return !!s.school.name.trim();
      case "classes":
        return s.classes.length > 0;
      case "subjects":
        return s.subjects.length > 0;
      case "gradeScale":
        return s.gradeScale.length > 0;
      case "assessments":
        return s.assessments.length > 0;
      case "skills":
        return true;
      default:
        return true;
    }
  };

  const finish = async () => {
    setError("");
    setSaving(true);
    console.log("[SetupWizard] Starting finish, state:", state);
    try {
      const { db } = getFirebase();
      const batch = writeBatch(db);

      // Classes
      const classIdMap = new Map();
      state.classes.forEach((c, i) => {
        const id = `class_${i + 1}`;
        classIdMap.set(c.tempId, id);
        batch.set(doc(db, "classes", id), {
          name: c.name,
          level: c.level || "other",
          order: c.order ?? i + 1,
          active: true,
          studentCount: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      console.log("[SetupWizard] Queued", state.classes.length, "classes");

      // Subjects
      state.subjects.forEach((s, i) => {
        const id = `subject_${i + 1}`;
        batch.set(doc(db, "subjects", id), {
          name: s.name,
          code: s.code || s.name.slice(0, 3).toUpperCase(),
          category: s.category || "core",
          classIds: (s.classTempIds || [])
            .map((t) => classIdMap.get(t))
            .filter(Boolean),
          order: i + 1,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      console.log("[SetupWizard] Queued", state.subjects.length, "subjects");

      // Assessments
      state.assessments.forEach((a, i) => {
        const id = `assessment_${(a.code || `a${i}`).toLowerCase()}`;
        batch.set(doc(db, "assessments", id), {
          name: a.name,
          code: a.code,
          maxScore: Number(a.maxScore),
          order: a.order ?? i + 1,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      });
      console.log(
        "[SetupWizard] Queued",
        state.assessments.length,
        "assessments",
      );

      // Root school doc
      batch.set(doc(db, "school", "root"), {
        name: state.school.name,
        shortName:
          state.school.shortName ||
          state.school.name
            .split(" ")
            .map((w) => w[0])
            .join("")
            .toUpperCase(),
        motto: state.school.motto || "",
        address: state.school.address || "",
        contact: {
          phone: state.school.phone || "",
          email: state.school.email || "",
          website: state.school.website || "",
        },
        branding: { primaryColor: state.school.primaryColor || "#2563eb" },
        gradingScale: state.gradeScale.map((g) => ({
          min: Number(g.min),
          max: Number(g.max),
          grade: g.grade,
          remark: g.remark,
        })),
        reportCardConfig: {
          ...state.reportCardConfig,
          skills: state.skills.filter((s) => s.trim()),
        },
        setupComplete: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      console.log("[SetupWizard] Queued school root doc. Committing batch…");

      await batch.commit();
      console.log("[SetupWizard] Batch commit SUCCESS ✓");
      // SchoolContext listener will pick up setupComplete=true and route to Dashboard.
      // We do NOT setSaving(false) on success because the component will unmount.
      // But just in case there's a delay, set a fallback timer.
      setTimeout(() => setSaving(false), 3000);
    } catch (err) {
      console.error("[SetupWizard] finish error:", err);
      setError(err.code ? `${err.code}: ${err.message}` : err.message);
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-surface-soft">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-brand-600" />
          <span className="font-semibold">School setup</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        {/* Progress */}
        <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex items-center flex-shrink-0">
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${
                  i < current
                    ? "bg-brand-600 text-white"
                    : i === current
                      ? "bg-brand-100 text-brand-700 ring-2 ring-brand-600"
                      : "bg-slate-200 text-ink-soft"
                }`}
              >
                {i < current ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <span
                className={`ml-2 text-sm ${i === current ? "font-medium" : "text-ink-soft"}`}
              >
                {s.title}
              </span>
              {i < STEPS.length - 1 && (
                <div className="w-8 h-px bg-slate-300 mx-3" />
              )}
            </div>
          ))}
        </div>

        <Card className="p-6 md:p-8">
          <StepComponent state={state} patch={patch} />
        </Card>

        {error && (
          <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 text-center">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center justify-between">
          <Button
            variant="secondary"
            onClick={() => setCurrent((c) => Math.max(0, c - 1))}
            disabled={current === 0 || saving}
          >
            <ChevronLeft className="w-4 h-4" /> Back
          </Button>

          {isLast ? (
            <Button onClick={finish} disabled={saving || !canProceed()}>
              {saving ? "Saving…" : "Finish setup"}{" "}
              <Check className="w-4 h-4" />
            </Button>
          ) : (
            <Button
              onClick={() =>
                setCurrent((c) => Math.min(STEPS.length - 1, c + 1))
              }
              disabled={!canProceed()}
            >
              Next <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </main>
    </div>
  );
}
