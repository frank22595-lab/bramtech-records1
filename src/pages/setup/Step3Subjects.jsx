import { useState } from "react";
import { Plus, X, Check } from "lucide-react";
import { Button, Input, Select } from "../../components/ui";

const CATEGORIES = [
  { value: "core", label: "Core" },
  { value: "elective", label: "Elective" },
  { value: "vocational", label: "Vocational" },
];

const POPULAR_SUBJECTS = [
  { name: "Mathematics", code: "MTH", category: "core" },
  { name: "English Language", code: "ENG", category: "core" },
  { name: "Basic Science", code: "BSC", category: "core" },
  { name: "Basic Technology", code: "BTC", category: "core" },
  { name: "Social Studies", code: "SOS", category: "core" },
  { name: "Civic Education", code: "CIV", category: "core" },
  { name: "Christian Religious Studies", code: "CRS", category: "core" },
  { name: "Islamic Religious Studies", code: "IRS", category: "core" },
  { name: "Agricultural Science", code: "AGR", category: "core" },
  { name: "Home Economics", code: "HEC", category: "core" },
  { name: "Computer Studies", code: "CPS", category: "core" },
  { name: "Physical Education", code: "PHE", category: "core" },
  { name: "Cultural & Creative Arts", code: "CCA", category: "core" },
  { name: "French", code: "FRE", category: "elective" },
  { name: "Igbo", code: "IGB", category: "core" },
  { name: "Yoruba", code: "YOR", category: "core" },
  { name: "Hausa", code: "HAU", category: "core" },
  { name: "Physics", code: "PHY", category: "core" },
  { name: "Chemistry", code: "CHE", category: "core" },
  { name: "Biology", code: "BIO", category: "core" },
  { name: "Further Mathematics", code: "FMT", category: "elective" },
  { name: "Economics", code: "ECO", category: "core" },
  { name: "Government", code: "GOV", category: "core" },
  { name: "Literature in English", code: "LIT", category: "core" },
  { name: "Geography", code: "GEO", category: "core" },
  { name: "History", code: "HIS", category: "core" },
];

