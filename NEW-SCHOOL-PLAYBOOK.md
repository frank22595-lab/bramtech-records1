# New School Playbook

Your step-by-step for onboarding a new school. Follow every step; each is quick.

## Total time per new school: ~30 minutes

---

## Step 1 — Get school info from your customer

Before you start, collect:

- [ ] **School name** (e.g. "Delta College Academy")
- [ ] **School short name / acronym** (e.g. "DCA")
- [ ] **Slug** — lowercase, no spaces, no special characters (e.g. `deltacollege`)
- [ ] **Director's full name**
- [ ] **Director's email address** (this becomes their login)
- [ ] **School address** (for report cards)
- [ ] **School motto** (optional, appears on report cards)

---

## Step 2 — Create their Firebase project (10 min)

1. Go to https://console.firebase.google.com
2. Click **Add project**
3. Name: `bramresult-{slug}` (e.g. `bramresult-deltacollege`)
4. Disable Google Analytics (not needed, keeps things simple)
5. Click **Create project**

**Once created, enable services:**

### Enable Firestore
1. Left menu → **Build → Firestore Database**
2. Click **Create database**
3. Start in **production mode**
4. Region: **eur3** (multi-region Europe — matches your current setup)
5. Click **Enable**

### Enable Authentication
1. Left menu → **Build → Authentication**
2. Click **Get started**
3. Click **Email/Password** → Enable → Save

### Enable Storage
1. Left menu → **Build → Storage**
2. Click **Get started**
3. Start in **production mode**
4. Same region as Firestore
5. Click **Done**

---

## Step 3 — Get the Firebase config (5 min)

### Web app config
1. Firebase Console → **Project Settings** (gear icon top-left)
2. Scroll to **Your apps** section
3. Click the **Web icon** (`</>`)
4. App nickname: `{school slug} portal`
5. Do NOT check "Set up Firebase Hosting"
6. Click **Register app**
7. Copy the `firebaseConfig` object shown

You'll see something like:
```javascript
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "bramresult-deltacollege.firebaseapp.com",
  projectId: "bramresult-deltacollege",
  storageBucket: "bramresult-deltacollege.appspot.com",
  messagingSenderId: "1234567890",
  appId: "1:1234567890:web:abcdef123456"
};
```

### Service account (for API routes on Vercel)
1. Project Settings → **Service accounts** tab
2. Click **Generate new private key**
3. Save the downloaded JSON file securely
4. Open it, you'll need the whole JSON string later

---

## Step 4 — Add school to the registry (2 min)

Open `public/schools.json` in your portal codebase.

Add a new entry:

```json
{
  "yourkidsni": {
    "apiKey": "...",
    "authDomain": "bramresult.firebaseapp.com",
    "projectId": "bramresult",
    "storageBucket": "bramresult.appspot.com",
    "messagingSenderId": "...",
    "appId": "..."
  },
  "deltacollege": {
    "apiKey": "AIzaSy...",
    "authDomain": "bramresult-deltacollege.firebaseapp.com",
    "projectId": "bramresult-deltacollege",
    "storageBucket": "bramresult-deltacollege.appspot.com",
    "messagingSenderId": "1234567890",
    "appId": "1:1234567890:web:abcdef123456"
  }
}
```

Paste values from Step 3's `firebaseConfig`.

---

## Step 5 — Deploy Firestore Security Rules to their new project (5 min)

Rules are in `firestore.rules` in your project root. Deploy them to the new school's Firebase project:

### Option A — Manual via Firebase Console
1. Firebase Console (new project) → Firestore Database → **Rules** tab
2. Delete the placeholder rules
3. Copy contents of `firestore.rules` from your portal codebase
4. Paste → **Publish**

### Option B — Firebase CLI (faster once installed)
Once at your terminal:
```
firebase login
firebase use --add bramresult-deltacollege
firebase deploy --only firestore:rules
```

---

## Step 6 — Update Vercel environment variables (5 min)

The API routes (staff-signup, school-info, check-result) use the FIREBASE_SERVICE_ACCOUNT_JSON to talk to Firestore.

**Currently only ONE school works with the API routes.** For multi-tenant API, you need to add per-school service accounts.

Two ways:

