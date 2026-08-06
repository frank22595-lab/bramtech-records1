/**
 * POST /api/create-teacher
 *
 * Director/admin manually adds a teacher. Creates the Auth account AND the
 * Firestore profile in THIS school's project, then returns the generated
 * temporary password once so the director can pass it on.
 *
 * Why this moved server-side: the browser used to create the account with a
 * secondary Firebase app and then write users/{newUid} as the director — which
 * Firestore rules correctly reject, because a director does not own that uid.
 * The Auth account was created but the profile write failed, leaving an
 * orphaned login. The Admin SDK does both, atomically from the caller's point
 * of view, with a rollback if the second step fails.
 *
 * Auth: Bearer <Firebase ID token> of a director/admin OF THIS SCHOOL.
 * Body: { fullName, email, phone?, assignedClasses?, assignedSubjects?,
 *         classTeacherOf?, role?, permissions?, school? }
 */

import { FieldValue } from "firebase-admin/firestore";
import {
  getAuthForSchool,
  getDbForSchool,
  resolveSchoolSlug,
  requireAdminCaller,
} from "./_firebase-admin.js";

const WORDS = [
  "Sun",
  "Moon",
  "Star",
  "Rain",
  "Bird",
  "Fish",
  "Tree",
  "Book",
  "Ocean",
  "Cloud",
];

function generatePassword() {
  const word = WORDS[Math.floor(Math.random() * WORDS.length)];
  const num = Math.floor(1000 + Math.random() * 9000);
  return `${word}${num}!`;
}

function asArray(v) {
  return Array.isArray(v) ? v.filter((x) => typeof x === "string") : [];
}

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const schoolSlug = resolveSchoolSlug(req);

  const {
    fullName,
    email,
    phone,
    assignedClasses,
    assignedSubjects,
    classTeacherOf,
    role,
    permissions,
  } = req.body || {};

  if (!fullName?.trim())
    return res.status(400).json({ error: "Full name is required." });
  if (!email?.trim())
    return res.status(400).json({ error: "Email is required." });

  // Only ever teacher or admin from this route — never director.
  const safeRole = role === "admin" ? "admin" : "teacher";
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = fullName.trim();

  let createdUid = null;

  try {
    // Caller must be a director/admin of THIS school. verifyIdToken is scoped
    // to this school's Firebase project, so a token from another tenant fails.
    const caller = await requireAdminCaller(req, schoolSlug);
    if (!caller.ok) {
      return res.status(caller.status).json({ error: caller.error });
    }

    const db = getDbForSchool(schoolSlug);
    const auth = getAuthForSchool(schoolSlug);

    const tempPassword = generatePassword();

    let userRecord;
    try {
      userRecord = await auth.createUser({
        email: cleanEmail,
        password: tempPassword,
        displayName: cleanName,
      });
    } catch (err) {
      if (err.code === "auth/email-already-exists") {
        return res.status(409).json({
          error: "A user with that email already exists at this school.",
        });
      }
      if (err.code === "auth/invalid-email") {
        return res
          .status(400)
          .json({ error: "That does not look like a valid email address." });
      }
      throw err;
    }
    createdUid = userRecord.uid;

    const classes = asArray(assignedClasses);
    const classTeacher = classTeacherOf || null;
    // Being class teacher of a class implies being assigned to it.
    if (classTeacher && !classes.includes(classTeacher)) {
      classes.push(classTeacher);
    }

    await db.doc(`users/${createdUid}`).set({
      fullName: cleanName,
      email: cleanEmail,
      phone: (phone || "").trim(),
      role: safeRole,
      // Director-created accounts skip the approval queue.
      status: "active",
      active: true,
      assignedClasses: classes,
      assignedSubjects: asArray(assignedSubjects),
      classTeacherOf: classTeacher,
      isClassTeacher: !!classTeacher,
      permissions:
        permissions && typeof permissions === "object" ? permissions : {},
      mustChangePassword: true,
      createdBy: caller.uid,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return res.status(200).json({
      success: true,
      uid: createdUid,
      fullName: cleanName,
      email: cleanEmail,
      tempPassword,
    });
  } catch (err) {
    console.error("create-teacher error:", err);

    // Never leave an Auth account without a profile — that account could log
    // in and hit the director auto-promotion path in AuthContext.
    if (createdUid) {
      try {
        await getAuthForSchool(schoolSlug).deleteUser(createdUid);
      } catch (cleanupErr) {
        console.error(
          "create-teacher: failed to roll back auth user",
          createdUid,
          cleanupErr.message,
        );
      }
    }

    return res
      .status(500)
      .json({ error: "Could not create the teacher account. Please try again." });
  }
}
