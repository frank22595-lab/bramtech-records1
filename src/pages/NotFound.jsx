import { AlertCircle } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <AlertCircle className="w-12 h-12 text-amber-500 mx-auto mb-4" />
        <h1 className="text-2xl font-semibold mb-2">Portal not found</h1>
        <p className="text-ink-soft mb-6">
          This portal address isn't registered yet. If you're setting up a new school,
          please sign up at <a className="text-brand-600 underline" href="https://bramtechrecords.com">bramtechrecords.com</a>.
        </p>
        <p className="text-sm text-ink-soft">
          If you believe this is a mistake, please contact support.
        </p>
      </div>
    </div>
  )
}
