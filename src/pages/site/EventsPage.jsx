import { Link } from 'react-router-dom'
import { Calendar, ArrowRight } from 'lucide-react'
import SiteLayout from '../../components/site/SiteLayout'
import Pill from '../../components/site/Pill'
import { events } from '../../data/schoolContent'

const TAG_TONES = {
  Term: 'plum',
  Admissions: 'coral',
  Community: 'yellow',
  Showcase: 'sky',
}

export default function EventsPage() {
  const now = new Date()
  const upcoming = events.filter(e => new Date(e.date) >= now).sort((a, b) => new Date(a.date) - new Date(b.date))
  const past = events.filter(e => new Date(e.date) < now).sort((a, b) => new Date(b.date) - new Date(a.date))

  return (
    <SiteLayout>
      {/* Header */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" style={{ position: 'absolute', top: '-80px', right: '-80px', width: '360px', height: '360px', borderRadius: '50%', backgroundColor: '#DEEEF7', filter: 'blur(70px)', opacity: 0.8 }} />
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-10 md:pt-20 md:pb-14">
          <Pill tone="sky" size="sm">Events</Pill>
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
            What's happening <span style={{ fontFamily: '"Caveat", cursive', color: '#FF5B7F', fontSize: '1.05em', display: 'inline-block', transform: 'rotate(-1.5deg)' }}>at school.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg" style={{ color: '#4C1D5C', opacity: 0.8, lineHeight: 1.55 }}>
            Term dates, open days, cultural celebrations, and the little moments in between.
          </p>
        </div>
      </section>

      {/* Upcoming */}
      <section className="pb-16">
        <div className="max-w-5xl mx-auto px-4 md:px-6">
          <div className="mb-8 flex items-baseline gap-4">
            <h2
              style={{
                fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(22px, 3vw, 32px)',
                color: '#4C1D5C',
              }}
            >
              Coming up
            </h2>
            <div className="text-sm" style={{ color: '#4C1D5C', opacity: 0.5 }}>
              {upcoming.length} {upcoming.length === 1 ? 'event' : 'events'}
            </div>
          </div>

          {upcoming.length === 0 ? (
            <EmptyState message="Nothing on the calendar right now. Check back soon." />
          ) : (
            <div className="space-y-4">
              {upcoming.map((e, i) => <EventCard key={i} event={e} />)}
            </div>
          )}
        </div>
      </section>

      {/* Past */}
      {past.length > 0 && (
        <section className="pb-20 md:pb-28">
          <div className="max-w-5xl mx-auto px-4 md:px-6">
            <div className="mb-8 flex items-baseline gap-4">
              <h2
                style={{
                  fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: 'clamp(22px, 3vw, 32px)',
                  color: '#4C1D5C',
                  opacity: 0.6,
                }}
              >
                Previously
              </h2>
            </div>
            <div className="space-y-3">
              {past.map((e, i) => <EventCard key={i} event={e} muted />)}
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#4C1D5C', color: '#FFF8F0' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <h2
            style={{
              fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            Want to hear about upcoming events?
          </h2>
          <p className="mt-4 text-lg" style={{ opacity: 0.85 }}>
            Get in touch and we'll add you to the parent WhatsApp group.
          </p>
          <div className="mt-7">
            <Pill as={Link} to="/contact" tone="yellow" size="lg">Get in touch <ArrowRight className="w-4 h-4" /></Pill>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}

function EventCard({ event, muted = false }) {
  const date = new Date(event.date)
  const day = date.toLocaleDateString('en-GB', { day: '2-digit' })
  const month = date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()
  const year = date.getFullYear()
  const weekday = date.toLocaleDateString('en-GB', { weekday: 'long' })
  const tone = TAG_TONES[event.tag] || 'blush'

  return (
    <div
      className="rounded-3xl p-5 md:p-6 flex gap-5 md:gap-7 items-start transition-all hover:shadow-sm"
      style={{
        backgroundColor: muted ? 'rgba(255, 232, 238, 0.35)' : '#FFF8F0',
        border: `1px solid ${muted ? 'rgba(76, 29, 92, 0.06)' : 'rgba(76, 29, 92, 0.08)'}`,
        opacity: muted ? 0.75 : 1,
      }}
    >
      {/* Date block */}
      <div
        className="text-center rounded-2xl px-4 py-3 shrink-0"
        style={{
          backgroundColor: muted ? '#FFE8EE' : '#FF5B7F',
          color: muted ? '#4C1D5C' : '#FFFFFF',
          minWidth: '76px',
        }}
      >
        <div
          style={{
            fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: '30px',
            lineHeight: 1,
          }}
        >
          {day}
        </div>
        <div
          className="text-xs font-semibold tracking-wider mt-1"
          style={{ opacity: 0.9 }}
        >
          {month}
        </div>
        <div className="text-[10px] mt-0.5" style={{ opacity: 0.7 }}>
          {year}
        </div>
      </div>

      {/* Content */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          <Pill tone={tone} size="sm">{event.tag}</Pill>
          <span className="text-xs" style={{ color: '#4C1D5C', opacity: 0.5 }}>{weekday}</span>
        </div>
        <h3
          style={{
            fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(18px, 2.2vw, 22px)',
            color: '#4C1D5C',
            lineHeight: 1.15,
          }}
        >
          {event.title}
        </h3>
        <p className="mt-2 text-sm md:text-base" style={{ color: '#4C1D5C', opacity: 0.8, lineHeight: 1.55 }}>
          {event.description}
        </p>
      </div>
    </div>
  )
}

function EmptyState({ message }) {
  return (
    <div
      className="rounded-3xl p-12 text-center"
      style={{ backgroundColor: '#FFE8EE' }}
    >
      <Calendar className="w-10 h-10 mx-auto mb-3" style={{ color: '#FF5B7F' }} />
      <p style={{ color: '#4C1D5C', opacity: 0.75 }}>{message}</p>
    </div>
  )
}
