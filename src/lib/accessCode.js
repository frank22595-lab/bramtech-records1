/**
 * Access code utilities for the parent result-checker portal.
 *
 * Codes are 9 characters formatted as XXX-XXX-XXX using an unambiguous
 * 32-character alphabet (no 0/O, no 1/l/I confusion). That gives
 * 32^9 = ~35 trillion possible codes — practically impossible to guess,
 * even without rate limiting.
 *
 * The database stores only the SHA-256 hash of the code. Even if the
 * database leaked, the codes themselves would not be exposed.
 */

// Unambiguous alphabet — 32 chars, no confusing pairs (removed 0, 1, I, L, O)
const ALPHABET = '23456789ABCDEFGHJKMNPQRSTUVWXYZ'

/**
 * Generate a cryptographically random 9-character access code.
 * Format: XXX-XXX-XXX (e.g. "K7M-P9Q-N3X")
 */
export function generateAccessCode() {
  const bytes = new Uint8Array(9)
  crypto.getRandomValues(bytes)
  const chars = []
  for (let i = 0; i < 9; i++) {
    chars.push(ALPHABET[bytes[i] % ALPHABET.length])
  }
  return `${chars.slice(0, 3).join('')}-${chars.slice(3, 6).join('')}-${chars.slice(6, 9).join('')}`
}

/**
 * Hash an access code with SHA-256.
 * Normalizes to uppercase and strips hyphens before hashing so we compare
 * "k7m-p9q-n3x" and "K7MP9QN3X" the same way.
 *
 * Access codes are already high-entropy random strings, so a fast hash
 * (SHA-256) is enough — bcrypt-style slow hashing isn't needed.
 */
export async function hashAccessCode(code) {
  const normalized = String(code || '').replace(/-/g, '').toUpperCase()
  const buffer = new TextEncoder().encode(normalized)
  const hashBuffer = await crypto.subtle.digest('SHA-256', buffer)
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

/**
 * Auto-format an access code as the user types.
 * "k7mp9qn3x" → "K7M-P9Q-N3X"
 * "K7M-P" → "K7M-P"
 */
export function formatAccessCode(input) {
  const cleaned = String(input || '').replace(/[^0-9A-Z]/gi, '').toUpperCase()
  if (cleaned.length <= 3) return cleaned
  if (cleaned.length <= 6) return `${cleaned.slice(0, 3)}-${cleaned.slice(3)}`
  return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6, 9)}`
}
