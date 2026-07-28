import { useState, useEffect, useMemo } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  where,
  writeBatch,
  serverTimestamp,
} from "firebase/firestore";
import { ClipboardList, Save, AlertCircle, Check } from "lucide-react";
import { Card, Button, Select, Spinner, Badge } from "../../components/ui";
import { getFirebase } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";
import { useSchool } from "../../contexts/SchoolContext";

export default function ResultsPage() {
  const { db } = getFirebase();
  const { profile } = useAuth();
  const { school } = useSchool();

  const [terms, setTerms] = useState([]);
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [assessments, setAssessments] = useState([]);
  const [students, setStudents] = useState([]);
  // scores keyed as { studentId: { assessmentId: number, ... }, ... }
  const [scores, setScores] = useState({});
  // savedScores tracks what's in the database, so we can show "Saved" badges
  const [savedScores, setSavedScores] = useState({});
  const [loading, setLoading] = useState(true);

  const [classId, setClassId] = useState("");
  const [subjectId, setSubjectId] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState("");

  const isAdmin = profile?.role === "director" || profile?.role === "admin";
  const currentTermId = school?.currentTermId;

  // Load reference data
  useEffect(() => {
    const unsubs = [
      onSnapshot(
        query(collection(db, "terms"), orderBy("academicYear", "desc")),
        (snap) => setTerms(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
      onSnapshot(query(collection(db, "classes"), orderBy("order")), (snap) =>
        setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
      onSnapshot(query(collection(db, "subjects"), orderBy("order")), (snap) =>
        setSubjects(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
      ),
      onSnapshot(
        query(collection(db, "assessments"), orderBy("order")),
        (snap) => {
          setAssessments(
            snap.docs
              .map((d) => ({ id: d.id, ...d.data() }))
              .filter((a) => a.active),
          );
          setLoading(false);
        },
      ),
    ];
    return () => unsubs.forEach((u) => u());
  }, [db]);

  const availableClasses = useMemo(() => {
    if (isAdmin) return classes.filter((c) => c.active);
    const assigned = profile?.assignedClasses || [];
    return classes.filter((c) => c.active && assigned.includes(c.id));
  }, [classes, isAdmin, profile]);

  const availableSubjects = useMemo(() => {
    if (!classId) return [];
    return subjects.filter(
      (s) => s.active && (s.classIds || []).includes(classId),
    );
  }, [subjects, classId]);

  // Load students of selected class
  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    const unsub = onSnapshot(
      query(
        collection(db, "students"),
        where("classId", "==", classId),
        where("active", "==", true),
      ),
      (snap) => {
        const list = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName));
        setStudents(list);
      },
    );
    return unsub;
  }, [db, classId]);

  // Load ALL existing results for the class+subject+term across every assessment
  useEffect(() => {
    if (!classId || !subjectId || !currentTermId) {
      setScores({});
      setSavedScores({});
      return;
    }
    const q = query(
      collection(db, "results"),
      where("classId", "==", classId),
      where("subjectId", "==", subjectId),
      where("termId", "==", currentTermId),
    );
    const unsub = onSnapshot(q, (snap) => {
      const byStudent = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        if (!byStudent[data.studentId]) byStudent[data.studentId] = {};
        byStudent[data.studentId][data.assessmentId] = data.score;
      });
      setSavedScores(byStudent);
      // Pre-fill editing state with saved values (only if scores state is empty)
      setScores((prev) => {
        const merged = { ...byStudent };
        // Preserve unsaved edits in memory
        Object.entries(prev).forEach(([sid, sMap]) => {
          merged[sid] = { ...(merged[sid] || {}), ...sMap };
        });
        return merged;
      });
    });
    return unsub;
  }, [db, classId, subjectId, currentTermId]);

  const setScore = (studentId, assessmentId, value, maxScore) => {
    if (value === "") {
      setScores((s) => {
        const next = { ...s };
        if (next[studentId]) {
          const nextS = { ...next[studentId] };
          delete nextS[assessmentId];
          if (Object.keys(nextS).length === 0) delete next[studentId];
          else next[studentId] = nextS;
        }
        return next;
      });
      return;
    }
    let num = Number(value);
    if (isNaN(num)) return;
    if (num < 0) num = 0;
    if (num > maxScore) num = maxScore;
    setScores((s) => ({
      ...s,
      [studentId]: { ...(s[studentId] || {}), [assessmentId]: num },
    }));
  };

  const getScore = (studentId, assessmentId) => {
    return scores[studentId]?.[assessmentId] ?? "";
  };

  const rowTotal = (studentId) => {
    return assessments.reduce((sum, a) => {
      const v = scores[studentId]?.[a.id];
      return sum + (typeof v === "number" ? v : 0);
    }, 0);
  };

  const maxTotal = assessments.reduce((sum, a) => sum + (a.maxScore || 0), 0);

  const saveAll = async () => {
    setSavedMsg("");
    setSaving(true);
    try {
      const batch = writeBatch(db);
      let count = 0;
      // For each student, for each assessment they have a value on, upsert a result doc.
      // Only write cells with values - never overwrite existing scores with blanks.
      for (const student of students) {
        const studentScores = scores[student.id] || {};
        for (const assessment of assessments) {
          const value = studentScores[assessment.id];
          if (value === undefined || value === null || value === "") continue;

          // Skip if unchanged from saved (avoids unnecessary writes)
          const saved = savedScores[student.id]?.[assessment.id];
          if (saved === value) continue;

          const resultId = `${student.id}_${currentTermId}_${subjectId}_${assessment.id}`;
          batch.set(
            doc(db, "results", resultId),
            {
              studentId: student.id,
              termId: currentTermId,
              classId,
              subjectId,
              assessmentId: assessment.id,
              score: Number(value),
              maxScore: assessment.maxScore,
              enteredBy: profile.id,
              enteredByName: profile.fullName,
              enteredAt: serverTimestamp(),
              updatedBy: profile.id,
              updatedAt: serverTimestamp(),
            },
            { merge: true },
          );
          count++;
        }
      }
      if (count === 0) {
        setSavedMsg("No changes to save");
        setSaving(false);
        return;
      }
      await batch.commit();
      setSavedMsg(`Saved ${count} score${count === 1 ? "" : "s"} ✓`);
      setTimeout(() => setSavedMsg(""), 3000);
    } catch (err) {
      console.error("Save scores error:", err);
      setSavedMsg("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="p-8">
        <Spinner />
      </div>
    );

  if (!currentTermId) {
    return (
      <div className="p-6 md:p-8 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-6">Result entry</h1>
        <Card className="p-12 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-ink-soft mb-1">No current academic term set.</p>
          <p className="text-sm text-ink-soft">
            Ask your director to set the current term in Settings → Terms.
          </p>
        </Card>
      </div>
    );
  }

  if (availableClasses.length === 0) {
    return (
      <div className="p-6 md:p-8 max-w-4xl">
        <h1 className="text-2xl font-semibold mb-6">Result entry</h1>
        <Card className="p-12 text-center">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
          <p className="text-ink-soft mb-1">
            You have no classes assigned to you.
          </p>
          <p className="text-sm text-ink-soft">
            Ask your director to assign you to classes in Teachers.
          </p>
        </Card>
      </div>
    );
  }

  const currentTerm = terms.find((t) => t.id === currentTermId);
  const selectedClass = classes.find((c) => c.id === classId);
  const selectedSubject = subjects.find((s) => s.id === subjectId);

  return (
    <div className="p-6 md:p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Result entry</h1>
        <p className="text-sm text-ink-soft mt-1">
          {currentTerm && (
            <>
              Current term:{" "}
              <strong>
                {currentTerm.academicYear} — {currentTerm.name}
              </strong>
            </>
          )}
        </p>
      </div>

      <Card className="p-4 mb-6">
        <div className="grid md:grid-cols-2 gap-4">
          <Select
            label="Class"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value);
              setSubjectId("");
            }}
          >
            <option value="">— select —</option>
            {availableClasses.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
          <Select
            label="Subject"
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            disabled={!classId}
          >
            <option value="">— select —</option>
            {availableSubjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      </Card>

      {!classId || !subjectId ? (
        <Card className="p-12 text-center">
          <ClipboardList className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">
            Pick a class and subject to open the score sheet.
          </p>
        </Card>
      ) : students.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-ink-soft">No active students in this class.</p>
        </Card>
      ) : assessments.length === 0 ? (
        <Card className="p-12 text-center">
          <p className="text-ink-soft">
            No assessments configured. Ask your director to set them up in
            Settings.
          </p>
        </Card>
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between flex-wrap gap-2">
            <div className="text-sm text-ink-soft">
              <strong className="text-ink">{selectedClass?.name}</strong> ·{" "}
              <strong className="text-ink">{selectedSubject?.name}</strong> ·{" "}
              {students.length} students
            </div>
          </div>

          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 border-b border-slate-200">
                  <tr>
                    <th className="text-left px-3 py-3 font-medium w-10 sticky left-0 bg-slate-50">
                      #
                    </th>
                    <th className="text-left px-3 py-3 font-medium sticky left-10 bg-slate-50 min-w-[180px]">
                      Student
                    </th>
                    {assessments.map((a) => (
                      <th
                        key={a.id}
                        className="text-center px-2 py-3 font-medium min-w-[90px]"
                      >
                        {a.code}
                        <div className="text-xs text-ink-soft font-normal">
                          / {a.maxScore}
                        </div>
                      </th>
                    ))}
                    <th className="text-center px-2 py-3 font-medium bg-slate-100 min-w-[90px]">
                      Total
                      <div className="text-xs text-ink-soft font-normal">
                        / {maxTotal}
                      </div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {students.map((s, i) => {
                    const total = rowTotal(s.id);
                    const filledCount = assessments.filter(
                      (a) => scores[s.id]?.[a.id] !== undefined,
                    ).length;
                    return (
                      <tr
                        key={s.id}
                        className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                      >
                        <td className="px-3 py-2 text-ink-soft sticky left-0 bg-white">
                          {i + 1}
                        </td>
                        <td className="px-3 py-2 font-medium sticky left-10 bg-white">
                          {s.fullName}
                        </td>
                        {assessments.map((a) => {
                          const val = getScore(s.id, a.id);
                          const saved = savedScores[s.id]?.[a.id];
                          const isChanged = val !== "" && saved !== val;
                          return (
                            <td key={a.id} className="px-2 py-2 text-center">
                              <input
                                type="number"
                                min="0"
                                max={a.maxScore}
                                step="0.5"
                                value={val}
                                onChange={(e) =>
                                  setScore(
                                    s.id,
                                    a.id,
                                    e.target.value,
                                    a.maxScore,
                                  )
                                }
                                placeholder="—"
                                className={`w-16 rounded border px-1.5 py-1.5 text-center focus:outline-none focus:ring-2 focus:ring-brand-500 ${
                                  isChanged
                                    ? "border-amber-400 bg-amber-50"
                                    : saved !== undefined
                                      ? "border-emerald-300 bg-emerald-50"
                                      : "border-slate-300"
                                }`}
                              />
                            </td>
                          );
                        })}
                        <td
                          className={`px-2 py-2 text-center font-medium bg-slate-50 ${
                            filledCount === 0
                              ? "text-ink-soft"
                              : filledCount < assessments.length
                                ? "text-amber-700"
                                : "text-emerald-700"
                          }`}
                        >
                          {filledCount === 0 ? "—" : total}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>

          <div className="mt-4 flex items-center gap-4 flex-wrap text-xs text-ink-soft">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-emerald-300 bg-emerald-50"></span>{" "}
              Saved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-amber-400 bg-amber-50"></span>{" "}
              Edited, not saved
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded border border-slate-300 bg-white"></span>{" "}
              Empty
            </span>
          </div>

          <div className="mt-6 flex items-center justify-end gap-3 flex-wrap">
            {savedMsg && (
              <span
                className={`text-sm ${savedMsg.includes("failed") ? "text-red-600" : "text-emerald-700"}`}
              >
                {savedMsg}
              </span>
            )}
            <Button onClick={saveAll} disabled={saving}>
              <Save className="w-4 h-4" />{" "}
              {saving ? "Saving…" : "Save all scores"}
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
