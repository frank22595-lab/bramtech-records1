import { useState, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { Save } from 'lucide-react'
import { Button, Card, Input } from '../../../components/ui'
import { getFirebase } from '../../../config/firebase'

export default function TermSettingsTab({ term, readOnly }) {
  const { db } = getFirebase()
  const [form, setForm] = useState({
    name: '', academicYear: '',
    startDate: '', endDate: '', resumesOn: '', closingDate: '', timesOpened: '',
  })
  const [saving, setSaving] = useState(false)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (term) setForm({
      name: term.name || '',
      academicYear: term.academicYear || '',
      startDate: term.startDate || '',
      endDate: term.endDate || '',
      resumesOn: term.resumesOn || '',
      closingDate: term.closingDate || '',
      timesOpened: term.timesOpened || '',
    })
  }, [term])

  const save = async () => {
    setSaving(true); setMsg('')
    try {
      await updateDoc(doc(db, 'terms', term.id), {
        name: form.name.trim(),
        academicYear: form.academicYear.trim(),
        startDate: form.startDate || null,
        endDate: form.endDate || null,
        resumesOn: form.resumesOn || null,
        closingDate: form.closingDate || null,
        timesOpened: form.timesOpened ? Number(form.timesOpened) : null,
        updatedAt: serverTimestamp(),
      })
      setMsg('✓ Saved')
      setTimeout(() => setMsg(''), 3000)
    } catch (err) { setMsg('Save failed: ' + err.message) } finally { setSaving(false) }
  }

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  return (
    <Card className="p-6">
      <h3 className="font-medium mb-1">Term settings</h3>
      <p className="text-sm text-ink-soft mb-4">These values only affect this term. School-wide config lives in Settings.</p>
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Term name" value={form.name} onChange={e => set('name', e.target.value)} disabled={readOnly} />
          <Input label="Academic year" value={form.academicYear} onChange={e => set('academicYear', e.target.value)} disabled={readOnly} />
        </div>
        <div className="grid md:grid-cols-4 gap-3">
          <Input label="Start date" type="date" value={form.startDate} onChange={e => set('startDate', e.target.value)} disabled={readOnly} />
          <Input label="End date" type="date" value={form.endDate} onChange={e => set('endDate', e.target.value)} disabled={readOnly} />
          <Input label="Closing date" type="date" value={form.closingDate} onChange={e => set('closingDate', e.target.value)} disabled={readOnly} />
          <Input label="Next term begins" type="date" value={form.resumesOn} onChange={e => set('resumesOn', e.target.value)} disabled={readOnly} />
        </div>
        <div className="grid md:grid-cols-2 gap-3">
          <Input label="No. of times school opened" type="number" placeholder="e.g. 122" value={form.timesOpened} onChange={e => set('timesOpened', e.target.value)} disabled={readOnly} />
        </div>
      </div>
      {!readOnly && (
        <div className="mt-6 flex items-center gap-3">
          <Button onClick={save} disabled={saving}><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save changes'}</Button>
          {msg && <span className={`text-sm ${msg.includes('failed') ? 'text-red-600' : 'text-emerald-700'}`}>{msg}</span>}
        </div>
      )}
    </Card>
  )
}
