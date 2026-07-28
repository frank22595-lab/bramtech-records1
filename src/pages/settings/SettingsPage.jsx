import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  doc,
  updateDoc,
  serverTimestamp,
  collection,
  onSnapshot,
  query,
  orderBy,
  setDoc,
  writeBatch,
} from "firebase/firestore";
import {
  Save,
  Plus,
  Trash2,
  Building2,
  GraduationCap,
  ListChecks,
  Star,
  GripVertical,
} from "lucide-react";
import { Button, Card, Input, Select, Spinner } from "../../components/ui";
import { TabBar } from "../../components/Layout";
import { getFirebase } from "../../config/firebase";
import { useSchool } from "../../contexts/SchoolContext";
import DemoDataPanel from "../../components/DemoDataPanel";
import SchoolBrandingSection from "../../components/SchoolBrandingSection";

const TABS = [
  { id: "school", label: "School", icon: Building2 },
  { id: "grades", label: "Grade scale", icon: GraduationCap },
  { id: "assessments", label: "Assessments", icon: ListChecks },
  { id: "demo", label: "Demo data", icon: Star },
];

export default function SettingsPage() {
  const nav = useNavigate();
  const { tab } = useParams();
  const activeTab = tab || "school";
  return (
    <div className="p-4 md:p-8 max-w-5xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Settings</h1>
        <p className="text-sm text-ink-soft mt-0.5">
          School-wide configuration. Report card template & colors live in{" "}
          <button
            onClick={() => nav("/reports/design")}
            className="text-brand-700 hover:underline"
          >
            Reports → Design
          </button>
          . Per-term settings live inside each term's workspace.
        </p>
      </div>
      <TabBar
        tabs={TABS}
        activeTab={activeTab}
        onSelect={(id) => nav(`/settings/${id}`)}
      />
      {activeTab === "school" && <SchoolTab />}
      {activeTab === "grades" && <GradesTab />}
      {activeTab === "assessments" && <AssessmentsTab />}
      {activeTab === "demo" && <DemoDataPanel />}
    </div>
  );
}

function SchoolTab() {
  const { db } = getFirebase();
  const { school } = useSchool();
  const [form, setForm] = useState({
    name: "",
    shortName: "",
    motto: "",
    address: "",
    phone: "",
    email: "",
    principalName: "",
    principalTitle: "",
  });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (school) setForm((f) => ({ ...f, ...pluck(school, Object.keys(f)) }));
  }, [school]);

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      await updateDoc(doc(db, "school", "root"), {
        ...form,
        updatedAt: serverTimestamp(),
      });
      setMsg("✓ Saved");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  if (!school) return <Spinner />;

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <h3 className="font-medium mb-4">School identity</h3>
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="School name"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              required
            />
            <Input
              label="Short name / abbreviation"
              value={form.shortName}
              onChange={(e) => set("shortName", e.target.value)}
              placeholder="e.g. DUCAMS"
            />
          </div>
          <Input
            label="Motto"
            value={form.motto}
            onChange={(e) => set("motto", e.target.value)}
          />
          <Input
            label="Address"
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
          />
          <div className="grid md:grid-cols-2 gap-4">
            <Input
              label="Phone"
              value={form.phone}
              onChange={(e) => set("phone", e.target.value)}
            />
            <Input
              label="Email"
              type="email"
              value={form.email}
              onChange={(e) => set("email", e.target.value)}
            />
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-medium mb-4">Signatory</h3>
        <p className="text-sm text-ink-soft mb-3">
          Used to auto-sign the principal's comment on report cards.
        </p>
        <div className="grid md:grid-cols-2 gap-4">
          <Input
            label="Principal name"
            value={form.principalName}
            onChange={(e) => set("principalName", e.target.value)}
            placeholder="e.g. Mr. John Amasunya"
          />
          <Input
            label="Principal title"
            value={form.principalTitle}
            onChange={(e) => set("principalTitle", e.target.value)}
            placeholder="Principal / Head Teacher / Proprietor"
          />
        </div>
      </Card>

      <SchoolBrandingSection school={school} />

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
        </Button>
        {msg && (
          <span
            className={`text-sm ${msg.includes("failed") ? "text-red-600" : "text-emerald-700"}`}
          >
            {msg}
          </span>
        )}
      </div>
    </div>
  );
}

