import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import SiteLayout from '../../components/site/SiteLayout'
import Pill from '../../components/site/Pill'
import { school, about } from '../../data/schoolContent'

export default function AboutPage() {
  return (
    <SiteLayout>
      {/* Header */}
      <section className="relative overflow-hidden">
        <div aria-hidden="true" style={{ position: 'absolute', top: '-100px', left: '-100px', width: '400px', height: '400px', borderRadius: '50%', backgroundColor: '#FFF3CC', filter: 'blur(70px)', opacity: 0.7 }} />
        <div className="relative max-w-5xl mx-auto px-4 md:px-6 pt-14 pb-12 md:pt-20 md:pb-16">
          <Pill tone="yellow" size="sm">About us</Pill>
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
            Built for the parents <span style={{ fontFamily: '"Caveat", cursive', color: '#FF5B7F', fontSize: '1.05em', display: 'inline-block', transform: 'rotate(-1.5deg)' }}>who never stop.</span>
          </h1>
        </div>
      </section>

      {/* Mission callout */}
      <section className="pb-16">
        <div className="max-w-4xl mx-auto px-4 md:px-6">
          <div
            className="rounded-[36px] p-8 md:p-14 text-center"
            style={{ backgroundColor: '#4C1D5C', color: '#FFF8F0' }}
          >
            <div className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#FFC531' }}>
              Our mission
            </div>
            <p
              style={{
                fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                fontWeight: 500,
                fontSize: 'clamp(24px, 3.5vw, 40px)',
                lineHeight: 1.2,
                letterSpacing: '-0.015em',
              }}
            >
              {about.mission}
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="py-12 md:py-16">
        <div className="max-w-3xl mx-auto px-4 md:px-6">
          <Pill tone="blush" size="sm">Our story</Pill>
          <h2
            className="mt-5"
            style={{
              fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
              fontWeight: 700,
              fontSize: 'clamp(28px, 4vw, 42px)',
              lineHeight: 1.05,
              letterSpacing: '-0.02em',
              color: '#4C1D5C',
            }}
          >
            How it started, why it matters.
          </h2>

          <div className="mt-8 space-y-6">
            {about.story.map((para, i) => (
              <p
                key={i}
                style={{
                  fontSize: 'clamp(16px, 1.4vw, 19px)',
                  lineHeight: 1.7,
                  color: '#4C1D5C',
                  opacity: i === 0 ? 1 : 0.85,
                }}
              >
                {para}
              </p>
            ))}
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-16 md:py-20" style={{ backgroundColor: '#FFE8EE' }}>
        <div className="max-w-6xl mx-auto px-4 md:px-6">
          <div className="max-w-2xl mb-12">
            <Pill tone="coral" size="sm">What we stand for</Pill>
            <h2
              className="mt-5"
              style={{
                fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                fontWeight: 700,
                fontSize: 'clamp(28px, 4vw, 44px)',
                lineHeight: 1.05,
                letterSpacing: '-0.02em',
                color: '#4C1D5C',
              }}
            >
              Four things we won't compromise on.
            </h2>
          </div>

          <div className="grid sm:grid-cols-2 gap-5">
            {about.values.map((v, i) => (
              <div
                key={v.title}
                className="rounded-3xl p-7 flex gap-5 items-start"
                style={{ backgroundColor: '#FFF8F0' }}
              >
                <div
                  style={{
                    fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                    fontWeight: 700,
                    fontSize: '54px',
                    lineHeight: 0.9,
                    color: '#FFC531',
                    flexShrink: 0,
                  }}
                >
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div>
                  <h3
                    style={{
                      fontFamily: '"Bricolage Grotesque", system-ui, sans-serif',
                      fontWeight: 700,
                      fontSize: '22px',
                      color: '#4C1D5C',
                      lineHeight: 1.15,
                    }}
                  >
                    {v.title}
                  </h3>
                  <p className="mt-2" style={{ color: '#4C1D5C', opacity: 0.8, lineHeight: 1.55 }}>
                    {v.body}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 md:py-24">
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
            The best way to know us is to visit.
          </h2>
          <p className="mt-4 text-lg" style={{ color: '#4C1D5C', opacity: 0.8 }}>
            Come by any weekday. Tea and biscuits included.
          </p>
          <div className="mt-7 flex flex-wrap gap-3 justify-center">
            <Pill as={Link} to="/contact" tone="coral" size="lg">Plan a visit <ArrowRight className="w-4 h-4" /></Pill>
            <Pill as={Link} to="/programs" tone="outline" size="lg">See programs</Pill>
          </div>
        </div>
      </section>
    </SiteLayout>
  )
}
