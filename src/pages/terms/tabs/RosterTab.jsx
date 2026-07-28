import { useEffect, useState, useMemo } from 'react'
import { collection, onSnapshot, orderBy, query, where } from 'firebase/firestore'
import { Users, Search } from 'lucide-react'
import { Card, Select, Spinner, Input } from '../../../components/ui'
import { getFirebase } from '../../../config/firebase'

export default function RosterTab({ term }) {
  const { db } = getFirebase()
  const [classes, setClasses] = useState([])
  const [students, setStudents] = useState([])
  const [filterClassId, setFilterClassId] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    return onSnapshot(query(collection(db, 'classes'), orderBy('order')), snap =>
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(c => c.active)))
  }, [db])

  useEffect(() => {
    return onSnapshot(query(collection(db, 'students'), where('active', '==', true)), snap => {
      setStudents(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => a.fullName.localeCompare(b.fullName)))
      setLoading(false)
    })
  }, [db])

  const filtered = useMemo(() => {
    const term = search.toLowerCase().trim()
    return students.filter(s => {
      if (filterClassId !== 'all' && s.classId !== filterClassId) return false
      if (term && !s.fullName.toLowerCase().includes(term) && !(s.admissionNumber || '').toLowerCase().includes(term)) return false
      return true
    })
  }, [students, filterClassId, search])

  const byClass = useMemo(() => {
    const map = {}
    filtered.forEach(s => {
      const className = classes.find(c => c.id === s.classId)?.name || 'Unassigned'
      map[className] = map[className] || []
      map[className].push(s)
    })
    return map
  }, [filtered, classes])

  if (loading) return <Spinner />

  return (
    <div>
      <Card className="p-4 mb-4">
        <div className="grid md:grid-cols-[1fr_240px] gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-ink-soft" />
            <input placeholder="Search by name or admission #…" value={search} onChange={e => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-300 pl-10 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <Select value={filterClassId} onChange={e => setFilterClassId(e.target.value)}>
            <option value="all">All classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
        </div>
        <p className="text-xs text-ink-soft mt-2">
          To add or remove students permanently, use <strong>School → Students</strong>. This roster shows who's active in this term.
        </p>
      </Card>

      {Object.keys(byClass).length === 0 ? (
        <Card className="p-12 text-center">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <p className="text-ink-soft">No students match your filters.</p>
        </Card>
      ) : (
        Object.entries(byClass).map(([className, list]) => (
          <div key={className} className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-medium">{className}</h3>
              <span className="text-xs text-ink-soft">{list.length} students</span>
            </div>
            <Card className="divide-y divide-slate-100">
              {list.map((s, i) => (
                <div key={s.id} className="p-3 flex items-center gap-3">
                  <span className="text-xs text-ink-soft w-6 text-right">{i + 1}</span>
                  <span className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 text-xs font-medium flex items-center justify-center flex-shrink-0">
                    {(s.fullName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate text-sm">{s.fullName}</div>
                    <div className="text-xs text-ink-soft">{s.admissionNumber || '—'} · {s.gender || '—'}</div>
                  </div>
                </div>
              ))}
            </Card>
          </div>
        ))
      )}
    </div>
  )
}
