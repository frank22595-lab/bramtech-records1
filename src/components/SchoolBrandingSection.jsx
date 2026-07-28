import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { useState, useEffect } from 'react'
import { Save } from 'lucide-react'
import { Button, Card } from './ui'
import ImageUpload from './ImageUpload'
import { getFirebase } from '../config/firebase'
import { isCloudinaryConfigured } from '../lib/cloudinary'

/**
 * Drop this into the School tab of your Settings page.
 * Handles school logo, principal signature, and school stamp uploads.
 *
 * Usage:
 *   import SchoolBrandingSection from '../../components/SchoolBrandingSection'
 *   ...
 *   <SchoolBrandingSection school={school} />
 */
export default function SchoolBrandingSection({ school }) {
  const { db } = getFirebase()
  const configured = isCloudinaryConfigured()

  const [logoUrl, setLogoUrl] = useState(school?.logoUrl || null)
  const [signatureUrl, setSignatureUrl] = useState(school?.principalSignatureUrl || null)
  const [stampUrl, setStampUrl] = useState(school?.stampUrl || null)
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    setLogoUrl(school?.logoUrl || null)
    setSignatureUrl(school?.principalSignatureUrl || null)
    setStampUrl(school?.stampUrl || null)
  }, [school?.logoUrl, school?.principalSignatureUrl, school?.stampUrl])

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await updateDoc(doc(db, 'school', 'root'), {
        logoUrl: logoUrl || null,
        principalSignatureUrl: signatureUrl || null,
        stampUrl: stampUrl || null,
        updatedAt: serverTimestamp(),
      })
      setMsg('✓ Saved')
      setTimeout(() => setMsg(''), 2500)
    } catch (err) {
      setMsg('Save failed: ' + err.message)
    } finally { setSaving(false) }
  }

  return (
    <Card className="p-6">
      <h3 className="font-medium">School branding</h3>
      <p className="text-sm text-ink-soft mb-4">
        Logo, principal's signature, and school stamp appear on printed report cards.
        {!configured && ' Set up Cloudinary first (see CLOUDINARY_SETUP.md).'}
      </p>

      <div className="grid md:grid-cols-3 gap-6">
        <ImageUpload
          label="School logo"
          value={logoUrl}
          onChange={setLogoUrl}
          folder="bramtech-records/school"
          aspect="square"
          hint="Square or round image. Transparent PNG works best."
        />

        <ImageUpload
          label="Principal's signature"
          value={signatureUrl}
          onChange={setSignatureUrl}
          folder="bramtech-records/school"
          aspect="wide-signature"
          hint="Sign on white paper, take a clear photo, upload. Transparent PNG works best."
        />

        <ImageUpload
          label="School stamp / seal"
          value={stampUrl}
          onChange={setStampUrl}
          folder="bramtech-records/school"
          aspect="square"
          hint="Round or square. Transparent PNG works best."
        />
      </div>

      <div className="flex items-center gap-3 mt-4 pt-4 border-t border-slate-200">
        <Button onClick={save} disabled={saving || !configured}>
          <Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save branding'}
        </Button>
        {msg && <span className={`text-sm ${msg.includes('failed') ? 'text-red-600' : 'text-emerald-700'}`}>{msg}</span>}
      </div>
    </Card>
  )
}
