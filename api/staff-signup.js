/**
 * POST /api/staff-signup — v2 hardened
 *
 * Validates the staff join code, creates the user doc, and cleans up the
 * Firebase Auth account if the code is invalid.
 *
 * v2: robust private key parsing — accepts \n (literal), real newlines,
 * or the value wrapped in quotes. All formats normalize to a valid PEM.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";
import crypto from "crypto";

/**
 * Normalize the FIREBASE_PRIVATE_KEY env var into a valid PEM string.
 * Handles:
 *   - literal \n characters (as pasted from JSON: "-----BEGIN...\nMIIE...")
 *   - real newline characters (as pasted by Vercel's textarea after \n→\n conversion)
 *   - values wrapped in surrounding "quotes"
 */
function parsePrivateKey(raw) {
  if (!raw) return "";
  let key = String(raw).trim();
  // Strip surrounding quotes if present
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  // Convert literal \n to real newlines
  key = key.replace(/\\n/g, "\n");
  return key;
}

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  });
}

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
    console.error("Error name:", err.name);
    console.error("Error code:", err.code);
    await deleteAuthUser(uid);
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
      debug: process.env.NODE_ENV !== "production" ? err.message : undefined,
    });
  }
}
