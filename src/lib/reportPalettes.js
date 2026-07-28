/**
 * Report card color palettes.
 *
 * 5 color schemes × 3 designs (classic, polish, experimental) = 15 combinations.
 * The palette drives colors; the design drives layout.
 *
 * Custom brand color: schools can override the palette's brand color with
 * their own hex code. All other palette values (background, panel, alt, grid)
 * stay put so the design still reads coherent.
 */

export const PALETTES = {
  burgundy: {
    label: 'Burgundy',
    brand: [123, 45, 38],        // #7B2D26
    brandHex: '#7B2D26',
    background: [250, 246, 240], // #FAF6F0 warm ivory
    bgHex: '#FAF6F0',
    panel: [254, 251, 246],
    altRow: [245, 237, 228],
    grid: [196, 184, 171],
  },
  oxford: {
    label: 'Oxford',
    brand: [27, 58, 92],         // #1B3A5C
    brandHex: '#1B3A5C',
    background: [245, 239, 224], // #F5EFE0 classic cream
    bgHex: '#F5EFE0',
    panel: [252, 249, 238],
    altRow: [238, 231, 208],
    grid: [197, 188, 160],
  },
  emerald: {
    label: 'Emerald',
    brand: [15, 95, 66],         // #0F5F42
    brandHex: '#0F5F42',
    background: [241, 246, 236], // #F1F6EC pale sage
    bgHex: '#F1F6EC',
    panel: [248, 251, 246],
    altRow: [228, 237, 224],
    grid: [184, 199, 176],
  },
  steel: {
    label: 'Steel',
    brand: [13, 95, 107],        // #0D5F6B
    brandHex: '#0D5F6B',
    background: [237, 243, 245], // #EDF3F5 cool white
    bgHex: '#EDF3F5',
    panel: [248, 251, 252],
    altRow: [223, 234, 236],
    grid: [176, 192, 196],
  },
  navy: {
    label: 'Navy',
    brand: [27, 58, 92],         // #1B3A5C — same navy as Oxford
    brandHex: '#1B3A5C',
    background: [255, 255, 255], // pure white
    bgHex: '#FFFFFF',
    panel: [250, 251, 252],
    altRow: [240, 242, 245],
    grid: [200, 208, 218],
  },
}

// Old template names → new color names
const LEGACY_TEMPLATE_TO_COLOR = {
  ducams: 'burgundy',
  classic: 'oxford',
  modern: 'steel',
  elegant: 'emerald',
}

export const DESIGNS = ['classic', 'polish', 'experimental']

export function hexToRgb(hex) {
  const s = String(hex || '').replace('#', '').trim()
  const short = s.length === 3 ? s.split('').map(c => c + c).join('') : s
  if (!/^[0-9a-f]{6}$/i.test(short)) return null
  return [
    parseInt(short.slice(0, 2), 16),
    parseInt(short.slice(2, 4), 16),
    parseInt(short.slice(4, 6), 16),
  ]
}

export function rgbToHex(rgb) {
  if (!rgb || rgb.length < 3) return null
  const h = (n) => n.toString(16).padStart(2, '0')
  return `#${h(rgb[0])}${h(rgb[1])}${h(rgb[2])}`.toUpperCase()
}

/**
 * Normalize any report card config (old or new schema) into:
 *   { design, color, customBrand }
 */
export function normalizeConfig(config) {
  const t = config?.template
  const c = config?.colorScheme

  const design = DESIGNS.includes(t) ? t : 'classic'

  let color = c
  if (!PALETTES[color]) {
    if (PALETTES[t]) color = t
    else if (LEGACY_TEMPLATE_TO_COLOR[t]) color = LEGACY_TEMPLATE_TO_COLOR[t]
    else color = 'burgundy'
  }

  const customBrand = config?.customBrandColor || null

  return { design, color, customBrand }
}

/**
 * Get a palette object with optional custom brand color override.
 * Only the brand color is overridden; background/panel/alt/grid stay
 * from the palette to keep the design cohesive.
 */
export function getPalette(colorName, customBrandHex) {
  const base = PALETTES[colorName] || PALETTES.burgundy
  const p = { ...base }
  const custom = hexToRgb(customBrandHex)
  if (custom) {
    p.brand = custom
    p.brandHex = String(customBrandHex).toUpperCase()
  }
  return p
}
