import { useState, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp, onSnapshot } from 'firebase/firestore'
import { Copy, RefreshCw, MessageCircle, KeyRound, Eye, EyeOff, CheckCircle } from 'lucide-react'
import { getFirebase } from '../../config/firebase'
import { generateStaffCode, hashStaffCode } from '../../lib/staffCode'

/**
 * Staff join code section — director sees the current code, can generate
 * a new one, copy it, or send it to teachers via WhatsApp.
 *
 * The staff code lives at school/root.staffJoinCode (plaintext for admin
 * display) and school/root.staffJoinCodeHash (used to validate signups).
 */
export default function StaffCodeSection({ school }) {
  const { db } = getFirebase()
  const [busy, setBusy] = useState(false)
  const [showCode, setShowCode] = useState(true)
  const [copied, setCopied] = useState(false)
  const [liveSchool, setLiveSchool] = useState(school)

  // Listen for the school doc so if someone else regenerates, we update live
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'school', 'root'), (snap) => {
      if (snap.exists()) setLiveSchool({ id: snap.id, ...snap.data() })
    })
    return () => unsub()
  }, [db])

  const currentCode = liveSchool?.staffJoinCode || ''
  const hasCode = !!currentCode

  const signupUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/staff-join${window.location.search}`
    : '/staff-join'

  const handleGenerate = async () => {
    const confirmMsg = hasCode
      ? 'Regenerate the staff join code? The current code will stop working immediately. Teachers who have not signed up yet will need the new code.'
      : null
    if (confirmMsg && !confirm(confirmMsg)) return

    setBusy(true)
    try {
      const newCode = generateStaffCode()
      const newHash = await hashStaffCode(newCode)
      await updateDoc(doc(db, 'school', 'root'), {
        staffJoinCode: newCode,
        staffJoinCodeHash: newHash,
        staffJoinCodeGeneratedAt: serverTimestamp(),
      })
      setShowCode(true)
    } catch (err) {
      alert('Could not generate code: ' + err.message)
    } finally {
      setBusy(false)
    }
  }

  const handleCopy = () => {
    if (!currentCode) return
    navigator.clipboard.writeText(currentCode).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    })
  }

  const handleWhatsApp = () => {
    if (!currentCode) return
    const message = `Hello team 👋

To create your ${liveSchool?.name || 'school'} staff account, please:

1. Go to: ${signupUrl}
2. Enter this join code:

   ${currentCode}

3. Fill out your details (name, email, password, subjects you teach, class you teach)
4. Wait for approval

I'll approve your account as soon as I see it. Welcome!`

    const url = `https://wa.me/?text=${encodeURIComponent(message)}`
    window.open(url, '_blank', 'noopener,noreferrer')
  }

  if (!hasCode) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
            <KeyRound className="w-6 h-6 text-brand-600" />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-slate-900">Staff join code</h3>
            <p className="text-sm text-slate-600 mt-1 max-w-md">
              Generate a code and share it with your teachers. They'll use it to create their accounts. You'll approve each one before they can log in.
            </p>
            <button
              onClick={handleGenerate}
              disabled={busy}
              className="mt-4 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg disabled:opacity-50 flex items-center gap-2"
            >
              {busy ? 'Generating…' : (
                <>
                  <KeyRound className="w-4 h-4" />
                  Generate first join code
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 p-6">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <h3 className="text-lg font-semibold text-slate-900">Staff join code</h3>
        <button
          onClick={handleGenerate}
          disabled={busy}
          className="text-xs text-slate-600 hover:text-slate-900 flex items-center gap-1.5"
          title="Generate a new code — invalidates the current one"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} />
          Regenerate
        </button>
      </div>

      <p className="text-sm text-slate-600 mb-4">
        Share this code with your teachers so they can sign up.
      </p>

      {/* Code display */}
      <div className="bg-slate-50 rounded-lg p-4 flex items-center gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] uppercase tracking-widest text-slate-500 mb-1">
            Current code
          </div>
          <div className="font-mono text-lg md:text-xl font-bold text-slate-900 tracking-wider truncate">
            {showCode ? currentCode : '••••-•••-•••-•••'}
          </div>
        </div>
        <button
          onClick={() => setShowCode(!showCode)}
          className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"
          title={showCode ? 'Hide' : 'Show'}
        >
          {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        </button>
        <button
          onClick={handleCopy}
          className="p-2 hover:bg-slate-200 rounded-lg text-slate-600"
          title="Copy"
        >
          {copied ? <CheckCircle className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
        </button>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={handleWhatsApp}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <MessageCircle className="w-4 h-4" />
          Send via WhatsApp
        </button>
        <button
          onClick={handleCopy}
          className="border border-slate-300 hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2"
        >
          {copied ? (
            <>
              <CheckCircle className="w-4 h-4 text-emerald-600" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy code
            </>
          )}
        </button>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 text-xs text-slate-500">
        Signup link: <span className="font-mono">{signupUrl.replace(/^https?:\/\//, '')}</span>
      </div>
    </div>
  )
}
