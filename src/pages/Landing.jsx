import { Link } from 'react-router-dom'
import { GraduationCap, FileText, Users, Shield } from 'lucide-react'
import { Button } from '../components/ui'

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <header className="border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GraduationCap className="w-6 h-6 text-brand-600" />
            <span className="font-semibold text-lg">BramTech Records</span>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/signup"><Button>Get started</Button></Link>
          </div>
        </div>
      </header>

      <section className="max-w-4xl mx-auto px-6 py-20 text-center">
        <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">
          Digital report cards for Nigerian schools
        </h1>
        <p className="text-lg text-ink-soft max-w-2xl mx-auto mb-8">
          Enter scores. Publish results. Parents view anytime.
          Every school gets its own private, isolated portal.
        </p>
        <Link to="/signup"><Button className="text-base px-6 py-3">Set up your school</Button></Link>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16 grid md:grid-cols-3 gap-8">
        <Feature icon={FileText} title="Auto-computed report cards" desc="Enter scores per assessment. Grades, positions and averages calculate automatically." />
        <Feature icon={Users} title="Parents & students online" desc="Parents log in to view report cards. Download professional PDFs anytime." />
        <Feature icon={Shield} title="Your data, isolated" desc="Every school runs on its own database. Automatic daily backups. Nothing gets deleted." />
      </section>

      <footer className="border-t border-slate-200 py-8 text-center text-sm text-ink-soft">
        Built by Bram Technologies · Okpanam, Delta State
      </footer>
    </div>
  )
}

function Feature({ icon: Icon, title, desc }) {
  return (
    <div>
      <div className="w-10 h-10 rounded-lg bg-brand-100 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-brand-700" />
      </div>
      <h3 className="font-semibold mb-1">{title}</h3>
      <p className="text-sm text-ink-soft">{desc}</p>
    </div>
  )
}
