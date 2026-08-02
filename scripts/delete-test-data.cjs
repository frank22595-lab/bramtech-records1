/**
 * delete-test-data.js
 *
 * Wipes all test data so the school starts fresh.
 * KEEPS: school/root doc, classes, subjects, assessments, director user
 * DELETES: students, terms, results, reportCards, ALL non-director users
 *
 * Run with:
 *   node scripts/delete-test-data.js
 *
 * REQUIREMENTS:
 *   - service-account.json must exist in project root
 *   - firebase-admin installed (should already be)
 *
 * SAFETY:
 *   - Prompts you before deleting anything
 *   - Prints exactly what will be deleted first
 */

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const readline = require("readline");
const path = require("path");

const serviceAccount = require(
  path.join(__dirname, "..", "service-account.json"),
);

const app = initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore(app);

// Keep the FieldValue import for the reset step below
const { FieldValue } = require("firebase-admin/firestore");

// Collections to WIPE entirely
const COLLECTIONS_TO_WIPE = ["students", "terms", "results", "reportCards"];

// Ask user for confirmation
function ask(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

async function deleteCollection(name) {
  const snap = await db.collection(name).get();
  if (snap.empty) {
    console.log(`  ${name}: already empty`);
    return 0;
  }
  const batch = db.batch();
  snap.docs.forEach((doc) => batch.delete(doc.ref));
  await batch.commit();
  console.log(`  ${name}: deleted ${snap.size} documents ✓`);
  return snap.size;
}

async function deleteNonDirectorUsers() {
  const snap = await db.collection("users").get();
  if (snap.empty) {
    console.log(`  users: already empty`);
    return { deleted: 0, kept: 0 };
  }

  const batch = db.batch();
  let deleted = 0;
  let kept = 0;
  const keptNames = [];

  snap.docs.forEach((doc) => {
    const data = doc.data();
    if (data.role === "director") {
      kept++;
      keptNames.push(data.fullName || data.email);
    } else {
      batch.delete(doc.ref);
      deleted++;
    }
  });

  if (deleted > 0) await batch.commit();

  console.log(`  users: deleted ${deleted}, kept ${kept} director(s)`);
  if (keptNames.length) {
    keptNames.forEach((name) => console.log(`    → kept: ${name}`));
  }

  return { deleted, kept };
}

async function resetCounters() {
  // Wipe admission serial counter so new students start from 001
  try {
    const countersSnap = await db
      .collection("school")
      .doc("root")
      .collection("counters")
      .get();
    if (countersSnap.empty) {
      console.log(`  counters: already empty`);
      return 0;
    }
    const batch = db.batch();
    countersSnap.docs.forEach((doc) => batch.delete(doc.ref));
    await batch.commit();
    console.log(`  counters: reset ${countersSnap.size} counter(s) ✓`);
    return countersSnap.size;
  } catch (err) {
    console.log(`  counters: could not reset (${err.message})`);
    return 0;
  }
}

async function resetSchoolCurrentTerm() {
  // Clear currentTermId so setup flow works cleanly
  try {
    await db.collection("school").doc("root").update({
      currentTermId: null,
      updatedAt: FieldValue.serverTimestamp(),
    });
    console.log(`  school/root: cleared currentTermId ✓`);
  } catch (err) {
    console.log(`  school/root: could not update (${err.message})`);
  }
}

async function preview() {
  console.log("\n=== PREVIEW — what will be deleted ===\n");

  for (const name of COLLECTIONS_TO_WIPE) {
    const snap = await db.collection(name).get();
    console.log(`  ${name}: ${snap.size} document(s)`);
  }

  const usersSnap = await db.collection("users").get();
  let directors = 0,
    others = 0;
  usersSnap.docs.forEach((d) => {
    if (d.data().role === "director") directors++;
    else others++;
  });
  console.log(
    `  users: ${others} to delete, ${directors} director(s) will stay`,
  );

  const countersSnap = await db
    .collection("school")
    .doc("root")
    .collection("counters")
    .get();
  console.log(`  counters: ${countersSnap.size} document(s) to reset`);

  console.log("\n=== WILL BE KEPT ===");
  console.log("  ✓ school/root document (with currentTermId cleared)");
  console.log("  ✓ classes (all)");
  console.log("  ✓ subjects (all)");
  console.log("  ✓ assessments (all)");
  console.log("  ✓ director user(s)");
  console.log("");
}

async function main() {
  console.log("\n🗑️  BramTech Records — Test Data Cleanup");
  console.log("=========================================");

  await preview();

  const answer = await ask("Type YES to proceed with deletion: ");
  if (answer !== "yes") {
    console.log("\nCancelled. Nothing deleted.\n");
    process.exit(0);
  }

  console.log("\n=== DELETING ===\n");

  for (const name of COLLECTIONS_TO_WIPE) {
    await deleteCollection(name);
  }
  await deleteNonDirectorUsers();
  await resetCounters();
  await resetSchoolCurrentTerm();

  console.log("\n✅ Cleanup complete!");
  console.log("\nNext steps for the director:");
  console.log("  1. Log in");
  console.log("  2. Settings → Terms → create the current term");
  console.log("  3. School → Students → add real students");
  console.log("  4. Share staff-join link with teachers\n");

  process.exit(0);
}

main().catch((err) => {
  console.error("\n❌ Error:", err.message);
  process.exit(1);
});
