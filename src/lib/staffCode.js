/**
 * Staff join code utilities.
 *
 * Format: STAFF-XXX-XXX-XXX (9 random characters + "STAFF-" prefix)
 * The prefix makes it obvious what the code is when shared in WhatsApp.
 *
 * Same 32-char unambiguous alphabet as parent access codes.
 * Same SHA-256 hashing — only the hash is stored, plaintext is throwaway.
 */

const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

export function generateStaffCode() {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  const chars = []
  for (let i = 0; i < 9; i++) {
    chars.push(ALPHABET[bytes[i] % ALPHABET.length])
  }
  return `STAFF-${chars.slice(0, 3).join('')}-${chars.slice(3, 6).join('')}-${chars.slice(6, 9).join('')}`
}

/**
 * Normalize a code for comparison — strip "STAFF-" prefix, hyphens, whitespace.
 * Case-insensitive.
 */
function normalizeCode(code) {
  return String(code || '')
    .toUpperCase()
    .replace(/[-\s]/g, '')
    .replace(/^STAFF/, '')
}

export async function hashStaffCode(code) {
  const normalized = normalizeCode(code)
  const buffer = new TextEncoder().encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Auto-format code as user types.
 * "staffk7mp9qn3x" → "STAFF-K7M-P9Q-N3X"
 */
export function formatStaffCode(input) {
  const clean = String(input || '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '')
    .replace(/^STAFF/, '')
    .slice(0, 9)
  if (clean.length === 0) return ''
  if (clean.length <= 3) return `STAFF-${clean}`
  if (clean.length <= 6) return `STAFF-${clean.slice(0, 3)}-${clean.slice(3)}`
  return `STAFF-${clean.slice(0, 3)}-${clean.slice(3, 6)}-${clean.slice(6, 9)}`
}
