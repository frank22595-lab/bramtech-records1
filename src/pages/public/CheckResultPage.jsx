import { useState, useEffect } from "react";
import { generateReportCardPDF } from "../../lib/pdfGenerator";
import { formatAccessCode } from "../../lib/accessCode";
import { UserCircle2, Plus, Trash2, ArrowLeft, Shield } from "lucide-react";

/**
 * Parent portal — check student results.
 *
 * Multi-child device memory:
 *   - Parents with multiple children can save each on their device
 *   - Stored in localStorage per school slug (from ?school=XXX query param)
 *   - Auto-shown on the landing screen as clickable cards
 *   - One tap → auto-fills form and submits
 *   - Delete individual saved children
 *   - Not saved by default. Only if parent ticks "Remember this student"
 *
 * Security note: access codes stored in localStorage are device-local. Anyone
 * with access to the parent's browser can view results — same as any remembered
 * password. A warning is shown next to the toggle.
 */

// Storage key per school so a parent using different schools' portals stays separated
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
    // Replace if same admission number exists, otherwise add
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

  const performLookup = async (adm, cd) => {
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

      // Save to device if the user asked us to (only when we typed it — auto-lookups
      // from a saved card come from an already-saved entry)
      if (remember && showAddForm) {
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
    await performLookup(admission, code);
  };

  const openSavedChild = async (child) => {
    setAdmission(child.admissionNumber);
    setCode(child.accessCode);
    await performLookup(child.admissionNumber, child.accessCode);
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
    // Refresh saved list in case it changed
    setSavedChildren(loadSavedChildren());
  };

  if (result) {
    return (
      <ResultView
        result={result}
        onReset={reset}
        onDownload={downloadPdf}
        downloadingId={downloadingId}
      />
    );
  }

  // Landing: has saved children AND user hasn't tapped "Add another child"
  if (savedChildren.length > 0 && !showAddForm) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="flex-1 flex items-start justify-center px-4 py-8">
          <div className="max-w-md w-full">
            <div className="text-center mb-6">
              <h1 className="text-2xl font-semibold text-slate-900">
                Check Student Result
              </h1>
              <p className="text-sm text-slate-600 mt-2">
                Tap a child to view their latest results.
              </p>
            </div>

            <div className="space-y-2 mb-4">
              {savedChildren.map((child) => (
                <div
                  key={child.admissionNumber}
                  className="bg-white rounded-xl shadow-sm border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all p-4 flex items-center gap-3"
                >
                  <button
                    onClick={() => openSavedChild(child)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    {child.photoUrl ? (
                      <img
                        src={child.photoUrl}
                        alt={child.fullName}
                        className="w-12 h-12 rounded-full object-cover border border-slate-200 flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold flex-shrink-0">
                        {(child.fullName || "?").charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-slate-900 truncate">
                        {child.fullName}
                      </div>
                      <div className="text-xs text-slate-500 truncate">
                        {child.className && `${child.className} · `}
                        <span className="font-mono">
                          {child.admissionNumber}
                        </span>
                      </div>
                    </div>
                  </button>
                  <button
                    onClick={() =>
                      handleRemove(child.admissionNumber, child.fullName)
                    }
                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex-shrink-0"
                    title={`Remove ${child.fullName}`}
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
              className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-slate-300 rounded-xl text-slate-600 hover:border-slate-400 hover:bg-white transition-colors font-medium text-sm"
            >
              <Plus className="w-4 h-4" /> Add another child
            </button>

            {loading && (
              <div className="mt-4 text-center text-sm text-slate-500">
                Loading result…
              </div>
            )}
            {error && (
              <div className="mt-4 text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
                {error}
              </div>
            )}

            <p className="text-xs text-center text-slate-500 mt-6 flex items-center justify-center gap-1">
              <Shield className="w-3 h-3" /> Saved on this device only
            </p>
          </div>
        </div>
      </div>
    );
  }

  // Standard input form
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          {savedChildren.length > 0 && (
            <button
              onClick={() => setShowAddForm(false)}
              className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-flex items-center gap-1"
            >
              <ArrowLeft className="w-4 h-4" /> Back to saved children
            </button>
          )}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              {savedChildren.length > 0
                ? "Add another child"
                : "Check Student Result"}
            </h1>
            <p className="text-sm text-slate-600 mt-2">
              Enter your child's admission number and access code.
            </p>
          </div>

          <form
            onSubmit={submit}
            className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-4"
          >
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Admission Number
              </label>
              <input
                type="text"
                value={admission}
                onChange={(e) => setAdmission(e.target.value.toUpperCase())}
                placeholder="YKI/2026/001"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">
                Access Code
              </label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(formatAccessCode(e.target.value))}
                placeholder="K7M-P9Q-N3X"
                className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                required
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                maxLength={11}
              />
            </div>

            <label className="flex items-start gap-2 text-sm text-slate-700 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="w-4 h-4 accent-slate-800 mt-0.5 flex-shrink-0"
              />
              <span>
                Remember this child on this device
                <span className="block text-xs text-slate-500 mt-0.5">
                  Only save on your personal device — anyone using this browser
                  can see the results.
                </span>
              </span>
            </label>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !admission || !code}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Checking…" : "Check Result"}
            </button>
          </form>

          <p className="text-xs text-center text-slate-500 mt-4">
            Contact your school if you don't have the access code.
          </p>
        </div>
      </div>
    </div>
  );
}

function ResultView({ result, onReset, onDownload, downloadingId }) {
  return (
    <div className="min-h-screen bg-slate-50">
      <div className="max-w-2xl mx-auto px-4 py-6">
        <button
          onClick={onReset}
          className="text-sm text-slate-600 hover:text-slate-900 mb-4 inline-flex items-center gap-1"
        >
          <ArrowLeft className="w-4 h-4" /> Back
        </button>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 mb-4">
          <div className="flex items-center gap-4">
            {result.student.photoUrl ? (
              <img
                src={result.student.photoUrl}
                alt={result.student.fullName}
                className="w-16 h-16 rounded-full object-cover border border-slate-200"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-200 flex items-center justify-center text-slate-500 font-semibold text-xl">
                {result.student.fullName?.charAt(0) || "?"}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <div className="text-lg font-semibold text-slate-900 truncate">
                {result.student.fullName}
              </div>
              <div className="text-sm text-slate-600 font-mono">
                {result.student.admissionNumber}
              </div>
              <div className="text-sm text-slate-500">{result.school.name}</div>
            </div>
          </div>
        </div>

        {result.reports.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8 text-center">
            <div className="text-slate-400 mb-2">📄</div>
            <p className="text-sm text-slate-600">No published results yet.</p>
            <p className="text-xs text-slate-500 mt-1">
              Check back after the school publishes term results.
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide px-1 mb-2">
              Available Reports ({result.reports.length})
            </div>
            {result.reports.map((r) => (
              <ReportRow
                key={r.id}
                report={r}
                downloading={downloadingId === r.id}
                onDownload={() => onDownload(r)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function ReportRow({ report, downloading, onDownload }) {
  const session = report.academicYear || report.session || "";
  const termLabel = report.termName || report.term || "";
  return (
    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-4 flex items-center gap-3">
      <div className="min-w-0 flex-1">
        <div className="font-medium text-slate-900 truncate">
          {session} — {termLabel}
        </div>
        <div className="text-sm text-slate-600 mt-0.5">
          {report.className}
          {report.overallGrade && (
            <>
              {" · "}
              <span className="font-medium">Grade: {report.overallGrade}</span>
            </>
          )}
          {report.percentageAverage != null && (
            <>
              {" · "}
              <span>{report.percentageAverage}%</span>
            </>
          )}
        </div>
      </div>
      <button
        onClick={onDownload}
        disabled={downloading}
        className="bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
      >
        {downloading ? "Loading…" : "Download PDF"}
      </button>
    </div>
  );
}
