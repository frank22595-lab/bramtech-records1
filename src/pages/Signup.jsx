import { useState } from 'react'
import { Link } from 'react-router-dom'
import { GraduationCap, CheckCircle2 } from 'lucide-react'
import { Button, Card, Input } from '../components/ui'

/**
 * Signup captures the request; provisioning a new Firebase project happens
 * out-of-band (by you as operator). This form writes to a "requests" collection
 * in a MASTER Firebase project you control. For now it just simulates that.
 *
 * TODO (post-MVP): wire this to a serverless endpoint that:
 *   1. Records the request in the master project
 *   2. Sends you an email/WhatsApp notification
 *   3. On approval: provisions the new Firebase project via Google Cloud API
 *   4. Adds the subdomain -> config mapping to /schools.json
 *   5. Emails the director their login link
 */
export default function Signup() {
  const [form, setForm] = useState({
    schoolName: '',
    subdomain: '',
    directorName: '',
    directorEmail: '',
    directorPhone: '',
    state: '',
  })
  const [submitted, setSubmitted] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  const update = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const handleSubdomain = (v) => {
    const clean = v.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 30)
    update('subdomain', clean)
  }

  const submit = async (e) => {
    e.preventDefault()
    setSubmitting(true)
    // TODO: POST to /api/signup-requests (Vercel Function that writes to master project)
    await new Promise(r => setTimeout(r, 800))
    setSubmitted(true)
    setSubmitting(false)
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <Card className="max-w-lg w-full p-8 text-center">
          <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Request received</h2>
          <p className="text-ink-soft mb-6">
            We'll set up your portal at <strong>{form.subdomain}.records.bramtechsuite.com</strong> and
            email <strong>{form.directorEmail}</strong> once it's ready. Usually within 24 hours.
          </p>
          <Link to="/"><Button variant="secondary">Back to home</Button></Link>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-surface-soft py-10 px-6">
      <div className="max-w-lg mx-auto">
        <Link to="/" className="flex items-center gap-2 mb-6 text-ink-soft hover:text-ink">
          <GraduationCap className="w-5 h-5" />
          <span className="font-semibold">BramTech Records</span>
        </Link>

        <Card className="p-8">
          <h1 className="text-2xl font-semibold mb-1">Set up your school</h1>
          <p className="text-ink-soft mb-6 text-sm">Takes about 2 minutes. We'll email you when your portal is live.</p>

          <form onSubmit={submit} className="space-y-4">
            <Input label="School name" placeholder="Delta State College" required value={form.schoolName} onChange={e => update('schoolName', e.target.value)} />

            <div>
              <Input
                label="Choose your portal address"
                placeholder="deltacollege"
                required
                value={form.subdomain}
                onChange={e => handleSubdomain(e.target.value)}
              />
              {form.subdomain && (
                <p className="text-xs text-ink-soft mt-1">
                  Your portal will be: <strong>{form.subdomain}.records.bramtechsuite.com</strong>
                </p>
              )}
            </div>

            <Input label="Your name (director/principal)" required value={form.directorName} onChange={e => update('directorName', e.target.value)} />
            <Input label="Your email" type="email" required value={form.directorEmail} onChange={e => update('directorEmail', e.target.value)} />
            <Input label="Phone (WhatsApp)" required value={form.directorPhone} onChange={e => update('directorPhone', e.target.value)} />
            <Input label="State" placeholder="Delta" required value={form.state} onChange={e => update('state', e.target.value)} />

            <Button type="submit" disabled={submitting} className="w-full py-3">
              {submitting ? 'Submitting…' : 'Request my portal'}
            </Button>
          </form>
        </Card>
      </div>
    </div>
  )
}
