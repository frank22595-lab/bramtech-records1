import { useState, useEffect } from "react";
import { generateReportCardPDF } from "../../lib/pdfGenerator";
import { formatAccessCode } from "../../lib/accessCode";
import { useSchool } from "../../contexts/SchoolContext";
import {
  Plus,
  Trash2,
  ArrowLeft,
  Shield,
  GraduationCap,
  Download,
  FileText,
  Award,
  Loader2,
  User,
  AlertCircle,
} from "lucide-react";

/**
 * Parent portal — check student results.
 *
 * Modern branded UI with multi-child device memory.
 * See v2 header for the full multi-child spec.
 */

function storageKey() {
  const params = new URLSearchParams(window.location.search);
  const slug = params.get("school") || "default";
  return `bramtech-records-children-${slug}`;
}

function loadSavedChildren() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveChild(child) {
  try {
    const list = loadSavedChildren();
    const filtered = list.filter(
      (c) => c.admissionNumber !== child.admissionNumber,
    );
    filtered.unshift({ ...child, savedAt: Date.now() });
    localStorage.setItem(storageKey(), JSON.stringify(filtered));
  } catch (err) {
    console.error("Could not save child:", err);
  }
}

function removeChild(admissionNumber) {
  try {
    const list = loadSavedChildren();
    const filtered = list.filter((c) => c.admissionNumber !== admissionNumber);
    localStorage.setItem(storageKey(), JSON.stringify(filtered));
  } catch (err) {
    console.error("Could not remove child:", err);
  }
}

