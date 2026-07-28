import { Input } from '../../components/ui'

export default function Step1School({ state, patch }) {
  const s = state.school
  const set = (k, v) => patch({ school: { ...s, [k]: v } })

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Tell us about your school</h2>
      <p className="text-ink-soft mb-6 text-sm">This information appears on report cards and around the portal.</p>

      <div className="space-y-4">
        <Input label="School name" placeholder="Delta State College" value={s.name} onChange={e => set('name', e.target.value)} />
        <div className="grid md:grid-cols-2 gap-4">
          <Input label="Short name / abbreviation" placeholder="DSC" value={s.shortName} onChange={e => set('shortName', e.target.value)} />
          <Input label="Motto" placeholder="Knowledge is Power" value={s.motto} onChange={e => set('motto', e.target.value)} />
        </div>
        <Input label="Address" placeholder="12 School Rd, Onitsha, Anambra" value={s.address} onChange={e => set('address', e.target.value)} />
        <div className="grid md:grid-cols-3 gap-4">
          <Input label="Phone" value={s.phone} onChange={e => set('phone', e.target.value)} />
          <Input label="Email" type="email" value={s.email} onChange={e => set('email', e.target.value)} />
          <Input label="Website" value={s.website} onChange={e => set('website', e.target.value)} />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1.5">Primary brand color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={s.primaryColor} onChange={e => set('primaryColor', e.target.value)} className="w-12 h-10 rounded border border-slate-300 cursor-pointer" />
            <span className="text-sm text-ink-soft">{s.primaryColor}</span>
          </div>
        </div>
      </div>
    </div>
  )
}
