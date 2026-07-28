import { useState, useEffect } from 'react'
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { Save, Plus, Trash2, Check } from 'lucide-react'
import { Button, Card, Input, Spinner } from '../../components/ui'
import { getFirebase } from '../../config/firebase'
import { useSchool } from '../../contexts/SchoolContext'
import { PALETTES, normalizeConfig, hexToRgb } from '../../lib/reportPalettes'

const DESIGNS = [
  {
    id: 'classic',
    name: 'Classic',
    desc: 'The familiar layout: letterhead header, info panels, subjects table with highlights, bottom sections, comments, signatures. Reads like a proper Nigerian report card.',
    ready: true,
  },
  {
    id: 'polish',
    name: 'Polish',
    desc: 'Classic with refinements: bigger school name, hero stats strip (Average / Position / Grade / Attendance), grade pills in the subjects table, bigger signature.',
    ready: true,
  },
  {
    id: 'experimental',
    name: 'Experimental',
    desc: 'Modern hero layout: big photo + name on top, stat cards, minimal typography-driven subjects table with grade pills, dot-based trait ratings. Feels like a school dashboard.',
    ready: true,
  },
]

const COLORS = [
  { id: 'burgundy', name: 'Burgundy', desc: 'Prestigious. Stands out.' },
  { id: 'oxford', name: 'Oxford', desc: 'Classic academic feel.' },
  { id: 'emerald', name: 'Emerald', desc: 'Warm and educational.' },
  { id: 'steel', name: 'Steel', desc: 'Modern and distinctive.' },
  { id: 'navy', name: 'Navy on White', desc: 'Crispest. Cheapest to print.' },
]

