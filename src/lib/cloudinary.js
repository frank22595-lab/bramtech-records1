/**
 * Cloudinary upload helper — stopgap image storage before Firebase Storage.
 *
 * Set these in .env.local:
 *   VITE_CLOUDINARY_CLOUD_NAME
 *   VITE_CLOUDINARY_UPLOAD_PRESET
 *
 * Uses unsigned uploads. All safety limits (file size, allowed formats)
 * are enforced on the Cloudinary side via the upload preset settings.
 *
 * MULTI-TENANT: All uploads are automatically namespaced by school slug.
 * Example: uploading a student photo for Yourkids&i lands in the folder
 * `bramtech-records/yourkidsni/students`. This keeps every school's
 * images isolated even though we share one Cloudinary account.
 */

import { getSchoolSlug } from "../config/schoolRegistry";

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

const ROOT_FOLDER = "bramtech-records";

export function isCloudinaryConfigured() {
  return !!(CLOUD_NAME && UPLOAD_PRESET);
}

export function getCloudName() {
  return CLOUD_NAME;
}

/**
 * Build the final Cloudinary folder path for the current school.
 * Callers pass a subfolder like 'students' or 'logo' — we prepend
 * the root folder and the school slug automatically.
 *
 *   buildFolder('students')            → 'bramtech-records/yourkidsni/students'
 *   buildFolder('logo')                → 'bramtech-records/yourkidsni/logo'
 *   buildFolder()                      → 'bramtech-records/yourkidsni'
 *   buildFolder('students', 'delta')   → 'bramtech-records/delta/students'
 *
 * If no school slug is available (e.g. main marketing site), falls
 * back to a shared "_unknown" folder — safer than mixing with a school's.
 */
export function buildFolder(subfolder = "", slugOverride = null) {
  const slug = slugOverride || getSchoolSlug() || "_unknown";
  const parts = [ROOT_FOLDER, slug];
  if (subfolder) parts.push(subfolder);
  return parts.join("/");
}

/**
 * Upload a file (from an <input type="file"> or drag/drop) to Cloudinary.
 * Returns { url, publicId, width, height, format, bytes }.
 *
 * The `folder` option is now RELATIVE — pass e.g. 'students', not the full
 * path. The school slug is auto-injected. If the caller passes the OLD-style
 * absolute folder (e.g. 'bramtech-records'), we still accept it for
 * backwards compatibility.
 */
export async function uploadToCloudinary(
  file,
  { folder = "", tags = [] } = {},
) {
  if (!isCloudinaryConfigured()) {
    throw new Error(
      "Cloudinary is not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env.local file.",
    );
  }
  if (!file) throw new Error("No file provided");

  // Client-side size guard (Cloudinary preset should also enforce)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error("File too large. Maximum 5 MB.");
  }

  // Detect old-style absolute paths (backwards compatibility) so existing
  // callers that pass 'bramtech-records' don't double up the root.
  let resolvedFolder;
  if (folder.startsWith(ROOT_FOLDER)) {
    // Old caller — use as-is
    resolvedFolder = folder;
  } else {
    // New style — treat as a subfolder and inject the slug
    resolvedFolder = buildFolder(folder);
  }

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", resolvedFolder);
  if (tags.length) formData.append("tags", tags.join(","));

  let res;
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: "POST",
      body: formData,
    });
  } catch (err) {
    throw new Error("Network error. Check your internet connection.");
  }

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`;
    try {
      const err = await res.json();
      if (err?.error?.message) msg = err.error.message;
    } catch {}
    throw new Error(msg);
  }

  const data = await res.json();
  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
  };
}

/**
 * Build a Cloudinary URL with transformations applied.
 * Accepts either a full Cloudinary URL or a bare public_id.
 *
 * Examples of transformations:
 *   'w_200,h_200,c_fill,g_face' — 200x200 square, face-detected crop
 *   'w_400,c_fit,f_auto,q_auto' — max 400 wide, auto format & quality
 */
export function cloudinaryUrl(
  publicIdOrUrl,
  transformations = "f_auto,q_auto",
) {
  if (!publicIdOrUrl) return null;
  if (String(publicIdOrUrl).startsWith("http")) {
    return String(publicIdOrUrl).replace(
      "/upload/",
      `/upload/${transformations}/`,
    );
  }
  if (!CLOUD_NAME) return null;
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${publicIdOrUrl}`;
}

// Preset transformation strings for common use cases
export const cloudinaryPresets = {
  studentPhotoThumb: "w_120,h_120,c_fill,g_face,f_auto,q_auto",
  studentPhotoAvatar: "w_200,h_200,c_fill,g_face,f_auto,q_auto",
  studentPhotoLarge: "w_400,h_400,c_fill,g_face,f_auto,q_auto",
  schoolLogo: "w_300,h_300,c_fit,f_auto,q_auto",
  signature: "w_300,h_100,c_fit,f_auto,q_auto",
  stamp: "w_200,h_200,c_fit,f_auto,q_auto",
};
