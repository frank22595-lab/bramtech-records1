import { useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { school } from '../../data/schoolContent'
import Pill from './Pill'

const LINKS = [
  { to: '/', label: 'Home' },
  { to: '/programs', label: 'Programs' },
  { to: '/about', label: 'About' },
  { to: '/events', label: 'Events' },
  { to: '/contact', label: 'Contact' },
]

export default function SiteNav() {
  const [open, setOpen] = useState(false)

  return (
    <header
      className="sticky top-0 z-50 backdrop-blur-md"
      style={{ backgroundColor: 'rgba(255, 248, 240, 0.92)', borderBottom: '1px solid rgba(76, 29, 92, 0.08)' }}
    >
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <Logo />
          <div className="hidden sm:block">
            <div style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', fontWeight: 700, fontSize: '18px', color: '#4C1D5C', lineHeight: 1 }}>
              {school.name}
            </div>
            <div style={{ fontFamily: '"Caveat", cursive', fontSize: '14px', color: '#FF5B7F', lineHeight: 1.3 }}>
              {school.tagline}
            </div>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {LINKS.map(l => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                  isActive
                    ? ''
                    : 'hover:bg-[#FFE8EE]'
                }`
              }
              style={({ isActive }) => ({
                color: isActive ? '#FFFFFF' : '#4C1D5C',
                backgroundColor: isActive ? '#4C1D5C' : 'transparent',
                fontFamily: '"Manrope", system-ui, sans-serif',
              })}
            >
              {l.label}
            </NavLink>
          ))}
        </nav>

        {/* Desktop CTAs */}
        <div className="hidden md:flex items-center gap-2">
          <Pill as={Link} to="/check-result" tone="outline" size="sm">Check results</Pill>
          <Pill as={Link} to="/contact" tone="coral" size="sm">Register now</Pill>
        </div>

        {/* Mobile menu button */}
        <button
          onClick={() => setOpen(!open)}
          className="lg:hidden p-2 -mr-2"
          style={{ color: '#4C1D5C' }}
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="lg:hidden border-t" style={{ borderColor: 'rgba(76, 29, 92, 0.08)', backgroundColor: '#FFF8F0' }}>
          <div className="max-w-6xl mx-auto px-4 py-4 space-y-1">
            {LINKS.map(l => (
              <NavLink
                key={l.to}
                to={l.to}
                end={l.to === '/'}
                onClick={() => setOpen(false)}
                className={({ isActive }) =>
                  `block px-4 py-3 rounded-full text-base font-semibold ${
                    isActive ? '' : 'hover:bg-[#FFE8EE]'
                  }`
                }
                style={({ isActive }) => ({
                  color: isActive ? '#FFFFFF' : '#4C1D5C',
                  backgroundColor: isActive ? '#4C1D5C' : 'transparent',
                  fontFamily: '"Manrope", system-ui, sans-serif',
                })}
              >
                {l.label}
              </NavLink>
            ))}
            <div className="flex gap-2 pt-3">
              <Pill as={Link} to="/check-result" tone="outline" size="md" onClick={() => setOpen(false)}>Check results</Pill>
              <Pill as={Link} to="/contact" tone="coral" size="md" onClick={() => setOpen(false)}>Register now</Pill>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}

function Logo() {
  // A playful inline SVG mark — two rounded silhouettes (parent + child) in coral and plum
  return (
    <svg width="42" height="42" viewBox="0 0 42 42" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <circle cx="21" cy="21" r="20" fill="#FFF8F0" stroke="#4C1D5C" strokeWidth="1.5" />
      {/* parent shape (plum, taller) */}
      <circle cx="16" cy="15" r="4" fill="#4C1D5C" />
      <path d="M10 32 C 10 24, 22 24, 22 32 Z" fill="#4C1D5C" />
      {/* child shape (coral, shorter) */}
      <circle cx="27" cy="19" r="3" fill="#FF5B7F" />
      <path d="M23 32 C 23 26, 31 26, 31 32 Z" fill="#FF5B7F" />
      {/* dot sparkle */}
      <circle cx="33" cy="12" r="1.5" fill="#FFC531" />
    </svg>
  )
}
