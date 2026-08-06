/**
 * POST /api/verify-staff-code
 *
 * Checks a staff join code against the CURRENT school's `school/root
 * .staffJoinCodeHash` before the teacher is allowed past step 1 of signup.
 *
 * This is a UX gate, not the security boundary — /api/staff-signup revalidates
 * the same code before it creates anything. Skipping this endpoint entirely
 * gains an attacker nothing.
 *
 * Body: { code, school? }   (school also accepted via x-school-slug header)
 * 200 → { valid: true, school: { name } }
 * 401 → { error }
 */

import { getDbForSchool, resolveSchoolSlug } from "./_firebase-admin.js";
import {
  validateStaffCode,
  makeRateLimiter,
  clientIp,
} from "./_staff-code.js";

// Stricter than signup: this endpoint is the one worth brute-forcing.
const checkRateLimit = makeRateLimiter({ max: 20, windowMs: 60 * 60 * 1000 });

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  if (!checkRateLimit(clientIp(req))) {
    return res
      .status(429)
      .json({ error: "Too many attempts from this address. Try again later." });
  }

  const { code } = req.body || {};
  if (!code || !String(code).trim()) {
    return res.status(400).json({ error: "Please enter the staff join code." });
  }

  const schoolSlug = resolveSchoolSlug(req);

  try {
    const db = getDbForSchool(schoolSlug);
    const result = await validateStaffCode(db, code);

    if (!result.ok) {
      return res.status(result.status).json({ error: result.error });
    }

    return res.status(200).json({
      valid: true,
      school: { name: result.school.name || "" },
    });
  } catch (err) {
    console.error("verify-staff-code error:", err);
    return res
      .status(500)
      .json({ error: "Could not check that code. Please try again." });
  }
}
