/**
 * POST /api/staff-signup — v3
 *
 * Now uses the shared firebase-admin helper which reads a single
 * FIREBASE_SERVICE_ACCOUNT_JSON env var (much less error-prone than the
 * 3-variable format).
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import crypto from "crypto";
import { ensureFirebaseAdmin } from "./_firebase-admin.js";

ensureFirebaseAdmin();

const db = getFirestore();
const auth = getAuth();

const attempts = new Map();
function checkRateLimit(ip) {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const entries = (attempts.get(ip) || []).filter((t) => now - t < hour);
  if (entries.length >= 10) return false;
  entries.push(now);
  attempts.set(ip, entries);
  return true;
}

function hashCode(code) {
  const normalized = String(code || "")
    .toUpperCase()
    .replace(/[-\s]/g, "")
    .replace(/^STAFF/, "");
  return crypto.createHash("sha256").update(normalized).digest("hex");
}

async function deleteAuthUser(uid) {
  try {
    await auth.deleteUser(uid);
  } catch (err) {
    console.warn("Could not delete auth user:", uid, err.message);
  }
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const ip = (
    req.headers["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "unknown"
  )
    .split(",")[0]
    .trim();

  if (!checkRateLimit(ip)) {
    return res
      .status(429)
      .json({ error: "Too many signups from this address. Try later." });
  }

  const { code, uid, fullName, email, phone, subjects, classId, note } =
    req.body || {};

  if (!code)
    return res.status(400).json({ error: "Staff join code is required." });
  if (!uid) return res.status(400).json({ error: "Auth account missing." });
  if (!fullName?.trim())
    return res.status(400).json({ error: "Full name is required." });
  if (!email?.trim())
    return res.status(400).json({ error: "Email is required." });

  try {
    const schoolSnap = await db.doc("school/root").get();
    if (!schoolSnap.exists) {
      await deleteAuthUser(uid);
      return res
        .status(404)
        .json({ error: "School not set up yet. Contact the director." });
    }

    const school = schoolSnap.data();
    const storedHash = school.staffJoinCodeHash;

    if (!storedHash) {
      await deleteAuthUser(uid);
      return res.status(403).json({
        error:
          "Staff signups are not enabled. Ask the director to generate a join code.",
      });
    }

    const providedHash = hashCode(code);
    if (providedHash !== storedHash) {
      await deleteAuthUser(uid);
      return res.status(401).json({ error: "Invalid staff join code." });
    }

    const existingSnap = await db.doc(`users/${uid}`).get();
    if (existingSnap.exists) {
      return res
        .status(409)
        .json({ error: "Account already exists for this user." });
    }

    await db.doc(`users/${uid}`).set({
      fullName: fullName.trim(),
      email: email.trim().toLowerCase(),
      phone: (phone || "").trim(),
      role: "teacher",
      status: "pending",
      active: true,
      proposedSubjects: Array.isArray(subjects) ? subjects : [],
      proposedClassTeacherOf: classId || null,
      assignedClasses: [],
      assignedSubjects: [],
      classTeacherOf: null,
      permissions: {},
      signupNote: (note || "").trim(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({ success: true, uid });
  } catch (err) {
    console.error("staff-signup error:", err);
    await deleteAuthUser(uid);
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}