function GradesTab() {
  const { db } = getFirebase();
  const { school } = useSchool();
  const [scale, setScale] = useState([]);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (school) setScale(school.gradingScale ? [...school.gradingScale] : []);
  }, [school]);

  const add = () =>
    setScale([...scale, { grade: "", min: 0, max: 0, remark: "" }]);
  const remove = (i) => setScale(scale.filter((_, idx) => idx !== i));
  const update = (i, k, v) =>
    setScale(
      scale.map((row, idx) =>
        idx === i
          ? { ...row, [k]: k === "grade" || k === "remark" ? v : Number(v) }
          : row,
      ),
    );

  const save = async () => {
    setSaving(true);
    setMsg("");
    try {
      const sorted = [...scale].sort((a, b) => b.min - a.min);
      await updateDoc(doc(db, "school", "root"), {
        gradingScale: sorted,
        updatedAt: serverTimestamp(),
      });
      setScale(sorted);
      setMsg("✓ Saved");
      setTimeout(() => setMsg(""), 3000);
    } catch (err) {
      setMsg("Save failed: " + err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="p-6">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="font-medium">Grade scale</h3>
          <p className="text-sm text-ink-soft">
            Score bands and their letter grades and remarks.
          </p>
        </div>
        <Button variant="secondary" onClick={add}>
          <Plus className="w-4 h-4" /> Add band
        </Button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-ink-soft border-b border-slate-200">
              <th className="p-2 w-20">Grade</th>
              <th className="p-2 w-24">Min %</th>
              <th className="p-2 w-24">Max %</th>
              <th className="p-2">Remark</th>
              <th className="p-2 w-12"></th>
            </tr>
          </thead>
          <tbody>
            {scale.map((row, i) => (
              <tr key={i} className="border-b border-slate-100">
                <td className="p-1">
                  <input
                    value={row.grade}
                    onChange={(e) => update(i, "grade", e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded"
                    placeholder="A"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="number"
                    value={row.min}
                    onChange={(e) => update(i, "min", e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded"
                  />
                </td>
                <td className="p-1">
                  <input
                    type="number"
                    value={row.max}
                    onChange={(e) => update(i, "max", e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded"
                  />
                </td>
                <td className="p-1">
                  <input
                    value={row.remark}
                    onChange={(e) => update(i, "remark", e.target.value)}
                    className="w-full px-2 py-1.5 border border-slate-300 rounded"
                    placeholder="Excellent"
                  />
                </td>
                <td className="p-1">
                  <button
                    onClick={() => remove(i)}
                    className="text-red-600 hover:bg-red-50 p-1.5 rounded"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {scale.length === 0 && (
          <p className="text-sm text-ink-soft py-4 text-center">
            No bands yet. Click "Add band" to start.
          </p>
        )}
      </div>
      <div className="flex items-center gap-3 mt-4">
        <Button onClick={save} disabled={saving}>
          <Save className="w-4 h-4" /> {saving ? "Saving…" : "Save changes"}
        </Button>
        {msg && (
          <span
            className={`text-sm ${msg.includes("failed") ? "text-red-600" : "text-emerald-700"}`}
          >
            {msg}
          </span>
        )}
      </div>
    </Card>
  );
}

function AssessmentsTab() {
  const { db } = getFirebase();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    name: "",
    code: "",
    maxScore: 10,
    category: "ca",
  });
  const [dragging, setDragging] = useState(null);

  useEffect(() => {
    return onSnapshot(
      query(collection(db, "assessments"), orderBy("order")),
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
        setLoading(false);
      },
    );
  }, [db]);

  const add = async () => {
    if (!form.name.trim() || !form.code.trim()) return;
    const id = `ass_${Date.now()}`;
    await setDoc(doc(db, "assessments", id), {
      name: form.name.trim(),
      code: form.code.trim().toUpperCase(),
      maxScore: Number(form.maxScore) || 10,
      category: form.category,
      order: items.length + 1,
      active: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    setForm({ name: "", code: "", maxScore: 10, category: "ca" });
  };
  const toggle = async (a) =>
    await updateDoc(doc(db, "assessments", a.id), {
      active: !a.active,
      updatedAt: serverTimestamp(),
    });

  const reorder = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return;
    const next = [...items];
    const [moved] = next.splice(fromIdx, 1);
    next.splice(toIdx, 0, moved);
    setItems(next);
    const batch = writeBatch(db);
    next.forEach((a, i) =>
      batch.update(doc(db, "assessments", a.id), { order: i + 1 }),
    );
    await batch.commit();
  };

  if (loading) return <Spinner />;

  return (
    <Card className="p-6">
      <div className="mb-2">
        <h3 className="font-medium">Assessments</h3>
        <p className="text-sm text-ink-soft">
          Score components (CAs and exam). Drag to reorder — order affects the
          score sheet and report card columns.
        </p>
      </div>
      <div className="grid md:grid-cols-[2fr_1fr_1fr_1fr_auto] gap-3 mb-6 items-end mt-4">
        <Input
          label="Name"
          value={form.name}
          onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          placeholder="e.g. First CA"
        />
        <Input
          label="Code"
          value={form.code}
          onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
          placeholder="CA1"
        />
        <Input
          label="Max score"
          type="number"
          value={form.maxScore}
          onChange={(e) => setForm((f) => ({ ...f, maxScore: e.target.value }))}
        />
        <Select
          label="Category"
          value={form.category}
          onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
        >
          <option value="ca">Continuous assessment</option>
          <option value="exam">Exam</option>
        </Select>
        <Button onClick={add}>
          <Plus className="w-4 h-4" /> Add
        </Button>
      </div>
      <ul>
        {items.map((a, i) => (
          <li
            key={a.id}
            draggable
            onDragStart={() => setDragging(i)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => {
              if (dragging !== null) reorder(dragging, i);
              setDragging(null);
            }}
            onDragEnd={() => setDragging(null)}
            className={`py-2.5 flex items-center gap-3 border-b border-slate-100 ${dragging === i ? "opacity-50 bg-slate-50" : ""}`}
          >
            <GripVertical className="w-4 h-4 text-slate-300 cursor-grab flex-shrink-0" />
            <span className="text-xs text-ink-soft w-6 text-center">
              {i + 1}
            </span>
            <div className="flex-1 min-w-0">
              <div className="font-medium">
                {a.name}{" "}
                <span className="text-xs bg-slate-100 rounded px-1.5 py-0.5 ml-1">
                  {a.code}
                </span>
              </div>
              <div className="text-xs text-ink-soft">
                Max {a.maxScore} · {a.category === "exam" ? "Exam" : "CA"}
              </div>
            </div>
            <button
              onClick={() => toggle(a)}
              className={`text-xs px-2 py-1 rounded flex-shrink-0 ${a.active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-ink-soft"}`}
            >
              {a.active ? "Active" : "Inactive"}
            </button>
          </li>
        ))}
      </ul>
      {items.length === 0 && (
        <p className="text-sm text-ink-soft py-4 text-center">
          No assessments yet.
        </p>
      )}
    </Card>
  );
}

function pluck(obj, keys) {
  const out = {};
  keys.forEach((k) => {
    if (obj[k] !== undefined) out[k] = obj[k];
  });
  return out;
}
