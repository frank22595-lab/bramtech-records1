/**
 * Compress an image file to a target size and dimensions before uploading.
 * Uses the browser's canvas API. All work happens on the client - no server
 * cost, no Firebase Storage bandwidth wasted on huge original files.
 *
 * Defaults are tuned for student passport photos:
 *  - max 400x400 pixels
 *  - JPEG at 0.85 quality
 *  - typical output ~50-100 KB from a 3-5 MB phone photo
 */

export async function compressImage(file, {
  maxWidth = 400,
  maxHeight = 400,
  quality = 0.85,
  mimeType = 'image/jpeg',
} = {}) {
  if (!file) throw new Error('No file provided')
  if (!file.type.startsWith('image/')) throw new Error('Not an image file')

  // Load into an image element
  const dataUrl = await fileToDataURL(file)
  const img = await loadImage(dataUrl)

  // Compute target dimensions preserving aspect ratio
  let { width, height } = img
  const ratio = Math.min(maxWidth / width, maxHeight / height, 1)
  width = Math.round(width * ratio)
  height = Math.round(height * ratio)

  // Draw to canvas
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(img, 0, 0, width, height)

  // Export as Blob
  const blob = await new Promise((resolve, reject) => {
    canvas.toBlob(
      b => b ? resolve(b) : reject(new Error('Canvas toBlob failed')),
      mimeType,
      quality
    )
  })

  return blob
}

function fileToDataURL(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve(img)
    img.onerror = () => reject(new Error('Image load failed'))
    img.src = src
  })
}

export function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}
