/**
 * POST /api/staff-signup — v4
 *
 * Removed firebase-admin/auth import (was triggering ERR_REQUIRE_ESM on
 * Vercel's Node runtime). Now uses ONLY firebase-admin/firestore, which
 * is stable everywhere.
 *
 * Tradeoff: if code validation fails, the Firebase Auth user stays around.
 * Client can offer them a retry with a different code — auth user will be
 * reused. Small imperfection, worth it to get signups working.
 */

import { getFirestore, FieldValue } from "firebase-admin/firestore";
import crypto from "crypto";
import { ensureFirebaseAdmin } from "./_firebase-admin.js";

ensureFirebaseAdmin();

const db = getFirestore();

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
      return res
        .status(404)
        .json({ error: "School not set up yet. Contact the director." });
    }

    const school = schoolSnap.data();
    const storedHash = school.staffJoinCodeHash;

    if (!storedHash) {
      return res.status(403).json({
        error:
          "Staff signups are not enabled. Ask the director to generate a join code.",
      });
    }

    const providedHash = hashCode(code);
    if (providedHash !== storedHash) {
      return res
        .status(401)
        .json({
          error: "Invalid staff join code. Please check with your director.",
        });
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
    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}
