import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { Plus, GripVertical } from 'lucide-react'
import { Button, Card, Input, Select, Spinner } from '../../components/ui'
import { getFirebase } from '../../config/firebase'

export default function SubjectsTab() {
  const { db } = getFirebase()
  const [subjects, setSubjects] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeClassId, setActiveClassId] = useState('all')
  const [newName, setNewName] = useState('')
  const [newCode, setNewCode] = useState('')
  const [dragging, setDragging] = useState(null)

  useEffect(() => {
    const u1 = onSnapshot(query(collection(db, 'classes'), orderBy('order')), snap => setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
    const u2 = onSnapshot(query(collection(db, 'subjects'), orderBy('order')), snap => { setSubjects(snap.docs.map(d => ({ id: d.id, ...d.data() }))); setLoading(false) })
    return () => { u1(); u2() }
  }, [db])

  const filtered = activeClassId === 'all' ? subjects : subjects.filter(s => (s.classIds || []).includes(activeClassId))

  const add = async () => {
    if (!newName.trim()) return
    const id = `subject_${Date.now()}`
    await setDoc(doc(db, 'subjects', id), {
      name: newName.trim(), code: (newCode.trim() || newName.trim().slice(0, 3)).toUpperCase(),
      category: 'core', classIds: activeClassId === 'all' ? [] : [activeClassId],
      order: subjects.length + 1, active: true,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    setNewName(''); setNewCode('')
  }
  const toggleClass = async (s, classId) => {
    const cur = s.classIds || []
    const next = cur.includes(classId) ? cur.filter(id => id !== classId) : [...cur, classId]
    await updateDoc(doc(db, 'subjects', s.id), { classIds: next, updatedAt: serverTimestamp() })
  }
  const reorder = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx || activeClassId !== 'all') return // reordering only makes sense on the full list
    const next = [...subjects]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setSubjects(next)
    const batch = writeBatch(db)
    next.forEach((s, i) => batch.update(doc(db, 'subjects', s.id), { order: i + 1 }))
    await batch.commit()
  }

  if (loading) return <Spinner />

  return (
    <Card className="p-6">
      <div className="mb-4">
        <Select label="Filter by class" value={activeClassId} onChange={e => setActiveClassId(e.target.value)}>
          <option value="all">All subjects (drag here to reorder)</option>
          {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </div>
      <div className="grid md:grid-cols-[1fr_120px_auto] gap-3 mb-6 items-end">
        <Input label="Add subject" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <Input label="Code" value={newCode} onChange={e => setNewCode(e.target.value)} />
        <Button onClick={add}><Plus className="w-4 h-4" /> Add</Button>
      </div>
      <ul>
        {filtered.map((s, i) => (
          <li key={s.id}
            draggable={activeClassId === 'all'}
            onDragStart={() => setDragging(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragging !== null) reorder(dragging, i); setDragging(null) }}
            className={`py-3 border-b border-slate-100 ${dragging === i ? 'opacity-50' : ''}`}>
            <div className="flex items-center gap-3 mb-2">
              {activeClassId === 'all' && <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />}
              <span className="font-medium">{s.name}</span>
              <span className="text-xs bg-slate-100 rounded px-1.5 py-0.5">{s.code}</span>
            </div>
            <div className="flex flex-wrap gap-1.5 pl-7">
              {classes.map(c => {
                const inClass = (s.classIds || []).includes(c.id)
                return (
                  <button key={c.id} onClick={() => toggleClass(s, c.id)}
                    className={`text-xs px-2 py-1 rounded-full border ${inClass ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300 hover:bg-slate-50'}`}>
                    {c.name}
                  </button>
                )
              })}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
