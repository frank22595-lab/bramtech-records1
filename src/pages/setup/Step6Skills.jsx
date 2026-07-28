import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input } from '../../components/ui'

export default function Step6Skills({ state, patch }) {
  const [newSkill, setNewSkill] = useState('')

  const add = () => {
    if (!newSkill.trim()) return
    if (state.skills.some(s => s.toLowerCase() === newSkill.trim().toLowerCase())) return
    patch({ skills: [...state.skills, newSkill.trim()] })
    setNewSkill('')
  }

  const remove = (i) => patch({ skills: state.skills.filter((_, idx) => idx !== i) })

  const toggleOption = (key) => {
    patch({
      reportCardConfig: {
        ...state.reportCardConfig,
        [key]: !state.reportCardConfig[key],
      },
    })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Skills & report card options</h2>
      <p className="text-ink-soft mb-6 text-sm">
        Skills are rated 1–5 by teachers (⚫⚫⚫⚫⚪). Toggle what shows up on the report card.
      </p>

      <div className="grid md:grid-cols-2 gap-6">
        <div>
          <h3 className="font-medium mb-3">Skills to rate</h3>
          <div className="flex gap-2 mb-3">
            <Input placeholder="e.g. Punctuality" value={newSkill}
              onChange={e => setNewSkill(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), add())} />
            <Button onClick={add}><Plus className="w-4 h-4" /></Button>
          </div>
          {state.skills.length === 0 ? (
            <p className="text-sm text-ink-soft">No skills added.</p>
          ) : (
            <ul className="space-y-1">
              {state.skills.map((s, i) => (
                <li key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm">
                  <span>{s}</span>
                  <button onClick={() => remove(i)} className="text-red-600 hover:bg-red-100 p-1 rounded">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div>
          <h3 className="font-medium mb-3">Report card sections</h3>
          <div className="space-y-2">
            {[
              ['showPhoto',              'Student photo'],
              ['showAttendance',         'Attendance days'],
              ['showSkills',             'Skills rating section'],
              ['showClassAverage',       'Class average'],
              ['showPosition',           'Position in class'],
              ['showTeacherComment',     'Class teacher comment'],
              ['showHeadTeacherComment', 'Head teacher / principal comment'],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                <input
                  type="checkbox"
                  checked={state.reportCardConfig[key]}
                  onChange={() => toggleOption(key)}
                  className="w-4 h-4 accent-brand-600"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
