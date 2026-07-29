/**
 * Report card PDF generator (async).
 *
 * v4 — subjects live inside report.publishSnapshot.subjects
 * (not top-level report.subjects). This version looks in both places.
 */

import { renderDucams } from "./ducamsTemplate";
import { renderPolish } from "./polishTemplate";
import { renderExperimental } from "./experimentalTemplate";
import { normalizeConfig } from "./reportPalettes";
import { urlToBase64 } from "./imageLoader";

async function safeFetch(url) {
  if (!url) return null;
  try {
    return await urlToBase64(url);
  } catch (err) {
    console.warn("Image fetch failed:", url, err.message);
    return null;
  }
}

/**
 * Extract an array field from either the top level or inside publishSnapshot.
 * Reports save subject data inside `publishSnapshot` at publish time; this
 * makes them findable no matter which level they live at.
 */
function pickArray(...candidates) {
  for (const c of candidates) {
    if (Array.isArray(c) && c.length > 0) return c;
  }
  return [];
}

/**
 * Guarantee every array/object/primitive the templates read exists.
 */
function sanitize(input) {
  const school = input.school || {};
  const student = input.student || {};
  const term = input.term || {};
  const rawReport = input.report || {};
  const snapshot = rawReport.publishSnapshot || {};
  const config = input.config || {};

  // Subjects can live at either report.subjects OR report.publishSnapshot.subjects
  const subjects = pickArray(
    rawReport.subjects,
    snapshot.subjects,
    input.subjects,
  );

  const psychomotor = pickArray(
    input.psychomotor,
    rawReport.psychomotor,
    snapshot.psychomotor,
  );

  const affective = pickArray(
    input.affective,
    rawReport.affective,
    snapshot.affective,
  );

  console.log("[pdfGenerator] Sanitize resolved:", {
    subjectsFound: subjects.length,
    subjectsSource: rawReport.subjects?.length
      ? "report.subjects"
      : snapshot.subjects?.length
        ? "publishSnapshot.subjects"
        : "none",
    firstSubject: subjects[0]
      ? {
          subjectName: subjects[0].subjectName,
          total: subjects[0].total,
          grade: subjects[0].grade,
          hasAssessments: !!subjects[0].assessments,
        }
      : null,
  });

  return {
    school: {
      name: "",
      shortName: "",
      motto: "",
      address: "",
      phone: "",
      email: "",
      website: "",
      logoUrl: null,
      principalSignatureUrl: null,
      stampUrl: null,
      gradingScale: [],
      reportCardConfig: {},
      branding: { primaryColor: "#2563eb" },
      contact: {},
      ...school,
    },
    student: {
      fullName: "",
      admissionNumber: "",
      photoUrl: null,
      currentClass: "",
      gender: "",
      dateOfBirth: null,
      ...student,
    },
    className:
      input.className || student.currentClass || rawReport.className || "",
    term: {
      academicYear: "",
      termNumber: 1,
      name: "",
      closingDate: null,
      resumesOn: null,
      ...term,
    },
    age: input.age,
    report: {
      ...rawReport,
      subjects,
      psychomotor,
      affective,
      // Also pull common overall fields from snapshot if missing at top level
      totalObtained: rawReport.totalObtained ?? snapshot.totalObtained ?? 0,
      totalPossible: rawReport.totalPossible ?? snapshot.totalPossible ?? 0,
      percentageAverage:
        rawReport.percentageAverage ?? snapshot.percentageAverage ?? 0,
      overallGrade: rawReport.overallGrade ?? snapshot.overallGrade ?? "",
      overallPosition: rawReport.overallPosition ?? snapshot.overallPosition,
      overallRemark: rawReport.overallRemark ?? snapshot.overallRemark ?? "",
      classSize: rawReport.classSize ?? snapshot.classSize ?? 0,
      classAverage: rawReport.classAverage ?? snapshot.classAverage ?? 0,
      classHighestPct: rawReport.classHighestPct ?? snapshot.classHighestPct,
      classLowestPct: rawReport.classLowestPct ?? snapshot.classLowestPct,
    },
    attendance: input.attendance || rawReport.attendance || {},
    psychomotor,
    affective,
    adviser: input.adviser || {},
    classTeacher: input.classTeacher || {},
    headTeacher: input.headTeacher || {},
    config: {
      template: "ducams",
      palette: "default",
      showAttendance: true,
      showSkills: true,
      showClassAverage: true,
      showPosition: true,
      showPhoto: true,
      showTeacherComment: true,
      showHeadTeacherComment: true,
      skills: [],
      ...config,
      skills: Array.isArray(config.skills) ? config.skills : [],
    },
  };
}

export async function generateReportCardPDF(rawInput) {
  const input = sanitize(rawInput);
  const { school, student } = input;

  const [logo, studentPhoto, signature, stamp] = await Promise.all([
    safeFetch(school?.logoUrl),
    safeFetch(student?.photoUrl),
    safeFetch(school?.principalSignatureUrl),
    safeFetch(school?.stampUrl),
  ]);

  const images = {};
  if (logo) images.logo = logo;
  if (studentPhoto) images.studentPhoto = studentPhoto;
  if (signature) images.signature = signature;
  if (stamp) images.stamp = stamp;

  const enrichedInput = { ...input, images };
  console.log(
    "[pdfGenerator] Rendering with",
    enrichedInput.report.subjects.length,
    "subjects",
  );

  try {
    const { design } = normalizeConfig(input.config || {});
    if (design === "polish") return renderPolish(enrichedInput);
    if (design === "experimental") return renderExperimental(enrichedInput);
    return renderDucams(enrichedInput);
  } catch (err) {
    console.error("PDF template render failed:", err);
    console.error("Input was:", enrichedInput);
    throw new Error(`Report card is missing some data. (${err.message})`);
  }
}
