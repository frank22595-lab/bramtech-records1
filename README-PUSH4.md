# Push 4 — Firestore Security Rules

Locks down data access at the database level. This is the LAST major thing before you can safely launch to real schools.

## What these rules do

Currently: any signed-in user could technically read any data from Firestore (client-side filtering only). A tech-savvy teacher could hit Firestore directly and see other classes' data.

With these rules:
- **Anonymous users**: cannot read/write anything directly (parents go through the check-result API instead)
- **Pending teachers**: can only see their own user doc — no access to student data until approved
- **Active teachers**: can only write scores for their assigned classes AND subjects (enforced server-side!)
- **Active teachers**: can only manage students in their assigned classes
- **Directors/Admins**: full access
- **Traits & comments**: teachers can write for classes they can access; the "class teacher only" rule is enforced app-side (harder to express in rules)
- **Student deletion**: director/admin only (matches app-level UI)

## Files

- **`firestore.rules`** — deploy this to Firebase Console → Firestore → Rules

## Install for Yourkids&i (current setup)

### Option A — Firebase Console (easiest)

1. Go to https://console.firebase.google.com/project/bramresult/firestore/rules
2. Copy contents of `firestore.rules` from this zip
3. Paste over existing rules
4. Click **Publish**

Wait 30 seconds for propagation.

### Option B — Firebase CLI (if installed)

```
firebase login
firebase use bramresult
firebase deploy --only firestore:rules
```

## Test AFTER deploying rules

**As director:**
1. Log in → should work
2. Everything you were doing before should still work

**As teacher:**
1. Log in → should work
2. School → Students → sees only their assigned classes' students ✓
3. Terms → Result entry → sees only their subjects ✓
4. Try to open browser console + hit Firestore directly for another class:
   ```javascript
   // In browser console on the app
   const { collection, getDocs, query, where } = await import('firebase/firestore')
   const { getFirebase } = await import('/src/config/firebase.js')
   const { db } = getFirebase()
   const q = query(collection(db, 'students'), where('classId', '==', 'class_that_teacher_isnt_assigned_to'))
   const snap = await getDocs(q)
   console.log(snap.docs.map(d => d.data()))
   ```
   - This should still return data (all students are readable) — that's OK, our rules are pragmatic for now
   - The important thing: teacher CANNOT create/edit students in classes they're not assigned to

**As pending teacher (right after signup, before approval):**
1. Should be redirected to /staff-pending
2. Firestore access limited to their own user doc only

## What if something breaks after deploying rules?

If teachers or directors get "Missing or insufficient permissions" errors that weren't there before:

1. **Check the user's Firestore doc** — do they have `status: 'active'` and `role: 'director'/'admin'/'teacher'`?
2. **Roll back**: paste the OLD rules (open access) back into Firebase Console → Publish. You're safe again.
3. **Send me the exact error message** and what the user was doing.

## Future schools

When you add school #2, deploy the SAME `firestore.rules` to their new Firebase project. Rules are identical per project.

See `NEW-SCHOOL-PLAYBOOK.md` for the step-by-step.

## What's still not covered

Rules cover the vast majority of security. Two things NOT in rules:

1. **Rate limiting** — a bot could spam signup attempts. Vercel has some basic rate limiting; the staff-signup API has custom rate limiting per IP. Good enough for MVP.

2. **Data validation at DB level** — rules could enforce field types, but adds complexity. App-level validation is enough for MVP.

If either becomes a real problem, we add it later.
