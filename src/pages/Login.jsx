import { useState } from 'react'
import { GraduationCap } from 'lucide-react'
import { Button, Card, Input } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useSchool } from '../contexts/SchoolContext'

export default function Login() {
  const { login, registerDirector } = useAuth()
  const { slug, school } = useSchool()
  const [mode, setMode] = useState(school ? 'login' : 'firstTime')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await registerDirector({ email, password, fullName })
      }
    } catch (err) {
      setError(err.message.replace('Firebase: ', ''))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        <div className="flex items-center gap-2 justify-center mb-6">
          <GraduationCap className="w-6 h-6 text-brand-600" />
          <span className="font-semibold">{slug}.records.bramtechsuite.com</span>
        </div>
        <Card className="p-8">
          <h1 className="text-2xl font-semibold mb-1">
            {mode === 'login' ? 'Sign in' : 'Create director account'}
          </h1>
          <p className="text-ink-soft mb-6 text-sm">
            {mode === 'login'
              ? 'Enter your credentials to access the portal.'
              : 'This is a new portal. Create the first director account to get started.'}
          </p>

          <form onSubmit={submit} className="space-y-4">
            {mode === 'firstTime' && (
              <Input label="Full name" required value={fullName} onChange={e => setFullName(e.target.value)} />
            )}
            <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} />
            <Input label="Password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} />
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" disabled={busy} className="w-full py-3">
              {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account & continue'}
            </Button>
          </form>

          {!school && (
            <p className="text-xs text-ink-soft mt-4 text-center">
              {mode === 'login' ? (
                <>First time here? <button className="text-brand-600 underline" onClick={() => setMode('firstTime')}>Create director account</button></>
              ) : (
                <>Already have an account? <button className="text-brand-600 underline" onClick={() => setMode('login')}>Sign in</button></>
              )}
            </p>
          )}
        </Card>
      </div>
    </div>
  )
}
