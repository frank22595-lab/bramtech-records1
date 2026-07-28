import { useState, useEffect } from 'react'
import {
  collection, doc, onSnapshot, orderBy, query, where, setDoc, updateDoc,
  serverTimestamp,
} from 'firebase/firestore'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, updateProfile } from 'firebase/auth'
import { Plus, X, User, Copy, Check, Users, GraduationCap } from 'lucide-react'
import { Button, Card, Input, Spinner, Badge } from '../../components/ui'
import { getFirebase, getFirebaseConfig } from '../../config/firebase'
import { useAuth } from '../../contexts/AuthContext'

export default function TeachersPage() {
  const { db } = getFirebase()
  const [teachers, setTeachers] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(null)
  const [createdTeacher, setCreatedTeacher] = useState(null) // shows temp password

  useEffect(() => {
    const unsub1 = onSnapshot(
      query(collection(db, 'users'), where('role', '==', 'teacher')),
      snap => {
        setTeachers(snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '')))
        setLoading(false)
      }
    )
    const unsub2 = onSnapshot(query(collection(db, 'classes'), orderBy('order')), snap => {
      setClasses(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    })
    return () => { unsub1(); unsub2() }
  }, [db])

  return (
    <div className="p-6 md:p-8 max-w-6xl">
      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <h1 className="text-2xl font-semibold">Teachers</h1>
          <p className="text-sm text-ink-soft mt-0.5">{teachers.length} teacher{teachers.length === 1 ? '' : 's'}</p>
        </div>
        <Button onClick={() => setEditing({})}><Plus className="w-4 h-4" /> Add teacher</Button>
      </div>

      {loading ? <Spinner label="Loading teachers…" /> : (
        teachers.length === 0 ? (
          <Card className="p-12 text-center">
            <Users className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-ink-soft">No teachers yet. Click "Add teacher" to invite one.</p>
          </Card>
        ) : (
          <div className="grid gap-2">
            {teachers.map(t => (
              <TeacherRow key={t.id} teacher={t} classes={classes} onEdit={() => setEditing(t)} />
            ))}
          </div>
        )
      )}

      {editing !== null && (
        <TeacherModal
          teacher={editing.id ? editing : null}
          classes={classes}
          onClose={() => setEditing(null)}
          onCreated={(info) => { setEditing(null); setCreatedTeacher(info) }}
        />
      )}

      {createdTeacher && (
        <CredentialsModal info={createdTeacher} onClose={() => setCreatedTeacher(null)} />
      )}
    </div>
  )
}

