# Round 1 — Parent Result Checker Portal

Everything for parents to check their kids' results without logging in.

## What you get

- **Public `/check-result` page** — parent types admission number + access code, sees list of published reports, downloads PDF
- **Vercel API** at `/api/check-result` — validates code server-side, rate-limits attempts, uses Firebase Admin SDK
- **Admission number auto-generation** — `YKI/2026/001` format, never resets, transaction-safe
- **Access code generator** — 9-character unguessable codes (`K7M-P9Q-N3X`)
- **Admin card on student profile** — shows both codes, one-tap WhatsApp send to parent, regenerate button

## The 5 files inside

```
src/lib/admissionNumber.js         ← auto-generate admission numbers
src/lib/accessCode.js              ← generate & hash access codes
src/pages/public/CheckResultPage.jsx   ← the parent portal page
src/components/students/StudentAccessCard.jsx  ← admin controls on student profile
api/check-result.js                ← Vercel serverless function
```

Drop each into its matching path in your project.

---

## SETUP CHECKLIST

Do these in order. Nothing skipped.

### ☐ 1. Install firebase-admin

In your project root, run:
```
npm install firebase-admin
```

This is needed only for the API function (server-side). Your existing client-side `firebase` package stays as-is.

### ☐ 2. Get a Firebase service account key

1. Go to https://console.firebase.google.com → your `bramresult` project
2. Click the ⚙️ gear icon top-left → **Project settings**
3. Click the **Service accounts** tab
4. Click **Generate new private key** — a JSON file downloads
5. **KEEP THIS SAFE** — do NOT commit it to git. Anyone with this file has full admin access to your Firestore.

### ☐ 3. Add environment variables

Open the downloaded JSON file. You need three fields:
- `project_id`
- `client_email`
- `private_key`

**For local development:**

Create `.env.local` in your project root (add to `.gitignore` if it isn't already):
```
FIREBASE_PROJECT_ID=bramresult
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@bramresult.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvQIBADANB...\n-----END PRIVATE KEY-----\n"
```

⚠ The private key is huge. Copy the ENTIRE value including quotes and `\n` characters.

**For Vercel production:**

Vercel Dashboard → your project → Settings → Environment Variables. Add the same three, one at a time. Redeploy after adding.

### ☐ 4. Add the public route

Open your routing file (probably `src/App.jsx` or `src/main.jsx` — look for `<Routes>` or `createBrowserRouter`).

Add this route **outside any protected/authenticated wrapper**:

```jsx
import CheckResultPage from './pages/public/CheckResultPage'

// Inside your <Routes>:
<Route path="/check-result" element={<CheckResultPage />} />
```

If you use `createBrowserRouter`, add:
```jsx
{ path: '/check-result', element: <CheckResultPage /> }
```

The key point: `/check-result` must NOT require authentication. It's public.

### ☐ 5. Add the access card to student profile

Find your student profile / edit page — probably `src/pages/school/StudentsTab.jsx` or a modal inside it.

Add near the top of the profile view:
```jsx
import StudentAccessCard from '../../components/students/StudentAccessCard'

// Inside the profile render:
<StudentAccessCard student={student} school={school} onUpdate={reloadStudent} />
```

Where `student` is the current student object and `school` is your school context.

### ☐ 6. Update student creation to auto-fill admission number

Wherever you handle "Add new student" (probably in StudentsTab), when the form opens, auto-fill the admission number:

```jsx
import { previewNextAdmissionNumber, generateAdmissionNumber } from '../../lib/admissionNumber'
import { generateAccessCode, hashAccessCode } from '../../lib/accessCode'

// When opening the "Add Student" form:
useEffect(() => {
  const acronym = school?.shortName || 'YKI'
  previewNextAdmissionNumber(acronym).then(setSuggestedAdmission)
}, [school])

// In the form field:
<input
  placeholder={suggestedAdmission}
  value={form.admissionNumber}
  onChange={(e) => setForm({...form, admissionNumber: e.target.value})}
/>

// On save (before creating the student):
const admissionNumber = form.admissionNumber.trim() || await generateAdmissionNumber(school?.shortName || 'YKI')
const accessCode = generateAccessCode()
const accessCodeHash = await hashAccessCode(accessCode)

await addDoc(collection(db, 'students'), {
  ...form,
  admissionNumber,
  accessCode,          // stored for admin to view
  accessCodeHash,      // used for validation
  accessCodeGeneratedAt: serverTimestamp(),
  createdAt: serverTimestamp(),
})
```

### ☐ 7. Add "Check Results" button to your main site (done in Round 5)

The website build (Round 5) already includes a "Check results" button in the nav that links to `/check-result`. Both rounds work together.

For direct testing during development:
```
http://localhost:5173/check-result
```

---

## Testing checklist

Once installed, verify each step works:

- [ ] Add a new student — admission number auto-fills as `YKI/2026/046` (or similar)
- [ ] Open the student profile — StudentAccessCard shows admission number + "No code yet"
- [ ] Click "Generate code" — access code appears like `K7M-P9Q-N3X`
- [ ] Click "Send WhatsApp" (with a real parent phone saved) — WhatsApp opens with pre-typed message
- [ ] Open `/check-result` in an incognito window
- [ ] Enter admission number + code → see student card + list of published reports
- [ ] Click "Download PDF" — the correct report PDF downloads
- [ ] Enter WRONG code → see "Admission number or access code is incorrect"
- [ ] Try 6 wrong codes in a row → get rate-limited

---

## Existing student migration (for students already in the system)

Any student created before this update has no access code. Two options:

**Option A: Bulk-generate on demand.** In the students list, add a "Generate codes for all missing" button. It loops over students without codes, generates one for each, saves.

**Option B: Manually click "Generate code" per student** on each profile.

I can build Option A in a follow-up round if needed. For a school with 200 students it takes ~30 minutes manually.

---

## Firestore Security Rules (add these)

Add or update your `firestore.rules` to prevent direct client-side reads of the `accessCodeHash` field. Full example rules block:

```
match /students/{studentId} {
  allow read: if request.auth != null &&
    (
      // Directors and admins
      get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['director', 'admin']
      ||
      // Teachers of this class
      (get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'teacher'
       && resource.data.class in get(/databases/$(database)/documents/users/$(request.auth.uid)).data.assignedClasses)
    );
  allow write: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['director', 'admin'];
}

match /reportCards/{cardId} {
  allow read: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['director', 'admin', 'teacher'];
  allow write: if request.auth != null &&
    get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['director', 'admin'];
}
```

The parent portal doesn't need to read these directly — the API uses Firebase Admin SDK which bypasses rules by design.

Note: your existing rules probably let anyone authenticated read/write. Tightening this is Round 4 (teacher roles). For now, at minimum make sure the collections aren't publicly readable.

---

## What's next

**Round 2:** Student lifecycle (promotion, graduation, withdrawal, session rollover)
**Round 3:** Backup system
**Round 4:** Teacher role restructure
**Round 5:** Marketing site (landing, events, contact) + link the "Check Results" button — ALREADY BUILT

Test Round 1, tell me it works, and I ship Round 2.
