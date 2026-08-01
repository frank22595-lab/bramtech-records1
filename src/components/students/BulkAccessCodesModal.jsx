import { useState, useEffect } from "react";
import {
  collection,
  doc,
  updateDoc,
  serverTimestamp,
  query,
  where,
  onSnapshot,
} from "firebase/firestore";
import {
  X,
  MessageCircle,
  Copy,
  RefreshCw,
  Loader2,
  CheckCircle2,
} from "lucide-react";
import { Card, Button } from "../ui";
import { getFirebase } from "../../config/firebase";
import { useSchool } from "../../contexts/SchoolContext";
import { generateAccessCode, hashAccessCode } from "../../lib/accessCode";

/**
 * Bulk access codes modal.
 *
 * Director/teacher (with permission) picks a class → sees all students →
 * can generate/regenerate codes and open a per-parent WhatsApp message.
 *
 * "One message per parent" — each parent gets a personalized WhatsApp with
 * only their own child's code.
 */
export default function BulkAccessCodesModal({ classId, classes, onClose }) {
  const { db } = getFirebase();
  const { school } = useSchool();
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState({});
  const [copied, setCopied] = useState({});

  const selectedClass = classes.find((c) => c.id === classId);

  useEffect(() => {
    if (!classId) return;
    return onSnapshot(
      query(
        collection(db, "students"),
        where("classId", "==", classId),
        where("active", "==", true),
      ),
      (snap) => {
        setStudents(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .sort((a, b) => a.fullName.localeCompare(b.fullName)),
        );
        setLoading(false);
      },
    );
  }, [db, classId]);

  const generateForStudent = async (student) => {
    setBusy((prev) => ({ ...prev, [student.id]: true }));
    try {
      const code = generateAccessCode();
      const hash = await hashAccessCode(code);
      await updateDoc(doc(db, "students", student.id), {
        accessCode: code,
        accessCodeHash: hash,
        accessCodeGeneratedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      alert("Failed to generate code: " + err.message);
    } finally {
      setBusy((prev) => ({ ...prev, [student.id]: false }));
    }
  };

  const generateAllMissing = async () => {
    const missing = students.filter((s) => !s.accessCode);
    if (missing.length === 0) {
      alert("All students already have codes.");
      return;
    }
    if (
      !confirm(
        `Generate codes for ${missing.length} student${missing.length === 1 ? "" : "s"} without codes?`,
      )
    )
      return;
    for (const s of missing) {
      await generateForStudent(s);
    }
  };

  const regenerateAll = async () => {
    if (
      !confirm(
        `Regenerate codes for ALL ${students.length} students in ${selectedClass?.name}? Old codes will stop working.`,
      )
    )
      return;
    for (const s of students) {
      await generateForStudent(s);
    }
  };

  const sendWhatsApp = (student) => {
    if (!student.accessCode) {
      alert("Generate a code first.");
      return;
    }
    if (!student.parentPhone) {
      alert(
        "No parent phone number saved for this student. Edit the student first to add one.",
      );
      return;
    }

    let phone = student.parentPhone.replace(/[^0-9]/g, "");
    // Normalize Nigerian numbers
    if (phone.startsWith("0")) phone = "234" + phone.slice(1);
    else if (!phone.startsWith("234") && phone.length <= 10)
      phone = "234" + phone;

    const checkUrl = `${window.location.origin}/check-result${window.location.search}`;
    const parentName = student.parentName || "Parent";
    const schoolName = school?.name || "the school";

    const message = `Hello ${parentName} 👋

Your child's result access details for ${schoolName}:

📖 Student: ${student.fullName}
🔖 Admission #: ${student.admissionNumber || "—"}
🔑 Access Code: ${student.accessCode}

Check results here:
${checkUrl}

Please keep this code safe. Thank you!`;

    const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  };

  const copyToClipboard = (student) => {
    if (!student.accessCode) return;
    navigator.clipboard.writeText(student.accessCode).then(() => {
      setCopied((prev) => ({ ...prev, [student.id]: true }));
      setTimeout(
        () => setCopied((prev) => ({ ...prev, [student.id]: false })),
        1500,
      );
    });
  };

  const missingCodes = students.filter((s) => !s.accessCode).length;
  const readyToSend = students.filter(
    (s) => s.accessCode && s.parentPhone,
  ).length;

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <Card
        className="max-w-3xl w-full my-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-3 sticky top-0 bg-white z-10">
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold truncate">
              Access codes — {selectedClass?.name}
            </h2>
            <p className="text-xs text-ink-soft mt-1">
              {students.length} students · {missingCodes} without codes ·{" "}
              {readyToSend} ready to WhatsApp
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5">
          {loading ? (
            <div className="text-center py-8 text-slate-500">
              Loading students…
            </div>
          ) : students.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              No active students in this class.
            </div>
          ) : (
            <>
              <div className="flex gap-2 mb-4 flex-wrap">
                {missingCodes > 0 && (
                  <Button onClick={generateAllMissing}>
                    Generate {missingCodes} missing code
                    {missingCodes === 1 ? "" : "s"}
                  </Button>
                )}
                <Button variant="secondary" onClick={regenerateAll}>
                  <RefreshCw className="w-4 h-4" /> Regenerate all
                </Button>
              </div>

              <div className="border border-slate-200 rounded overflow-hidden">
                {students.map((s, i) => (
                  <div
                    key={s.id}
                    className={`p-3 flex items-center gap-3 ${i % 2 ? "bg-slate-50" : "bg-white"} border-b border-slate-100 last:border-b-0`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {s.fullName}
                      </div>
                      <div className="text-xs text-ink-soft flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="font-mono">
                          {s.admissionNumber || "—"}
                        </span>
                        {s.parentName && (
                          <>
                            <span>·</span>
                            <span className="truncate max-w-[100px]">
                              {s.parentName}
                            </span>
                          </>
                        )}
                        {s.parentPhone ? (
                          <>
                            <span>·</span>
                            <span className="text-emerald-700">
                              {s.parentPhone}
                            </span>
                          </>
                        ) : (
                          <>
                            <span>·</span>
                            <span className="text-amber-700">No phone</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {s.accessCode ? (
                        <span className="font-mono text-xs bg-slate-100 px-2 py-1 rounded whitespace-nowrap">
                          {s.accessCode}
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          no code
                        </span>
                      )}
                      {busy[s.id] ? (
                        <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                      ) : (
                        <button
                          onClick={() => generateForStudent(s)}
                          className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
                          title={s.accessCode ? "Regenerate" : "Generate"}
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {s.accessCode && (
                        <>
                          <button
                            onClick={() => copyToClipboard(s)}
                            className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
                            title="Copy code"
                          >
                            {copied[s.id] ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <button
                            onClick={() => sendWhatsApp(s)}
                            disabled={!s.parentPhone}
                            className="p-1.5 hover:bg-emerald-100 rounded text-emerald-700 disabled:opacity-30 disabled:cursor-not-allowed"
                            title={
                              s.parentPhone
                                ? "Send via WhatsApp"
                                : "No parent phone"
                            }
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {missingCodes === 0 && readyToSend > 0 && (
                <p className="text-xs text-ink-soft mt-3">
                  Click the WhatsApp icon on each row to send that parent their
                  code.
                </p>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-slate-200 flex justify-end">
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}
