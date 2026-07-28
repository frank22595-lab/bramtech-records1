# BramTech Records

School result portal SaaS. Product #2 in the BramTech Suite.

## What's in this scaffold

This is the **foundation** — school setup + Firebase bootstrap. Next phases will add: student enrollment, teachers, result entry, report card generation, PDF export, parent portal.

**Built so far:**
- Runtime Firebase config loader (one deployed app serves any number of schools, each on its own isolated Firebase project)
- Main-domain landing + signup flow
- Subdomain login flow with first-time director account creation
- 6-step setup wizard: school details, classes, subjects, grade scale, assessments, skills + report card options
- Batched Firestore write on setup completion
- Auto-routing based on school state (needs setup → wizard, ready → dashboard)

## How the multi-tenancy works

Each school gets its **own Firebase project** = its own isolated database, storage, and auth. The React app is deployed **once** and figures out which school it's serving based on the subdomain:

```
deltacollege.records.bramtechsuite.com → Firebase project A
stmarys.records.bramtechsuite.com     → Firebase project B
bramtechrecords.com                    → main marketing/signup site
```

The mapping lives in `public/schools.json`. To add a new school:
1. Create a new Firebase project in the console
2. Enable Authentication (email/password) and Firestore
3. Copy the Firebase config
4. Paste it into `public/schools.json` under the school's slug
5. Redeploy (or if hosting the JSON externally, no redeploy needed)

## Getting started

```bash
npm install
npm run dev
```

Open http://localhost:5173 — you'll see the main landing page.

To test as a school, use the query param override:
```
http://localhost:5173/?school=demo
```

This treats you as if you're on `demo.records.bramtechsuite.com`.

## Firebase setup for local dev

1. Create a Firebase project called `bramtech-demo` (or anything)
2. Enable **Authentication → Email/Password**
3. Enable **Firestore Database** (start in test mode for now)
4. Enable **Storage**
5. Project settings → General → Your apps → add a Web app → copy the config
6. Paste the config values into `public/schools.json` under `"demo"`
7. Run `npm run dev` and visit `http://localhost:5173/?school=demo`
8. Create your first director account, walk through the setup wizard

## Architecture principles applied

- **Isolation:** one Firebase project per school. Schools cannot see or affect each other.
- **Snapshot data:** report cards will be immutable snapshots, not live views (implemented in next phase).
- **No hard deletes:** grades and results will be append-only (Firestore rules enforce this in next phase).
- **Fail-safe defaults:** Firestore rules deny by default (rules to be added in next phase).
- **Runtime config:** app doesn't hardcode a Firebase project — reads the right one per school at boot.
- **Batched writes:** setup wizard commits all classes/subjects/assessments/school doc in one atomic batch.
- **Scale-safe patterns:** designed for pagination, denormalization, and composite indexes from the start.

## Next steps

1. **Firestore security rules** — enforce role-based access at DB level
2. **Student enrollment** — CRUD + CSV import + photo upload
3. **Teacher management** — director invites teachers, assigns to classes/subjects
4. **Result entry UI** — teacher enters scores for their class/subject/assessment in batch
5. **Report card generation** — batch job computes snapshots at term end
6. **PDF export** — jsPDF + jspdf-autotable
7. **Parent portal** — parent logs in, sees their child's report cards
8. **Backup automation** — scheduled Firestore exports to Cloud Storage
