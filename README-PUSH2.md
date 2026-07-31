# Push 2 — Director's Staff Tab

Full UI for managing staff — no more console workarounds.

## What you get

Under **School → Staff**:
1. **Staff join code** section at the top — generate/regenerate/copy the code, one-click "Send via WhatsApp"
2. **Waiting for approval** — pending teachers who signed up but haven't been approved yet. Review or reject.
3. **Active staff** — approved teachers. Click any to edit their role, class, subjects, or permissions.

Plus a proper **Approval modal** where you set:
- Role (Teacher / Admin)
- Class teacher of (dropdown)
- Additional classes they teach (multi-select)
- Subjects they teach (multi-select)
- **Permission toggles** — baseline permissions locked ON, 8 optional permissions you choose per teacher

## Files delivered

```
src/pages/school/SchoolPage.jsx              ← REPLACES existing (adds Staff tab)
src/pages/school/StaffTab.jsx                ← NEW
src/components/staff/StaffCodeSection.jsx    ← NEW
src/components/staff/StaffApprovalModal.jsx  ← NEW
```

## Install

### ☐ 1. Copy files into your project

Match the paths exactly. Create folders if they don't exist:
- `src/components/staff/` needs to be created

### ☐ 2. Push

```
git add src/pages/school/SchoolPage.jsx src/pages/school/StaffTab.jsx src/components/staff/
git commit -m "Push 2: director staff tab with code + approval + permissions"
git push
```

Wait 2 minutes for Vercel.

### ☐ 3. Test the full flow

**Generate a code (director side):**
1. Log in as director
2. Go to **School → Staff**
3. Click **"Generate first join code"**
4. Code appears — click **Copy** or **Send via WhatsApp**

**Sign up a test teacher (fresh incognito):**
1. Open incognito window
2. Go to `/staff-join?school=yourkidsni`
3. Enter code → Continue
4. Fill signup form
5. Submit → lands on "Waiting for approval"

**Approve the teacher (back to director tab):**
1. Refresh the Staff tab
2. Teacher appears under **Waiting for approval**
3. Click **Review**
4. Modal opens — set role, class teacher of, additional classes, subjects, tick permission toggles
5. Click **Approve & save**

**Teacher instantly unblocks:**
1. Their incognito tab should INSTANTLY navigate from `/staff-pending` to `/dashboard`
2. (Push 3 will add permission-gated views — for now they'll see the full dashboard)

**Test regenerate:**
1. Back on Staff tab, click the small **Regenerate** link
2. Confirm — new code replaces old
3. Old code no longer works for new signups

**Test reject:**
1. Create another test pending teacher
2. On the Staff tab, click the trash icon on their row
3. Confirm — they're removed from the list

## What's next

**Push 3** — Permission-gated teacher dashboard
- Teacher signs in — sees only THEIR class in Students
- Score entry gated by subject assignment
- Attendance entry gated by class teacher role
- Sidebar hides items the teacher doesn't have permission for
- "Forgot password?" link on login page

**Push 4** — Real Firestore Security Rules
- Currently rules are wide open (any signed-in user)
- Lock down: teachers can only read/write their own class data
- Directors: full access
- Students collection: no public read of accessCodeHash

Say "Push 3" when Push 2 is tested and working.