export default function ReportDesignPage({ embedded = false }) {
  const { db } = getFirebase()
  const { school } = useSchool()

  const [design, setDesign] = useState('classic')
  const [colorScheme, setColorScheme] = useState('burgundy')
  const [customBrand, setCustomBrand] = useState('')
  const [customBrandError, setCustomBrandError] = useState('')

  const [psychomotor, setPsychomotor] = useState([])
  const [affective, setAffective] = useState([])
  const [options, setOptions] = useState({})
  const [newPsycho, setNewPsycho] = useState('')
  const [newAffective, setNewAffective] = useState('')
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    if (!school) return
    const cfg = school?.reportCardConfig || {}
    const norm = normalizeConfig(cfg)
    setDesign(norm.design)
    setColorScheme(norm.color)
    setCustomBrand(norm.customBrand || '')
    setPsychomotor([...(cfg.psychomotorSkills || cfg.skills || [])])
    setAffective([...(cfg.affectiveTraits || [])])
    setOptions({
      showAge: cfg.showAge ?? true,
      showAttendance: cfg.showAttendance ?? true,
      showAttendancePercent: cfg.showAttendancePercent ?? true,
      showTimesOpened: cfg.showTimesOpened ?? true,
      showPosition: cfg.showPosition ?? true,
      showSubjectPosition: cfg.showSubjectPosition ?? true,
      showClassAverage: cfg.showClassAverage ?? true,
      showClassHighest: cfg.showClassHighest ?? true,
      showClassLowest: cfg.showClassLowest ?? true,
      showNoSubjects: cfg.showNoSubjects ?? true,
      showMarksObtainable: cfg.showMarksObtainable ?? true,
      showPsychomotor: cfg.showPsychomotor ?? true,
      showAffective: cfg.showAffective ?? true,
      showTeacherComment: cfg.showTeacherComment ?? true,
      showHeadTeacherComment: cfg.showHeadTeacherComment ?? true,
      showGradeScale: cfg.showGradeScale ?? true,
      showRatingScale: cfg.showRatingScale ?? true,
      showPhoto: cfg.showPhoto ?? true,
      showRegNumber: cfg.showRegNumber ?? true,
      showWeightHeight: cfg.showWeightHeight ?? false,
      showAdviserComment: cfg.showAdviserComment ?? false,
    })
  }, [school])

  if (!school) return <Spinner />

  const validateCustomBrand = (val) => {
    if (!val || !val.trim()) { setCustomBrandError(''); return true }
    const rgb = hexToRgb(val)
    if (!rgb) { setCustomBrandError('Enter a valid hex code like #7B2D26 or leave blank.'); return false }
    setCustomBrandError('')
    return true
  }

  const addPsycho = () => {
    const v = newPsycho.trim()
    if (!v || psychomotor.some(s => s.toLowerCase() === v.toLowerCase())) return
    setPsychomotor([...psychomotor, v]); setNewPsycho('')
  }
  const addAffective = () => {
    const v = newAffective.trim()
    if (!v || affective.some(s => s.toLowerCase() === v.toLowerCase())) return
    setAffective([...affective, v]); setNewAffective('')
  }

  const save = async () => {
    if (!validateCustomBrand(customBrand)) return
    setSaving(true)
    try {
      const updates = {
        'reportCardConfig.template': design,
        'reportCardConfig.colorScheme': colorScheme,
        'reportCardConfig.customBrandColor': customBrand.trim() || null,
        'reportCardConfig.psychomotorSkills': psychomotor,
        'reportCardConfig.affectiveTraits': affective,
        updatedAt: serverTimestamp(),
      }
      Object.entries(options).forEach(([k, v]) => { updates[`reportCardConfig.${k}`] = v })
      await updateDoc(doc(db, 'school', 'root'), updates)
      setSavedAt(new Date())
      setTimeout(() => setSavedAt(null), 3000)
    } catch (err) { alert('Save failed: ' + err.message) } finally { setSaving(false) }
  }

  const OPTION_GROUPS = [
    ['Student info', [
      ['showPhoto', 'Student photo (when available)'],
      ['showRegNumber', 'Admission / registration number'],
      ['showAge', 'Age (auto-calculated from DOB)'],
      ['showWeightHeight', 'Weight & Height'],
    ]],
    ['Attendance', [
      ['showAttendance', 'Attendance section'],
      ['showTimesOpened', 'Number of times school opened'],
      ['showAttendancePercent', 'Attendance percentage'],
    ]],
    ['Subjects table', [
      ['showSubjectPosition', 'Position per subject'],
      ['showClassAverage', 'Class average per subject'],
      ['showClassHighest', 'Class highest per subject'],
      ['showClassLowest', 'Class lowest per subject'],
    ]],
    ['Summary', [
      ['showPosition', 'Overall position in class'],
      ['showNoSubjects', 'Number of subjects offered'],
      ['showMarksObtainable', 'Marks obtainable / obtained'],
    ]],
    ['Traits & domains', [
      ['showPsychomotor', 'Psychomotor skills'],
      ['showAffective', 'Affective traits'],
    ]],
    ['Comments & footer', [
      ['showAdviserComment', "Academic adviser's report"],
      ['showTeacherComment', 'Class teacher comment'],
      ['showHeadTeacherComment', 'Principal / head teacher comment'],
      ['showGradeScale', 'Grade scale reference'],
      ['showRatingScale', 'Rating scale reference'],
    ]],
  ]

  const Container = ({ children }) => embedded ? <div className="space-y-4">{children}</div>
    : <div className="p-4 md:p-8 max-w-5xl space-y-4">{children}</div>

  return (
    <Container>
      {!embedded && (
        <div className="mb-2">
          <h1 className="text-2xl font-semibold">Report card design</h1>
          <p className="text-sm text-ink-soft mt-0.5">Pick a design and color. Grades in the subjects table are auto-colored by tier (A green, B blue, C amber, D orange, F red).</p>
        </div>
      )}

      <Card className="p-6">
        <h3 className="font-medium">Design</h3>
        <p className="text-sm text-ink-soft mb-4">The layout and typography of the report card.</p>
        <div className="grid md:grid-cols-3 gap-3">
          {DESIGNS.map(d => (
            <DesignCard key={d.id} d={d} active={design === d.id} onClick={() => d.ready && setDesign(d.id)} />
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <h3 className="font-medium">Color palette</h3>
        <p className="text-sm text-ink-soft mb-4">Color of the header, table headings, badges, and accents.</p>
        <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3">
          {COLORS.map(c => (
            <ColorCard key={c.id} c={c} active={colorScheme === c.id} onClick={() => setColorScheme(c.id)} />
          ))}
        </div>

        <div className="mt-6 pt-5 border-t border-slate-100">
          <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">Custom brand color <span className="text-ink-soft/60 font-normal normal-case">(optional)</span></p>
          <p className="text-xs text-ink-soft mb-3">Use your school's own color instead of the palette default. Only the brand color changes — the background stays from the palette.</p>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={customBrand}
              onChange={(e) => { setCustomBrand(e.target.value); validateCustomBrand(e.target.value) }}
              placeholder="#7B2D26"
              className="w-36 px-3 py-1.5 border border-slate-300 rounded text-sm font-mono focus:outline-none focus:border-brand-500"
            />
            {customBrand && hexToRgb(customBrand) && (
              <div className="w-8 h-8 rounded border border-slate-300 shadow-sm" style={{ backgroundColor: customBrand }} title={customBrand}></div>
            )}
            {customBrand && (
              <button onClick={() => { setCustomBrand(''); setCustomBrandError('') }} className="text-xs text-ink-soft hover:text-red-600 ml-1">Clear</button>
            )}
          </div>
          {customBrandError && <p className="text-xs text-red-600 mt-2">{customBrandError}</p>}
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4">
        <TraitList title="Psychomotor skills" desc="Physical / motor abilities. Rated 1-5."
          items={psychomotor} setItems={setPsychomotor}
          newItem={newPsycho} setNewItem={setNewPsycho} onAdd={addPsycho} />
        <TraitList title="Affective traits" desc="Behaviour / attitude. Rated 1-5."
          items={affective} setItems={setAffective}
          newItem={newAffective} setNewItem={setNewAffective} onAdd={addAffective} />
      </div>

      <Card className="p-6">
        <h3 className="font-medium mb-1">Sections</h3>
        <p className="text-sm text-ink-soft mb-4">Turn off anything you don't want on the printed report card.</p>
        <div className="grid md:grid-cols-2 gap-6">
          {OPTION_GROUPS.map(([title, opts]) => (
            <div key={title}>
              <p className="text-xs font-semibold text-ink-soft uppercase tracking-wide mb-2">{title}</p>
              <div className="space-y-1">
                {opts.map(([key, label]) => (
                  <label key={key} className="flex items-center gap-3 cursor-pointer p-2 hover:bg-slate-50 rounded">
                    <input type="checkbox" checked={options[key] || false} onChange={e => setOptions(o => ({ ...o, [key]: e.target.checked }))} className="w-4 h-4 accent-brand-600" />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      <div className="flex items-center gap-3">
        <Button onClick={save} disabled={saving || !!customBrandError}><Save className="w-4 h-4" /> {saving ? 'Saving…' : 'Save all'}</Button>
        {savedAt && <span className="text-sm text-emerald-700">✓ Saved</span>}
      </div>
    </Container>
  )
}

function DesignCard({ d, active, onClick }) {
  return (
    <button
      onClick={onClick}
      className={`text-left border rounded-xl p-4 transition-all relative ${
        active ? 'border-brand-600 ring-2 ring-brand-100 bg-brand-50/40'
        : 'border-slate-200 hover:border-slate-300 bg-white cursor-pointer'
      }`}
    >
      {active && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center">
          <Check className="w-3 h-3" />
        </div>
      )}
      <div className="font-medium text-sm mt-1">{d.name}</div>
      <p className="text-xs text-ink-soft mt-1 leading-relaxed">{d.desc}</p>
    </button>
  )
}

function ColorCard({ c, active, onClick }) {
  const p = PALETTES[c.id]
  return (
    <button
      onClick={onClick}
      className={`text-left border rounded-xl p-3 transition-all relative ${
        active ? 'border-brand-600 ring-2 ring-brand-100 bg-brand-50/40' : 'border-slate-200 hover:border-slate-300 bg-white'
      }`}
    >
      {active && (
        <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-brand-600 text-white flex items-center justify-center z-10">
          <Check className="w-3 h-3" />
        </div>
      )}
      <div className="mb-3">
        <MiniPreview p={p} />
      </div>
      <div className="font-medium text-sm">{c.name}</div>
      <p className="text-xs text-ink-soft mt-1 leading-relaxed">{c.desc}</p>
      <div className="flex items-center gap-1.5 mt-2">
        <span className="w-3 h-3 rounded-full border border-slate-200" style={{ background: p.brandHex }}></span>
        <span className="text-[10px] font-mono text-ink-soft">{p.brandHex}</span>
      </div>
    </button>
  )
}

function MiniPreview({ p }) {
  const bg = p.bgHex
  const brand = p.brandHex
  return (
    <div className="w-full aspect-[3/4] rounded border overflow-hidden text-[3px] leading-none flex flex-col"
      style={{ backgroundColor: bg, borderColor: '#d4c9c0' }}>
      <div style={{ height: '4px', backgroundColor: brand }}></div>
      <div className="p-1 flex items-start gap-1">
        <div style={{ width: '11px', height: '11px', borderRadius: '50%', backgroundColor: brand, flexShrink: 0 }}></div>
        <div className="flex-1 text-center">
          <div style={{ fontSize: '4px', fontWeight: 'bold', color: brand }}>SCHOOL NAME</div>
          <div style={{ height: '0.8px', width: '18px', backgroundColor: brand, margin: '1px auto' }}></div>
          <div style={{ fontSize: '3px', fontWeight: 'bold' }}>address</div>
          <div style={{ fontSize: '2.5px', fontStyle: 'italic', color: brand }}>motto</div>
        </div>
        <div style={{ width: '9px', height: '11px', backgroundColor: 'rgba(0,0,0,0.1)', flexShrink: 0 }}></div>
      </div>
      <div style={{ height: '1px', backgroundColor: brand }}></div>
      <div className="text-center py-0.5" style={{ fontSize: '3px', fontWeight: 'bold' }}>RESULT SHEET</div>
      <div className="p-1 flex-1 flex flex-col">
        <div style={{ height: '3px', backgroundColor: brand }}></div>
        <div className="flex-1 grid" style={{ gridTemplateRows: 'repeat(5, 1fr)' }}>
          {[0,1,2,3,4].map(r => (
            <div key={r} className="grid grid-cols-6 gap-px" style={{ backgroundColor: '#e0d8cf' }}>
              <div style={{ backgroundColor: r % 2 ? bg : '#fff' }}></div>
              <div style={{ backgroundColor: r % 2 ? bg : '#fff' }}></div>
              <div style={{ backgroundColor: r % 2 ? bg : '#fff' }}></div>
              <div style={{ backgroundColor: '#F5E4B4' }}></div>
              <div style={{ backgroundColor: '#DCF0DC' }}></div>
              <div style={{ backgroundColor: r % 2 ? bg : '#fff' }}></div>
            </div>
          ))}
        </div>
      </div>
      <div className="px-1 pb-0.5 grid grid-cols-3 gap-0.5">
        <div style={{ height: '4px', backgroundColor: brand }}></div>
        <div style={{ height: '4px', backgroundColor: brand }}></div>
        <div style={{ height: '4px', backgroundColor: brand }}></div>
      </div>
    </div>
  )
}

function TraitList({ title, desc, items, setItems, newItem, setNewItem, onAdd }) {
  return (
    <Card className="p-6">
      <h3 className="font-medium">{title}</h3>
      <p className="text-xs text-ink-soft mb-3">{desc}</p>
      <div className="flex gap-2 mb-3">
        <Input placeholder="e.g. Handwriting" value={newItem} onChange={e => setNewItem(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), onAdd())} />
        <Button onClick={onAdd}><Plus className="w-4 h-4" /></Button>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-ink-soft">No items yet.</p>
      ) : (
        <ul className="space-y-1">
          {items.map((s, i) => (
            <li key={i} className="flex items-center justify-between bg-slate-50 rounded px-3 py-2 text-sm">
              <span>{s}</span>
              <button onClick={() => setItems(items.filter((_, idx) => idx !== i))} className="text-red-600 hover:bg-red-100 p-1 rounded">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}
