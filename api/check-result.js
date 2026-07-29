/**
 * POST /api/check-result
 *
 * v3 — returns full school object (gradingScale, signature, stamp) so the
 * PDF template can render everything the admin view shows.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import crypto from "crypto";

if (!getApps().length) {
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: (process.env.FIREBASE_PRIVATE_KEY || "").replace(
        /\\n/g,
        "\n",
      ),
    }),
  });
}

const db = getFirestore();

const attempts = new Map();

function checkRateLimit(ip) {
  const now = Date.now();
  const hour = 60 * 60 * 1000;
  const entries = (attempts.get(ip) || []).filter((t) => now - t < hour);
  if (entries.length >= 5) return false;
  entries.push(now);
  attempts.set(ip, entries);
  return true;
}

function hashCode(code) {
  const normalized = String(code || "")
    .replace(/-/g, "")
    .toUpperCase();
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
      .json({ error: "Too many attempts. Please wait an hour and try again." });
  }

  const { admissionNumber, accessCode } = req.body || {};

  if (!admissionNumber || !accessCode) {
    return res
      .status(400)
      .json({ error: "Admission number and access code are required." });
  }

  const normalizedAdm = String(admissionNumber).trim().toUpperCase();
  const hashedCode = hashCode(accessCode);

  try {
    const studentsSnap = await db
      .collection("students")
      .where("admissionNumber", "==", normalizedAdm)
      .limit(1)
      .get();

    if (studentsSnap.empty) {
      return res
        .status(404)
        .json({ error: "Admission number or access code is incorrect." });
    }

    const studentDoc = studentsSnap.docs[0];
    const student = studentDoc.data();

    if (!student.accessCodeHash || student.accessCodeHash !== hashedCode) {
      return res
        .status(404)
        .json({ error: "Admission number or access code is incorrect." });
    }

    const reportsSnap = await db
      .collection("reportCards")
      .where("studentId", "==", studentDoc.id)
      .where("status", "==", "published")
      .get();

    const reports = reportsSnap.docs
      .map((d) => ({ id: d.id, ...d.data() }))
      .sort((a, b) => {
        const ta = new Date(a.publishedAt || a.createdAt || 0).getTime();
        const tb = new Date(b.publishedAt || b.createdAt || 0).getTime();
        return tb - ta;
      });

    const schoolSnap = await db.doc("school/root").get();
    const schoolData = schoolSnap.exists ? schoolSnap.data() : {};

    // Return the FULL school object so PDF template has everything
    // (gradingScale, signature, stamp, contact object, etc.)
    return res.status(200).json({
      student: {
        id: studentDoc.id,
        fullName: student.fullName,
        admissionNumber: student.admissionNumber,
        photoUrl: student.photoUrl || null,
        currentClass:
          student.class || student.currentClass || student.className || "",
        status: student.status || "active",
        gender: student.gender || "",
        dateOfBirth: student.dateOfBirth || null,
        weight: student.weight || null,
        height: student.height || null,
      },
      school: {
        // Include everything — the template picks what it needs
        ...schoolData,
        // Ensure these string field aliases exist (template checks both)
        phone: schoolData.phone || schoolData.contact?.phone || "",
        email: schoolData.email || schoolData.contact?.email || "",
        website: schoolData.website || schoolData.contact?.website || "",
      },
      reports,
    });
  } catch (err) {
    console.error("check-result error:", err);
    return res
      .status(500)
      .json({ error: "Something went wrong. Please try again." });
  }
}