export default function CheckResultPage() {
  const { school } = useSchool();
  const [admission, setAdmission] = useState("");
  const [code, setCode] = useState("");
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const [savedChildren, setSavedChildren] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    setSavedChildren(loadSavedChildren());
  }, []);

  const performLookup = async (adm, cd, isNewlyTyped = false) => {
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/check-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNumber: adm.trim(),
          accessCode: cd.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);

      if (remember && isNewlyTyped) {
        saveChild({
          admissionNumber: adm.trim(),
          accessCode: cd.trim(),
          fullName: data.student?.fullName || "",
          photoUrl: data.student?.photoUrl || null,
          className:
            data.student?.className || data.reports?.[0]?.className || "",
          schoolName: data.school?.name || "",
        });
        setSavedChildren(loadSavedChildren());
      }
    } catch (err) {
      setError(err.message || "Could not check result. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    await performLookup(admission, code, true);
  };

  const openSavedChild = async (child) => {
    setAdmission(child.admissionNumber);
    setCode(child.accessCode);
    await performLookup(child.admissionNumber, child.accessCode, false);
  };

  const handleRemove = (admissionNumber, name) => {
    if (
      !confirm(
        `Remove ${name} from this device? You'll need the admission number and access code to add them again.`,
      )
    )
      return;
    removeChild(admissionNumber);
    setSavedChildren(loadSavedChildren());
  };

  const downloadPdf = async (report) => {
    setDownloadingId(report.id);
    try {
      let age = report.age;
      if (age === 0 || age === "0") age = null;

      const input = {
        school: result.school,
        student: report.studentSnapshot || result.student,
        className: report.className || "",
        term: report.termSnapshot || {
          academicYear: report.academicYear || report.session || "",
          termNumber: report.termNumber || 1,
          name: report.termName || report.term || "",
          closingDate: report.closingDate,
          resumesOn: report.resumesOn,
        },
        age,
        report,
        attendance: report.attendance || {},
        psychomotor: report.psychomotor || [],
        affective: report.affective || [],
        adviser: report.adviser || {},
        classTeacher: {
          name: report.classTeacherName || "Class Teacher",
          comment: report.classTeacherComment || "",
        },
        headTeacher: {
          name:
            report.headTeacherName ||
            result.school?.headTeacherName ||
            result.school?.principalName ||
            "Principal",
          title: report.headTeacherTitle || "Principal",
          comment: report.headTeacherComment || "",
        },
        config: report.config || {},
      };

      const doc = await generateReportCardPDF(input);
      const fileName =
        `${result.student.fullName} - ${report.termName || report.term || "Term"} - ${report.academicYear || report.session || ""}.pdf`.replace(
          /[\/\\:*?"<>|]/g,
          "-",
        );
      doc.save(fileName);
    } catch (err) {
      alert("Could not generate PDF: " + (err.message || "unknown error"));
    } finally {
      setDownloadingId(null);
    }
  };

  const reset = () => {
    setResult(null);
    setAdmission("");
    setCode("");
    setError("");
    setShowAddForm(false);
    setSavedChildren(loadSavedChildren());
  };

  // ===== BRAND HEADER (shared across screens) =====
  const BrandHeader = () => (
    <header className="bg-white border-b border-slate-200">
      <div className="max-w-2xl mx-auto px-4 py-4 flex items-center gap-3">
        {school?.logoUrl ? (
          <img
            src={school.logoUrl}
            alt={school?.name}
            className="w-10 h-10 object-contain rounded-lg"
          />
        ) : (
          <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center">
            <GraduationCap className="w-5 h-5 text-brand-700" />
          </div>
        )}
        <div className="min-w-0">
          <div className="font-semibold text-ink truncate">
            {school?.name || "School Portal"}
          </div>
          <div className="text-xs text-ink-soft">Result Portal</div>
        </div>
      </div>
    </header>
  );

  // ===== RESULT VIEW =====
  if (result) {
    return (
      <div className="min-h-screen bg-slate-50">
        <BrandHeader />

        <div className="max-w-2xl mx-auto px-4 py-6">
          <button
            onClick={reset}
            className="text-sm text-ink-soft hover:text-ink mb-4 inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          {/* Student card */}
          <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 mb-4">
            <div className="flex items-center gap-4">
              {result.student.photoUrl ? (
                <img
                  src={result.student.photoUrl}
                  alt={result.student.fullName}
                  className="w-16 h-16 md:w-20 md:h-20 rounded-full object-cover border-2 border-brand-100"
                />
              ) : (
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-2xl">
                  {result.student.fullName?.charAt(0)?.toUpperCase() || "?"}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-lg md:text-xl font-bold text-ink truncate">
                  {result.student.fullName}
                </div>
                <div className="text-sm text-ink-soft font-mono mt-0.5">
                  {result.student.admissionNumber}
                </div>
                {result.reports[0]?.className && (
                  <div className="inline-flex items-center gap-1 mt-2 px-2 py-0.5 bg-brand-50 text-brand-700 text-xs font-medium rounded-full">
                    {result.reports[0].className}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Reports list */}
          {result.reports.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 text-center">
              <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-medium text-ink mb-1">
                No results yet
              </p>
              <p className="text-xs text-ink-soft">
                Check back after the school publishes term results.
              </p>
            </div>
          ) : (
            <div>
              <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide px-1 mb-3">
                {result.reports.length} Report
                {result.reports.length === 1 ? "" : "s"} Available
              </div>
              <div className="space-y-2.5">
                {result.reports.map((r) => (
                  <ReportRow
                    key={r.id}
                    report={r}
                    downloading={downloadingId === r.id}
                    onDownload={() => downloadPdf(r)}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ===== SAVED CHILDREN LANDING =====
  if (savedChildren.length > 0 && !showAddForm) {
    return (
      <div className="min-h-screen bg-slate-50">
        <BrandHeader />

        <div className="max-w-md mx-auto px-4 py-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-ink">Welcome back 👋</h1>
            <p className="text-sm text-ink-soft mt-1.5">
              Tap a child to view their results.
            </p>
          </div>

          <div className="space-y-2.5 mb-4">
            {savedChildren.map((child) => (
              <div
                key={child.admissionNumber}
                className="bg-white rounded-2xl border border-slate-200 hover:border-brand-300 hover:shadow-md transition-all p-4 flex items-center gap-3"
              >
                <button
                  onClick={() => openSavedChild(child)}
                  disabled={loading}
                  className="flex items-center gap-3 flex-1 min-w-0 text-left"
                >
                  {child.photoUrl ? (
                    <img
                      src={child.photoUrl}
                      alt={child.fullName}
                      className="w-14 h-14 rounded-full object-cover border-2 border-brand-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-semibold text-lg flex-shrink-0">
                      {(child.fullName || "?").charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink truncate">
                      {child.fullName}
                    </div>
                    <div className="text-xs text-ink-soft mt-0.5">
                      {child.className && <span>{child.className} · </span>}
                      <span className="font-mono">{child.admissionNumber}</span>
                    </div>
                  </div>
                </button>
                <button
                  onClick={() =>
                    handleRemove(child.admissionNumber, child.fullName)
                  }
                  className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                  title={`Remove ${child.fullName}`}
                  aria-label={`Remove ${child.fullName}`}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>

          <button
            onClick={() => {
              setShowAddForm(true);
              setAdmission("");
              setCode("");
              setError("");
            }}
            className="w-full flex items-center justify-center gap-2 py-3.5 border-2 border-dashed border-slate-300 rounded-2xl text-ink-soft hover:border-brand-400 hover:text-brand-700 hover:bg-brand-50 transition-colors font-medium text-sm"
          >
            <Plus className="w-4 h-4" /> Add another child
          </button>

          {loading && (
            <div className="mt-4 flex items-center justify-center gap-2 text-sm text-ink-soft">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading results…
            </div>
          )}
          {error && (
            <div className="mt-4 flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="mt-8 text-xs text-center text-ink-soft space-y-2">
            <div className="flex items-center justify-center gap-1.5">
              <Shield className="w-3 h-3" /> Saved on this device only
            </div>
            <div>
              <a href="/terms-of-service" className="hover:underline">
                Terms of Service
              </a>
              {" · "}
              <a href="/privacy" className="hover:underline">
                Privacy Policy
              </a>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ===== LOGIN FORM =====
  return (
    <div className="min-h-screen bg-slate-50">
      <BrandHeader />

      <div className="max-w-md mx-auto px-4 py-6">
        {savedChildren.length > 0 && (
          <button
            onClick={() => setShowAddForm(false)}
            className="text-sm text-ink-soft hover:text-ink mb-4 inline-flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Back to saved children
          </button>
        )}

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-brand-100 text-brand-700 mb-3">
            <User className="w-7 h-7" />
          </div>
          <h1 className="text-2xl font-bold text-ink">
            {savedChildren.length > 0
              ? "Add another child"
              : "Check student result"}
          </h1>
          <p className="text-sm text-ink-soft mt-1.5">
            Enter your child's admission number and access code.
          </p>
        </div>

        <form
          onSubmit={submit}
          className="bg-white rounded-2xl shadow-sm border border-slate-200 p-5 md:p-6 space-y-4"
        >
          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Admission Number
            </label>
            <input
              type="text"
              value={admission}
              onChange={(e) => setAdmission(e.target.value.toUpperCase())}
              placeholder="e.g. YKI/2026/001"
              className="w-full px-3.5 py-3 border border-slate-300 rounded-xl font-mono uppercase text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-300 placeholder:normal-case"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-ink mb-1.5">
              Access Code
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(formatAccessCode(e.target.value))}
              placeholder="e.g. K7M-P9Q-N3X"
              className="w-full px-3.5 py-3 border border-slate-300 rounded-xl font-mono uppercase text-sm bg-white transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500 placeholder:text-slate-300 placeholder:normal-case"
              required
              autoComplete="off"
              autoCapitalize="characters"
              spellCheck={false}
              maxLength={11}
            />
          </div>

          <label className="flex items-start gap-2.5 text-sm text-ink cursor-pointer select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="w-4 h-4 accent-brand-600 mt-0.5 flex-shrink-0"
            />
            <span>
              Remember this child on this device
              <span className="block text-xs text-ink-soft mt-0.5 font-normal">
                Save for quick access next time.
              </span>
            </span>
          </label>

          {error && (
            <div className="flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !admission || !code}
            className="w-full bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white font-semibold py-3 rounded-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-brand-600 flex items-center justify-center gap-2 shadow-sm"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Checking…
              </>
            ) : (
              "Check result"
            )}
          </button>
        </form>

        <p className="text-xs text-center text-ink-soft mt-6">
          Contact your school if you don't have the access code.
        </p>

        <div className="mt-4 text-xs text-center text-ink-soft">
          <a href="/terms-of-service" className="hover:underline">
            Terms of Service
          </a>
          {" · "}
          <a href="/privacy" className="hover:underline">
            Privacy Policy
          </a>
        </div>
      </div>
    </div>
  );
}

function ReportRow({ report, downloading, onDownload }) {
  const session = report.academicYear || report.session || "";
  const termLabel = report.termName || report.term || "";
  const grade = report.overallGrade;
  const pct = report.percentageAverage;

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-4 md:p-5 hover:border-slate-300 transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-lg bg-brand-100 text-brand-700 flex items-center justify-center flex-shrink-0">
          <Award className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-semibold text-ink truncate">
            {session} · {termLabel}
          </div>
          <div className="text-sm text-ink-soft mt-0.5 flex items-center gap-2 flex-wrap">
            <span>{report.className}</span>
            {(grade || pct != null) && (
              <span className="w-1 h-1 rounded-full bg-slate-300" />
            )}
            {pct != null && <span className="font-medium">{pct}%</span>}
            {grade && (
              <>
                <span className="w-1 h-1 rounded-full bg-slate-300" />
                <span className="font-medium">Grade {grade}</span>
              </>
            )}
          </div>
          <button
            onClick={onDownload}
            disabled={downloading}
            className="mt-3 inline-flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 active:scale-[0.98] text-white text-sm font-semibold px-4 py-2 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
          >
            {downloading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Loading…
              </>
            ) : (
              <>
                <Download className="w-4 h-4" /> Download PDF
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
