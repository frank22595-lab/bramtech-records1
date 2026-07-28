/**
 * Pill — the signature design element for the Yourkids&i site.
 *
 * The flyer uses colored pill-shaped tags for the four programs.
 * The site extends this shape as its visual language: section labels,
 * navigation items, buttons, category tags — all follow the pill.
 *
 * Six tones matching the site palette. Use sparingly on the same page
 * so it doesn't turn into a rainbow.
 */

const TONES = {
  coral: { bg: '#FF5B7F', text: '#FFFFFF' },
  plum: { bg: '#4C1D5C', text: '#FFFFFF' },
  yellow: { bg: '#FFC531', text: '#4C1D5C' },
  sky: { bg: '#62B6E1', text: '#FFFFFF' },
  cream: { bg: '#FFF8F0', text: '#4C1D5C' },
  blush: { bg: '#FFE8EE', text: '#4C1D5C' },
  outline: { bg: 'transparent', text: '#4C1D5C', border: '#4C1D5C' },
}

const SIZES = {
  sm: { padding: '4px 12px', fontSize: '11px', letterSpacing: '0.03em' },
  md: { padding: '8px 18px', fontSize: '13px', letterSpacing: '0.02em' },
  lg: { padding: '14px 28px', fontSize: '15px', letterSpacing: '0.01em' },
  xl: { padding: '18px 36px', fontSize: '17px', letterSpacing: '0' },
}

export default function Pill({
  children,
  tone = 'plum',
  size = 'md',
  as: Component = 'span',
  className = '',
  style = {},
  ...props
}) {
  const t = TONES[tone] || TONES.plum
  const s = SIZES[size] || SIZES.md

  return (
    <Component
      className={`inline-flex items-center gap-2 rounded-full font-semibold whitespace-nowrap transition-transform hover:scale-[1.02] ${className}`}
      style={{
        backgroundColor: t.bg,
        color: t.text,
        border: t.border ? `1.5px solid ${t.border}` : 'none',
        fontFamily: '"Manrope", system-ui, sans-serif',
        textTransform: 'uppercase',
        ...s,
        ...style,
      }}
      {...props}
    >
      {children}
    </Component>
  )
}
