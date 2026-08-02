/**
 * School Registry
 * ---------------
 * Given a hostname like "deltacollege.records.bramtechsuite.com",
 * this returns the Firebase config for THAT school's isolated project.
 *
 * How it works:
 *  1. If URL has ?school=X, use X (and remember it in localStorage)
 *  2. Otherwise, parse the subdomain from window.location.hostname
 *  3. If neither exists, fall back to localStorage from a previous visit
 *     (this is what makes refresh work when the URL doesn't have ?school=)
 *  4. If nothing, return null — treat as public/marketing site
 *
 * The registry itself is a JSON file at /schools.json (served from public/).
 */

const MAIN_DOMAINS = new Set([
  "bramtechrecords.com",
  "www.bramtechrecords.com",
  "records.bramtechsuite.com",
  "www.records.bramtechsuite.com",
  "localhost",
  "127.0.0.1",
]);

const REGISTRY_URL = "/schools.json";
const SLUG_STORAGE_KEY = "bramtech-records-active-slug";

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

// Remember which school this browser is currently viewing.
// Read on refresh so we don't lose our place when the ?school= param
// isn't in the URL any more (e.g. after navigating to /dashboard).
function saveStoredSlug(slug) {
  try {
    if (slug) localStorage.setItem(SLUG_STORAGE_KEY, slug);
  } catch {}
}

function loadStoredSlug() {
  try {
    return localStorage.getItem(SLUG_STORAGE_KEY) || null;
  } catch {
    return null;
  }
}

/**
 * Clear the stored slug. Call this on logout, or from a "switch school"
 * flow if you ever add one.
 */
export function clearStoredSlug() {
  try {
    localStorage.removeItem(SLUG_STORAGE_KEY);
  } catch {}
}

/**
 * Figure out which school this browser session should load.
 * Priority: URL param → hostname subdomain → localStorage → null.
 */
export function getSchoolSlug(hostname = window.location.hostname) {
  // 1. URL param wins (e.g. ?school=yourkidsni). Save it for next refresh.
  const params = new URLSearchParams(window.location.search);
  const override = params.get("school");
  if (override) {
    saveStoredSlug(override);
    return override;
  }

  // 2. Subdomain — the "proper" long-term way
  if (hostname.endsWith(".records.bramtechsuite.com")) {
    const slug = hostname.split(".")[0];
    saveStoredSlug(slug);
    return slug;
  }
  if (hostname.endsWith(".bramtechrecords.com")) {
    const slug = hostname.split(".")[0];
    saveStoredSlug(slug);
    return slug;
  }

  // 3. localStorage fallback — this is what fixes the refresh bug.
  //    When the URL is /dashboard (no ?school=) after login, we still know
  //    which school we were on from the initial page load.
  const stored = loadStoredSlug();
  if (stored) return stored;

  // 4. Nothing — treat as public/marketing landing
  return null;
}

/**
 * Resolve a school slug to its Firebase config.
 * Returns null if the school isn't registered.
 */
export async function getSchoolConfig(slug) {
  if (!slug) return null;
  const registry = await loadRegistry();
  return registry[slug] || null;
}

export function isMainDomain() {
  return getSchoolSlug() === null;
}