function TeacherRow({ teacher, classes, onEdit }) {
  const initials = (teacher.fullName || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase()
  const classNames = (teacher.assignedClasses || [])
    .map(id => classes.find(c => c.id === id)?.name)
    .filter(Boolean)

  return (
    <Card className="p-3 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer" onClick={onEdit}>
      <div className="w-10 h-10 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center font-medium flex-shrink-0">
        {initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-medium truncate">{teacher.fullName}</div>
        <div className="text-xs text-ink-soft mt-0.5 truncate">
          {teacher.email}
          {classNames.length > 0 && <> · Teaches {classNames.join(', ')}</>}
          {teacher.isClassTeacher && <> · Class teacher</>}
        </div>
      </div>
      {!teacher.active && <Badge tone="warning">Inactive</Badge>}
    </Card>
  )
}

function TeacherModal({ teacher, classes, onClose, onCreated }) {
  const { db } = getFirebase()
  const isEdit = !!teacher

  const [form, setForm] = useState(() => teacher ? {
    fullName: teacher.fullName || '',
    email: teacher.email || '',
    phone: teacher.phone || '',
    assignedClasses: teacher.assignedClasses || [],
    isClassTeacher: teacher.isClassTeacher || false,
    classTeacherOf: teacher.classTeacherOf || null,
    active: teacher.active !== false,
  } : {
    fullName: '', email: '', phone: '',
    assignedClasses: [], isClassTeacher: false, classTeacherOf: null, active: true,
  })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))
  const toggleClass = (classId) => {
    const cur = form.assignedClasses
    const next = cur.includes(classId) ? cur.filter(id => id !== classId) : [...cur, classId]
    set('assignedClasses', next)
  }

  const save = async () => {
    setError('')
    if (!form.fullName.trim()) { setError('Full name is required'); return }
    if (!form.email.trim()) { setError('Email is required'); return }
    setBusy(true)
    try {
      if (isEdit) {
        await updateDoc(doc(db, 'users', teacher.id), {
          fullName: form.fullName.trim(),
          phone: form.phone.trim(),
          assignedClasses: form.assignedClasses,
          isClassTeacher: form.isClassTeacher,
          classTeacherOf: form.classTeacherOf,
          active: form.active,
          updatedAt: serverTimestamp(),
        })
        onClose()
      } else {
        // NEW TEACHER: create Firebase Auth account via secondary app so
        // the current director stays logged in. Then create the user profile doc.
        const tempPassword = generatePassword()
        const config = getFirebaseConfig()
        const secondaryApp = initializeApp(config, `secondary-${Date.now()}`)
        try {
          const secondaryAuth = getAuth(secondaryApp)
          const cred = await createUserWithEmailAndPassword(secondaryAuth, form.email.trim(), tempPassword)
          await updateProfile(cred.user, { displayName: form.fullName.trim() })

          // Create user profile in Firestore (via primary db, using new uid)
          await setDoc(doc(db, 'users', cred.user.uid), {
            email: form.email.trim(),
            fullName: form.fullName.trim(),
            phone: form.phone.trim(),
            role: 'teacher',
            active: true,
            assignedClasses: form.assignedClasses,
            isClassTeacher: form.isClassTeacher,
            classTeacherOf: form.classTeacherOf,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          })

          onCreated({
            fullName: form.fullName.trim(),
            email: form.email.trim(),
            tempPassword,
          })
        } finally {
          await deleteApp(secondaryApp)
        }
      }
    } catch (err) {
      console.error('Save teacher error:', err)
      setError(err.message.replace('Firebase: ', ''))
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50" onClick={onClose}>
      <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="p-6 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-xl font-semibold">{isEdit ? 'Edit teacher' : 'Add teacher'}</h2>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-slate-100"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-6 space-y-4">
          <Input label="Full name" required value={form.fullName} onChange={e => set('fullName', e.target.value)} />
          <Input label="Email (used for login)" type="email" required disabled={isEdit}
            value={form.email} onChange={e => set('email', e.target.value)} />
          {isEdit && <p className="text-xs text-ink-soft -mt-2">Email can't be changed after account creation.</p>}
          <Input label="Phone (WhatsApp)" value={form.phone} onChange={e => set('phone', e.target.value)} />

          <div className="pt-2 border-t border-slate-200">
            <p className="text-sm font-medium mb-2">Assigned classes</p>
            <p className="text-xs text-ink-soft mb-3">Teacher can enter scores for these classes only.</p>
            {classes.length === 0 ? (
              <p className="text-sm text-ink-soft">Add classes in Settings first.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {classes.map(c => {
                  const assigned = form.assignedClasses.includes(c.id)
                  return (
                    <button key={c.id} onClick={() => toggleClass(c.id)}
                      className={`text-xs px-2.5 py-1.5 rounded-full border transition-colors ${
                        assigned ? 'bg-brand-600 border-brand-600 text-white' : 'bg-white border-slate-300 hover:bg-slate-50'
                      }`}>
                      {c.name}
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="pt-2 border-t border-slate-200">
            <label className="flex items-center gap-2 mb-3">
              <input type="checkbox" checked={form.isClassTeacher}
                onChange={e => set('isClassTeacher', e.target.checked)}
                className="w-4 h-4 accent-brand-600" />
              <span className="text-sm font-medium">Class teacher / form teacher</span>
            </label>
            {form.isClassTeacher && (
              <div>
                <label className="block text-sm mb-1.5">For which class?</label>
                <select value={form.classTeacherOf || ''} onChange={e => set('classTeacherOf', e.target.value || null)}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm bg-white">
                  <option value="">— select —</option>
                  {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
          </div>

          {isEdit && (
            <label className="flex items-center gap-2 pt-2">
              <input type="checkbox" checked={form.active} onChange={e => set('active', e.target.checked)} className="w-4 h-4 accent-brand-600" />
              <span className="text-sm">Active (uncheck to remove access)</span>
            </label>
          )}

          {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{error}</div>}
        </div>

        <div className="p-6 border-t border-slate-200 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button onClick={save} disabled={busy}>
            {busy ? 'Saving…' : isEdit ? 'Save changes' : 'Create account'}
          </Button>
        </div>
      </Card>
    </div>
  )
}

function CredentialsModal({ info, onClose }) {
  const [copied, setCopied] = useState(false)
  const shareText = `Hi ${info.fullName}, your BramTech Records account is ready.\n\nEmail: ${info.email}\nTemporary password: ${info.tempPassword}\n\nPlease log in and change your password.`

  const copyAll = () => {
    navigator.clipboard.writeText(shareText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center p-4 z-50">
      <Card className="max-w-md w-full">
        <div className="p-6 border-b border-slate-200">
          <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mb-3">
            <Check className="w-6 h-6 text-emerald-700" />
          </div>
          <h2 className="text-xl font-semibold mb-1">Teacher account created</h2>
          <p className="text-sm text-ink-soft">Share these credentials with {info.fullName}. This is the only time you'll see the password.</p>
        </div>

        <div className="p-6 space-y-3">
          <div>
            <label className="text-xs text-ink-soft">Email</label>
            <div className="font-mono text-sm bg-slate-50 rounded p-2 mt-1">{info.email}</div>
          </div>
          <div>
            <label className="text-xs text-ink-soft">Temporary password</label>
            <div className="font-mono text-sm bg-slate-50 rounded p-2 mt-1">{info.tempPassword}</div>
          </div>
        </div>

        <div className="p-6 border-t border-slate-200 flex gap-2">
          <Button variant="secondary" onClick={copyAll} className="flex-1">
            <Copy className="w-4 h-4" /> {copied ? 'Copied!' : 'Copy message'}
          </Button>
          <Button onClick={onClose} className="flex-1">Done</Button>
        </div>
      </Card>
    </div>
  )
}

function generatePassword() {
  const words = ['Sun', 'Moon', 'Star', 'Rain', 'Bird', 'Fish', 'Tree', 'Book', 'Ocean', 'Cloud']
  const word = words[Math.floor(Math.random() * words.length)]
  const num = Math.floor(1000 + Math.random() * 9000)
  return `${word}${num}!`
}
