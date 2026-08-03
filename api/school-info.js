/**
 * GET /api/school-info — v4 multi-tenant
 *
 * Resolves the school from ?school=slug (or Referer) and returns school
 * branding, classes, and subjects from THAT school's Firestore project.
 */

import { getDbForSchool, resolveSchoolSlug } from "./_firebase-admin.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const schoolSlug = resolveSchoolSlug(req);

  try {
    const db = getDbForSchool(schoolSlug);

    const [schoolSnap, classesSnap, subjectsSnap] = await Promise.all([
      db.doc("school/root").get(),
      db.collection("classes").orderBy("order").get(),
      db.collection("subjects").orderBy("order").get(),
    ]);

    const school = schoolSnap.exists ? schoolSnap.data() : {};

    const classes = classesSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      order: d.data().order,
    }));

    const subjects = subjectsSnap.docs.map((d) => ({
      id: d.id,
      name: d.data().name,
      code: d.data().code,
    }));

    return res.status(200).json({
      school: {
        name: school.name || "",
        shortName: school.shortName || "",
        motto: school.motto || "",
      },
      classes,
      subjects,
    });
  } catch (err) {
    console.error("school-info error:", err);
    return res.status(500).json({ error: "Something went wrong." });
  }
}
