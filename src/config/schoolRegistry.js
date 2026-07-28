/**
 * School Registry
 * ---------------
 * Given a hostname like "deltacollege.records.bramtechsuite.com",
 * this returns the Firebase config for THAT school's isolated project.
 *
 * How it works:
 *  1. We parse the subdomain from window.location.hostname
 *  2. We fetch a public JSON registry that maps subdomain -> firebase config
 *  3. If we're on the main domain (no subdomain), we return null - that means
 *     "you're on the public/marketing site, don't init Firebase for a specific school yet"
 *
 * The registry is a single JSON file hosted on Vercel at /schools.json.
 * To add a new school: create their Firebase project, then add an entry here.
 * No code changes, no redeploy needed if the JSON is hosted separately.
 */

const MAIN_DOMAINS = new Set([
  "bramtechrecords.com",
  "www.bramtechrecords.com",
  "records.bramtechsuite.com",
  "www.records.bramtechsuite.com",
  "localhost",
  "127.0.0.1",
]);

const REGISTRY_URL = "/schools.json"; // served from /public/schools.json

let cachedRegistry = null;

async function loadRegistry() {
  if (cachedRegistry) return cachedRegistry;
  try {
    const res = await fetch(REGISTRY_URL, { cache: "no-cache" });
    if (!res.ok) throw new Error(`registry fetch failed: ${res.status}`);
    cachedRegistry = await res.json();
    return cachedRegistry;
  } catch (err) {
    console.error("[schoolRegistry] Failed to load registry:", err);
    return {};
  }
}

/**
 * Extract subdomain slug from a hostname.
 * "deltacollege.records.bramtechsuite.com" -> "deltacollege"
 * "records.bramtechsuite.com" -> null (main domain)
 * "localhost" -> null (main domain during local dev, UNLESS ?school= override is set)
 */
export function getSchoolSlug(hostname = window.location.hostname) {
  // Check for local dev override FIRST, before anything else.
  // e.g. http://localhost:5173?school=demo forces us to act as the "demo" school.
  const params = new URLSearchParams(window.location.search);
  const override = params.get("school");
  if (override) return override;

  if (MAIN_DOMAINS.has(hostname)) return null;

  // Parse subdomain from records.bramtechsuite.com or bramtechrecords.com
  if (hostname.endsWith(".records.bramtechsuite.com")) {
    return hostname.split(".")[0];
  }
  if (hostname.endsWith(".bramtechrecords.com")) {
    return hostname.split(".")[0];
  }

  // Unknown host - treat as main
  return null;
}

/**
 * Resolve a school slug to its Firebase config.
 * Returns null if the school isn't registered (caller should show a friendly error).
 */
export async function getSchoolConfig(slug) {
  if (!slug) return null;
  const registry = await loadRegistry();
  return registry[slug] || null;
}

export function isMainDomain() {
  return getSchoolSlug() === null;
}