### Option A — Quick (works for now, up to 5 schools)
Add environment variables per school in Vercel:
- `FIREBASE_SERVICE_ACCOUNT_JSON_YOURKIDSNI` = full JSON string
- `FIREBASE_SERVICE_ACCOUNT_JSON_DELTACOLLEGE` = full JSON string

**Then update API routes** to pick based on the school slug from the request. (I'll build this when needed.)

### Option B — Long-term (build a service account switcher)
Move service account resolution into `api/_firebase-admin.js` based on slug in request header/body. Cleaner. Build this when you have 3+ schools.

**For now, Option A is fine.** Just add the variable and remember to reference it.

---

## Step 7 — Commit and deploy your portal (2 min)

```
git add public/schools.json
git commit -m "Add [school name] to registry"
git push
```

Vercel auto-deploys. Wait 90 seconds.

---

## Step 8 — Create the director's account (5 min)

The director needs to log in and complete the setup wizard. Create their auth account:

### In their new Firebase project console:
1. Authentication → **Users** tab
2. Click **Add user**
3. Enter director's email + a temporary password (e.g. `TempPass2026`)
4. Click **Add user**

### In their Firestore:
1. Firestore → **Start collection**
2. Collection: `users`
3. Document ID: (the UID from the auth user you just created — copy from Authentication tab)
4. Add fields:

```
email:      director@deltacollege.com  (string)
fullName:   [director's full name]      (string)
role:       director                    (string)
status:     active                      (string)
active:     true                        (boolean)
createdAt:  [click "server timestamp"]
updatedAt:  [click "server timestamp"]
```

Save.

---

## Step 9 — Send the director their credentials (2 min)

Send them via WhatsApp/email:

```
Hi [Director Name] 👋

Your BramTech Records portal is ready!

🔗 Login URL:
https://deltacollege.records.bramtechsuite.com/login

(or for now while your subdomain is being set up:
https://bramtech-records1.vercel.app/login?school=deltacollege)

👤 Email: [their email]
🔑 Temporary password: [temp password]

Please change your password once you log in.

I'll walk you through setup on our onboarding call.

- Bright
```

---

## Step 10 — Onboarding call (30 min)

Set up a video call. Guide them through:
1. Change password (Settings → Account)
2. Add classes (School → Classes tab)
3. Add subjects (School → Subjects tab)
4. Create current term (Settings → Terms)
5. Set current term
6. Generate staff join code (School → Staff tab)
7. Add first few students
8. Add school branding (logo, motto in Settings)

---

## Subdomain setup (later, when you own the domain)

Once you own `bramtechsuite.com` or `bramtechrecords.com`:

1. In Vercel project → **Domains**
2. Add wildcard: `*.records.bramtechsuite.com`
3. Configure DNS: add wildcard CNAME record pointing to `cname.vercel-dns.com`
4. Now `deltacollege.records.bramtechsuite.com` automatically works

Until then, use the query param URL: `?school=deltacollege`.

---

## Troubleshooting

**"School not found" error when director tries to log in**
→ Check `schools.json` has their slug. Check Vercel deployed the change.

**"Missing or insufficient permissions" everywhere**
→ Check Firestore rules were published to their project.

**API routes fail with 500**
→ Check the service account env var for their school is set on Vercel.

**Director sees the setup wizard on every login**
→ They haven't finished setup. Check `school/root` doc has `setupComplete: true` after setup wizard runs.

---

## Rate card (what to charge)

**Setup fee: ₦50,000** (one-time, covers your ~30 min of work + onboarding call)

**Monthly subscription (recurring):**
- Up to 100 students: **₦20,000/month**
- Up to 300 students: **₦50,000/month**
- Unlimited: **₦100,000/month**

**First month free** as a launch promo — school covers setup fee only.

**Annual discount:** 15% off if they pay yearly upfront.

---

## Add school checklist (short version)

Copy this checklist for each new school:

- [ ] Collected school info
- [ ] Firebase project created
- [ ] Firestore enabled
- [ ] Auth enabled with Email/Password
- [ ] Storage enabled
- [ ] Web config copied
- [ ] Service account JSON downloaded
- [ ] Entry added to `public/schools.json`
- [ ] Security rules deployed to new Firebase project
- [ ] Vercel env var for their service account added
- [ ] Git commit + push
- [ ] Director user created in Firebase Auth
- [ ] Director user doc created in Firestore
- [ ] Login credentials sent to director
- [ ] Onboarding call scheduled
