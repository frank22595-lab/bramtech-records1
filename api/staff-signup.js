/**
 * POST /api/staff-signup — v6 multi-tenant
 *
 * Creates a pending teacher account in THIS school's Firebase project.
 *
 * v6 change: the Auth account is now created HERE, with the Admin SDK, after
 * the join code has been validated. Previously the browser called
 * createUserWithEmailAndPassword() first and only then hit this route, which
 * meant (a) an invalid code still left a real Auth account behind, and
 * (b) signing in mid-submit unmounted the signup page before it could finish.
 *
 * Order of operations — code first, account second, and roll the account back
 * if the profile write fails, so Auth and Firestore never drift apart:
 *   1. validate the join code against school/root.staffJoinCodeHash
 *   2. createUser() in this school's Auth
 *   3. write users/{uid} with status: "pending"
 *
 * Body: { code, fullName, email, password, phone?, subjects?, classId?, note?, school? }
 */

import { FieldValue } from "firebase-admin/firestore";
import {
  getAuthForSchool,
  getDbForSchool,
  resolveSchoolSlug,
} from "./_firebase-admin.js";
import {
  validateStaffCode,
  makeRateLimiter,
  clientIp,
} from "./_staff-code.js";

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

  const { code, fullName, email, password, phone, subjects, classId, note } =
    req.body || {};

  if (!code)
    return res.status(400).json({ error: "Staff join code is required." });
  if (!fullName?.trim())
    return res.status(400).json({ error: "Full name is required." });
  if (!email?.trim())
    return res.status(400).json({ error: "Email is required." });
  if (!password || String(password).length < 6)
    return res
      .status(400)
      .json({ error: "Password must be at least 6 characters." });

  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();

  // Which school does this signup belong to?
  const schoolSlug = resolveSchoolSlug(req);

  let createdUid = null;

  try {
    const db = getDbForSchool(schoolSlug);
    const auth = getAuthForSchool(schoolSlug);

    // 1. The code gate. Nothing is created before this passes.
    const codeCheck = await validateStaffCode(db, code);
    if (!codeCheck.ok) {
      return res.status(codeCheck.status).json({ error: codeCheck.error });
    }

    // 2. Create the Auth account in THIS school's project.
    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: cleanEmail,
        password: String(password),
        displayName: cleanName,
      });
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        return res.status(409).json({
          error:
            "This email already has an account at this school. Try logging in instead.",
        });
      }
      if (err.code === "auth/invalid-email") {
        return res
          .status(400)
          .json({ error: "That does not look like a valid email address." });
      }
      if (err.code === "auth/invalid-password") {
        return res
          .status(400)
          .json({ error: "Password must be at least 6 characters." });
      }
      throw err;
    }
    createdUid = userRecord.uid;

    // 3. Write the pending profile. The director approves from School → Staff.
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

    return res.status(200).json({ success: true, uid: createdUid });
  } catch (err) {
    console.error("staff-signup error:", err);

    // Roll back the orphaned Auth account so the teacher can retry with the
    // same email instead of hitting "email already in use" forever.
    if (createdUid) {
      try {
        await getAuthForSchool(schoolSlug).deleteUser(createdUid);
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
