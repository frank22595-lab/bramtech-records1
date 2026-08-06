/**
 * Shared Firebase Admin initializer — MULTI-TENANT.
 *
 * The `firebase-admin/auth` module is loaded lazily via dynamic import.
 * Importing it at the top level crashes on Vercel (ERR_REQUIRE_ESM).
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
// NO top-level import of "firebase-admin/auth" — loaded lazily below.

const appCache = new Map();
let _getAuthFn = null;

async function loadGetAuth() {
  if (_getAuthFn) return _getAuthFn;
  const mod = await import("firebase-admin/auth");
  _getAuthFn = mod.getAuth;
  return _getAuthFn;
}

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

function loadServiceAccount(slug) {
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
          `Set FIREBASE_DEFAULT_SCHOOL_SLUG before onboarding a second school.`,
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

function getAppForSchool(slug) {
  const cacheKey = slug || "_default_";

  if (appCache.has(cacheKey)) {
    return appCache.get(cacheKey);
  }

  const serviceAccount = loadServiceAccount(slug);
  const appName = cacheKey;

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

export function getDbForSchool(slug) {
  return getFirestore(getAppForSchool(slug));
}

export async function getAuthForSchool(slug) {
  const getAuth = await loadGetAuth();
  return getAuth(getAppForSchool(slug));
}

export function resolveSchoolSlug(req) {
  const clean = (v) => String(v).trim().toLowerCase() || null;

  const header = req.headers?.["x-school-slug"];
  if (header) return clean(header);

  if (req.body && typeof req.body === "object" && req.body.school) {
    return clean(req.body.school);
  }

  if (req.query && req.query.school) {
    return clean(req.query.school);
  }

  const referer = req.headers?.referer || req.headers?.referrer;
  if (referer) {
    try {
      const url = new URL(referer);
      const s = url.searchParams.get("school");
      if (s) return clean(s);
    } catch {}
  }

  return null;
}

export async function requireAdminCaller(req, slug) {
  const raw = req.headers?.authorization || req.headers?.Authorization || "";
  const match = /^Bearer\s+(.+)$/i.exec(String(raw).trim());
  if (!match) {
    return { ok: false, status: 401, error: "You are not signed in." };
  }

  let decoded;
  try {
    const auth = await getAuthForSchool(slug);
    decoded = await auth.verifyIdToken(match[1]);
  } catch (err) {
    console.warn(
      "[requireAdminCaller] token verification failed:",
      err.message,
    );
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

export function ensureFirebaseAdmin() {
  getAppForSchool(null);
}
