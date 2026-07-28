import { useEffect } from 'react'
import SiteNav from './SiteNav'
import SiteFooter from './SiteFooter'

/**
 * Wraps every marketing site page.
 *
 * Loads Google Fonts (Bricolage Grotesque, Manrope, Caveat) once,
 * sets the warm cream background, renders nav + footer.
 *
 * Admin pages should NOT use this layout — they keep their own.
 */
export default function SiteLayout({ children }) {
  useEffect(() => {
    // Inject Google Fonts once
    const id = 'yki-fonts'
    if (document.getElementById(id)) return
    const link = document.createElement('link')
    link.id = id
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400..800&family=Manrope:wght@300..800&family=Caveat:wght@400..700&display=swap'
    document.head.appendChild(link)
  }, [])

  return (
    <div
      style={{
        backgroundColor: '#FFF8F0',
        color: '#4C1D5C',
        fontFamily: '"Manrope", system-ui, -apple-system, sans-serif',
        minHeight: '100vh',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <SiteNav />
      <main style={{ flex: 1 }}>{children}</main>
      <SiteFooter />
    </div>
  )
}
