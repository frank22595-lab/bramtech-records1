import { useState, useEffect } from "react";
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  getDocs,
  orderBy,
  query,
} from "firebase/firestore";
import { X, Check, User, Mail, Phone, FileText, Loader2 } from "lucide-react";
import { getFirebase } from "../../config/firebase";

/**
 * Modal that opens when a director reviews a pending teacher (or edits an
 * approved one). Sets: role, class teacher of, assigned classes, assigned
 * subjects, permissions.
 *
 * On save: updates the user doc. If teacher was pending, changes status to
 * 'active'.
 */

const OPTIONAL_PERMISSIONS = [
  { key: "manageTerms", label: "Create and edit academic terms" },
  { key: "generateAccessCodes", label: "Generate parent access codes" },
  { key: "sendAccessCodes", label: "Send access codes via WhatsApp" },
  { key: "regenerateAccessCodes", label: "Regenerate parent access codes" },
  { key: "viewClassAnalytics", label: "View class analytics" },
  { key: "editClassDetails", label: "Edit class details" },
  { key: "manageSubjects", label: "Add/remove subjects to their class" },
  { key: "printReports", label: "Print report cards" },
  { key: "downloadClassSheet", label: "Download class score sheet (Excel)" },
];

const BASELINE_PERMISSIONS = [
  "Add/remove students in own class",
  "Enter scores for assigned subjects",
  "Enter attendance for own class",
  "Write teacher comments",
  "Publish report cards",
];

