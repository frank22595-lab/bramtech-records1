import { Plus, Trash2 } from 'lucide-react'
import { Button, Input } from '../../components/ui'

const PRESETS = {
  standard: [
    { min: 70, max: 100, grade: 'A', remark: 'Excellent' },
    { min: 60, max: 69,  grade: 'B', remark: 'Very Good' },
    { min: 50, max: 59,  grade: 'C', remark: 'Good' },
    { min: 40, max: 49,  grade: 'D', remark: 'Fair' },
    { min: 0,  max: 39,  grade: 'F', remark: 'Fail' },
  ],
  waec: [
    { min: 75, max: 100, grade: 'A1', remark: 'Excellent' },
    { min: 70, max: 74,  grade: 'B2', remark: 'Very Good' },
    { min: 65, max: 69,  grade: 'B3', remark: 'Good' },
    { min: 60, max: 64,  grade: 'C4', remark: 'Credit' },
    { min: 55, max: 59,  grade: 'C5', remark: 'Credit' },
    { min: 50, max: 54,  grade: 'C6', remark: 'Credit' },
    { min: 45, max: 49,  grade: 'D7', remark: 'Pass' },
    { min: 40, max: 44,  grade: 'E8', remark: 'Pass' },
    { min: 0,  max: 39,  grade: 'F9', remark: 'Fail' },
  ],
}

export default function Step4GradeScale({ state, patch }) {
  const set = (idx, field, value) => {
    const next = [...state.gradeScale]
    next[idx] = { ...next[idx], [field]: field === 'min' || field === 'max' ? value : value }
    patch({ gradeScale: next })
  }

  const add = () => {
    patch({ gradeScale: [...state.gradeScale, { min: 0, max: 0, grade: '', remark: '' }] })
  }

  const remove = (idx) => {
    patch({ gradeScale: state.gradeScale.filter((_, i) => i !== idx) })
  }

  const usePreset = (key) => {
    patch({ gradeScale: PRESETS[key].map(r => ({ ...r })) })
  }

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Grade scale</h2>
      <p className="text-ink-soft mb-4 text-sm">Set how percentage scores convert to grades. You can edit or replace it anytime.</p>

      <div className="flex flex-wrap gap-2 mb-6">
        <span className="text-sm text-ink-soft self-center mr-1">Presets:</span>
        <Button variant="secondary" onClick={() => usePreset('standard')}>Standard (A–F)</Button>
        <Button variant="secondary" onClick={() => usePreset('waec')}>WAEC (A1–F9)</Button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-ink-soft border-b border-slate-200">
            <tr>
              <th className="pb-2 pr-3">Min score</th>
              <th className="pb-2 pr-3">Max score</th>
              <th className="pb-2 pr-3">Grade</th>
              <th className="pb-2 pr-3">Remark</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {state.gradeScale.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-3">
                  <input type="number" min="0" max="100" value={row.min}
                    onChange={e => set(i, 'min', Number(e.target.value))}
                    className="w-20 rounded border border-slate-300 px-2 py-1.5" />
                </td>
                <td className="py-2 pr-3">
                  <input type="number" min="0" max="100" value={row.max}
                    onChange={e => set(i, 'max', Number(e.target.value))}
                    className="w-20 rounded border border-slate-300 px-2 py-1.5" />
                </td>
                <td className="py-2 pr-3">
                  <input value={row.grade}
                    onChange={e => set(i, 'grade', e.target.value)}
                    className="w-20 rounded border border-slate-300 px-2 py-1.5" />
                </td>
                <td className="py-2 pr-3">
                  <input value={row.remark}
                    onChange={e => set(i, 'remark', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5" />
                </td>
                <td className="py-2">
                  <button onClick={() => remove(i)} className="text-red-600 hover:bg-red-50 p-1.5 rounded">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Button variant="secondary" onClick={add} className="mt-4"><Plus className="w-4 h-4" /> Add row</Button>
    </div>
  )
}
