/**
 * Report card PDF generator (async).
 *
 * v3 — simpler sanitize, extra logging, more permissive with field names.
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
 * Guarantee every array/object/primitive the templates read exists.
 * Also accept subjects at either input.report.subjects OR input.subjects.
 */
function sanitize(input) {
  const school = input.school || {};
  const student = input.student || {};
  const term = input.term || {};
  const rawReport = input.report || {};
  const config = input.config || {};

  // Subjects can live at report.subjects OR at top-level input.subjects
  const subjects =
    (Array.isArray(rawReport.subjects) && rawReport.subjects.length > 0
      ? rawReport.subjects
      : null) ||
    (Array.isArray(input.subjects) && input.subjects.length > 0
      ? input.subjects
      : null) ||
    [];

  const psychomotor =
    (Array.isArray(input.psychomotor) && input.psychomotor.length > 0
      ? input.psychomotor
      : null) ||
    (Array.isArray(rawReport.psychomotor) && rawReport.psychomotor.length > 0
      ? rawReport.psychomotor
      : null) ||
    [];

  const affective =
    (Array.isArray(input.affective) && input.affective.length > 0
      ? input.affective
      : null) ||
    (Array.isArray(rawReport.affective) && rawReport.affective.length > 0
      ? rawReport.affective
      : null) ||
    [];

  console.log("[pdfGenerator] Sanitize called with:", {
    reportKeys: Object.keys(rawReport),
    hasSubjects: !!rawReport.subjects,
    subjectsIsArray: Array.isArray(rawReport.subjects),
    subjectsLength: Array.isArray(rawReport.subjects)
      ? rawReport.subjects.length
      : "n/a",
    finalSubjectsCount: subjects.length,
    firstSubject: subjects[0]
      ? {
          subjectName: subjects[0].subjectName,
          total: subjects[0].total,
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
  console.log("[pdfGenerator] Raw input received:", rawInput);

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
  console.log("[pdfGenerator] Enriched input for template:", {
    subjectsCount: enrichedInput.report.subjects.length,
    reportKeys: Object.keys(enrichedInput.report),
    hasImages: {
      logo: !!images.logo,
      studentPhoto: !!images.studentPhoto,
    },
  });

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
