import { Plus, Trash2 } from 'lucide-react'
import { Button } from '../../components/ui'

export default function Step5Assessments({ state, patch }) {
  const set = (idx, field, value) => {
    const next = [...state.assessments]
    next[idx] = { ...next[idx], [field]: value }
    patch({ assessments: next })
  }

  const add = () => {
    patch({
      assessments: [
        ...state.assessments,
        { name: '', code: '', maxScore: 20, order: state.assessments.length + 1 },
      ],
    })
  }

  const remove = (idx) => {
    patch({ assessments: state.assessments.filter((_, i) => i !== idx) })
  }

  const total = state.assessments.reduce((sum, a) => sum + (Number(a.maxScore) || 0), 0)

  return (
    <div>
      <h2 className="text-xl font-semibold mb-1">Assessments per term</h2>
      <p className="text-ink-soft mb-6 text-sm">
        Set what students are scored on each term. Typical: two CAs (20 marks each) + Exam (60 marks).
        Total should usually add to 100.
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs text-ink-soft border-b border-slate-200">
            <tr>
              <th className="pb-2 pr-3">Name</th>
              <th className="pb-2 pr-3">Code</th>
              <th className="pb-2 pr-3">Max score</th>
              <th className="pb-2"></th>
            </tr>
          </thead>
          <tbody>
            {state.assessments.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="py-2 pr-3">
                  <input value={row.name}
                    placeholder="e.g. First CA"
                    onChange={e => set(i, 'name', e.target.value)}
                    className="w-full rounded border border-slate-300 px-2 py-1.5" />
                </td>
                <td className="py-2 pr-3">
                  <input value={row.code}
                    placeholder="CA1"
                    onChange={e => set(i, 'code', e.target.value.toUpperCase())}
                    className="w-24 rounded border border-slate-300 px-2 py-1.5" />
                </td>
                <td className="py-2 pr-3">
                  <input type="number" min="1" value={row.maxScore}
                    onChange={e => set(i, 'maxScore', Number(e.target.value))}
                    className="w-24 rounded border border-slate-300 px-2 py-1.5" />
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

      <div className="mt-4 flex items-center justify-between">
        <Button variant="secondary" onClick={add}><Plus className="w-4 h-4" /> Add assessment</Button>
        <p className={`text-sm ${total === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
          Total: {total} {total === 100 ? '✓' : '(commonly 100)'}
        </p>
      </div>
    </div>
  )
}
