import { useState } from "react";
import { generateReportCardPDF } from "../../lib/pdfGenerator";
import { formatAccessCode } from "../../lib/accessCode";

/**
 * Public parent result-checker portal.
 * Route: /check-result (no login required)
 *
 * Flow:
 *   1. Parent enters admission number + access code
 *   2. Frontend POSTs to /api/check-result
 *   3. On success, shows student card + list of published reports
 *   4. Parent clicks a report → PDF downloads
 */
export default function CheckResultPage() {
  const [admission, setAdmission] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const res = await fetch("/api/check-result", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          admissionNumber: admission.trim(),
          accessCode: code.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Something went wrong.");
      setResult(data);
    } catch (err) {
      setError(err.message || "Could not check result. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const downloadPdf = async (report) => {
    setDownloadingId(report.id);
    try {
      // Debug: log the exact shape of the report we received
      console.log("[CheckResultPage] Report card doc:", report);
      console.log(
        "[CheckResultPage] Subjects count:",
        Array.isArray(report.subjects)
          ? report.subjects.length
          : "not an array",
      );

      // Build the pdfGenerator input mapping Firestore field names correctly.
      // The reportCards doc has these fields flat at top level:
      //   academicYear, termName, termNumber, classTeacherComment, classTeacherName,
      //   headTeacherComment, headTeacherName, headTeacherTitle, subjects, psychomotor, affective, attendance
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
        age: report.age,
        report,
        attendance: report.attendance || {},
        psychomotor: report.psychomotor || [],
        affective: report.affective || [],
        adviser: report.adviser || {},
        classTeacher: {
          name: report.classTeacherName || "",
          comment: report.classTeacherComment || "",
        },
        headTeacher: {
          name: report.headTeacherName || "",
          title: report.headTeacherTitle || "Principal",
          comment: report.headTeacherComment || "",
        },
        config: report.config || {},
      };
      console.log("[CheckResultPage] PDF input:", input);

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

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-semibold text-slate-900">
              Check Student Result
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
          ← Check another result
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
