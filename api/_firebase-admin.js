/**
 * Shared Firebase Admin initializer — MULTI-TENANT.
 *
 * Each school has its own Firebase project. This module maintains a cache
 * of initialized admin apps, one per school, and provides `getDbForSchool(slug)`
 * / `getAuthForSchool(slug)` that return handles connected to THAT school's
 * project.
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
 * Backward compatibility — and the guard rail around it
 * -----------------------------------------------------
 * If a school-specific env var doesn't exist we fall back to the plain
 * FIREBASE_SERVICE_ACCOUNT_JSON. That fallback is convenient for the
 * single-school deployment but it is DANGEROUS once there are two schools:
 * an unresolved slug would silently write into whichever project the plain
 * service account points at.
 *
 * So: set `FIREBASE_DEFAULT_SCHOOL_SLUG` to the slug that the plain
 * FIREBASE_SERVICE_ACCOUNT_JSON belongs to. Once it is set, a request for
 * any OTHER school without its own env var throws instead of writing to the
 * wrong project. Leaving it unset keeps the legacy behaviour (with a warning).
 *
 * How the API routes resolve the school slug
 * ------------------------------------------
 * They call `resolveSchoolSlug(req)` which tries in order:
 *   1. `x-school-slug` request header (what the app's apiClient always sends)
 *   2. `school` param in the request body (POST) or query string (GET)
 *   3. Parses the Referer URL for a `?school=` param
 *   4. Returns null (falls back to plain FIREBASE_SERVICE_ACCOUNT_JSON)
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

// Cache: schoolSlug → Firebase admin app instance
const appCache = new Map();

function parsePrivateKey(raw) {
  if (!raw) return "";
  let key = String(raw).trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

function slugToEnvSuffix(slug) {
  return String(slug)
    .toUpperCase()
    .replace(/-/g, "_")
    .replace(/[^A-Z0-9_]/g, "");
}

function defaultSlug() {
  return (process.env.FIREBASE_DEFAULT_SCHOOL_SLUG || "").trim().toLowerCase();
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
        console.error(
          `[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON_${suffix}:`,
          err.message,
        );
        throw new Error(
          `Service account for school "${slug}" is misconfigured. Contact support.`,
        );
      }
    }
  }

  // 2. Fall back to plain FIREBASE_SERVICE_ACCOUNT_JSON — but never across
  //    tenants once the operator has declared which school it belongs to.
  const expected = defaultSlug();
  if (slug && expected && slug !== expected) {
    throw new Error(
      `No Firebase service account configured for school "${slug}". ` +
        `Add FIREBASE_SERVICE_ACCOUNT_JSON_${slugToEnvSuffix(slug)} in Vercel. ` +
        `Refusing to fall back to the default project ("${expected}").`,
    );
  }

  const plain = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (plain) {
    if (slug && !expected) {
      console.warn(
        `[firebase-admin] Using the default service account for school "${slug}". ` +
          `Set FIREBASE_DEFAULT_SCHOOL_SLUG (and per-school env vars) before onboarding a second school.`,
      );
    }
    try {
      return JSON.parse(plain);
    } catch (err) {
      console.error(
        "[firebase-admin] Failed to parse FIREBASE_SERVICE_ACCOUNT_JSON:",
        err.message,
      );
    }
  }

  // 3. Fall back to legacy 3-var format
  if (
    process.env.FIREBASE_PROJECT_ID &&
    process.env.FIREBASE_CLIENT_EMAIL &&
    process.env.FIREBASE_PRIVATE_KEY
  ) {
    return {
      project_id: process.env.FIREBASE_PROJECT_ID,
      client_email: process.env.FIREBASE_CLIENT_EMAIL,
      private_key: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    };
  }

  throw new Error(
    `No Firebase service account configured${slug ? ` for school "${slug}"` : ""}. ` +
      `Add FIREBASE_SERVICE_ACCOUNT_JSON${slug ? "_" + slugToEnvSuffix(slug) : ""} in Vercel.`,
  );
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
      {
        credential: cert(serviceAccount),
        projectId: serviceAccount.project_id,
      },
      appName,
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
  return getFirestore(getAppForSchool(slug));
}

/**
 * Get an Auth instance for a specific school. Used to create staff accounts
 * and to verify ID tokens — verification implicitly proves the caller's token
 * was issued by THIS school's project, which is our tenant-isolation check.
 */
export function getAuthForSchool(slug) {
  return getAuth(getAppForSchool(slug));
}

/**
 * Extract the school slug from a request.
 * Tries the explicit header, then body, then query, then Referer.
 */
export function resolveSchoolSlug(req) {
  const clean = (v) => String(v).trim().toLowerCase() || null;

  // 1. Explicit header — the app's apiClient always sends this.
  const header = req.headers?.["x-school-slug"];
  if (header) return clean(header);

  // 2. Body (POST requests)
  if (req.body && typeof req.body === "object" && req.body.school) {
    return clean(req.body.school);
  }

  // 3. Query string (GET requests)
  if (req.query && req.query.school) {
    return clean(req.query.school);
  }

  // 4. Referer header — client visits e.g. /check-result?school=yourkidsni
  //    the browser sends that URL as Referer when it makes the fetch.
  const referer = req.headers?.referer || req.headers?.referrer;
  if (referer) {
    try {
      const url = new URL(referer);
      const s = url.searchParams.get("school");
      if (s) return clean(s);
    } catch {}
  }

  // 5. No slug found — API will use the fallback FIREBASE_SERVICE_ACCOUNT_JSON
  return null;
}

/**
 * Verify that the caller is a signed-in director or admin OF THIS SCHOOL.
 *
 * Returns `{ ok: true, uid, role, profile }` or
 * `{ ok: false, status, error }` — callers should return the error verbatim.
 *
 * Two independent tenant checks happen here:
 *   1. verifyIdToken only accepts tokens minted by this school's Firebase
 *      project. A token from another school fails outright.
 *   2. The users/{uid} doc is read from this school's Firestore.
 */
export async function requireAdminCaller(req, slug) {
  const raw = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  if (!match) {
    return { ok: false, status: 401, error: "You are not signed in." };
  }

  let decoded;
  try {
    decoded = await getAuthForSchool(slug).verifyIdToken(match[1]);
  } catch (err) {
    console.warn("[requireAdminCaller] token verification failed:", err.message);
    return {
      ok: false,
      status: 401,
      error: "Your session has expired. Please sign in again.",
    };
  }

  const snap = await getDbForSchool(slug).doc(`users/${decoded.uid}`).get();
  if (!snap.exists) {
    return {
      ok: false,
      status: 403,
      error: "No staff profile found for this account.",
    };
  }

  const profile = snap.data();
  const role = profile.role;
  const isAdmin = role === "director" || role === "admin";
  const isActive = (profile.status || "active") !== "pending";

  if (!isAdmin || !isActive) {
    return {
      ok: false,
      status: 403,
      error: "Only a director or admin can do this.",
    };
  }

  return { ok: true, uid: decoded.uid, role, profile };
}

/**
 * LEGACY — kept for backward compatibility with any code that still imports
 * the old function. Initializes the default admin app (single-school mode).
 */
export function ensureFirebaseAdmin() {
  getAppForSchool(null);
}
