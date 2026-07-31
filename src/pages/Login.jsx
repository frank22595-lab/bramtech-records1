import { useState } from 'react'
import { GraduationCap, ArrowLeft } from 'lucide-react'
import { sendPasswordResetEmail } from 'firebase/auth'
import { Button, Card, Input } from '../components/ui'
import { useAuth } from '../contexts/AuthContext'
import { useSchool } from '../contexts/SchoolContext'
import { getFirebase } from '../config/firebase'

export default function Login() {
  const { login, registerDirector } = useAuth()
  const { slug, school } = useSchool()
  const [mode, setMode] = useState(school ? 'login' : 'firstTime')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [fullName, setFullName] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [resetSent, setResetSent] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else if (mode === 'firstTime') {
        await registerDirector({ email, password, fullName })
      } else if (mode === 'forgot') {
        const { auth } = getFirebase()
        await sendPasswordResetEmail(auth, email.trim())
        setResetSent(true)
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
          {mode === 'forgot' ? (
            <>
              <button
                onClick={() => { setMode('login'); setResetSent(false); setError('') }}
                className="text-sm text-ink-soft hover:text-ink flex items-center gap-1 mb-3"
              >
                <ArrowLeft className="w-4 h-4" /> Back to sign in
              </button>
              <h1 className="text-2xl font-semibold mb-1">Reset your password</h1>
              <p className="text-ink-soft mb-6 text-sm">
                Enter the email you signed up with. We'll send a link to reset your password.
              </p>

              {resetSent ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-sm text-emerald-900">
                  ✓ Password reset email sent to <strong>{email}</strong>. Check your inbox (and spam folder) for a link.
                </div>
              ) : (
                <form onSubmit={submit} className="space-y-4">
                  <Input
                    label="Email"
                    type="email"
                    required
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                  />
                  {error && <p className="text-sm text-red-600">{error}</p>}
                  <Button type="submit" disabled={busy} className="w-full py-3">
                    {busy ? 'Sending…' : 'Send reset link'}
                  </Button>
                </form>
              )}
            </>
          ) : (
            <>
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
                <Input label="Email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
                <Input label="Password" type="password" required minLength={6} value={password} onChange={e => setPassword(e.target.value)} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
                {error && <p className="text-sm text-red-600">{error}</p>}
                <Button type="submit" disabled={busy} className="w-full py-3">
                  {busy ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account & continue'}
                </Button>
              </form>

              {mode === 'login' && (
                <p className="text-sm text-center mt-4">
                  <button
                    type="button"
                    className="text-brand-600 hover:underline"
                    onClick={() => { setMode('forgot'); setError('') }}
                  >
                    Forgot password?
                  </button>
                </p>
              )}

              {!school && (
                <p className="text-xs text-ink-soft mt-4 text-center">
                  {mode === 'login' ? (
                    <>First time here? <button className="text-brand-600 underline" onClick={() => setMode('firstTime')}>Create director account</button></>
                  ) : (
                    <>Already have an account? <button className="text-brand-600 underline" onClick={() => setMode('login')}>Sign in</button></>
                  )}
                </p>
              )}
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
