import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  serverTimestamp,
  where,
  getDocs,
} from "firebase/firestore";
import {
  Plus,
  ChevronRight,
  Calendar,
  Archive,
  PlayCircle,
  Edit2,
} from "lucide-react";
import {
  Button,
  Card,
  Input,
  Select,
  Spinner,
  Badge,
} from "../../components/ui";
import { getFirebase } from "../../config/firebase";
import { useSchool } from "../../contexts/SchoolContext";
import { usePermissions } from "../../hooks/usePermissions";

export default function TermsListPage() {
  const { db } = getFirebase();
  const { school } = useSchool();
  const { isAdminOrDirector, has } = usePermissions();
  const nav = useNavigate();
  const [terms, setTerms] = useState([]);
  const [reportStats, setReportStats] = useState({});
  const [studentsTotal, setStudentsTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState(null);

  // Can this user create/edit terms and set the current term?
  // Directors/admins always can. Teachers only if 'manageTerms' permission is on.
  const canManageTerms = isAdminOrDirector || has("manageTerms");

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "terms"), orderBy("academicYear", "desc")),
      (snap) => {
        setTerms(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
    );
  }, [db]);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "students"), where("active", "==", true)),
      (snap) => {
        setStudentsTotal(snap.size);
      },
    );
  }, [db]);

  useEffect(() => {
    return onSnapshot(collection(db, "reportCards"), (snap) => {
      const stats = {};
      snap.docs.forEach((d) => {
        const data = d.data();
        const tid = data.termId;
        if (!tid) return;
        stats[tid] = stats[tid] || { published: 0, draft: 0 };
        if (data.status === "published") stats[tid].published++;
        else stats[tid].draft++;
      });
      setReportStats(stats);
    });
  }, [db]);

  const setCurrent = async (termId) => {
    await updateDoc(doc(db, "school", "root"), {
      currentTermId: termId,
      updatedAt: serverTimestamp(),
    });
  };

  if (loading)
    return (
      <div className="p-8">
        <Spinner />
      </div>
    );

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Terms</h1>
          <p className="text-sm text-ink-soft mt-0.5">
            Every academic term's workspace lives here.
          </p>
        </div>
        {canManageTerms && (
          <Button
            onClick={() => {
              setEditing(null);
              setShowForm(true);
            }}
          >
            <Plus className="w-4 h-4" /> New term
          </Button>
        )}
      </div>

      {showForm && canManageTerms && (
        <TermForm
          term={editing}
          onClose={() => {
            setShowForm(false);
            setEditing(null);
          }}
          currentTermId={school?.currentTermId}
          existingCount={terms.length}
        />
      )}

      {terms.length === 0 ? (
        <Card className="p-12 text-center">
          <Calendar className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">
            {canManageTerms
              ? "No terms yet. Create one to start scoring and generating report cards."
              : "No terms yet. Ask your director to create one."}
          </p>
        </Card>
      ) : (
        <div className="grid gap-3">
          {terms.map((t) => {
            const isCurrent = t.id === school?.currentTermId;
            const isArchived = t.status === "archived";
            const stats = reportStats[t.id] || { published: 0, draft: 0 };
            const total = studentsTotal;
            return (
              <Card
                key={t.id}
                className={`p-4 transition-shadow ${isArchived ? "bg-slate-50/60" : "hover:shadow-md cursor-pointer"}`}
                onClick={() => !isArchived && nav(`/terms/${t.id}`)}
              >
                <div className="flex items-center gap-4">
                  <div className="w-11 h-11 rounded-lg bg-brand-50 text-brand-700 flex items-center justify-center flex-shrink-0">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium">
                        {t.academicYear} — {t.name}
                      </span>
                      {isCurrent && <Badge tone="success">Current</Badge>}
                      {isArchived && (
                        <Badge tone="default">
                          <Archive className="w-3 h-3 inline mr-0.5" />
                          Archived
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-ink-soft mt-1 flex items-center gap-3 flex-wrap">
                      <span>
                        {stats.published} published · {stats.draft} draft · of{" "}
                        {total} students
                      </span>
                      {t.resumesOn && <span>· Next term: {t.resumesOn}</span>}
                    </div>
                  </div>
                  {canManageTerms && !isCurrent && !isArchived && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setCurrent(t.id);
                      }}
                      className="text-xs px-3 py-1.5 rounded-full border border-slate-300 hover:bg-brand-50 hover:border-brand-400 whitespace-nowrap"
                    >
                      <PlayCircle className="w-3 h-3 inline mr-1" />
                      Set current
                    </button>
                  )}
                  {canManageTerms && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditing(t);
                        setShowForm(true);
                      }}
                      className="text-ink-soft hover:text-ink p-1.5 rounded hover:bg-slate-100"
                      title="Edit"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                  {!isArchived && (
                    <ChevronRight className="w-4 h-4 text-ink-soft" />
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TermForm({ term, onClose, currentTermId, existingCount }) {
  const { db } = getFirebase();
  const isEdit = !!term;
  const [form, setForm] = useState({
    name: term?.name || "",
    academicYear: term?.academicYear || "",
    termNumber: term?.termNumber || 1,
    startDate: term?.startDate || "",
    endDate: term?.endDate || "",
    resumesOn: term?.resumesOn || "",
    closingDate: term?.closingDate || "",
    timesOpened: term?.timesOpened || "",
  });
  const [busy, setBusy] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.academicYear.trim()) {
      alert("Term name and academic year are required");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        academicYear: form.academicYear.trim(),
        termNumber: Number(form.termNumber),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        resumesOn: form.resumesOn || null,
        closingDate: form.closingDate || null,
        timesOpened: form.timesOpened ? Number(form.timesOpened) : null,
        updatedAt: serverTimestamp(),
      };
      if (isEdit) {
        await updateDoc(doc(db, "terms", term.id), payload);
      } else {
        const id = `term_${Date.now()}`;
        await setDoc(doc(db, "terms", id), {
          ...payload,
          status: "active",
          createdAt: serverTimestamp(),
        });
        if (existingCount === 0 || !currentTermId) {
          await updateDoc(doc(db, "school", "root"), {
            currentTermId: id,
            updatedAt: serverTimestamp(),
          });
        }
      }
      onClose();
    } catch (err) {
      alert("Save failed: " + err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4 mb-4 bg-slate-50">
      <p className="text-sm font-medium mb-3">
        {isEdit ? "Edit term" : "New term"}
      </p>
      <div className="space-y-3">
        <div className="grid md:grid-cols-[2fr_1fr_100px] gap-3">
          <Input
            label="Term name"
            placeholder="First Term"
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
          <Input
            label="Academic year"
            placeholder="2026/2027"
            value={form.academicYear}
            onChange={(e) =>
              setForm((f) => ({ ...f, academicYear: e.target.value }))
            }
          />
          <Select
            label="Term #"
            value={form.termNumber}
            onChange={(e) =>
              setForm((f) => ({ ...f, termNumber: e.target.value }))
            }
          >
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
          </Select>
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <Input
            label="Start date"
            type="date"
            value={form.startDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, startDate: e.target.value }))
            }
          />
          <Input
            label="End date"
            type="date"
            value={form.endDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, endDate: e.target.value }))
            }
          />
          <Input
            label="Closing date"
            type="date"
            value={form.closingDate}
            onChange={(e) =>
              setForm((f) => ({ ...f, closingDate: e.target.value }))
            }
          />
          <Input
            label="Next term begins"
            type="date"
            value={form.resumesOn}
            onChange={(e) =>
              setForm((f) => ({ ...f, resumesOn: e.target.value }))
            }
          />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Input
            label="No. of times school opened"
            type="number"
            placeholder="e.g. 122"
            value={form.timesOpened}
            onChange={(e) =>
              setForm((f) => ({ ...f, timesOpened: e.target.value }))
            }
          />
        </div>
        <div className="flex gap-2">
          <Button onClick={save} disabled={busy}>
            {busy ? "Saving…" : isEdit ? "Save changes" : "Create term"}
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </div>
      </div>
    </Card>
  );
}
