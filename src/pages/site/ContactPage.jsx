import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, MessageCircle, Clock, Send, Check } from 'lucide-react'
import SiteLayout from '../../components/site/SiteLayout'
import Pill from '../../components/site/Pill'
import { school } from '../../data/schoolContent'

export default function ContactPage() {
  const [form, setForm] = useState({ parentName: '', childAge: '', phone: '', message: '' })
  const [sent, setSent] = useState(false)

  const submit = (e) => {
    e.preventDefault()
    // Route through WhatsApp — no backend needed.
    // The message opens on the user's phone with the school pre-filled as the recipient.
    const msg = `Hello ${school.name},

I would like to register my child.

Parent name: ${form.parentName}
Child's age / class: ${form.childAge}
Phone: ${form.phone}

${form.message ? `Message:\n${form.message}` : ''}`

    const url = `https://wa.me/${school.whatsapp}?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener,noreferrer')
    setSent(true)
  }

  return (
    <SiteLayout>
      {/* Header */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" style={{ position: 'absolute', top: '-100px', left: '20%', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: '#FFF3CC', filter: 'blur(80px)', opacity: 0.7 }} />
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-10 md:pt-20 md:pb-14">
          <Pill tone="coral" size="sm">Get in touch</Pill>
          <h1
            className="mt-5 max-w-3xl"
            style={{
              fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(36px, 6vw, 64px)',
              lineHeight: 1.02,
              letterSpacing: '-0.025em',
              color: '#4C1D5C',
            }}
          >
            Let's talk about <span style={{ fontFamily: '"Caveat", cursive', color: '#FF5B7F', fontSize: '1.05em', display: 'inline-block', transform: 'rotate(-1.5deg)' }}>your child.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg" style={{ color: '#4C1D5C', opacity: 0.8, lineHeight: 1.55 }}>
            WhatsApp is fastest. Phone works too. Or fill out the short form below and we'll come back to you the same day.
          </p>
        </div>
      </section>

      {/* Two-column: contact info + form */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="grid lg:grid-cols-5 gap-8">
            {/* Contact channels — 2 cols */}
            <div className="lg:col-span-2 space-y-3">
              <ContactCard
                icon={MessageCircle}
                title="WhatsApp"
                subtitle="Fastest way to reach us"
                cta="Open WhatsApp"
                href={`https://wa.me/${school.whatsapp}?text=${encodeURIComponent(`Hi ${school.name}, I'd like to know more about the school.`)}`}
                tone="coral"
                accent
              />
              <ContactCard
                icon={Phone}
                title="Call us"
                subtitle={<><div>{school.phone1}</div><div>{school.phone2}</div></>}
                cta="Call now"
                href={`tel:${school.phone1.replace(/\s/g, '')}`}
                tone="plum"
              />
              <ContactCard
                icon={Mail}
                title="Email"
                subtitle={school.email}
                cta="Send email"
                href={`mailto:${school.email}`}
                tone="sky"
              />
              <ContactCard
                icon={MapPin}
                title="Visit us"
                subtitle={school.address}
                cta="Open in Maps"
                href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(school.address)}`}
                tone="yellow"
              />

              {/* Hours */}
              <div className="rounded-3xl p-5" style={{ backgroundColor: '#FFF8F0', border: '1px solid rgba(76, 29, 92, 0.1)' }}>
                <div className="flex items-center gap-2 mb-3">
                  <Clock className="w-4 h-4" style={{ color: '#FF5B7F' }} />
                  <div className="text-xs font-semibold uppercase tracking-widest" style={{ color: '#4C1D5C', opacity: 0.7 }}>
                    Hours
                  </div>
                </div>
                <div className="space-y-1.5 text-sm" style={{ color: '#4C1D5C' }}>
                  <div>{school.hours.weekday}</div>
                  <div style={{ opacity: 0.75 }}>{school.hours.saturday}</div>
                  <div className="pt-2 mt-2 border-t" style={{ borderColor: 'rgba(76, 29, 92, 0.08)', color: '#FF5B7F', fontWeight: 600 }}>
                    {school.hours.around_the_clock}
                  </div>
                </div>
              </div>
            </div>

            {/* Form — 3 cols */}
            <div className="lg:col-span-3">
              <div
                className="rounded-3xl p-6 md:p-8"
                style={{ backgroundColor: '#FFF8F0', border: '1px solid rgba(76, 29, 92, 0.1)' }}
              >
                <div className="mb-6">
                  <Pill tone="blush" size="sm">Register or ask</Pill>
                  <h2
                    className="mt-3"
                    style={{
                      fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: 'clamp(22px, 2.8vw, 30px)',
                      color: '#4C1D5C',
                      letterSpacing: '-0.015em',
                      lineHeight: 1.15,
                    }}
                  >
                    Fill this in — sends via WhatsApp.
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: '#4C1D5C', opacity: 0.7 }}>
                    Your phone will open WhatsApp with the message already typed. You just press send.
                  </p>
                </div>

                {sent ? (
                  <div
                    className="rounded-2xl p-6 flex items-start gap-4"
                    style={{ backgroundColor: '#FFE8EE', color: '#4C1D5C' }}
                  >
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{ backgroundColor: '#FF5B7F', color: '#FFFFFF' }}
                    >
                      <Check className="w-5 h-5" strokeWidth={3} />
                    </div>
                    <div>
                      <div className="font-semibold text-base">Message ready.</div>
                      <p className="text-sm mt-1" style={{ opacity: 0.8 }}>
                        WhatsApp opened in a new tab with your message pre-filled. Just press send and we'll reply shortly.
                      </p>
                      <button
                        onClick={() => { setSent(false); setForm({ parentName: '', childAge: '', phone: '', message: '' }) }}
                        className="mt-3 text-sm font-semibold underline"
                        style={{ color: '#FF5B7F' }}
                      >
                        Send another
                      </button>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={submit} className="space-y-4">
                    <Input
                      label="Your name"
                      value={form.parentName}
                      onChange={v => setForm(f => ({ ...f, parentName: v }))}
                      placeholder="Mrs Adaeze Obi"
                      required
                    />
                    <div className="grid sm:grid-cols-2 gap-4">
                      <Input
                        label="Child's age or class"
                        value={form.childAge}
                        onChange={v => setForm(f => ({ ...f, childAge: v }))}
                        placeholder="3 years / Nursery"
                        required
                      />
                      <Input
                        label="Your phone"
                        value={form.phone}
                        onChange={v => setForm(f => ({ ...f, phone: v }))}
                        placeholder="080 xxx xxxx"
                        required
                        type="tel"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold mb-2" style={{ color: '#4C1D5C' }}>
                        Anything else? <span className="font-normal opacity-60">(optional)</span>
                      </label>
                      <textarea
                        value={form.message}
                        onChange={e => setForm(f => ({ ...f, message: e.target.value }))}
                        rows={4}
                        className="w-full px-4 py-3 rounded-2xl outline-none transition-colors"
                        style={{
                          backgroundColor: '#FFFFFF',
                          border: '1.5px solid rgba(76, 29, 92, 0.15)',
                          color: '#4C1D5C',
                          fontFamily: 'inherit',
                          resize: 'vertical',
                          fontSize: '15px',
                        }}
                        placeholder="e.g. I work night shifts and need weekend drop-off..."
                        onFocus={e => e.target.style.borderColor = '#FF5B7F'}
                        onBlur={e => e.target.style.borderColor = 'rgba(76, 29, 92, 0.15)'}
                      />
                    </div>

                    <div className="pt-2">
                      <Pill
                        as="button"
                        type="submit"
                        tone="coral"
                        size="lg"
                        style={{ width: '100%', justifyContent: 'center' }}
                      >
                        <Send className="w-4 h-4" /> Send via WhatsApp
                      </Pill>
                    </div>

                    <p className="text-xs text-center pt-2" style={{ color: '#4C1D5C', opacity: 0.55 }}>
                      Or contact us directly using any option on the left.
                    </p>
                  </form>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Small link back to check-result */}
      <section className="pb-16 md:pb-24">
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <p className="text-sm" style={{ color: '#4C1D5C', opacity: 0.7 }}>
            Already a parent here?{' '}
            <Link to="/check-result" className="font-semibold underline" style={{ color: '#FF5B7F' }}>
              Check your child's results
            </Link>
            .
          </p>
        </div>
      </section>
    </SiteLayout>
  )
}

function ContactCard({ icon: Icon, title, subtitle, cta, href, tone = 'plum', accent = false }) {
  const bg = accent ? '#FF5B7F' : '#FFF8F0'
  const textColor = accent ? '#FFFFFF' : '#4C1D5C'
  const iconBg = accent ? 'rgba(255, 255, 255, 0.2)' : '#FFE8EE'
  const iconColor = accent ? '#FFFFFF' : '#FF5B7F'

  return (
    <a
      href={href}
      target={href.startsWith('http') ? '_blank' : undefined}
      rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
      className="block rounded-3xl p-5 transition-transform hover:scale-[1.01]"
      style={{
        backgroundColor: bg,
        color: textColor,
        border: accent ? 'none' : '1px solid rgba(76, 29, 92, 0.1)',
      }}
    >
      <div className="flex items-start gap-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center shrink-0"
          style={{ backgroundColor: iconBg, color: iconColor }}
        >
          <Icon className="w-5 h-5" strokeWidth={2.2} />
        </div>
        <div className="min-w-0 flex-1">
          <div style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', fontWeight: 700, fontSize: '17px', lineHeight: 1.2 }}>
            {title}
          </div>
          <div className="mt-1 text-sm" style={{ opacity: accent ? 0.95 : 0.75, lineHeight: 1.4 }}>
            {subtitle}
          </div>
          <div className="mt-2 text-xs font-semibold flex items-center gap-1" style={{ opacity: accent ? 0.95 : 0.9 }}>
            {cta} →
          </div>
        </div>
      </div>
    </a>
  )
}

function Input({ label, value, onChange, placeholder, type = 'text', required = false }) {
  return (
    <div>
      <label className="block text-sm font-semibold mb-2" style={{ color: '#4C1D5C' }}>
        {label} {required && <span style={{ color: '#FF5B7F' }}>*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full px-4 py-3 rounded-2xl outline-none transition-colors"
        style={{
          backgroundColor: '#FFFFFF',
          border: '1.5px solid rgba(76, 29, 92, 0.15)',
          color: '#4C1D5C',
          fontFamily: 'inherit',
          fontSize: '15px',
        }}
        onFocus={e => e.target.style.borderColor = '#FF5B7F'}
        onBlur={e => e.target.style.borderColor = 'rgba(76, 29, 92, 0.15)'}
      />
    </div>
  )
}
