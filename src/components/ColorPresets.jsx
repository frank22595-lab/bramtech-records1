import { Check } from 'lucide-react'

/**
 * ColorPresets
 * ------------
 * A palette of brand-color swatches plus a native color input for custom picks.
 *
 * Props:
 *   value    — current hex color (string)
 *   onChange — callback (hex) => void
 */

const PRESETS = [
  { hex: '#0080ff', name: 'Sky blue' },
  { hex: '#1e40af', name: 'Deep blue' },
  { hex: '#0d9488', name: 'Teal' },
  { hex: '#059669', name: 'Emerald' },
  { hex: '#16a34a', name: 'Forest green' },
  { hex: '#65a30d', name: 'Olive' },
  { hex: '#eab308', name: 'Gold' },
  { hex: '#f97316', name: 'Orange' },
  { hex: '#dc2626', name: 'Red' },
  { hex: '#be185d', name: 'Rose' },
  { hex: '#7c3aed', name: 'Violet' },
  { hex: '#4338ca', name: 'Indigo' },
  { hex: '#111827', name: 'Ink' },
  { hex: '#78350f', name: 'Brown' },
]

export default function ColorPresets({ value, onChange }) {
  const current = (value || '').toLowerCase()

  return (
    <div>
      <div className="grid grid-cols-7 gap-2 mb-4">
        {PRESETS.map(p => {
          const active = p.hex.toLowerCase() === current
          return (
            <button
              key={p.hex}
              type="button"
              onClick={() => onChange(p.hex)}
              title={p.name}
              aria-label={`Choose ${p.name}`}
              className={`aspect-square rounded-lg relative transition-all hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-slate-400 ${
                active ? 'ring-2 ring-offset-2 ring-slate-900 scale-105' : ''
              }`}
              style={{ backgroundColor: p.hex }}
            >
              {active && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <Check className="w-5 h-5 text-white drop-shadow" strokeWidth={3} />
                </span>
              )}
            </button>
          )
        })}
      </div>

      <div className="flex items-center gap-3 pt-3 border-t border-slate-200">
        <label className="text-sm text-ink-soft">Or pick custom:</label>
        <div className="flex items-center gap-2">
          <input
            type="color"
            value={value || '#0080ff'}
            onChange={e => onChange(e.target.value)}
            className="w-10 h-10 rounded cursor-pointer border border-slate-300"
          />
          <input
            type="text"
            value={value || ''}
            onChange={e => {
              const v = e.target.value.trim()
              if (/^#[0-9a-fA-F]{6}$/.test(v) || v === '') onChange(v || '#0080ff')
            }}
            placeholder="#0080ff"
            className="w-24 px-2 py-1.5 text-sm border border-slate-300 rounded font-mono"
          />
        </div>
        <div className="ml-auto text-xs text-ink-soft">
          Current: <span className="font-mono">{value || '—'}</span>
        </div>
      </div>
    </div>
  )
}
