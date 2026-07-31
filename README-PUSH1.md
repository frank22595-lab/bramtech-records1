# Push 1 — Staff Join Code + Signup + Pending

Teachers can now self-register with a shared join code the director shares in the WhatsApp group.

## What you get

- **Public `/staff-join` page** — teacher enters staff code + fills profile (name, email, password, phone, subjects, class, note)
- **Public `/staff-pending` page** — waiting-for-approval screen with LIVE update (bounces to dashboard the moment director approves)
- **Staff code system** — `STAFF-XXX-XXX-XXX` format, SHA-256 hashed in DB
- **Two new APIs** — `/api/school-info` (classes+subjects for signup form), `/api/staff-signup` (validates code, creates user)
- **Router integration** — pending users can't access admin pages, always bounce to pending screen

## Files delivered

```
src/lib/staffCode.js                     ← generate + hash staff codes
src/pages/staff/StaffJoinPage.jsx        ← the signup page
src/pages/staff/StaffPendingPage.jsx     ← the waiting page
src/App.jsx                              ← updated routing
api/school-info.js                       ← returns classes + subjects
api/staff-signup.js                      ← creates user doc after validation
```

## Setup

### ☐ 1. Drop files in

Copy each file into its matching path.

### ☐ 2. Push and deploy

```
git add src/lib/staffCode.js src/pages/staff/ src/App.jsx api/school-info.js api/staff-signup.js
git commit -m "Push 1: staff join code + signup + pending page"
git push
```

Wait 2 minutes for Vercel to redeploy.

### ☐ 3. Set your first staff join code (director side — temporary)

Push 2 will build the proper UI for this. For now, generate + save a test code manually.

**Open the deployed site, log in as director.** Open F12 → Console. Paste this and press Enter:

```javascript
(async () => {
  const { hashStaffCode, generateStaffCode } = await import('/src/lib/staffCode.js')
  const code = generateStaffCode()
  const hash = await hashStaffCode(code)
  const firebase = await import('firebase/firestore')
  const { getFirebase } = await import('/src/config/firebase.js')
  const { db } = getFirebase()
  await firebase.updateDoc(firebase.doc(db, 'school', 'root'), {
    staffJoinCode: code,
    staffJoinCodeHash: hash,
    staffJoinCodeGeneratedAt: firebase.serverTimestamp(),
  })
  console.log('%c✓ Staff join code created!', 'color:green;font-size:14px')
  console.log('%cShare this code with teachers:', 'font-size:14px')
  console.log('%c' + code, 'font-size:18px;color:blue;font-weight:bold')
})()
```

If the `import` paths fail due to Vite production build, use this simpler version — just paste in F12 Console while on your live site:

```javascript
(async () => {
  // Same alphabet as accessCode.js
  const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  const chars = []
  for (let i = 0; i < 9; i++) chars.push(ALPHABET[bytes[i] % ALPHABET.length])
  const code = `STAFF-${chars.slice(0,3).join('')}-${chars.slice(3,6).join('')}-${chars.slice(6,9).join('')}`

  // Hash it
  const normalized = code.replace(/[-\s]/g, '').replace(/^STAFF/, '')
  const buf = new TextEncoder().encode(normalized)
  const hashBuf = await crypto.subtle.digest('SHA-256', buf)
  const hash = Array.from(new Uint8Array(hashBuf)).map(b => b.toString(16).padStart(2, '0')).join('')

  // Save to school/root via Firestore SDK (director must be signed in)
  const firestore = window.firebase?.firestore || null

  console.log('%c✓ Code generated:', 'color:green;font-weight:bold', code)
  console.log('%cHash to save at school/root.staffJoinCodeHash:', 'color:gray', hash)
  console.log('%cAlso save plaintext at school/root.staffJoinCode:', 'color:gray', code)
  console.log('%cCopy these two values, open Firestore console, add fields to school/root document.', 'color:orange')
})()
```

The above prints two values (code + hash). Copy them, open Firebase Console → Firestore → `school/root`, add fields:

- `staffJoinCode` (string) = the printed code
- `staffJoinCodeHash` (string) = the printed hash

Save. Done.

### ☐ 4. Test the flow

**As a teacher (use a NEW email, or your test account):**

1. Sign out of director account
2. Open incognito → `https://bramtech-records1.vercel.app/staff-join?school=yourkidsni`
3. Enter the code from step 3 → Continue
4. Fill the form (any name, any email you can access, password 6+ chars, select a class, tick a few subjects, optional note)
5. Click "Sign up"
6. Should land on **"Waiting for approval"** screen
7. In Firebase Console → Firestore → `users` collection → find the new user doc → confirm:
   - `status: "pending"`
   - `role: "teacher"`
   - `fullName` filled
   - `proposedSubjects` array with what they picked
   - `proposedClassTeacherOf` = the class they picked
   - `signupNote` filled if they added one

**Test that pending works:**

1. Try to visit `/dashboard` → should bounce to `/staff-pending`
2. Try to visit `/school` → should also bounce to `/staff-pending`

**Test the auto-approval bounce:**

1. Keep the pending page open
2. In Firebase Console, change that user's `status` from `pending` to `active`
3. Save
4. The pending page should INSTANTLY navigate to `/dashboard` (real-time listener)

**Test invalid code:**

1. Log out
2. Go to `/staff-join`
3. Enter a random invalid code (e.g. `STAFF-XXX-XXX-XXX`)
4. Fill signup form
5. Submit → should show "Invalid staff join code" error
6. Check Firestore users collection — no new user doc should exist
7. Check Firebase Auth users list — no new auth user should exist (was created then deleted)

## What's next

**Push 2:** Director's "Staff" tab
- Generate + rotate + copy staff join code (UI, not console)
- List of pending teachers
- Approval flow with:
  - Set role (teacher/admin)
  - Assign class teacher of
  - Assign classes to see
  - Assign subjects to teach
  - Toggle permissions

**Push 3:** Permission-gated teacher dashboard
- Teacher sees only their class
- Can add/remove students in their class
- Can enter scores for their subjects
- Can enter attendance
- Can write comments
- Can publish reports
- Forgot password link

Say "next" when Push 1 is tested and working. I ship Push 2.
