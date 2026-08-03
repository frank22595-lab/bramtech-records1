/**
 * Shared Firebase Admin initializer — MULTI-TENANT.
 *
 * Each school has its own Firebase project. This module maintains a cache
 * of initialized admin apps, one per school, and provides `getDbForSchool(slug)`
 * that returns a Firestore instance connected to THAT school's project.
 *
 * How to configure per-school service accounts on Vercel
 * ------------------------------------------------------
 * For each school, add an env var like:
 *
 *   FIREBASE_SERVICE_ACCOUNT_JSON_YOURKIDSNI   → full service account JSON
 *   FIREBASE_SERVICE_ACCOUNT_JSON_BRAMTEST     → full service account JSON
 *   FIREBASE_SERVICE_ACCOUNT_JSON_DELTACOLLEGE → full service account JSON
 *
 * The slug is UPPERCASED and hyphens become underscores.
 *
 * Backward compatibility
 * ----------------------
 * If a school-specific env var doesn't exist, we fall back to the plain
 * FIREBASE_SERVICE_ACCOUNT_JSON. This keeps things working during the
 * transition — the single existing service account keeps serving whatever
 * school is calling.
 *
 * How the API routes resolve the school slug
 * ------------------------------------------
 * They call `resolveSchoolSlug(req)` which tries in order:
 *   1. `school` param in the request body (POST) or query string (GET)
 *   2. Parses the Referer URL for a `?school=` param
 *   3. Returns null (falls back to plain FIREBASE_SERVICE_ACCOUNT_JSON)
 */

import { initializeApp, cert, getApps, getApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";

// Cache: schoolSlug → Firebase admin app instance
const appCache = new Map();

function parsePrivateKey(raw) {
  if (!raw) return "";
  let key = String(raw).trim();
  if ((key.startsWith('"') && key.endsWith('"')) || (key.startsWith("'") && key.endsWith("'"))) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

function slugToEnvSuffix(slug) {
  return String(slug).toUpperCase().replace(/-/g, "_").replace(/[^A-Z0-9_]/g, "");
}

/**
 * Look up the service account for a given school slug.
 * Returns the parsed JSON object, or throws.
 */
function loadServiceAccount(slug) {
  // 1. Try school-specific env var: FIREBASE_SERVICE_ACCOUNT_JSON_<SLUG>
  if (slug) {
    const suffix = slugToEnvSuffix(slug);
    const specific = process.env[`FIREBASE_SERVICE_ACCOUNT_JSON_${suffix}`];
    if (specific) {
      try {
        return JSON.parse(specific);
      } catch (err) {
        console.error(`[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON_${suffix}:`, err.message);
      }
    }
  }

  // 2. Fall back to plain FIREBASE_SERVICE_ACCOUNT_JSON (single-school mode)
  const plain = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (plain) {
    try {
      return JSON.parse(plain);
    } catch (err) {
      console.error("[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:", err.message);
    }
  }

  // 3. Fall back to legacy 3-var format
  if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    };
  }

  throw new Error(`No Firebase service account configured${slug ? ` for school "${slug}"` : ""}. Add FIREBASE_SERVICE_ACCOUNT_JSON${slug ? "_" + slugToEnvSuffix(slug) : ""} in Vercel.`);
}

/**
 * Get an initialized Firebase admin app for a specific school.
 * Uses a cache so we don't re-initialize on every request.
 */
function getAppForSchool(slug) {
  const cacheKey = slug || "_default_";

  if (appCache.has(cacheKey)) {
    return appCache.get(cacheKey);
  }

  const serviceAccount = loadServiceAccount(slug);
  const appName = cacheKey;

  // Check if this named app already exists (from a previous cold start)
  let app;
  const existing = getApps().find((a) => a.name === appName);
  if (existing) {
    app = existing;
  } else {
    app = initializeApp(
      { credential: cert(serviceAccount), projectId: serviceAccount.project_id },
      appName
    );
  }

  appCache.set(cacheKey, app);
  return app;
}

/**
 * Get a Firestore instance for a specific school.
 * This is what API routes should use.
 */
export function getDbForSchool(slug) {
  const app = getAppForSchool(slug);
  return getFirestore(app);
}

/**
 * Extract the school slug from a request.
 * Tries body, then query, then Referer header.
 */
export function resolveSchoolSlug(req) {
  // 1. Body (POST requests)
  if (req.body && typeof req.body === "object" && req.body.school) {
    return String(req.body.school).trim().toLowerCase();
  }

  // 2. Query string (GET requests)
  if (req.query && req.query.school) {
    return String(req.query.school).trim().toLowerCase();
  }

  // 3. Referer header — client visits e.g. /check-result?school=yourkidsni
  //    the browser sends that URL as Referer when it makes the fetch.
  const referer = req.headers?.referer || req.headers?.referrer;
  if (referer) {
    try {
      const url = new URL(referer);
      const s = url.searchParams.get("school");
      if (s) return s.trim().toLowerCase();
    } catch {}
  }

  // 4. No slug found — API will use the fallback FIREBASE_SERVICE_ACCOUNT_JSON
  return null;
}

/**
 * LEGACY — kept for backward compatibility with any code that still imports
 * the old function. Initializes the default admin app (single-school mode).
 */
export function ensureFirebaseAdmin() {
  getAppForSchool(null);
}
