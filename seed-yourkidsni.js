/**
 * Yourkids&i Academy — Firestore Seed Script
 * ------------------------------------------
 * Creates the complete school setup in one run:
 *   - school/root document (with setupComplete: true)
 *   - 7 classes
 *   - Subjects (nursery + primary sets)
 *   - 3 terms for 2026/2027 session
 *   - Admission serial counter (starts at 0)
 *
 * How to run:
 *   node scripts/seed-yourkidsni.js
 *
 * Uses the same env vars as /api/check-result.js:
 *   FIREBASE_PROJECT_ID
 *   FIREBASE_CLIENT_EMAIL
 *   FIREBASE_PRIVATE_KEY
 *
 * Reads them from .env.local automatically.
 */

import admin from "firebase-admin";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── Load .env.local ──────────────────────────────────────────
try {
  const envPath = join(__dirname, "..", ".env.local");
  const envRaw = readFileSync(envPath, "utf-8");
  envRaw.split("\n").forEach((line) => {
    line = line.trim();
    if (!line || line.startsWith("#")) return;
    const eq = line.indexOf("=");
    if (eq === -1) return;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    // Strip surrounding quotes if present
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = value;
  });
} catch (err) {
  console.warn("⚠  Could not read .env.local — using system env vars instead");
}

// ── Init Firebase Admin ──────────────────────────────────────
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(
        /\\n/g,
        "\n",
      ),
    }),
  });
}

const db = admin.firestore();
const { FieldValue } = admin.firestore;

// ── School data ──────────────────────────────────────────────
const SCHOOL = {
  name: "Yourkids&i Academy",
  shortName: "YKI",
  motto: "Where early learning meets home-grown values",
  email: "yourkidsniacademy@gmail.com",
  phone: "08176358088",
  phoneSecondary: "08134763866",
  whatsapp: "+2348134763866",
  address: "166, Isawo Road, Okiki Bus-Stop, Agric, Ikorodu, Lagos State",
  state: "Lagos",
  country: "Nigeria",
  currentSession: "2026/2027",
  currentTermNumber: 1,
  setupComplete: true,
  createdAt: FieldValue.serverTimestamp(),
  updatedAt: FieldValue.serverTimestamp(),
};

// ── Classes (7 total) ────────────────────────────────────────
const CLASSES = [
  { name: "Pre-School 1", level: "nursery", order: 1 },
  { name: "Pre-School 2", level: "nursery", order: 2 },
  { name: "Nursery 1", level: "nursery", order: 3 },
  { name: "Nursery 2", level: "nursery", order: 4 },
  { name: "Primary 1", level: "primary", order: 5 },
  { name: "Primary 2", level: "primary", order: 6 },
  { name: "Primary 3", level: "primary", order: 7, terminal: true },
];

// ── Subjects ────────────────────────────────────────────────
const SUBJECTS = [
  // Common — both levels
  { name: "English Language", code: "ENG", levels: ["nursery", "primary"] },
  { name: "Mathematics", code: "MTH", levels: ["nursery", "primary"] },
  { name: "Creative Arts", code: "ART", levels: ["nursery", "primary"] },
  {
    name: "Physical & Health Education",
    code: "PHE",
    levels: ["nursery", "primary"],
  },

  // Nursery-focused
  { name: "Rhymes & Songs", code: "RHY", levels: ["nursery"] },
  { name: "Phonics", code: "PHN", levels: ["nursery"] },
  { name: "Handwriting", code: "HWR", levels: ["nursery"] },
  { name: "Social Habits", code: "SHB", levels: ["nursery"] },

  // Primary-focused
  { name: "Basic Science", code: "BSC", levels: ["primary"] },
  { name: "Social Studies", code: "SOS", levels: ["primary"] },
  { name: "Verbal Reasoning", code: "VBR", levels: ["primary"] },
  { name: "Quantitative Reasoning", code: "QTR", levels: ["primary"] },
  { name: "Christian Religious Studies", code: "CRS", levels: ["primary"] },
  { name: "Civic Education", code: "CIV", levels: ["primary"] },
  { name: "Computer Studies", code: "CMP", levels: ["primary"] },
  { name: "Yoruba", code: "YOR", levels: ["primary"] },
  { name: "Cultural & Creative Arts", code: "CCA", levels: ["primary"] },
];

// ── Terms (2026/2027 session) ────────────────────────────────
const TERMS = [
  {
    academicYear: "2026/2027",
    termNumber: 1,
    name: "First Term",
    current: true,
    status: "active",
  },
  {
    academicYear: "2026/2027",
    termNumber: 2,
    name: "Second Term",
    current: false,
    status: "upcoming",
  },
  {
    academicYear: "2026/2027",
    termNumber: 3,
    name: "Third Term",
    current: false,
    status: "upcoming",
  },
];

// ── Grading scale ────────────────────────────────────────────
const GRADING_SCALE = [
  { grade: "A", minScore: 70, maxScore: 100, remark: "Excellent" },
  { grade: "B", minScore: 60, maxScore: 69, remark: "Very Good" },
  { grade: "C", minScore: 50, maxScore: 59, remark: "Good" },
  { grade: "D", minScore: 45, maxScore: 49, remark: "Fair" },
  { grade: "E", minScore: 40, maxScore: 44, remark: "Pass" },
  { grade: "F", minScore: 0, maxScore: 39, remark: "Fail" },
];

// ── Runner ───────────────────────────────────────────────────
async function seed() {
  console.log("\n🌱  Seeding Yourkids&i Academy…\n");

  // 1. School root document
  console.log("  → Writing school/root…");
  await db.doc("school/root").set({
    ...SCHOOL,
    gradingScale: GRADING_SCALE,
  });
  console.log("    ✓ school/root created");

  // 2. Classes
  console.log("\n  → Writing classes…");
  const batchClasses = db.batch();
  CLASSES.forEach((cls) => {
    const ref = db.collection("classes").doc();
    batchClasses.set(ref, {
      ...cls,
      id: ref.id,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batchClasses.commit();
  console.log(`    ✓ ${CLASSES.length} classes created`);

  // 3. Subjects
  console.log("\n  → Writing subjects…");
  const batchSubjects = db.batch();
  SUBJECTS.forEach((sub) => {
    const ref = db.collection("subjects").doc();
    batchSubjects.set(ref, {
      ...sub,
      id: ref.id,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batchSubjects.commit();
  console.log(`    ✓ ${SUBJECTS.length} subjects created`);

  // 4. Terms
  console.log("\n  → Writing terms…");
  const batchTerms = db.batch();
  TERMS.forEach((term) => {
    const ref = db.collection("terms").doc();
    batchTerms.set(ref, {
      ...term,
      id: ref.id,
      createdAt: FieldValue.serverTimestamp(),
    });
  });
  await batchTerms.commit();
  console.log(
    `    ✓ ${TERMS.length} terms created for ${TERMS[0].academicYear}`,
  );

  // 5. Admission serial counter
  console.log("\n  → Initializing admission counter…");
  await db.doc("school/root/counters/admissionSerial").set({
    value: 0,
    updatedAt: FieldValue.serverTimestamp(),
  });
  console.log("    ✓ Counter set to 0 (first admission will be YKI/2026/001)");

  console.log("\n✅  Seed complete!\n");
  console.log(
    "   Log in at: https://bramtech-records1.vercel.app/dashboard?school=yourkidsni\n",
  );

  process.exit(0);
}

seed().catch((err) => {
  console.error("\n❌  Seed failed:", err.message);
  console.error(err);
  process.exit(1);
});
