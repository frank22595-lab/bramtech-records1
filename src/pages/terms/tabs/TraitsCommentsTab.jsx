import { useState, useEffect, useMemo } from "react";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  serverTimestamp,
  where,
} from "firebase/firestore";
import {
  ChevronLeft,
  ChevronRight,
  Save,
  Check,
  User,
  AlertCircle,
  Info,
  Lock,
} from "lucide-react";
import {
  Button,
  Card,
  Select,
  Spinner,
  Input,
  Badge,
} from "../../../components/ui";
import { getFirebase } from "../../../config/firebase";
import { useAuth } from "../../../contexts/AuthContext";
import { useSchool } from "../../../contexts/SchoolContext";
import { usePermissions } from "../../../hooks/usePermissions";
import { calculateAge } from "../../../lib/reportCardCompute";

function clean(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    if (v === undefined) continue;
    if (
      v &&
      typeof v === "object" &&
      !Array.isArray(v) &&
      !(v && v.constructor && v.constructor.name === "FieldValue")
    ) {
      out[k] = clean(v);
    } else {
      out[k] = v;
    }
  }
  return out;
}

/**
 * TraitsCommentsTab
 *
 * Ownership:
 *   - Class teacher of the class: can edit psychomotor + affective + class teacher's comment
 *   - Director/admin: can edit everything (traits, both comments, adviser comment)
 *   - Subject-only teachers (e.g. Music teacher across 3 classes): read-only view
 *
 * Attendance is NO LONGER edited here — moved to dedicated Attendance tab.
 */
