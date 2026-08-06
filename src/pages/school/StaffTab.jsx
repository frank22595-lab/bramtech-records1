import { useEffect, useState, useMemo } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import {
  Users,
  Clock,
  CheckCircle,
  User,
  ChevronRight,
  Trash2,
  Mail,
  Phone,
} from "lucide-react";
import { useSchool } from "../../contexts/SchoolContext";
import { useAuth } from "../../contexts/AuthContext";
import { getFirebase } from "../../config/firebase";
import { apiFetch } from "../../lib/apiClient";
import { Spinner, Card } from "../../components/ui";
import StaffCodeSection from "../../components/staff/StaffCodeSection";
import StaffApprovalModal from "../../components/staff/StaffApprovalModal";

/**
 * Director's Staff tab.
 * v2 — client-side sort (Firestore orderBy excludes docs without the field),
 * and includes debug logging so it's obvious when users aren't loading.
 */
export default function StaffTab() {
  const { db } = getFirebase();
  const { school } = useSchool();
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    // Query WITHOUT orderBy so docs missing createdAt still come through
    const unsub = onSnapshot(
      collection(db, "users"),
      (snap) => {
        const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));

        // Sort newest first, client-side, safe for docs missing createdAt
        docs.sort((a, b) => {
          const ta =
            a.createdAt?.toMillis?.() ||
            (a.createdAt?.seconds || 0) * 1000 ||
            0;
          const tb =
            b.createdAt?.toMillis?.() ||
            (b.createdAt?.seconds || 0) * 1000 ||
            0;
          return tb - ta;
        });

        setUsers(docs);
        setLoading(false);
        setError("");
      },
      (err) => {
        console.error("[StaffTab] Users load error:", err);
        setError(err.message || "Could not load users.");
        setLoading(false);
      },
    );
    return () => unsub();
  }, [db]);

  const { pending, active } = useMemo(() => {
    const p = users.filter((u) => u.status === "pending");
    // Show everyone except the currently logged-in director
    const a = users.filter(
      (u) => u.status !== "pending" && u.id !== currentUser?.uid,
    );
    return { pending: p, active: a };
  }, [users, currentUser?.uid]);

  const handleReject = async (user) => {
    if (
      !confirm(
        `Reject and delete ${user.fullName}'s account? This cannot be undone.`,
      )
    )
      return;
    try {
      // Server-side so the Firebase Auth login is deleted too — deleting only
      // the profile left a live login behind and blocked them from ever
      // re-signing-up with the same email.
      await apiFetch("/api/reject-staff", {
        method: "POST",
        auth: true,
        body: { uid: user.id },
      });
    } catch (err) {
      alert("Could not reject: " + err.message);
    }
  };

  if (loading) return <Spinner label="Loading staff…" />;

  return (
    <div className="space-y-6">
      <StaffCodeSection school={school} />

      {error && (
        <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
          Error loading staff: {error}
        </div>
      )}

      {/* Pending */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-amber-600" />
          <h3 className="text-base font-semibold text-slate-900">
            Waiting for approval
          </h3>
          <span className="text-xs text-slate-500">({pending.length})</span>
        </div>

        {pending.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-slate-500">
              No pending signups. When a teacher enters the join code and signs
              up, they'll appear here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-2">
            {pending.map((u) => (
              <PendingStaffRow
                key={u.id}
                user={u}
                onReview={() => setSelected(u)}
                onReject={() => handleReject(u)}
              />
            ))}
          </div>
        )}
      </section>

      {/* Active */}
      <section>
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <h3 className="text-base font-semibold text-slate-900">
            Active staff
          </h3>
          <span className="text-xs text-slate-500">({active.length})</span>
        </div>

        {active.length === 0 ? (
          <Card className="p-6 text-center">
            <p className="text-sm text-slate-500">
              No active staff yet. Approve pending signups above to add them
              here.
            </p>
          </Card>
        ) : (
          <div className="grid gap-2">
            {active.map((u) => (
              <ActiveStaffRow
                key={u.id}
                user={u}
                onClick={() => setSelected(u)}
              />
            ))}
          </div>
        )}
      </section>

      {selected && (
        <StaffApprovalModal
          staff={selected}
          onClose={() => setSelected(null)}
          onSave={() => setSelected(null)}
        />
      )}
    </div>
  );
}

function PendingStaffRow({ user, onReview, onReject }) {
  return (
    <Card className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center flex-shrink-0">
          <User className="w-5 h-5 text-amber-700" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-medium text-slate-900 truncate">
            {user.fullName}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-3 mt-0.5 flex-wrap">
            <span className="flex items-center gap-1">
              <Mail className="w-3 h-3" />
              {user.email}
            </span>
            {user.phone && (
              <span className="flex items-center gap-1">
                <Phone className="w-3 h-3" />
                {user.phone}
              </span>
            )}
          </div>
          {(user.proposedSubjects?.length > 0 || user.signupNote) && (
            <div className="mt-1.5 text-xs text-slate-600">
              {user.proposedSubjects?.length > 0 && (
                <span>{user.proposedSubjects.length} subjects proposed</span>
              )}
              {user.signupNote && (
                <>
                  {user.proposedSubjects?.length > 0 && " · "}
                  <span className="italic">
                    "{user.signupNote.slice(0, 50)}
                    {user.signupNote.length > 50 ? "…" : ""}"
                  </span>
                </>
              )}
            </div>
          )}
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button
            onClick={onReject}
            className="p-2 hover:bg-red-50 rounded-lg text-slate-400 hover:text-red-600"
            title="Reject"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={onReview}
            className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-3 py-1.5 rounded-lg flex items-center gap-1"
          >
            Review
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </Card>
  );
}

function ActiveStaffRow({ user, onClick }) {
  return (
    <Card
      className="p-3 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onClick}
    >
      <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
        <User className="w-5 h-5 text-emerald-700" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium text-slate-900 truncate">
          {user.fullName}
        </div>
        <div className="text-xs text-slate-500 mt-0.5">
          <span className="capitalize">{user.role || "no role"}</span>
          {user.classTeacherOf && " · Class teacher"}
          {user.assignedClasses?.length > 0 &&
            ` · ${user.assignedClasses.length} classes`}
          {user.assignedSubjects?.length > 0 &&
            ` · ${user.assignedSubjects.length} subjects`}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-slate-400" />
    </Card>
  );
}