export default function Step3Subjects({ state, patch }) {
  const [activeClassId, setActiveClassId] = useState(
    state.classes[0]?.tempId || null,
  );
  const [customName, setCustomName] = useState("");
  const [customCode, setCustomCode] = useState("");
  const [customCategory, setCustomCategory] = useState("core");

  if (state.classes.length === 0) {
    return (
      <div className="text-center py-10">
        <p className="text-ink-soft">
          Go back to Step 2 and add at least one class first.
        </p>
      </div>
    );
  }

  const activeClass =
    state.classes.find((c) => c.tempId === activeClassId) || state.classes[0];

  // Subjects assigned to the active class
  const classSubjects = state.subjects.filter((s) =>
    (s.classTempIds || []).includes(activeClass.tempId),
  );

  const isInClass = (subjectName) =>
    classSubjects.some(
      (s) => s.name.toLowerCase() === subjectName.toLowerCase(),
    );

  // Add a subject to the active class.
  // If a subject with the same name already exists globally, just link this class to it.
  // Otherwise, create a new subject.
  const addSubjectToClass = ({ name, code, category }) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    const existing = state.subjects.find(
      (s) => s.name.toLowerCase() === trimmed.toLowerCase(),
    );
    let nextSubjects;
    if (existing) {
      if ((existing.classTempIds || []).includes(activeClass.tempId)) return; // already linked
      nextSubjects = state.subjects.map((s) =>
        s.tempId === existing.tempId
          ? {
              ...s,
              classTempIds: [...(s.classTempIds || []), activeClass.tempId],
            }
          : s,
      );
    } else {
      nextSubjects = [
        ...state.subjects,
        {
          tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: trimmed,
          code: (code || trimmed.slice(0, 3)).toUpperCase(),
          category: category || "core",
          classTempIds: [activeClass.tempId],
        },
      ];
    }
    patch({ subjects: nextSubjects });
  };

  // Remove subject from active class only.
  // If it's the last class using this subject, delete the subject entirely.
  const removeSubjectFromClass = (subjectTempId) => {
    const nextSubjects = state.subjects
      .map((s) =>
        s.tempId === subjectTempId
          ? {
              ...s,
              classTempIds: (s.classTempIds || []).filter(
                (id) => id !== activeClass.tempId,
              ),
            }
          : s,
      )
      .filter((s) => (s.classTempIds || []).length > 0);
    patch({ subjects: nextSubjects });
  };

  const addCustom = () => {
    if (!customName.trim()) return;
    addSubjectToClass({
      name: customName,
      code: customCode,
      category: customCategory,
    });
    setCustomName("");
    setCustomCode("");
    setCustomCategory("core");
  };

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Subjects per class</h2>
      <p className="text-ink-soft mb-6 text-sm">
        Pick a class, then add its subjects. Tap a popular subject to add it, or
        type your own below.
      </p>

      {/* Class tabs */}
      <div className="border-b border-slate-200 mb-6 -mx-6 md:-mx-8 px-6 md:px-8 overflow-x-auto">
        <div className="flex gap-1 min-w-max">
          {state.classes.map((c) => {
            const count = state.subjects.filter((s) =>
              (s.classTempIds || []).includes(c.tempId),
            ).length;
            const isActive = c.tempId === activeClass.tempId;
            return (
              <button
                key={c.tempId}
                onClick={() => setActiveClassId(c.tempId)}
                className={`px-3 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
                  isActive
                    ? "border-brand-600 text-brand-700"
                    : "border-transparent text-ink-soft hover:text-ink hover:border-slate-300"
                }`}
              >
                {c.name}
                {count > 0 && (
                  <span
                    className={`ml-2 text-xs px-1.5 py-0.5 rounded-full ${
                      isActive
                        ? "bg-brand-100 text-brand-700"
                        : "bg-slate-100 text-ink-soft"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active class heading */}
      <div className="mb-4">
        <h3 className="font-semibold text-lg">{activeClass.name}</h3>
        <p className="text-sm text-ink-soft">
          {classSubjects.length === 0
            ? "No subjects yet. Add some below."
            : `${classSubjects.length} subject${classSubjects.length === 1 ? "" : "s"}`}
        </p>
      </div>

      {/* Currently in this class */}
      {classSubjects.length > 0 && (
        <div className="mb-6">
          <p className="text-sm font-medium mb-2">
            Subjects in {activeClass.name}:
          </p>
          <div className="flex flex-wrap gap-2">
            {classSubjects.map((s) => (
              <span
                key={s.tempId}
                className="inline-flex items-center gap-1.5 bg-brand-50 border border-brand-200 text-brand-800 text-sm rounded-full pl-3 pr-1 py-1"
              >
                {s.name}
                <span className="text-xs bg-brand-100 rounded px-1.5 py-0.5">
                  {s.code}
                </span>
                <button
                  onClick={() => removeSubjectFromClass(s.tempId)}
                  className="ml-0.5 w-5 h-5 rounded-full hover:bg-brand-200 flex items-center justify-center"
                  title={`Remove from ${activeClass.name}`}
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Popular subjects */}
      <div className="mb-6">
        <p className="text-sm font-medium mb-2">
          Popular subjects — tap to add:
        </p>
        <div className="flex flex-wrap gap-1.5">
          {POPULAR_SUBJECTS.map((sub) => {
            const added = isInClass(sub.name);
            return (
              <button
                key={sub.name}
                onClick={() => !added && addSubjectToClass(sub)}
                disabled={added}
                className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors flex items-center gap-1 ${
                  added
                    ? "bg-emerald-50 border-emerald-200 text-emerald-700 cursor-default"
                    : "bg-white border-slate-300 hover:bg-brand-50 hover:border-brand-400"
                }`}
              >
                {added ? (
                  <Check className="w-3 h-3" />
                ) : (
                  <Plus className="w-3 h-3" />
                )}
                {sub.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom subject */}
      <div className="border-t border-slate-200 pt-6">
        <p className="text-sm font-medium mb-3">Add a custom subject:</p>
        <div className="grid md:grid-cols-[1fr_120px_150px_auto] gap-3 items-end">
          <Input
            label="Subject name"
            placeholder="e.g. Robotics"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) =>
              e.key === "Enter" && (e.preventDefault(), addCustom())
            }
          />
          <Input
            label="Code"
            placeholder="ROB"
            value={customCode}
            onChange={(e) => setCustomCode(e.target.value)}
          />
          <Select
            label="Category"
            value={customCategory}
            onChange={(e) => setCustomCategory(e.target.value)}
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </Select>
          <Button onClick={addCustom}>
            <Plus className="w-4 h-4" /> Add
          </Button>
        </div>
      </div>
    </div>
  );
}
