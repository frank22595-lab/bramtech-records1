/**
 * Shared Firebase Admin initializer for API routes.
 *
 * Reads FIREBASE_SERVICE_ACCOUNT_JSON — a single env var containing the
 * ENTIRE service account JSON (as one string). This avoids all the newline
 * escaping problems that plague FIREBASE_PRIVATE_KEY.
 *
 * Falls back to the old 3-var format (FIREBASE_PROJECT_ID +
 * FIREBASE_CLIENT_EMAIL + FIREBASE_PRIVATE_KEY) if the JSON var isn't set,
 * for backward compat.
 */

import { initializeApp, cert, getApps } from "firebase-admin/app";

function parsePrivateKey(raw) {
  if (!raw) return "";
  let key = String(raw).trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  key = key.replace(/\\n/g, "\n");
  return key;
}

export function ensureFirebaseAdmin() {
  if (getApps().length > 0) return;

  // Preferred: single JSON env var
  const jsonRaw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (jsonRaw) {
    try {
      const serviceAccount = JSON.parse(jsonRaw);
      initializeApp({ credential: cert(serviceAccount) });
      return;
    } catch (err) {
      console.error(
        "[firebase-admin] FIREBASE_SERVICE_ACCOUNT_JSON parse failed:",
        err.message,
      );
      // Fall through to legacy vars
    }
  }

  // Fallback: legacy 3-var format
  initializeApp({
    credential: cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: parsePrivateKey(process.env.FIREBASE_PRIVATE_KEY),
    }),
  });
}