export default function TraitsCommentsTab({ term, readOnly }) {
  const { db } = getFirebase();
  const { profile } = useAuth();
  const { school } = useSchool();
  const { isAdminOrDirector, isTeacher, canAccessClass, classTeacherOf } =
    usePermissions();

  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [reportCards, setReportCards] = useState([]);
  const [classId, setClassId] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState(null);
  const [classTeacher, setClassTeacher] = useState(null);
  const [loading, setLoading] = useState(true);

  const cfg = school?.reportCardConfig || {};
  const psychomotorList = cfg.psychomotorSkills || cfg.skills || [];
  const affectiveList = cfg.affectiveTraits || [];
  const showAdviser = cfg.showAdviserComment === true;

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "classes"), orderBy("order")),
      (snap) => {
        setClasses(
          snap.docs
            .map((d) => ({ id: d.id, ...d.data() }))
            .filter((c) => c.active),
        );
        setLoading(false);
      },
    );
  }, [db]);

  const visibleClasses = useMemo(() => {
    if (isAdminOrDirector) return classes;
    return classes.filter((c) => canAccessClass(c.id));
  }, [classes, isAdminOrDirector, profile]);

  useEffect(() => {
    if (isTeacher && !classId && classTeacherOf) {
      // Pre-select the class they're class teacher of
      setClassId(classTeacherOf);
    } else if (isTeacher && !classId && visibleClasses.length === 1) {
      setClassId(visibleClasses[0].id);
    }
  }, [isTeacher, visibleClasses, classId, classTeacherOf]);

  useEffect(() => {
    if (!classId) {
      setStudents([]);
      return;
    }
    const q = query(
      collection(db, "students"),
      where("classId", "==", classId),
      where("active", "==", true),
    );
    return onSnapshot(q, (snap) => {
      setStudents(
        snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => a.fullName.localeCompare(b.fullName)),
      );
    });
  }, [db, classId]);

  useEffect(() => {
    if (!classId || !term?.id) {
      setReportCards([]);
      return;
    }
    const q = query(
      collection(db, "reportCards"),
      where("classId", "==", classId),
      where("termId", "==", term.id),
    );
    return onSnapshot(q, (snap) =>
      setReportCards(snap.docs.map((d) => ({ id: d.id, ...d.data() }))),
    );
  }, [db, classId, term?.id]);

  useEffect(() => {
    if (!classId) return;
    return onSnapshot(
      query(
        collection(db, "users"),
        where("role", "==", "teacher"),
        where("classTeacherOf", "==", classId),
      ),
      (snap) => {
        const t = snap.docs[0];
        setClassTeacher(t ? { id: t.id, ...t.data() } : null);
      },
    );
  }, [db, classId]);

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedIndex = students.findIndex((s) => s.id === selectedStudentId);
  const selectedClass = classes.find((c) => c.id === classId);

  // Am I the class teacher of the selected class?
  const isClassTeacherOfSelected = isTeacher && classTeacherOf === classId;

  if (loading) return <Spinner />;

  if (isTeacher && visibleClasses.length === 0) {
    return (
      <Card className="p-6 bg-amber-50 border-amber-200">
        <div className="flex items-start gap-3">
          <Lock className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-amber-900">
              No classes assigned
            </p>
            <p className="text-sm text-amber-800 mt-1">
              Your director hasn't assigned you to any classes yet.
            </p>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div>
      <Card className="p-4 mb-4">
        <Select
          label="Class"
          value={classId}
          onChange={(e) => {
            setClassId(e.target.value);
            setSelectedStudentId(null);
          }}
        >
          <option value="">— pick a class —</option>
          {visibleClasses.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
        {classId && classTeacher && (
          <p className="text-xs text-ink-soft mt-2">
            Class teacher: <strong>{classTeacher.fullName}</strong>
          </p>
        )}
        {classId && !classTeacher && (
          <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
            <AlertCircle className="w-3 h-3" /> No class teacher assigned. Set
            one in School → Teachers.
          </p>
        )}
        {isTeacher &&
          classId &&
          !isClassTeacherOfSelected &&
          !isAdminOrDirector && (
            <p className="text-xs text-amber-700 mt-2 flex items-center gap-1">
              <Info className="w-3 h-3" /> You're not the class teacher of{" "}
              {selectedClass?.name}. You can view but not edit.
            </p>
          )}
        <p className="text-xs text-ink-soft mt-2 flex items-center gap-1">
          <Info className="w-3 h-3" /> Enter attendance in the{" "}
          <strong>Attendance</strong> tab, not here.
        </p>
      </Card>

      {!classId ? (
        <Card className="p-12 text-center">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">
            Pick a class to start filling traits and comments.
          </p>
        </Card>
      ) : students.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">No active students in this class.</p>
        </Card>
      ) : (
        <div className="grid md:grid-cols-[280px_1fr] gap-4">
          <Card className="p-2 h-fit md:sticky md:top-4 max-h-[calc(100vh-100px)] overflow-y-auto">
            <div className="text-xs text-ink-soft px-2 py-1.5">
              {students.length} students · click to open
            </div>
            <ul>
              {students.map((s) => {
                const card = reportCards.find((r) => r.studentId === s.id);
                const hasData = !!(
                  card?.psychomotor?.length ||
                  card?.affective?.length ||
                  card?.classTeacherComment ||
                  card?.headTeacherComment ||
                  card?.adviserComment
                );
                const active = s.id === selectedStudentId;
                return (
                  <li key={s.id}>
                    <button
                      onClick={() => setSelectedStudentId(s.id)}
                      className={`w-full text-left px-2 py-2 rounded-lg text-sm flex items-center gap-2 ${active ? "bg-brand-50 text-brand-700 font-medium" : "hover:bg-slate-50"}`}
                    >
                      <span className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 text-xs font-medium flex items-center justify-center flex-shrink-0">
                        {(s.fullName || "?")
                          .split(" ")
                          .map((w) => w[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </span>
                      <span className="flex-1 truncate">{s.fullName}</span>
                      {hasData && (
                        <Check className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                      )}
                      {card?.status === "published" && (
                        <Badge tone="success">Pub</Badge>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          </Card>

          {!selectedStudent ? (
            <Card className="p-12 text-center">
              <p className="text-ink-soft">
                Pick a student on the left to fill in their traits and comments.
              </p>
            </Card>
          ) : (
            <StudentEditor
              student={selectedStudent}
              classId={classId}
              className={selectedClass?.name || selectedStudent.className || ""}
              term={term}
              existingCard={reportCards.find(
                (r) => r.studentId === selectedStudent.id,
              )}
              psychomotorList={psychomotorList}
              affectiveList={affectiveList}
              classTeacher={classTeacher}
              school={school}
              profile={profile}
              isAdminOrDirector={isAdminOrDirector}
              isClassTeacherOfSelected={isClassTeacherOfSelected}
              showAdviser={showAdviser}
              readOnly={readOnly}
              onPrev={
                selectedIndex > 0
                  ? () => setSelectedStudentId(students[selectedIndex - 1].id)
                  : null
              }
              onNext={
                selectedIndex < students.length - 1
                  ? () => setSelectedStudentId(students[selectedIndex + 1].id)
                  : null
              }
              position={`${selectedIndex + 1} of ${students.length}`}
            />
          )}
        </div>
      )}
    </div>
  );
}

function StudentEditor({
  student,
  classId,
  className,
  term,
  existingCard,
  psychomotorList,
  affectiveList,
  classTeacher,
  school,
  profile,
  isAdminOrDirector,
  isClassTeacherOfSelected,
  showAdviser,
  readOnly,
  onPrev,
  onNext,
  position,
}) {
  const { db } = getFirebase();
  const [psychomotor, setPsychomotor] = useState(() =>
    psychomotorList.map((name) => ({
      name,
      rating:
        existingCard?.psychomotor?.find((x) => x.name === name)?.rating || 0,
    })),
  );
  const [affective, setAffective] = useState(() =>
    affectiveList.map((name) => ({
      name,
      rating:
        existingCard?.affective?.find((x) => x.name === name)?.rating || 0,
    })),
  );
  const [classTeacherComment, setClassTeacherComment] = useState(
    existingCard?.classTeacherComment || "",
  );
  const [headTeacherComment, setHeadTeacherComment] = useState(
    existingCard?.headTeacherComment || "",
  );
  const [adviserComment, setAdviserComment] = useState(
    existingCard?.adviserComment || "",
  );
  const [adviserName, setAdviserName] = useState(
    existingCard?.adviserName || "",
  );
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setPsychomotor(
      psychomotorList.map((name) => ({
        name,
        rating:
          existingCard?.psychomotor?.find((x) => x.name === name)?.rating || 0,
      })),
    );
    setAffective(
      affectiveList.map((name) => ({
        name,
        rating:
          existingCard?.affective?.find((x) => x.name === name)?.rating || 0,
      })),
    );
    setClassTeacherComment(existingCard?.classTeacherComment || "");
    setHeadTeacherComment(existingCard?.headTeacherComment || "");
    setAdviserComment(existingCard?.adviserComment || "");
    setAdviserName(existingCard?.adviserName || "");
    setMsg("");
  }, [student.id]);

  // Permissions:
  //   - Traits + class teacher's comment: class teacher OR director
  //   - Principal's comment + adviser: director only
  const canEditClassTeacherFields =
    !readOnly && (isAdminOrDirector || isClassTeacherOfSelected);
  const canEditPrincipalFields = !readOnly && isAdminOrDirector;

  const age = calculateAge(
    student.dateOfBirth,
    term?.endDate ? new Date(term.endDate) : new Date(),
  );

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const reportId = `${student.id}_${term.id}`;
      const payload = {
        studentId: student.id,
        studentName: student.fullName || "",
        admissionNumber: student.admissionNumber || null,
        classId: classId || null,
        className: className || student.className || "",
        termId: term.id,
        termName: term.name || "",
        academicYear: term.academicYear || "",
        psychomotor: psychomotor.filter((s) => s.rating > 0),
        affective: affective.filter((s) => s.rating > 0),
        classTeacherComment: classTeacherComment.trim() || null,
        classTeacherName: classTeacherComment.trim()
          ? classTeacher?.fullName || null
          : null,
      };

      if (canEditPrincipalFields) {
        payload.headTeacherComment = headTeacherComment.trim() || null;
        payload.headTeacherName = headTeacherComment.trim()
          ? school?.principalName || null
          : null;
        payload.headTeacherTitle = headTeacherComment.trim()
          ? school?.principalTitle || "Principal"
          : null;
        if (showAdviser) {
          payload.adviserComment = adviserComment.trim() || null;
          payload.adviserName = adviserComment.trim()
            ? adviserName.trim() || "Academic Adviser"
            : null;
        }
      }

      payload.status = existingCard?.status || "draft";
      payload.updatedAt = serverTimestamp();
      if (!existingCard) payload.createdAt = serverTimestamp();

      await setDoc(doc(db, "reportCards", reportId), clean(payload), {
        merge: true,
      });
      setMsg("✓ Saved");
      setTimeout(() => setMsg(""), 2500);
    } catch (err) {
      console.error("Traits save error:", err);
      setMsg("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3 mb-4 flex-wrap">
        <div>
          <h2 className="text-lg font-semibold">{student.fullName}</h2>
          <p className="text-xs text-ink-soft">
            {student.admissionNumber || "—"} ·{" "}
            {student.gender
              ? student.gender.charAt(0).toUpperCase() + student.gender.slice(1)
              : "—"}
            {age !== null && ` · ${age} years`}
          </p>
          {position && (
            <p className="text-xs text-ink-soft mt-0.5">{position}</p>
          )}
        </div>
        <div className="flex gap-2">
          <button
            onClick={onPrev}
            disabled={!onPrev}
            className="p-2 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            onClick={onNext}
            disabled={!onNext}
            className="p-2 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {psychomotor.length > 0 && (
        <Section title="Psychomotor skills">
          <TraitGrid
            items={psychomotor}
            setItems={setPsychomotor}
            canEdit={canEditClassTeacherFields}
          />
        </Section>
      )}

      {affective.length > 0 && (
        <Section title="Affective traits">
          <TraitGrid
            items={affective}
            setItems={setAffective}
            canEdit={canEditClassTeacherFields}
          />
        </Section>
      )}

      <Section title="Class teacher's comment">
        <textarea
          value={classTeacherComment}
          disabled={!canEditClassTeacherFields}
          onChange={(e) => setClassTeacherComment(e.target.value)}
          placeholder={
            canEditClassTeacherFields
              ? "Enter class teacher's comment…"
              : "Only the class teacher or director can edit this."
          }
          rows={2}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
        <p className="text-xs text-ink-soft mt-1">
          {classTeacher?.fullName ? (
            <>
              Signed: <strong>{classTeacher.fullName}</strong>
            </>
          ) : (
            <span className="text-amber-700">No class teacher assigned.</span>
          )}
        </p>
      </Section>

      <Section title="Principal's comment">
        <textarea
          value={headTeacherComment}
          disabled={!canEditPrincipalFields}
          onChange={(e) => setHeadTeacherComment(e.target.value)}
          placeholder={
            canEditPrincipalFields
              ? "Enter principal's comment…"
              : "Only the director / admin can enter this."
          }
          rows={2}
          className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50"
        />
        <p className="text-xs text-ink-soft mt-1">
          {canEditPrincipalFields ? (
            school?.principalName ? (
              <>
                Signed: <strong>{school.principalName}</strong> (
                {school.principalTitle || "Principal"})
              </>
            ) : (
              <span className="text-amber-700">
                Set principal name in Settings → School to auto-sign.
              </span>
            )
          ) : (
            "Reserved for director / admin."
          )}
        </p>
      </Section>

      {showAdviser && (
        <Section title="Academic adviser's comment">
          <textarea
            value={adviserComment}
            disabled={!canEditPrincipalFields}
            onChange={(e) => setAdviserComment(e.target.value)}
            placeholder={
              canEditPrincipalFields
                ? "Enter academic adviser's comment…"
                : "Only the director / admin can enter this."
            }
            rows={2}
            className="w-full rounded border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-50 mb-2"
          />
          <Input
            label="Signed by"
            placeholder="e.g. Mrs. Adaeze Nwosu (Academic Adviser)"
            value={adviserName}
            disabled={!canEditPrincipalFields}
            onChange={(e) => setAdviserName(e.target.value)}
          />
          <p className="text-xs text-ink-soft mt-1">
            Only appears on report cards while the "Academic adviser's report"
            toggle is on in Reports → Design.
          </p>
        </Section>
      )}

      <div className="flex items-center justify-between gap-3 pt-3 border-t border-slate-200 mt-4">
        {msg && (
          <span
            className={`text-sm ${msg.includes("failed") ? "text-red-600" : "text-emerald-700"}`}
          >
            {msg}
          </span>
        )}
        <Button
          onClick={save}
          disabled={
            saving ||
            readOnly ||
            (!canEditClassTeacherFields && !canEditPrincipalFields)
          }
          className="ml-auto"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Card>
  );
}

function Section({ title, children }) {
  return (
    <div className="mb-4">
      <div className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">
        {title}
      </div>
      {children}
    </div>
  );
}

function TraitGrid({ items, setItems, canEdit }) {
  const rate = (name, r) =>
    setItems(items.map((x) => (x.name === name ? { ...x, rating: r } : x)));
  return (
    <div className="grid sm:grid-cols-2 gap-1.5">
      {items.map((item) => (
        <div
          key={item.name}
          className="flex items-center justify-between p-2 rounded hover:bg-slate-50"
        >
          <span className="text-sm">{item.name}</span>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((r) => (
              <button
                key={r}
                onClick={() => canEdit && rate(item.name, r)}
                disabled={!canEdit}
                className={`w-5 h-5 rounded-full border-2 transition-colors ${r <= item.rating ? "bg-brand-600 border-brand-600" : "border-slate-300 hover:border-brand-400"} disabled:cursor-not-allowed`}
                aria-label={`Rate ${r}`}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
