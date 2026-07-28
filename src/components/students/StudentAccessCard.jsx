import { useState } from 'react'
import { Copy, MessageCircle, RefreshCw, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { generateAccessCode, hashAccessCode } from '../../lib/accessCode'
import { getFirebase } from '../../config/firebase'

/**
 * Admin-only card on the student profile.
 * Shows admission number + access code, plus buttons to:
 *   - Copy each to clipboard
 *   - Show/hide the access code (privacy in shared screens)
 *   - Regenerate the access code (old one stops working immediately)
 *   - Send both via WhatsApp to the parent's phone
 *
 * Drop it into the student profile like:
 *   <StudentAccessCard student={student} school={school} onUpdate={reload} />
 */
export default function StudentAccessCard({ student, school, onUpdate }) {
  const { db } = getFirebase()
  const [showCode, setShowCode] = useState(false)
  const [regenerating, setRegenerating] = useState(false)
  const [currentCode, setCurrentCode] = useState(student.accessCode || '')
  const [copiedField, setCopiedField] = useState(null)

  // Common field name variations — grab the first one that has a value
  const parentPhone = student.parentPhone
    || student.guardianPhone
    || student.guardian?.phone
    || student.parent?.phone
    || ''
  const parentName = student.parentName
    || student.guardianName
    || student.guardian?.name
    || student.parent?.name
    || 'Parent'

  const portalUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/check-result`
    : '/check-result'

  const copy = (text, field) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedField(field)
      setTimeout(() => setCopiedField(null), 1500)
    })
  }

  const formatPhoneForWhatsApp = (raw) => {
    let phone = String(raw || '').replace(/\D/g, '')
    if (phone.startsWith('0')) phone = '234' + phone.slice(1)
    else if (!phone.startsWith('234')) phone = '234' + phone
    return phone
  }

  const sendWhatsApp = () => {
    if (!parentPhone) {
      alert("No parent phone number saved for this student. Add one on the student's profile first.")
      return
    }
    if (!currentCode) {
      alert('Generate an access code first.')
      return
    }

    const phone = formatPhoneForWhatsApp(parentPhone)
    const message = `Good day ${parentName}.

${student.fullName}'s access code for ${school?.name || 'the school'} results portal is:

Admission Number: ${student.admissionNumber}
Access Code: ${currentCode}

Check results here: ${portalUrl}

Save this message — you will use this code every term to check ${student.fullName}'s results. Do not share it with anyone.`

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  const regenerate = async () => {
    const isFirstTime = !currentCode
    const confirmMsg = isFirstTime
      ? null
      : 'Regenerate the access code? The current code will stop working immediately, and you will need to send the new code to the parent.'
    if (confirmMsg && !confirm(confirmMsg)) return

    setRegenerating(true)
    try {
      const newCode = generateAccessCode()
      const hash = await hashAccessCode(newCode)
      await updateDoc(doc(db, 'students', student.id), {
        accessCode: newCode,
        accessCodeHash: hash,
        accessCodeGeneratedAt: serverTimestamp(),
      })
      setCurrentCode(newCode)
      setShowCode(true)
      if (onUpdate) {
        onUpdate({ ...student, accessCode: newCode, accessCodeHash: hash })
      }
    } catch (err) {
      alert('Could not regenerate code: ' + (err.message || 'unknown error'))
    } finally {
      setRegenerating(false)
    }
  }

  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-medium text-sm text-slate-900">Parent portal access</h3>
        {!currentCode && (
          <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-medium">
            No code yet
          </span>
        )}
      </div>

      <div className="space-y-2 text-sm">
        {/* Admission number row */}
        <div className="flex items-center gap-2 p-2 bg-slate-50 rounded">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Admission number</div>
            <div className="font-mono font-medium truncate text-slate-900">
              {student.admissionNumber || <span className="text-slate-400">Not set</span>}
            </div>
          </div>
          {student.admissionNumber && (
            <button
              onClick={() => copy(student.admissionNumber, 'adm')}
              className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
              title="Copy admission number"
            >
              {copiedField === 'adm'
                ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                : <Copy className="w-3.5 h-3.5" />
              }
            </button>
          )}
        </div>

        {/* Access code row */}
        <div className="flex items-center gap-1 p-2 bg-slate-50 rounded">
          <div className="min-w-0 flex-1">
            <div className="text-[10px] text-slate-500 uppercase tracking-wide">Access code</div>
            <div className="font-mono font-medium truncate text-slate-900">
              {currentCode
                ? (showCode ? currentCode : '•••-•••-•••')
                : <span className="text-slate-400">Not generated</span>
              }
            </div>
          </div>
          {currentCode && (
            <>
              <button
                onClick={() => setShowCode(!showCode)}
                className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
                title={showCode ? 'Hide code' : 'Show code'}
              >
                {showCode ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              </button>
              <button
                onClick={() => copy(currentCode, 'code')}
                className="p-1.5 hover:bg-slate-200 rounded text-slate-600"
                title="Copy access code"
              >
                {copiedField === 'code'
                  ? <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                  : <Copy className="w-3.5 h-3.5" />
                }
              </button>
            </>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2 mt-4">
        <button
          onClick={sendWhatsApp}
          disabled={!currentCode || !parentPhone}
          className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-medium py-2 px-2 rounded flex items-center justify-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          title={
            !parentPhone ? "No parent phone saved" :
            !currentCode ? "Generate a code first" :
            "Send admission number + code via WhatsApp"
          }
        >
          <MessageCircle className="w-3.5 h-3.5" />
          Send WhatsApp
        </button>
        <button
          onClick={regenerate}
          disabled={regenerating}
          className="flex-1 bg-slate-700 hover:bg-slate-800 text-white text-xs font-medium py-2 px-2 rounded flex items-center justify-center gap-1.5 disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${regenerating ? 'animate-spin' : ''}`} />
          {currentCode ? 'Regenerate' : 'Generate code'}
        </button>
      </div>

      {/* Helper messages */}
      {currentCode && !parentPhone && (
        <p className="text-[11px] text-amber-700 mt-2">
          ⚠ Add a parent phone number on this student to enable WhatsApp sending.
        </p>
      )}
      {currentCode && parentPhone && (
        <p className="text-[11px] text-slate-500 mt-2">
          The parent uses this code at <span className="font-mono">{portalUrl.replace(/^https?:\/\//, '')}</span>.
        </p>
      )}
    </div>
  )
}
