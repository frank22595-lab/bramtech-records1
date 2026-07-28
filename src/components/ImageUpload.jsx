import { useState, useRef } from 'react'
import { Upload, X, Loader2, AlertCircle } from 'lucide-react'
import { uploadToCloudinary, isCloudinaryConfigured } from '../lib/cloudinary'

/**
 * Reusable image upload widget backed by Cloudinary.
 *
 * Props:
 *   label         — text above the widget
 *   value         — current image URL (or null)
 *   onChange      — (url | null) => void
 *   folder        — Cloudinary folder path (default 'bramtech-records')
 *   accept        — file input accept string (default 'image/*')
 *   maxSizeMB     — client-side size guard (default 5)
 *   aspect        — 'square' | 'landscape' | 'portrait' | 'wide-signature'
 *   hint          — help text below
 *   circle        — if true, round preview (avatars)
 */
export default function ImageUpload({
  label,
  value,
  onChange,
  folder = 'bramtech-records',
  accept = 'image/*',
  maxSizeMB = 5,
  aspect = 'square',
  hint,
  circle = false,
}) {
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const inputRef = useRef(null)
  const configured = isCloudinaryConfigured()

  const aspectClass = {
    square: 'aspect-square',
    landscape: 'aspect-video',
    portrait: 'aspect-[3/4]',
    'wide-signature': 'aspect-[3/1]',
  }[aspect] || 'aspect-square'

  const handleFile = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    setError('')
    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`File too large. Max ${maxSizeMB} MB.`)
      if (inputRef.current) inputRef.current.value = ''
      return
    }
    setUploading(true)
    try {
      const result = await uploadToCloudinary(file, { folder })
      onChange(result.url)
    } catch (err) {
      setError(err.message || 'Upload failed')
    } finally {
      setUploading(false)
      if (inputRef.current) inputRef.current.value = ''
    }
  }

  const remove = () => {
    onChange(null)
    setError('')
  }

  const roundedClass = circle ? 'rounded-full' : 'rounded-lg'

  return (
    <div>
      {label && <label className="block text-xs text-ink-soft mb-1">{label}</label>}

      {!configured ? (
        <div className="border-2 border-dashed border-amber-300 bg-amber-50 rounded-lg p-3 text-center">
          <AlertCircle className="w-5 h-5 text-amber-600 mx-auto mb-1" />
          <p className="text-xs text-amber-800">
            Image uploads not set up yet. See <code className="bg-amber-100 px-1 rounded">CLOUDINARY_SETUP.md</code>.
          </p>
        </div>
      ) : value ? (
        <div className={`relative ${aspectClass} ${roundedClass} border border-slate-200 overflow-hidden bg-slate-50 group max-w-[240px]`}>
          <img src={value} alt={label || 'Uploaded image'} className="w-full h-full object-contain" />
          <button
            onClick={remove}
            type="button"
            className="absolute top-1.5 right-1.5 bg-white/95 hover:bg-white rounded-full p-1.5 shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
            aria-label="Remove image"
          >
            <X className="w-3.5 h-3.5 text-red-600" />
          </button>
          <button
            onClick={() => inputRef.current?.click()}
            type="button"
            disabled={uploading}
            className="absolute bottom-1.5 right-1.5 bg-white/95 hover:bg-white rounded-md px-2 py-1 shadow-md text-xs opacity-0 group-hover:opacity-100 transition-opacity"
          >
            Replace
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className={`w-full ${aspectClass} ${roundedClass} border-2 border-dashed border-slate-300 hover:border-brand-400 flex flex-col items-center justify-center gap-1.5 text-slate-500 hover:text-brand-600 hover:bg-brand-50/30 transition-colors disabled:opacity-50 max-w-[240px]`}
        >
          {uploading ? (
            <>
              <Loader2 className="w-6 h-6 animate-spin" />
              <span className="text-xs">Uploading…</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6" />
              <span className="text-xs">Click to upload</span>
            </>
          )}
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleFile}
        className="hidden"
      />
      {hint && !error && <p className="text-xs text-ink-soft mt-1.5">{hint}</p>}
      {error && <p className="text-xs text-red-600 mt-1.5">{error}</p>}
    </div>
  )
}
