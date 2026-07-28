import { Link } from 'react-router-dom'
import { Check, ArrowRight } from 'lucide-react'
import SiteLayout from '../../components/site/SiteLayout'
import Pill from '../../components/site/Pill'
import { programs } from '../../data/schoolContent'

export default function ProgramsPage() {
  return (
    <SiteLayout>
      {/* Header */}
      <section className="relative overflow-hidden">
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: '-100px', right: '-100px',
            width: '400px', height: '400px', borderRadius: '50%',
            backgroundColor: '#FFE8EE', filter: 'blur(70px)', opacity: 0.7,
          }}
        />
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-12 md:pt-20 md:pb-16">
          <Pill tone="coral" size="sm">Our programs</Pill>
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
            Four stages, one philosophy: <span style={{ fontFamily: '"Caveat", cursive', color: '#FF5B7F', fontSize: '1.05em', display: 'inline-block', transform: 'rotate(-1.5deg)' }}>meet them where they are.</span>
          </h1>
          <p className="mt-5 max-w-2xl text-lg" style={{ color: '#4C1D5C', opacity: 0.8, lineHeight: 1.55 }}>
            From the first months of life through primary school, our programs grow with your child — routine and rhythm at first, curiosity and structure later, always with the warmth you'd want in your own home.
          </p>
        </div>
      </section>

      {/* Program blocks — alternating layout */}
      <section className="pb-20 md:pb-28">
        <div className="max-w-6xl mx-auto px-4 md:px-6 space-y-16 md:space-y-24">
          {programs.map((p, i) => (
            <ProgramBlock key={p.id} p={p} reverse={i % 2 === 1} />
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24" style={{ backgroundColor: '#FFE8EE' }}>
        <div className="max-w-3xl mx-auto px-4 md:px-6 text-center">
          <h2
            style={{
              fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4.5vw, 44px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#4C1D5C',
            }}
          >
            Not sure which program fits?
          </h2>
          <p className="mt-4 text-lg" style={{ color: '#4C1D5C', opacity: 0.8 }}>
            Come by, meet a teacher, and we'll figure it out together.
          </p>
          <div className="mt-7">
            <Pill as={Link} to="/contact" tone="coral" size="lg">
              Get in touch <ArrowRight className="w-4 h-4" />
            </Pill>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}

function ProgramBlock({ p, reverse }) {
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
    <div className={`grid md:grid-cols-2 gap-8 md:gap-12 items-center ${reverse ? 'md:[&>*:first-child]:order-2' : ''}`}>
      {/* Text */}
      <div>
        <Pill tone={p.tone} size="md">{p.label}</Pill>
        <div className="mt-4 text-sm font-semibold" style={{ color: accentColors[p.tone], letterSpacing: '0.05em' }}>
          {p.ages.toUpperCase()}
        </div>
        <h2
          className="mt-3"
          style={{
            fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
            fontWeight: 700,
            fontSize: 'clamp(28px, 4vw, 40px)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: '#4C1D5C',
          }}
        >
          {p.label}
        </h2>
        <p className="mt-4 text-lg" style={{ color: '#4C1D5C', opacity: 0.85, lineHeight: 1.55 }}>
          {p.description}
        </p>
        <ul className="mt-6 space-y-3">
          {p.highlights.map(h => (
            <li key={h} className="flex items-start gap-3">
              <div
                className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5"
                style={{ backgroundColor: accentColors[p.tone], color: '#FFF' }}
              >
                <Check className="w-3.5 h-3.5" strokeWidth={3} />
              </div>
              <span style={{ color: '#4C1D5C' }}>{h}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Visual */}
      <div
        className="aspect-square md:aspect-[4/5] rounded-[36px] p-8 relative overflow-hidden flex items-center justify-center"
        style={{ backgroundColor: bgColors[p.tone] }}
      >
        {/* Decorative dots */}
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: '30px', right: '40px',
            width: '14px', height: '14px', borderRadius: '50%',
            backgroundColor: accentColors[p.tone], opacity: 0.4,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', bottom: '50px', left: '40px',
            width: '22px', height: '22px', borderRadius: '50%',
            backgroundColor: '#FFC531', opacity: 0.5,
          }}
        />
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', top: '60%', right: '20%',
            width: '10px', height: '10px', borderRadius: '50%',
            backgroundColor: '#62B6E1', opacity: 0.5,
          }}
        />

        {/* Big age text */}
        <div className="text-center">
          <div
            style={{
              fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(80px, 15vw, 160px)',
              lineHeight: 1,
              color: accentColors[p.tone],
              opacity: 0.9,
              letterSpacing: '-0.05em',
            }}
          >
            {p.ages.match(/^\d+/)?.[0] || '★'}
          </div>
          <div
            style={{
              fontFamily: '"Caveat", cursive',
              fontSize: '28px',
              color: accentColors[p.tone],
              marginTop: '-8px',
              transform: 'rotate(-2deg)',
            }}
          >
            starts here
          </div>
        </div>
      </div>
    </div>
  )
}
