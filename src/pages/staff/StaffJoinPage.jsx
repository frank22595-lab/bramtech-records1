import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { getFirebase } from "../../config/firebase";
import { formatStaffCode } from "../../lib/staffCode";
import { apiFetch } from "../../lib/apiClient";
import {
  Loader2,
  Check,
  X,
  ChevronRight,
  ChevronLeft,
  GraduationCap,
  CheckSquare,
  Square,
} from "lucide-react";

export default function StaffJoinPage() {
  const navigate = useNavigate();
  const { auth } = getFirebase();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState("");

  const [code, setCode] = useState("");

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedSubjects, setSelectedSubjects] = useState([]);
  const [classId, setClassId] = useState("");
  const [note, setNote] = useState("");

  const [schoolInfo, setSchoolInfo] = useState(null);

  useEffect(() => {
    apiFetch("/api/school-info")
      .then((data) => setSchoolInfo(data))
      .catch((err) => console.error("Failed to load school info:", err));
  }, []);

  // Step 1 → 2 is gated on the server actually recognising the code for THIS
  // school. The same code is revalidated in /api/staff-signup, so a user who
  // skips this check still cannot create an account.
  const proceedToStep2 = async (e) => {
    e.preventDefault();
    setError("");

    if (!code.trim()) {
      setError("Please enter the staff join code.");
      return;
    }

    setVerifying(true);
    try {
      await apiFetch("/api/verify-staff-code", {
        method: "POST",
        body: { code: code.trim() },
      });
      setStep(2);
    } catch (err) {
      setError(
        err.message || "That code is not valid. Please check with your director.",
      );
    } finally {
      setVerifying(false);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!fullName.trim()) return setError("Full name is required.");
    if (!email.trim()) return setError("Email is required.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirmPassword)
      return setError("Passwords do not match.");
    // Only require a class when the school actually has classes to pick from.
    if (schoolInfo?.classes?.length > 0 && !classId)
      return setError(
        "Please select which class you teach or want to be class teacher of.",
      );

    setLoading(true);

    try {
      // The server validates the code, creates the Auth account and writes the
      // pending profile. Creating the account in the browser first (the old
      // flow) signed the user in mid-submit, which unmounted this page before
      // the profile was written.
      await apiFetch("/api/staff-signup", {
        method: "POST",
        body: {
          code: code.trim(),
          fullName: fullName.trim(),
          email: email.trim(),
          password,
          phone: phone.trim(),
          subjects: selectedSubjects,
          classId,
          note: note.trim(),
        },
      });

      // Account exists and is pending — sign in so /staff-pending can show
      // their status live and flip them to the dashboard on approval.
      try {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      } catch (signInErr) {
        console.warn("Post-signup sign-in failed:", signInErr.message);
        navigate(`/login${window.location.search}`, { replace: true });
        return;
      }

      navigate(`/staff-pending${window.location.search}`, { replace: true });
    } catch (err) {
      console.error("Signup error:", err);
      setError(err.message || "Signup failed. Please try again.");
      setLoading(false);

      // A rejected code means the one they typed stopped working (e.g. the
      // director regenerated it). Send them back to step 1 to re-enter it.
      if (err.status === 401 || err.status === 403) {
        setStep(1);
      }
    }
  };

  const toggleSubject = (subjectId) => {
    setSelectedSubjects((prev) =>
      prev.includes(subjectId)
        ? prev.filter((id) => id !== subjectId)
        : [...prev, subjectId],
    );
  };

  const selectAllSubjects = () => {
    if (!schoolInfo?.subjects) return;
    setSelectedSubjects(schoolInfo.subjects.map((s) => s.id));
  };

  const deselectAllSubjects = () => setSelectedSubjects([]);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-white border-b border-slate-200">
        <div className="max-w-3xl mx-auto px-6 py-4 flex items-center gap-2">
          <GraduationCap className="w-5 h-5 text-slate-700" />
          <span className="font-semibold text-slate-900">Staff sign up</span>
          {schoolInfo?.school?.name && (
            <span className="text-slate-500 text-sm ml-2">
              — {schoolInfo.school.name}
            </span>
          )}
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 py-8">
        <div className="max-w-lg w-full">
          <div className="flex items-center justify-center gap-3 mb-8">
            <StepDot
              label="Code"
              number={1}
              active={step === 1}
              done={step > 1}
            />
            <div
              className={`h-0.5 w-12 ${step > 1 ? "bg-slate-900" : "bg-slate-300"}`}
            />
            <StepDot
              label="Your details"
              number={2}
              active={step === 2}
              done={false}
            />
          </div>

          {step === 1 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Enter the join code
              </h1>
              <p className="text-sm text-slate-600 mb-6">
                Your director will have shared a staff join code in the school
                WhatsApp group. Enter it below to continue.
              </p>

              <form onSubmit={proceedToStep2} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Staff join code
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(formatStaffCode(e.target.value))}
                    placeholder="STAFF-XXX-XXX-XXX"
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg font-mono uppercase focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
                    required
                    autoComplete="off"
                    autoCapitalize="characters"
                    spellCheck={false}
                    maxLength={20}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={verifying}
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {verifying ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> Checking code…
                    </>
                  ) : (
                    <>
                      Continue <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              <p className="text-xs text-center text-slate-500 mt-6">
                Don't have the code? Ask your director or check the school
                WhatsApp group.
              </p>
            </div>
          )}

          {step === 2 && (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 md:p-8">
              <h1 className="text-2xl font-semibold text-slate-900 mb-2">
                Tell us about yourself
              </h1>
              <p className="text-sm text-slate-600 mb-6">
                This is what the director will see when approving your account.
              </p>

              <form onSubmit={submit} className="space-y-4">
                <Input
                  label="Full name"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="e.g. Mrs Adaeze Okoro"
                  required
                />
                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Email"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@example.com"
                    required
                    autoComplete="email"
                  />
                  <Input
                    label="Phone (WhatsApp)"
                    type="tel"
                    value={phone}
                    onChange={setPhone}
                    placeholder="080 xxx xxxx"
                  />
                </div>

                <div className="grid sm:grid-cols-2 gap-4">
                  <Input
                    label="Password"
                    type="password"
                    value={password}
                    onChange={setPassword}
                    placeholder="min 6 characters"
                    required
                    autoComplete="new-password"
                  />
                  <Input
                    label="Confirm password"
                    type="password"
                    value={confirmPassword}
                    onChange={setConfirmPassword}
                    placeholder="type again"
                    required
                    autoComplete="new-password"
                  />
                </div>

                {schoolInfo?.classes?.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5">
                      Which class do you teach?{" "}
                      <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={classId}
                      onChange={(e) => setClassId(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 bg-white"
                      required
                    >
                      <option value="">— select your class —</option>
                      {schoolInfo.classes.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-slate-500 mt-1">
                      The director may adjust this after reviewing.
                    </p>
                  </div>
                )}

                {schoolInfo?.subjects?.length > 0 && (
                  <div>
                    <div className="flex items-baseline justify-between mb-1.5">
                      <label className="block text-sm font-medium text-slate-700">
                        Which subjects do you teach?
                      </label>
                      <div className="flex gap-2 text-xs">
                        <button
                          type="button"
                          onClick={selectAllSubjects}
                          className="text-slate-700 hover:text-slate-900 font-medium flex items-center gap-1"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                          Select all
                        </button>
                        <span className="text-slate-300">·</span>
                        <button
                          type="button"
                          onClick={deselectAllSubjects}
                          className="text-slate-500 hover:text-slate-700 flex items-center gap-1"
                        >
                          <Square className="w-3.5 h-3.5" />
                          Clear
                        </button>
                      </div>
                    </div>
                    <p className="text-xs text-slate-500 mb-2">
                      In many primary schools, one teacher takes all subjects in
                      their class. Tap "Select all" if that's you.
                    </p>
                    <div className="border border-slate-300 rounded-lg p-3 max-h-48 overflow-y-auto space-y-1">
                      {schoolInfo.subjects.map((s) => {
                        const checked = selectedSubjects.includes(s.id);
                        return (
                          <label
                            key={s.id}
                            className={`flex items-center gap-2 p-2 rounded cursor-pointer text-sm ${checked ? "bg-slate-100" : "hover:bg-slate-50"}`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSubject(s.id)}
                              className="w-4 h-4 accent-slate-900"
                            />
                            <span>{s.name}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Note to director{" "}
                    <span className="text-slate-500 font-normal">
                      (optional)
                    </span>
                  </label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={2}
                    placeholder="e.g. I would also like access to view analytics."
                    className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500 text-sm resize-none"
                    maxLength={300}
                  />
                </div>

                {error && (
                  <div className="text-sm text-red-700 bg-red-50 border border-red-100 p-3 rounded-lg">
                    {error}
                  </div>
                )}

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setStep(1)}
                    disabled={loading}
                    className="px-4 py-2.5 border border-slate-300 text-slate-700 hover:bg-slate-50 font-medium rounded-lg flex items-center gap-2 disabled:opacity-50"
                  >
                    <ChevronLeft className="w-4 h-4" /> Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Creating
                        account…
                      </>
                    ) : (
                      <>
                        Sign up <Check className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

function StepDot({ number, label, active, done }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold ${
          done
            ? "bg-emerald-600 text-white"
            : active
              ? "bg-slate-900 text-white ring-4 ring-slate-100"
              : "bg-slate-200 text-slate-500"
        }`}
      >
        {done ? <Check className="w-4 h-4" /> : number}
      </div>
      <span
        className={`text-sm ${active ? "font-semibold text-slate-900" : "text-slate-500"}`}
      >
        {label}
      </span>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
  required = false,
  autoComplete,
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-700 mb-1.5">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        autoComplete={autoComplete}
        className="w-full px-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-slate-500 focus:ring-1 focus:ring-slate-500"
      />
    </div>
  );
}
