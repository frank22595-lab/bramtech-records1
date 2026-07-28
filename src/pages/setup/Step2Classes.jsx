import { useState } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Button, Input, Select } from '../../components/ui'

const LEVELS = [
  { value: 'nursery', label: 'Nursery' },
  { value: 'primary', label: 'Primary' },
  { value: 'jss',     label: 'Junior Secondary (JSS)' },
  { value: 'sss',     label: 'Senior Secondary (SSS)' },
  { value: 'other',   label: 'Other' },
]

const PRESETS = {
  primary: ['Primary 1', 'Primary 2', 'Primary 3', 'Primary 4', 'Primary 5', 'Primary 6'],
  jss: ['JSS 1', 'JSS 2', 'JSS 3'],
  sss: ['SSS 1', 'SSS 2', 'SSS 3'],
}

export default function Step2Classes({ state, patch }) {
  const [name, setName] = useState('')
  const [level, setLevel] = useState('jss')

  const add = () => {
    if (!name.trim()) return
    const next = [...state.classes, {
      tempId: `tmp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      name: name.trim(),
      level,
      order: state.classes.length + 1,
    }]
    patch({ classes: next })
    setName('')
  }

  const remove = (tempId) => {
    patch({
      classes: state.classes.filter(c => c.tempId !== tempId),
      // also unassign from subjects
      subjects: state.subjects.map(s => ({
        ...s,
        classTempIds: (s.classTempIds || []).filter(id => id !== tempId),
      })),
    })
  }

  const addPreset = (levelKey) => {
    const existing = new Set(state.classes.map(c => c.name.toLowerCase()))
    const toAdd = PRESETS[levelKey]
      .filter(n => !existing.has(n.toLowerCase()))
      .map((n, i) => ({
        tempId: `tmp_${Date.now()}_${i}_${Math.random().toString(36).slice(2, 5)}`,
        name: n,
        level: levelKey,
        order: state.classes.length + i + 1,
      }))
    patch({ classes: [...state.classes, ...toAdd] })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Add your classes</h2>
      <p className="text-ink-soft mb-6 text-sm">Add each class in your school. You can quick-add a full level or type them individually.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-sm text-ink-soft self-center mr-1">Quick add:</span>
        <Button variant="secondary" onClick={() => addPreset('primary')}>All Primary</Button>
        <Button variant="secondary" onClick={() => addPreset('jss')}>All JSS</Button>
        <Button variant="secondary" onClick={() => addPreset('sss')}>All SSS</Button>
      </div>

      <div className="grid md:grid-cols-[1fr_200px_auto] gap-3 mb-6 items-end">
        <Input label="Class name" placeholder="e.g. JSS 1" value={name} onChange={e => setName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <Select label="Level" value={level} onChange={e => setLevel(e.target.value)}>
          {LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
        </Select>
        <Button onClick={add} className="md:mb-0"><Plus className="w-4 h-4" /> Add</Button>
      </div>

      {state.classes.length === 0 ? (
        <p className="text-sm text-ink-soft text-center py-8">No classes added yet.</p>
      ) : (
        <ul className="space-y-2">
          {state.classes.map(c => (
            <li key={c.tempId} className="flex items-center justify-between bg-slate-50 rounded-lg px-4 py-3">
              <div>
                <span className="font-medium">{c.name}</span>
                <span className="ml-2 text-xs text-ink-soft">{LEVELS.find(l => l.value === c.level)?.label}</span>
              </div>
              <button onClick={() => remove(c.tempId)} className="text-red-600 hover:bg-red-50 p-1.5 rounded">
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