export default function StaffApprovalModal({ staff, onClose, onSave }) {
  const { db } = getFirebase();
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [role, setRole] = useState(staff.role || "teacher");
  const [classTeacherOf, setClassTeacherOf] = useState(
    staff.classTeacherOf || staff.proposedClassTeacherOf || "",
  );
  const [assignedClasses, setAssignedClasses] = useState(
    Array.isArray(staff.assignedClasses) && staff.assignedClasses.length > 0
      ? staff.assignedClasses
      : staff.proposedClassTeacherOf
        ? [staff.proposedClassTeacherOf]
        : [],
  );
  const [assignedSubjects, setAssignedSubjects] = useState(
    Array.isArray(staff.assignedSubjects) && staff.assignedSubjects.length > 0
      ? staff.assignedSubjects
      : Array.isArray(staff.proposedSubjects)
        ? staff.proposedSubjects
        : [],
  );
  const [permissions, setPermissions] = useState(staff.permissions || {});

  useEffect(() => {
    async function load() {
      try {
        const [classesSnap, subjectsSnap] = await Promise.all([
          getDocs(query(collection(db, "classes"), orderBy("order"))),
          getDocs(query(collection(db, "subjects"), orderBy("name"))),
        ]);
        setClasses(classesSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setSubjects(subjectsSnap.docs.map((d) => ({ id: d.id, ...d.data() })));
      } catch (err) {
        setError("Could not load classes and subjects: " + err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [db]);

  const toggleClass = (id) => {
    setAssignedClasses((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  };

  const toggleSubject = (id) => {
    setAssignedSubjects((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id],
    );
  };

  const togglePermission = (key) => {
    setPermissions((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleClassTeacherOfChange = (newClassId) => {
    setClassTeacherOf(newClassId);
    if (newClassId && !assignedClasses.includes(newClassId)) {
      setAssignedClasses((prev) => [...prev, newClassId]);
    }
  };

  const save = async (opts = { approve: false }) => {
    setError("");
    setSaving(true);
    try {
      const updates = {
        role,
        classTeacherOf: classTeacherOf || null,
        assignedClasses,
        assignedSubjects,
        permissions,
        updatedAt: serverTimestamp(),
      };
      if (opts.approve && staff.status === "pending") {
        updates.status = "active";
        updates.approvedAt = serverTimestamp();
      }
      await updateDoc(doc(db, "users", staff.id), updates);
      if (onSave) onSave();
      onClose();
    } catch (err) {
      setError("Could not save: " + err.message);
      setSaving(false);
    }
  };

  const isPending = staff.status === "pending";

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-start md:items-center justify-center p-4 z-50 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full my-4 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-slate-200 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-slate-900 truncate">
                {staff.fullName}
              </h2>
              {isPending && (
                <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  Pending
                </span>
              )}
              {staff.status === "active" && (
                <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider">
                  Active
                </span>
              )}
            </div>
            <div className="text-sm text-slate-500 space-y-0.5">
              <div className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5" />
                {staff.email}
              </div>
              {staff.phone && (
                <div className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5" />
                  {staff.phone}
                </div>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-slate-100 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading classes and subjects…
          </div>
        ) : (
          <div className="p-5 space-y-6">
            {staff.signupNote && (
              <div className="bg-slate-50 rounded-lg p-3 border-l-4 border-slate-400">
                <div className="flex items-center gap-2 text-xs font-semibold text-slate-600 mb-1">
                  <FileText className="w-3.5 h-3.5" />
                  Note from {staff.fullName?.split(" ")[0]}:
                </div>
                <p className="text-sm text-slate-700">{staff.signupNote}</p>
              </div>
            )}

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Role
              </label>
              <div className="flex gap-2">
                {[
                  { value: "teacher", label: "Teacher" },
                  { value: "admin", label: "Admin (full access)" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setRole(opt.value)}
                    className={`flex-1 border rounded-lg p-3 text-sm font-medium transition-colors ${
                      role === opt.value
                        ? "border-brand-600 bg-brand-50 text-brand-700"
                        : "border-slate-200 text-slate-600 hover:border-slate-300"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              {role === "admin" && (
                <p className="text-xs text-amber-700 mt-2 bg-amber-50 p-2 rounded">
                  ⚠ Admins have almost the same access as directors. Only give
                  this to trusted staff.
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Class teacher of
              </label>
              <select
                value={classTeacherOf}
                onChange={(e) => handleClassTeacherOfChange(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
              >
                <option value="">— not a class teacher —</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Class teachers can add/remove students in their class.
              </p>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Also teaches in classes{" "}
                <span className="text-slate-500 font-normal">(select all)</span>
              </label>
              <div className="border border-slate-300 rounded-lg p-3 grid grid-cols-2 gap-1">
                {classes.map((c) => {
                  const checked = assignedClasses.includes(c.id);
                  return (
                    <label
                      key={c.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${checked ? "bg-slate-100" : "hover:bg-slate-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleClass(c.id)}
                        className="w-4 h-4 accent-brand-600"
                      />
                      {c.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Subjects taught{" "}
                <span className="text-slate-500 font-normal">(select all)</span>
              </label>
              <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-0.5">
                {subjects.map((s) => {
                  const checked = assignedSubjects.includes(s.id);
                  return (
                    <label
                      key={s.id}
                      className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${checked ? "bg-slate-100" : "hover:bg-slate-50"}`}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleSubject(s.id)}
                        className="w-4 h-4 accent-brand-600"
                      />
                      {s.name}
                    </label>
                  );
                })}
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-slate-900 mb-2">
                Permissions
              </label>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 mb-3">
                <div className="text-xs font-semibold text-emerald-800 mb-2 uppercase tracking-wider">
                  Baseline — always on
                </div>
                <ul className="text-sm text-emerald-900 space-y-1">
                  {BASELINE_PERMISSIONS.map((p) => (
                    <li key={p} className="flex items-center gap-2">
                      <Check className="w-3.5 h-3.5 flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="border border-slate-200 rounded-lg p-3">
                <div className="text-xs font-semibold text-slate-600 mb-2 uppercase tracking-wider">
                  Optional — you choose
                </div>
                <div className="space-y-0.5">
                  {OPTIONAL_PERMISSIONS.map((p) => {
                    const checked = !!permissions[p.key];
                    return (
                      <label
                        key={p.key}
                        className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${checked ? "bg-slate-100" : "hover:bg-slate-50"}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => togglePermission(p.key)}
                          className="w-4 h-4 accent-brand-600"
                        />
                        {p.label}
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>
        )}

        {!loading && (
          <div className="p-5 border-t border-slate-200 flex justify-end gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg text-sm disabled:opacity-50"
            >
              Cancel
            </button>
            {isPending ? (
              <button
                onClick={() => save({ approve: true })}
                disabled={saving}
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium rounded-lg text-sm disabled:opacity-50 flex items-center gap-2"
              >
                {saving ? (
                  "Approving…"
                ) : (
                  <>
                    <Check className="w-4 h-4" />
                    Approve & save
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={() => save()}
                disabled={saving}
                className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-lg text-sm disabled:opacity-50"
              >
                {saving ? "Saving…" : "Save changes"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
