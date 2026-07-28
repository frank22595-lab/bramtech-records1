import { Link } from 'react-router-dom'
import { Phone, Mail, MapPin, MessageCircle } from 'lucide-react'
import { school } from '../../data/schoolContent'

export default function SiteFooter() {
  return (
    <footer style={{ backgroundColor: '#4C1D5C', color: '#FFF8F0' }}>
      <div className="max-w-6xl mx-auto px-4 md:px-6 py-12 md:py-16">
        <div className="grid md:grid-cols-3 gap-10">
          {/* School name and tagline */}
          <div>
            <div style={{ fontFamily: '"Bricolage Grotesque", system-ui, sans-serif', fontWeight: 700, fontSize: '22px', lineHeight: 1.1 }}>
              {school.name}
            </div>
            <p style={{ fontFamily: '"Caveat", cursive', fontSize: '20px', color: '#FFC531', marginTop: '4px' }}>
              {school.tagline}
            </p>
            <p className="mt-4 text-sm" style={{ opacity: 0.75, lineHeight: 1.6 }}>
              A school built for parents who need more than school hours can provide, and children who deserve to feel at home wherever they learn.
            </p>
          </div>

          {/* Navigation */}
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#FFC531' }}>
              Explore
            </div>
            <ul className="space-y-2.5 text-sm">
              <li><Link to="/programs" className="hover:opacity-80" style={{ opacity: 0.9 }}>Programs</Link></li>
              <li><Link to="/about" className="hover:opacity-80" style={{ opacity: 0.9 }}>About us</Link></li>
              <li><Link to="/events" className="hover:opacity-80" style={{ opacity: 0.9 }}>Events</Link></li>
              <li><Link to="/contact" className="hover:opacity-80" style={{ opacity: 0.9 }}>Contact & Register</Link></li>
              <li><Link to="/check-result" className="hover:opacity-80" style={{ opacity: 0.9 }}>Check student results</Link></li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <div className="text-xs font-semibold tracking-widest uppercase mb-4" style={{ color: '#FFC531' }}>
              Reach us
            </div>
            <ul className="space-y-3 text-sm" style={{ opacity: 0.9 }}>
              <li className="flex items-start gap-2.5">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#FF5B7F' }} />
                <span style={{ lineHeight: 1.55 }}>{school.address}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <Phone className="w-4 h-4 shrink-0" style={{ color: '#FF5B7F' }} />
                <span>{school.phone1} · {school.phone2}</span>
              </li>
              <li className="flex items-center gap-2.5">
                <MessageCircle className="w-4 h-4 shrink-0" style={{ color: '#FF5B7F' }} />
                <a
                  href={`https://wa.me/${school.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:opacity-80"
                >
                  Chat on WhatsApp
                </a>
              </li>
              <li className="flex items-center gap-2.5">
                <Mail className="w-4 h-4 shrink-0" style={{ color: '#FF5B7F' }} />
                <a href={`mailto:${school.email}`} className="hover:opacity-80 break-all">{school.email}</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t flex flex-col md:flex-row justify-between gap-4 text-xs" style={{ borderColor: 'rgba(255, 248, 240, 0.15)', opacity: 0.65 }}>
          <div>© {new Date().getFullYear()} {school.name}. All rights reserved.</div>
          <div>Built with care by Bram Technologies.</div>
        </div>
      </div>
    </footer>
  )
}
