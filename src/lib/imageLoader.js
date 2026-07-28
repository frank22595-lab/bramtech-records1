/**
 * Image loading helpers for report card PDF generation.
 *
 * urlToBase64      - fetch an image URL and return a base64 data URI
 * detectImageFormat - detect PNG vs JPEG vs WEBP from a base64 data URI,
 *                     for jsPDF's addImage() format argument
 */

/**
 * Fetch an image from a URL and convert to a base64 data URI.
 * Works with Cloudinary URLs and any CORS-allowing image host.
 */
export async function urlToBase64(url) {
  if (!url) return null;

  const res = await fetch(url, { mode: "cors" });
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);

  const blob = await res.blob();

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("FileReader failed"));
    reader.readAsDataURL(blob);
  });
}

/**
 * Detect image format from a base64 data URI (or raw base64).
 * Returns 'PNG', 'JPEG', or 'WEBP' — the format strings jsPDF expects.
 */
export function detectImageFormat(dataUri) {
  if (!dataUri) return "PNG";
  const s = String(dataUri);

  // Check MIME type in data URI
  if (s.startsWith("data:image/png")) return "PNG";
  if (s.startsWith("data:image/jpeg") || s.startsWith("data:image/jpg"))
    return "JPEG";
  if (s.startsWith("data:image/webp")) return "WEBP";

  // Fallback: check magic bytes in base64
  const base64 = s.includes(",") ? s.split(",")[1] : s;
  if (base64.startsWith("iVBOR")) return "PNG";
  if (base64.startsWith("/9j/")) return "JPEG";
  if (base64.startsWith("UklGR")) return "WEBP";

  return "PNG"; // safe default
}
