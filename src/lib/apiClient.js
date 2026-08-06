/**
 * apiClient — the single way the app talks to /api/*.
 *
 * Two things every call needs and kept getting wrong by hand:
 *
 *  1. The tenant. `getSchoolSlug()` is the one source of truth for which
 *     school this browser is on (?school= → subdomain → localStorage). We send
 *     it as the `x-school-slug` header so the API resolves the SAME Firebase
 *     project the client is talking to. Relying on the Referer only worked for
 *     ?school= URLs and silently fell back to the default service account on
 *     subdomains — i.e. potentially another school's data.
 *
 *  2. The caller's identity. Admin-only routes need a Firebase ID token, and
 *     it must come from the school-specific Firebase app (getFirebase()), not
 *     a default app.
 */

import { getSchoolSlug } from "../config/schoolRegistry";
import { getFirebase, isFirebaseReady } from "../config/firebase";

async function currentIdToken() {
  if (!isFirebaseReady()) return null;
  try {
    const { auth } = getFirebase();
    const user = auth.currentUser;
    if (!user) return null;
    return await user.getIdToken();
  } catch (err) {
    console.warn("[apiClient] could not get ID token:", err.message);
    return null;
  }
}

/**
 * Call an API route with tenant + auth headers attached.
 *
 * @param {string} path       e.g. "/api/staff-signup"
 * @param {object} options
 * @param {string} options.method   default "GET"
 * @param {object} options.body     JSON-serialized if present
 * @param {boolean} options.auth    attach the caller's ID token (default false)
 * @returns {Promise<any>}   parsed JSON body
 * @throws {Error}           with `.status` set, message from the API's `error`
 */
export async function apiFetch(path, { method = "GET", body, auth = false } = {}) {
  const slug = getSchoolSlug();

  const headers = {};
  if (slug) headers["x-school-slug"] = slug;
  if (body !== undefined) headers["Content-Type"] = "application/json";

  if (auth) {
    const token = await currentIdToken();
    if (!token) {
      const err = new Error("You are not signed in. Please log in again.");
      err.status = 401;
      throw err;
    }
    headers.Authorization = `Bearer ${token}`;
  }

  // Keep the slug on the URL too — belt and braces for GETs whose headers a
  // proxy might strip, and it makes the request self-describing in logs.
  const url =
    slug && !path.includes("school=")
      ? `${path}${path.includes("?") ? "&" : "?"}school=${encodeURIComponent(slug)}`
      : path;

  let res;
  try {
    res = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify({ ...body, school: slug }),
    });
  } catch {
    const err = new Error(
      "Could not reach the server. Check your internet connection and try again.",
    );
    err.status = 0;
    throw err;
  }

  let data = null;
  try {
    data = await res.json();
  } catch {
    /* non-JSON response — handled below */
  }

  if (!res.ok) {
    const err = new Error(
      data?.error || "Something went wrong. Please try again.",
    );
    err.status = res.status;
    throw err;
  }

  return data;
}
