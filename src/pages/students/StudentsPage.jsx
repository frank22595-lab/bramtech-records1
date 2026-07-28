import { useState, useEffect, useMemo, useRef } from "react";
import {
  collection,
  query,
  where,
  onSnapshot,
  doc,
  setDoc,
  updateDoc,
  serverTimestamp,
  orderBy,
} from "firebase/firestore";
import { Plus, Search, Camera, X, User, Lock } from "lucide-react";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Badge,
} from "../../components/ui";
import { getFirebase } from "../../config/firebase";
import { useAuth } from "../../contexts/AuthContext";

// Photo upload is temporarily disabled until Firebase Storage billing is set up.
// The <Avatar> component gracefully shows initials-in-a-circle for students
// without a photoUrl, so nothing looks broken. Flip this to true to re-enable.
const PHOTOS_ENABLED = false;

export default function StudentsPage() {
  const { db } = getFirebase();
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filterClassId, setFilterClassId] = useState("all");
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "classes"), orderBy("order"));
    return onSnapshot(q, (snap) => {
      setClasses(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, [db]);

  useEffect(() => {
    const q = query(collection(db, "students"), orderBy("fullName"));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setStudents(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
      (err) => {
        console.error("[Students] load error:", err);
        setLoading(false);
      },
    );
    return unsub;
  }, [db]);

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim();
    return students.filter((s) => {
      if (filterClassId !== "all" && s.classId !== filterClassId) return false;
      if (
        term &&
        !s.fullName.toLowerCase().includes(term) &&
        !(s.admissionNumber || "").toLowerCase().includes(term)
      )
        return false;
      return true;
    });
  }, [students, filterClassId, search]);

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Students</h1>
          <p className="text-sm text-ink-soft mt-0.5">
            {students.length} enrolled
          </p>
        </div>
        <Button onClick={() => setEditing({})}>
          <Plus className="w-4 h-4" /> Add student
        </Button>
      </div>

      <div className="grid md:grid-cols-[1fr_240px] gap-3 mb-6">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
          <input
            placeholder="Search by name or admission number…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500 focus:border-brand-500"
          />
        </div>
        <Select
          value={filterClassId}
          onChange={(e) => setFilterClassId(e.target.value)}
        >
          <option value="all">All classes</option>
          {classes.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {loading ? (
        <Spinner label="Loading students…" />
      ) : filtered.length === 0 ? (
        <Card className="p-12 text-center">
          <User className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">
            {students.length === 0
              ? 'No students yet. Click "Add student" to get started.'
              : "No students match your filters."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-2">
          {filtered.map((s) => (
            <StudentRow
              key={s.id}
              student={s}
              classes={classes}
              onEdit={() => setEditing(s)}
            />
          ))}
        </div>
      )}

      {editing !== null && (
        <StudentModal
          student={editing.id ? editing : null}
          classes={classes}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function StudentRow({ student, classes, onEdit }) {
  const className =
    classes.find((c) => c.id === student.classId)?.name ||
    student.className ||
    "—";
  return (
    <Card
      className="p-3 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onEdit}
    >
      <Avatar photoUrl={student.photoUrl} name={student.fullName} />
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{student.fullName}</div>
        <div className="text-xs text-ink-soft flex items-center gap-2 mt-0.5 flex-wrap">
          <span>{student.admissionNumber || "—"}</span>
          <span>·</span>
          <span>{className}</span>
          {student.gender && (
            <>
              <span>·</span>
              <span className="capitalize">{student.gender}</span>
            </>
          )}
        </div>
      </div>
      {!student.active && <Badge tone="warning">Inactive</Badge>}
    </Card>
  );
}

function Avatar({ photoUrl, name, size = 40 }) {
  const initials = (name || "?")
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  if (photoUrl) {
    return (
      <img
        src={photoUrl}
        alt={name}
        className="rounded-full object-cover flex-shrink-0"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <div
      className="rounded-full bg-brand-100 text-brand-700 font-medium flex items-center justify-center flex-shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {initials || <User className="w-1/2 h-1/2" />}
    </div>
  );
}

function StudentModal({ student, classes, onClose }) {
  const { db } = getFirebase();
  const { profile } = useAuth();
  const isEdit = !!student;

  const [form, setForm] = useState(
    () =>
      student || {
        fullName: "",
        admissionNumber: "",
        classId: classes[0]?.id || "",
        gender: "male",
        dateOfBirth: "",
        parentName: "",
        parentPhone: "",
        parentEmail: "",
        active: true,
      },
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const save = async () => {
    setError("");
    if (!form.fullName.trim()) {
      setError("Full name is required");
      return;
    }
    if (!form.classId) {
      setError("Please select a class");
      return;
    }
    setBusy(true);
    try {
      const studentId =
        student?.id ||
        `stu_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const selectedClass = classes.find((c) => c.id === form.classId);
      const payload = {
        fullName: form.fullName.trim(),
        admissionNumber: form.admissionNumber.trim() || null,
        classId: form.classId,
        className: selectedClass?.name || "",
        gender: form.gender,
        dateOfBirth: form.dateOfBirth || null,
        parentName: form.parentName.trim(),
        parentPhone: form.parentPhone.trim(),
        parentEmail: form.parentEmail.trim(),
        photoUrl: student?.photoUrl || null,
        active: form.active,
        updatedAt: serverTimestamp(),
        updatedBy: profile?.id || null,
      };

      if (isEdit) {
        await updateDoc(doc(db, "students", studentId), payload);
      } else {
        await setDoc(doc(db, "students", studentId), {
          ...payload,
          createdAt: serverTimestamp(),
          createdBy: profile?.id || null,
        });
      }
      onClose();
    } catch (err) {
      console.error("Save error:", err);
      setError(err.message);
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50"
      onClick={onClose}
    >
      <Card
        className="max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">
            {isEdit ? "Edit student" : "Add student"}
          </h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded hover:bg-slate-100"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Photo (placeholder only) */}
          <div className="flex items-center gap-4">
            <Avatar
              photoUrl={student?.photoUrl}
              name={form.fullName || "New"}
              size={80}
            />
            <div className="flex-1">
              {PHOTOS_ENABLED ? (
                <Button variant="secondary" disabled>
                  <Camera className="w-4 h-4" /> Add photo
                </Button>
              ) : (
                <div className="text-sm text-ink-soft flex items-center gap-2">
                  <Lock className="w-4 h-4" />
                  <span>Photo upload coming soon</span>
                </div>
              )}
            </div>
          </div>

          <Input
            label="Full name"
            required
            value={form.fullName}
            onChange={(e) => set("fullName", e.target.value)}
          />

          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Admission number"
              placeholder="e.g. DSC/2026/0234"
              value={form.admissionNumber}
              onChange={(e) => set("admissionNumber", e.target.value)}
            />
            <Select
              label="Class"
              value={form.classId}
              onChange={(e) => set("classId", e.target.value)}
            >
              <option value="">— select —</option>
              {classes.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <Select
              label="Gender"
              value={form.gender}
              onChange={(e) => set("gender", e.target.value)}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
            </Select>
            <Input
              label="Date of birth"
              type="date"
              value={form.dateOfBirth || ""}
              onChange={(e) => set("dateOfBirth", e.target.value)}
            />
          </div>

          <div className="pt-2 border-t border-slate-200">
            <p className="text-sm font-medium mb-3">Parent / Guardian</p>
            <div className="space-y-3">
              <Input
                label="Parent name"
                value={form.parentName}
                onChange={(e) => set("parentName", e.target.value)}
              />
              <div className="grid md:grid-cols-2 gap-4">
                <Input
                  label="Parent phone (WhatsApp)"
                  value={form.parentPhone}
                  onChange={(e) => set("parentPhone", e.target.value)}
                />
                <Input
                  label="Parent email"
                  type="email"
                  value={form.parentEmail}
                  onChange={(e) => set("parentEmail", e.target.value)}
                />
              </div>
            </div>
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 pt-2">
              <input
                type="checkbox"
                checked={form.active}
                onChange={(e) => set("active", e.target.checked)}
                className="w-4 h-4 accent-brand-600"
              />
              <span className="text-sm">
                Active (uncheck to graduate/deactivate)
              </span>
            </label>
          )}

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Add student"}
          </Button>
        </div>
      </Card>
    </div>
  );
}
