/**
 * POST /api/staff-signup
 *
 * Creates the teacher's Auth account AND pending user doc in THIS school's
 * Firebase project. Validates the staff join code server-side.
 */

import { FieldValue } from "firebase-admin/firestore";
import {
  getAuthForSchool,
  getDbForSchool,
  resolveSchoolSlug,
} from "./_firebase-admin.js";
import { validateStaffCode, makeRateLimiter, clientIp } from "./_staff-code.js";

const checkRateLimit = makeRateLimiter({ max: 10, windowMs: 60 * 60 * 1000 });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(clientIp(req))) {
    return res
      .status(429)
      .json({ error: "Too many signups from this address. Try later." });
  }

  const { code, fullName, email, password, phone, classId, subjects, note } =
    req.body || {};

  if (!code)
    return res.status(400).json({ error: "Staff join code is required." });
  if (!fullName?.trim())
    return res.status(400).json({ error: "Full name is required." });
  if (!email?.trim())
    return res.status(400).json({ error: "Email is required." });
  if (!password || password.length < 6) {
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });
  }

  const schoolSlug = resolveSchoolSlug(req);
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();

  let createdUid = null;

  try {
    const db = getDbForSchool(schoolSlug);

    // 1. Validate the staff code against the school's stored hash
    const codeCheck = await validateStaffCode(db, code);
    if (!codeCheck.ok) {
      return res.status(codeCheck.status).json({ error: codeCheck.error });
    }

    // 2. Create the Firebase Auth account
    const auth = await getAuthForSchool(schoolSlug);

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: cleanEmail,
        password,
        displayName: cleanName,
      });
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        return res.status(409).json({
          error: "An account with that email already exists.",
        });
      }
      if (err.code === "auth/invalid-email") {
        return res.status(400).json({
          error: "That does not look like a valid email address.",
        });
      }
      throw err;
    }
    createdUid = userRecord.uid;

    // 3. Create the pending Firestore user doc
    await db.doc(`users/${createdUid}`).set({
      fullName: cleanName,
      email: cleanEmail,
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

    return res.status(200).json({
      success: true,
      uid: createdUid,
      email: cleanEmail,
    });
  } catch (err) {
    console.error("staff-signup error:", err);

    // Roll back the Auth account if the Firestore write failed
    if (createdUid) {
      try {
        const auth = await getAuthForSchool(schoolSlug);
        await auth.deleteUser(createdUid);
      } catch (cleanupErr) {
        console.error(
          "staff-signup: failed to roll back auth user",
          createdUid,
          cleanupErr.message,
        );
      }
    }

    return res.status(500).json({
      error: "Something went wrong. Please try again.",
    });
  }
}
