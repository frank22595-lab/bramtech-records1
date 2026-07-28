/**
 * Cloudinary upload helper — stopgap image storage before Firebase Storage.
 *
 * Set these in .env.local:
 *   VITE_CLOUDINARY_CLOUD_NAME
 *   VITE_CLOUDINARY_UPLOAD_PRESET
 *
 * Uses unsigned uploads. All safety limits (file size, allowed formats)
 * are enforced on the Cloudinary side via the upload preset settings.
 */

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

export function isCloudinaryConfigured() {
  return !!(CLOUD_NAME && UPLOAD_PRESET)
}

export function getCloudName() {
  return CLOUD_NAME
}

/**
 * Upload a file (from an <input type="file"> or drag/drop) to Cloudinary.
 * Returns { url, publicId, width, height, format, bytes }.
 */
export async function uploadToCloudinary(file, { folder = 'bramtech-records', tags = [] } = {}) {
  if (!isCloudinaryConfigured()) {
    throw new Error('Cloudinary is not configured. Please add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET to your .env.local file.')
  }
  if (!file) throw new Error('No file provided')

  // Client-side size guard (Cloudinary preset should also enforce)
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('File too large. Maximum 5 MB.')
  }

  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', folder)
  if (tags.length) formData.append('tags', tags.join(','))

  let res
  try {
    res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`, {
      method: 'POST',
      body: formData,
    })
  } catch (err) {
    throw new Error('Network error. Check your internet connection.')
  }

  if (!res.ok) {
    let msg = `Upload failed (${res.status})`
    try {
      const err = await res.json()
      if (err?.error?.message) msg = err.error.message
    } catch {}
    throw new Error(msg)
  }

  const data = await res.json()
  return {
    url: data.secure_url,
    publicId: data.public_id,
    width: data.width,
    height: data.height,
    format: data.format,
    bytes: data.bytes,
  }
}

/**
 * Build a Cloudinary URL with transformations applied.
 * Accepts either a full Cloudinary URL or a bare public_id.
 *
 * Examples of transformations:
 *   'w_200,h_200,c_fill,g_face' — 200x200 square, face-detected crop
 *   'w_400,c_fit,f_auto,q_auto' — max 400 wide, auto format & quality
 */
export function cloudinaryUrl(publicIdOrUrl, transformations = 'f_auto,q_auto') {
  if (!publicIdOrUrl) return null
  if (String(publicIdOrUrl).startsWith('http')) {
    return String(publicIdOrUrl).replace('/upload/', `/upload/${transformations}/`)
  }
  if (!CLOUD_NAME) return null
  return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/${transformations}/${publicIdOrUrl}`
}

// Preset transformation strings for common use cases
export const cloudinaryPresets = {
  studentPhotoThumb:  'w_120,h_120,c_fill,g_face,f_auto,q_auto',
  studentPhotoAvatar: 'w_200,h_200,c_fill,g_face,f_auto,q_auto',
  studentPhotoLarge:  'w_400,h_400,c_fill,g_face,f_auto,q_auto',
  schoolLogo:         'w_300,h_300,c_fit,f_auto,q_auto',
  signature:          'w_300,h_100,c_fit,f_auto,q_auto',
  stamp:              'w_200,h_200,c_fit,f_auto,q_auto',
}
