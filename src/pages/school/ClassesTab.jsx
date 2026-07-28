import { useState, useEffect } from 'react'
import { collection, doc, onSnapshot, orderBy, query, setDoc, updateDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { Plus, GripVertical } from 'lucide-react'
import { Button, Card, Input, Select, Spinner } from '../../components/ui'
import { getFirebase } from '../../config/firebase'

export default function ClassesTab() {
  const { db } = getFirebase()
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [newName, setNewName] = useState('')
  const [newLevel, setNewLevel] = useState('jss')
  const [dragging, setDragging] = useState(null)

  useEffect(() => {
    return onSnapshot(query(collection(db, 'classes'), orderBy('order')), snap => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
  }, [db])

  const add = async () => {
    if (!newName.trim()) return
    const id = `class_${Date.now()}`
    await setDoc(doc(db, 'classes', id), {
      name: newName.trim(), level: newLevel, order: classes.length + 1,
      active: true, studentCount: 0,
      createdAt: serverTimestamp(), updatedAt: serverTimestamp(),
    })
    setNewName('')
  }
  const toggleActive = async (c) => await updateDoc(doc(db, 'classes', c.id), { active: !c.active, updatedAt: serverTimestamp() })
  const rename = async (c, newName) => await updateDoc(doc(db, 'classes', c.id), { name: newName, updatedAt: serverTimestamp() })

  const reorder = async (fromIdx, toIdx) => {
    if (fromIdx === toIdx) return
    const next = [...classes]
    const [moved] = next.splice(fromIdx, 1)
    next.splice(toIdx, 0, moved)
    setClasses(next)
    // Persist new orders
    const batch = writeBatch(db)
    next.forEach((c, i) => batch.update(doc(db, 'classes', c.id), { order: i + 1 }))
    await batch.commit()
  }

  if (loading) return <Spinner />

  return (
    <Card className="p-6">
      <div className="grid md:grid-cols-[1fr_200px_auto] gap-3 mb-6 items-end">
        <Input label="Add class" placeholder="e.g. JSS 1" value={newName} onChange={e => setNewName(e.target.value)} onKeyDown={e => e.key === 'Enter' && add()} />
        <Select label="Level" value={newLevel} onChange={e => setNewLevel(e.target.value)}>
          <option value="nursery">Nursery</option><option value="primary">Primary</option>
          <option value="jss">JSS</option><option value="sss">SSS</option><option value="other">Other</option>
        </Select>
        <Button onClick={add}><Plus className="w-4 h-4" /> Add</Button>
      </div>
      <p className="text-xs text-ink-soft mb-3">Drag to reorder. Order shown here is used everywhere in the app.</p>
      <ul>
        {classes.map((c, i) => (
          <li key={c.id}
            draggable
            onDragStart={() => setDragging(i)}
            onDragOver={e => e.preventDefault()}
            onDrop={() => { if (dragging !== null) reorder(dragging, i); setDragging(null) }}
            className={`py-2.5 flex items-center gap-3 border-b border-slate-100 ${dragging === i ? 'opacity-50' : ''}`}>
            <GripVertical className="w-4 h-4 text-slate-300 cursor-grab" />
            <input defaultValue={c.name}
              onBlur={e => e.target.value !== c.name && rename(c, e.target.value)}
              className="flex-1 rounded border border-transparent hover:border-slate-300 focus:border-brand-500 focus:outline-none px-2 py-1" />
            <span className="text-xs text-ink-soft capitalize w-16">{c.level}</span>
            <button onClick={() => toggleActive(c)}
              className={`text-xs px-2 py-1 rounded ${c.active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-ink-soft'}`}>
              {c.active ? 'Active' : 'Inactive'}
            </button>
          </li>
        ))}
      </ul>
    </Card>
  )
}
