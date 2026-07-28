/**
 * Report card PDF generator (async).
 *
 * Routes to Classic, Polish, or Experimental design based on
 * config.template. All three share the same palette system and
 * grade-tier colors.
 *
 * Fix #2 — sanitizes inputs before passing to templates so missing
 * fields don't crash with "Cannot read properties of undefined".
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
 * Guarantee every array/object/primitive the templates read exists,
 * so they never hit `undefined.length` or similar.
 */
function sanitize(input) {
  const school = input.school || {};
  const student = input.student || {};
  const term = input.term || {};
  const report = input.report || {};
  const config = input.config || {};

  return {
    ...input,
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
    className: input.className || student.currentClass || "",
    term: {
      academicYear: "",
      termNumber: 1,
      name: "",
      closingDate: null,
      resumesOn: null,
      ...term,
    },
    age: input.age || "",
    report: {
      overallGrade: "",
      percentageAverage: 0,
      totalScore: 0,
      maxScore: 0,
      position: "",
      classAverage: 0,
      subjects: [],
      psychomotor: [],
      affective: [],
      teacherComment: "",
      headTeacherComment: "",
      ...report,
      // Force these to arrays even if the incoming value is falsy/wrong type
      subjects: Array.isArray(report.subjects) ? report.subjects : [],
      psychomotor: Array.isArray(report.psychomotor) ? report.psychomotor : [],
      affective: Array.isArray(report.affective) ? report.affective : [],
    },
    attendance: {
      present: 0,
      absent: 0,
      total: 0,
      ...(input.attendance || {}),
    },
    psychomotor: Array.isArray(input.psychomotor) ? input.psychomotor : [],
    affective: Array.isArray(input.affective) ? input.affective : [],
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
