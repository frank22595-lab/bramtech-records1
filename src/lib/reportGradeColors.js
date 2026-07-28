/**
 * Grade-tier cell colors for the subjects table.
 *
 * A/A1 → green   (Excellent)
 * B/B2/B3 → blue    (Very Good / Good)
 * C/C4/C5/C6 → amber   (Credit)
 * D/D7 → orange  (Pass)
 * E/E8 → red-orange (Poor)
 * F/F9 → red     (Fail)
 */

export function gradeCellColors(grade) {
  const letter = String(grade || '').trim().match(/^([A-F])/i)?.[1]?.toUpperCase()
  switch (letter) {
    case 'A': return { bg: [220, 240, 220], text: [30, 90, 30] }
    case 'B': return { bg: [220, 232, 245], text: [25, 65, 120] }
    case 'C': return { bg: [245, 234, 210], text: [130, 95, 25] }
    case 'D': return { bg: [248, 220, 200], text: [155, 75, 25] }
    case 'E': return { bg: [245, 200, 190], text: [155, 60, 40] }
    case 'F': return { bg: [240, 210, 210], text: [140, 30, 30] }
    default:  return { bg: [240, 240, 240], text: [80, 80, 80] }
  }
}

// Hex version for React previews
export function gradeCellColorsHex(grade) {
  const c = gradeCellColors(grade)
  const h = (n) => n.toString(16).padStart(2, '0')
  return {
    bg: `#${h(c.bg[0])}${h(c.bg[1])}${h(c.bg[2])}`,
    text: `#${h(c.text[0])}${h(c.text[1])}${h(c.text[2])}`,
  }
}
