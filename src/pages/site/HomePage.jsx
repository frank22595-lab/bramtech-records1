import { Link } from 'react-router-dom'
import { ArrowRight, Phone, MessageCircle, Sparkles, Clock, Users, Music, Brain } from 'lucide-react'
import SiteLayout from '../../components/site/SiteLayout'
import Pill from '../../components/site/Pill'
import { school, programs, extras, differentiators, testimonials } from '../../data/schoolContent'

export default function HomePage() {
  return (
    <SiteLayout>
      <Hero />
      <ProgramsPreview />
      <Extras />
      <WhyUs />
      <Testimonials />
      <CTABand />
    </SiteLayout>
  )
}

/* ============================================================================
   HERO
============================================================================ */
function Hero() {
  return (
    <section className="relative overflow-hidden">
      {/* Ambient color blobs */}
      <Blob top="-100px" left="-80px" size="360px" color="#FFE8EE" />
      <Blob top="60px" right="-120px" size="420px" color="#FFC531" opacity={0.28} />
      <Blob bottom="-160px" left="30%" size="480px" color="#62B6E1" opacity={0.18} />

      <div className="relative max-w-6xl mx-auto px-4 md:px-6 pt-14 pb-20 md:pt-24 md:pb-32">
        <div className="max-w-3xl">
          <Pill tone="blush" size="md">
            <span style={{ color: '#FF5B7F' }}>●</span> Now enrolling · Ikorodu, Lagos
          </Pill>

          <h1
            className="mt-6"
            style={{
              fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(38px, 7vw, 76px)',
              lineHeight: 1.02,
              letterSpacing: '-0.03em',
              color: '#4C1D5C',
            }}
          >
            A school that loves your child <span style={{ fontFamily: '"Caveat", cursive', fontWeight: 700, color: '#FF5B7F', fontSize: '0.85em', display: 'inline-block', transform: 'rotate(-2deg)' }}>and</span> works around your life.
          </h1>

          <p
            className="mt-6 max-w-2xl"
            style={{
              fontFamily: '"Manrope", system-ui, sans-serif',
              fontSize: 'clamp(16px, 1.5vw, 19px)',
              lineHeight: 1.55,
              color: '#4C1D5C',
              opacity: 0.85,
            }}
          >
            24-hour care. Live-in options. Weekend drop-offs. Warm, hands-on learning from creche through primary — for the parents who need more than school hours can hold.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Pill as={Link} to="/contact" tone="coral" size="lg">
              Register your child <ArrowRight className="w-4 h-4" />
            </Pill>
            <Pill as={Link} to="/programs" tone="outline" size="lg">
              See programs
            </Pill>
          </div>

          {/* Quick contact chips */}
          <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-sm" style={{ opacity: 0.75 }}>
            <span className="flex items-center gap-2">
              <Phone className="w-4 h-4" style={{ color: '#FF5B7F' }} />
              {school.phone1}
            </span>
            <a
              href={`https://wa.me/${school.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 hover:opacity-100 transition-opacity"
            >
              <MessageCircle className="w-4 h-4" style={{ color: '#FF5B7F' }} />
              WhatsApp us
            </a>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" style={{ color: '#FF5B7F' }} />
              24 hours available
            </span>
          </div>
        </div>
      </div>
    </section>
  )
}

function Blob({ top, right, bottom, left, size, color, opacity = 0.5 }) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        top, right, bottom, left,
        width: size,
        height: size,
        borderRadius: '50%',
        backgroundColor: color,
        opacity,
        filter: 'blur(60px)',
        pointerEvents: 'none',
      }}
    />
  )
}

/* ============================================================================
   PROGRAMS PREVIEW
============================================================================ */
function ProgramsPreview() {
  return (
    <section className="relative py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between flex-wrap gap-4 mb-10 md:mb-14">
          <div>
            <Pill tone="yellow" size="sm">What we offer</Pill>
            <h2
              className="mt-4 max-w-2xl"
              style={{
                fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(30px, 4.5vw, 48px)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: '#4C1D5C',
              }}
            >
              From tiny hands to curious minds.
            </h2>
          </div>
          <Link
            to="/programs"
            className="text-sm font-semibold flex items-center gap-1.5 hover:gap-2.5 transition-all"
            style={{ color: '#FF5B7F' }}
          >
            See all programs <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {programs.map(p => (
            <ProgramCard key={p.id} p={p} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ProgramCard({ p }) {
  const bgColors = {
    coral: '#FFE8EE',
    plum: '#EEE2F2',
    yellow: '#FFF3CC',
    sky: '#DEEEF7',
  }
  const accentColors = {
    coral: '#FF5B7F',
    plum: '#4C1D5C',
    yellow: '#B8860B',
    sky: '#3B8FBF',
  }

  return (
    <div
      className="rounded-3xl p-6 flex flex-col h-full transition-transform hover:-translate-y-1"
      style={{ backgroundColor: bgColors[p.tone] || '#FFE8EE' }}
    >
      <Pill tone={p.tone} size="sm">{p.label}</Pill>
      <div className="mt-4 text-xs font-semibold" style={{ color: accentColors[p.tone], opacity: 0.8 }}>
        {p.ages.toUpperCase()}
      </div>
      <p className="mt-3 text-sm leading-relaxed flex-1" style={{ color: '#4C1D5C', opacity: 0.85 }}>
        {p.description}
      </p>
      <ul className="mt-4 space-y-1.5">
        {p.highlights.slice(0, 3).map(h => (
          <li key={h} className="text-xs flex items-center gap-2" style={{ color: '#4C1D5C' }}>
            <span
              className="w-1 h-1 rounded-full shrink-0"
              style={{ backgroundColor: accentColors[p.tone] }}
            />
            {h}
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ============================================================================
   EXTRAS BAND
============================================================================ */
function Extras() {
  const iconMap = { home: Users, moon: Clock, brain: Brain, music: Music }

  return (
    <section
      className="py-16 md:py-24"
      style={{ backgroundColor: '#4C1D5C', color: '#FFF8F0' }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="max-w-2xl mb-12">
          <Pill tone="yellow" size="sm">Also included</Pill>
          <h2
            className="mt-4"
            style={{
              fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4vw, 44px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
            }}
          >
            The things that make daily life <span style={{ fontFamily: '"Caveat", cursive', color: '#FFC531', fontSize: '1.1em', display: 'inline-block', transform: 'rotate(-1.5deg)' }}>actually</span> workable.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {extras.map((e, i) => {
            const Icon = iconMap[e.icon] || Sparkles
            return (
              <div
                key={i}
                className="rounded-3xl p-6"
                style={{ backgroundColor: 'rgba(255, 248, 240, 0.05)', border: '1px solid rgba(255, 248, 240, 0.12)' }}
              >
                <div
                  className="w-11 h-11 rounded-full flex items-center justify-center mb-4"
                  style={{ backgroundColor: '#FFC531', color: '#4C1D5C' }}
                >
                  <Icon className="w-5 h-5" strokeWidth={2.2} />
                </div>
                <h3
                  className="font-semibold mb-2"
                  style={{
                    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                    fontSize: '17px',
                    lineHeight: 1.2,
                  }}
                >
                  {e.title}
                </h3>
                <p className="text-sm leading-relaxed" style={{ opacity: 0.75 }}>{e.description}</p>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
   WHY US
============================================================================ */
function WhyUs() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="max-w-2xl mb-12">
          <Pill tone="coral" size="sm">Why we're different</Pill>
          <h2
            className="mt-4"
            style={{
              fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4vw, 44px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#4C1D5C',
            }}
          >
            Four reasons parents keep sending us their children.
          </h2>
        </div>

        <div className="grid md:grid-cols-2 gap-x-8 gap-y-10">
          {differentiators.map(d => (
            <div key={d.number} className="flex gap-5">
              <div
                style={{
                  fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                  fontWeight: 700,
                  fontSize: '48px',
                  lineHeight: 1,
                  color: '#FF5B7F',
                  flexShrink: 0,
                }}
              >
                {d.number}
              </div>
              <div>
                <h3
                  style={{
                    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: '22px',
                    color: '#4C1D5C',
                    lineHeight: 1.1,
                  }}
                >
                  {d.title}
                </h3>
                <p className="mt-2 text-base leading-relaxed" style={{ color: '#4C1D5C', opacity: 0.8 }}>
                  {d.body}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
   TESTIMONIALS
============================================================================ */
function Testimonials() {
  return (
    <section className="py-16 md:py-24" style={{ backgroundColor: '#FFE8EE' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6">
        <div className="max-w-2xl mb-10">
          <Pill tone="plum" size="sm">In parents' words</Pill>
        </div>

        <div className="grid md:grid-cols-3 gap-5">
          {testimonials.map((t, i) => (
            <div
              key={i}
              className="rounded-3xl p-7 flex flex-col"
              style={{ backgroundColor: '#FFF8F0' }}
            >
              <div
                style={{
                  fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                  fontSize: '60px',
                  lineHeight: 0.5,
                  color: '#FF5B7F',
                  height: '24px',
                }}
                aria-hidden="true"
              >
                "
              </div>
              <p
                className="flex-1"
                style={{
                  fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                  fontWeight: 500,
                  fontSize: '18px',
                  lineHeight: 1.35,
                  color: '#4C1D5C',
                }}
              >
                {t.quote}
              </p>
              <div
                className="mt-5"
                style={{
                  fontFamily: '"Caveat", cursive',
                  fontSize: '18px',
                  color: '#FF5B7F',
                }}
              >
                — {t.author}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ============================================================================
   CTA BAND
============================================================================ */
function CTABand() {
  return (
    <section className="py-16 md:py-24">
      <div className="max-w-4xl mx-auto px-4 md:px-6 text-center">
        <Pill tone="yellow" size="sm">Ready when you are</Pill>
        <h2
          className="mt-5"
          style={{
            fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(32px, 5vw, 56px)',
            lineHeight: 1.03,
            letterSpacing: '-0.025em',
            color: '#4C1D5C',
          }}
        >
          Come see the school. <br />
          <span style={{ fontFamily: '"Caveat", cursive', color: '#FF5B7F', fontSize: '1.05em', display: 'inline-block', transform: 'rotate(-1deg)' }}>
            Bring the child.
          </span>
        </h2>
        <p className="mt-5 text-lg" style={{ color: '#4C1D5C', opacity: 0.75, lineHeight: 1.55 }}>
          A short tour, an easy chat. No pressure to enrol on the spot.
        </p>
        <div className="mt-8 flex flex-wrap gap-3 justify-center">
          <Pill as={Link} to="/contact" tone="coral" size="lg">
            Book a visit <ArrowRight className="w-4 h-4" />
          </Pill>
          <Pill
            as="a"
            href={`https://wa.me/${school.whatsapp}?text=${encodeURIComponent("Hi! I'd like to know more about Yourkids&i Academy.")}`}
            target="_blank"
            rel="noopener noreferrer"
            tone="outline"
            size="lg"
          >
            <MessageCircle className="w-4 h-4" /> WhatsApp us
          </Pill>
        </div>
      </div>
    </section>
  )
}
