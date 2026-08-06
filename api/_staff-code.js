/**
 * Server-side staff join code helpers.
 *
 * MUST stay byte-for-byte compatible with src/lib/staffCode.js — the director
 * generates and hashes the code in the browser, the API validates the hash
 * here. Normalization: uppercase, strip hyphens/whitespace, drop the leading
 * "STAFF" prefix, then SHA-256 hex.
 */

import crypto from "crypto";

export function normalizeStaffCode(code) {
  return String(code || "")
    .toUpperCase()
    .replace(/[-\s]/g, "")
    .replace(/^STAFF/, "");
}

export function hashStaffCode(code) {
  return crypto
    .createHash("sha256")
    .update(normalizeStaffCode(code))
    .digest("hex");
}

/**
 * Constant-time comparison so we don't leak the stored hash one byte at a
 * time through response timing.
 */
export function hashesMatch(a, b) {
  if (typeof a !== "string" || typeof b !== "string") return false;
  const bufA = Buffer.from(a, "utf8");
  const bufB = Buffer.from(b, "utf8");
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Validate a submitted code against a school's stored hash.
 *
 * Returns `{ ok: true }` or `{ ok: false, status, error }`.
 * Every caller that creates an account MUST run this — never trust that the
 * client already checked.
 */
export async function validateStaffCode(db, code) {
  const schoolSnap = await db.doc("school/root").get();
  if (!schoolSnap.exists) {
    return {
      ok: false,
      status: 404,
      error: "School not set up yet. Contact the director.",
    };
  }

  const school = schoolSnap.data();
  const storedHash = school.staffJoinCodeHash;

  if (!storedHash) {
    return {
      ok: false,
      status: 403,
      error:
        "Staff signups are not enabled. Ask the director to generate a join code.",
    };
  }

  if (!hashesMatch(hashStaffCode(code), storedHash)) {
    return {
      ok: false,
      status: 401,
      error: "Invalid staff join code. Please check with your director.",
    };
  }

  return { ok: true, school };
}

/**
 * Tiny in-memory rate limiter, keyed by IP. Per-lambda-instance only, which
 * is good enough to blunt brute-forcing a 9-character code without adding a
 * datastore dependency.
 */
export function makeRateLimiter({ max, windowMs }) {
  const hits = new Map();
  return function check(key) {
    const now = Date.now();
    const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);
    if (recent.length >= max) return false;
    recent.push(now);
    hits.set(key, recent);
    return true;
  };
}

export function clientIp(req) {
  return (
    req.headers?.["x-forwarded-for"] ||
    req.socket?.remoteAddress ||
    "unknown"
  )
    .split(",")[0]
    .trim();
}
