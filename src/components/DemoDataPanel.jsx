/**
 * DemoDataPanel — drop-in component
 * Add to any page (Settings School tab, Dashboard, etc.):
 *   import DemoDataPanel from './DemoDataPanel'
 *   <DemoDataPanel />
 */
import { useState } from 'react'
import { Sparkles, Trash2, AlertTriangle, Check } from 'lucide-react'
import { Button, Card } from '../components/ui'
import { getFirebase } from '../config/firebase'
import { useAuth } from '../contexts/AuthContext'
import { useSchool } from '../contexts/SchoolContext'
import { seedDemoData, clearDemoData } from '../lib/seedDemoData'

export default function DemoDataPanel() {
  const { db } = getFirebase()
  const { profile } = useAuth()
  const { school } = useSchool()
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState('')
  const [status, setStatus] = useState('') // 'ok' | 'error' | ''
  const [confirmClear, setConfirmClear] = useState(false)

  const handleLoad = async () => {
    setBusy(true); setStatus(''); setMsg('Starting…')
    try {
      const result = await seedDemoData({
        db,
        currentTermId: school?.currentTermId,
        currentUserId: profile?.id,
        onProgress: (m) => setMsg(m),
      })
      setStatus('ok')
      setMsg(`✓ Created ${result.studentsCreated} students and ${result.scoresCreated} scores across: ${result.classes.join(', ')}`)
    } catch (err) {
      setStatus('error')
      setMsg('❌ ' + err.message)
    } finally { setBusy(false) }
  }

  const handleClear = async () => {
    if (!confirmClear) { setConfirmClear(true); return }
    setBusy(true); setStatus(''); setMsg('Clearing…')
    try {
      const result = await clearDemoData({
        db, onProgress: (m) => setMsg(m),
      })
      setStatus('ok')
      setMsg(`✓ Removed ${result.studentsRemoved} demo students and ${result.scoresRemoved} demo scores.`)
      setConfirmClear(false)
    } catch (err) {
      setStatus('error')
      setMsg('❌ ' + err.message)
    } finally { setBusy(false) }
  }

  return (
    <Card className="p-6 border-amber-200 bg-amber-50/40">
      <div className="flex items-start gap-3 mb-3">
        <Sparkles className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
        <div>
          <h3 className="font-medium">Demo data (for testing)</h3>
          <p className="text-sm text-ink-soft mt-1">
            Adds ~45 test students (15 in each of your first 3 classes) with realistic scores for every subject in the current term. Great for previewing report cards.
          </p>
          <p className="text-xs text-ink-soft mt-1">
            All demo students have admission numbers starting with <code className="bg-amber-100 px-1 rounded">DEMO/</code> so you can identify them easily.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 mb-3">
        <Button onClick={handleLoad} disabled={busy}>
          <Sparkles className="w-4 h-4" />
          {busy ? 'Working…' : 'Load demo data'}
        </Button>
        <button
          onClick={handleClear}
          disabled={busy}
          className={`text-sm px-3 py-2 rounded-md flex items-center gap-1.5 border transition-colors ${
            confirmClear
              ? 'bg-red-600 text-white border-red-600 hover:bg-red-700'
              : 'border-red-200 text-red-700 hover:bg-red-50'
          }`}
        >
          {confirmClear ? <AlertTriangle className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
          {confirmClear ? 'Click again to confirm' : 'Clear demo data'}
        </button>
        {confirmClear && !busy && (
          <button onClick={() => setConfirmClear(false)} className="text-xs text-ink-soft hover:text-ink underline">Cancel</button>
        )}
      </div>

      {msg && (
        <div className={`text-sm p-3 rounded-md flex items-start gap-2 ${
          status === 'ok' ? 'bg-emerald-50 text-emerald-800' :
          status === 'error' ? 'bg-red-50 text-red-800' :
          'bg-white text-ink-soft'
        }`}>
          {status === 'ok' && <Check className="w-4 h-4 mt-0.5 flex-shrink-0" />}
          <span>{msg}</span>
        </div>
      )}
    </Card>
  )
}
