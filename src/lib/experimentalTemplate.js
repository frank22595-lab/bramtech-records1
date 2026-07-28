/**
 * Report card renderer — EXPERIMENTAL design.
 *
 * Modern student-dashboard aesthetic:
 *   - Compact school bar (small logo + name + address in one row)
 *   - Big student hero: large photo + student name huge + meta row
 *   - 4 stat cards (Average / Position / Grade [accent] / Attendance)
 *   - Term info as a thin strip
 *   - Minimalist subjects table (no colored header, brand-color underline)
 *   - Grade pills (tier-colored, rounded)
 *   - Dot ratings for traits (5 circles, filled to rating)
 *   - Quote-style comments
 *   - Prominent signature footer
 *
 * 17 subject rows padded like Classic/Polish.
 */

import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { ordinal } from './reportCardCompute'
import { detectImageFormat } from './imageLoader'
import { normalizeConfig, getPalette } from './reportPalettes'
import { gradeCellColors } from './reportGradeColors'

function readContact(school) {
  return {
    phone: school?.phone || school?.contact?.phone || '',
    email: school?.email || school?.contact?.email || '',
  }
}
function cap(s = '') { return s ? s.charAt(0).toUpperCase() + s.slice(1) : '' }
function sortCodes(codes) {
  const isExam = c => /^EX|EXAM/i.test(String(c || ''))
  return [...codes.filter(c => !isExam(c)), ...codes.filter(isExam)]
}
function getAssessmentInfo(source) {
  if (!source?.subjects?.length) return []
  const first = source.subjects[0]
  const arr = Array.isArray(first.assessments) ? first.assessments : Object.values(first.assessments)
  const infos = arr.map(a => ({ code: a.code, name: a.name, maxScore: a.maxScore }))
  return sortCodes(infos.map(i => i.code)).map(code => infos.find(i => i.code === code))
}
function scoreCell(subject, code) {
  const arr = Array.isArray(subject.assessments) ? subject.assessments : Object.values(subject.assessments)
  const a = arr.find(x => x.code === code)
  return a ? String(a.score) : '-'
}
function gradePoint(grade) {
  const m = String(grade || '').match(/(\d+)/)
  return m ? m[1] : ''
}
const TARGET_SUBJECT_ROWS = 17
const MUTED = [140, 140, 140]

export function renderExperimental(input) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4', orientation: 'portrait' })
  const { school, student, className, term, age, report, attendance,
    psychomotor, affective, adviser, classTeacher, headTeacher,
    config = {}, images = {} } = input

  const { color, customBrand } = normalizeConfig(config)
  const palette = getPalette(color, customBrand)
  const brand = { r: palette.brand[0], g: palette.brand[1], b: palette.brand[2] }
  const BG = palette.background
  const PANEL = palette.panel
  const ALT = palette.altRow
  const GRID = palette.grid

  const contact = readContact(school)
  const PAGE = { w: 210, h: 297 }
  const M = 8
  const W = PAGE.w - 2 * M

  const showAdviser = config.showAdviserComment === true

  const hasLogo = !!images.logo
  const hasPhoto = !!images.studentPhoto
  const hasSignature = !!images.signature
  const hasStamp = !!images.stamp

  doc.setFillColor(BG[0], BG[1], BG[2])
  doc.rect(0, 0, PAGE.w, PAGE.h, 'F')
  doc.setFillColor(brand.r, brand.g, brand.b)
  doc.rect(0, 0, PAGE.w, 2, 'F')

  let y = 4

  // ── COMPACT SCHOOL BAR (14mm) ──
  const barH = 12
  const smallLogoR = 5
  const slcx = M + smallLogoR + 1
  const slcy = y + barH / 2
  if (hasLogo) {
    try {
      doc.addImage(images.logo, detectImageFormat(images.logo),
        slcx - smallLogoR, slcy - smallLogoR, smallLogoR * 2, smallLogoR * 2, undefined, 'FAST')
    } catch (err) { drawSmallLogoPlaceholder() }
  } else { drawSmallLogoPlaceholder() }

  function drawSmallLogoPlaceholder() {
    doc.setFillColor(brand.r, brand.g, brand.b)
    doc.circle(slcx, slcy, smallLogoR, 'F')
    if (school?.shortName) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5)
      doc.setTextColor(255)
      doc.text(String(school.shortName).toUpperCase().slice(0, 4), slcx, slcy + 0.5, { align: 'center' })
      doc.setTextColor(0)
    }
  }

  // School name (left of center)
  const schoolTextX = M + smallLogoR * 2 + 4
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(10.5)
  doc.setTextColor(brand.r, brand.g, brand.b)
  const schoolName = String(school?.name || '').toUpperCase()
  const nameLine = doc.splitTextToSize(schoolName, W * 0.55)[0] || ''
  doc.text(nameLine, schoolTextX, y + 5)

  // Address + contact one line below
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(7)
  doc.setTextColor(80)
  const subParts = []
  if (school?.address) subParts.push(school.address)
  if (contact.phone) subParts.push(`Tel ${contact.phone}`)
  if (contact.email) subParts.push(contact.email)
  const subLine = doc.splitTextToSize(subParts.join(' · '), W * 0.55)[0] || ''
  doc.text(subLine, schoolTextX, y + 9)

  // "RESULT SHEET" label right
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(8)
  doc.setTextColor(brand.r, brand.g, brand.b)
  doc.text('RESULT SHEET', M + W, y + 5.5, { align: 'right' })
  if (term?.academicYear) {
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(100)
    const termLabel = `${term.termNumber ? ordinal(term.termNumber) + ' TERM' : ''}  ${term.academicYear}`.trim()
    doc.text(termLabel, M + W, y + 9.5, { align: 'right' })
  }
  doc.setTextColor(0)
  y += barH

  // Divider
  doc.setDrawColor(brand.r, brand.g, brand.b)
  doc.setLineWidth(0.4)
  doc.line(M, y, M + W, y)
  y += 4

  // ── STUDENT HERO (30mm): big photo + name + meta ──
  const heroH = 30
  const photoW = 24
  const photoH = 30
  const photoX = M
  const photoY = y

  if (hasPhoto) {
    try {
      doc.addImage(images.studentPhoto, detectImageFormat(images.studentPhoto),
        photoX, photoY, photoW, photoH, undefined, 'FAST')
      doc.setDrawColor(GRID[0], GRID[1], GRID[2])
      doc.setLineWidth(0.4)
      doc.rect(photoX, photoY, photoW, photoH, 'S')
    } catch (err) { drawHeroPhotoPlaceholder() }
  } else { drawHeroPhotoPlaceholder() }

  function drawHeroPhotoPlaceholder() {
    doc.setFillColor(PANEL[0], PANEL[1], PANEL[2])
    doc.setDrawColor(GRID[0], GRID[1], GRID[2])
    doc.setLineWidth(0.4)
    doc.rect(photoX, photoY, photoW, photoH, 'FD')
    doc.setFillColor(210, 205, 195)
    doc.circle(photoX + photoW / 2, photoY + 9, 4, 'F')
    doc.rect(photoX + 5, photoY + 15, photoW - 10, 12, 'F')
  }

  // Student name and meta right of photo
  const heroTextX = M + photoW + 5
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(6.5)
  doc.setTextColor(140)
  doc.text('STUDENT', heroTextX, y + 4)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(22)
  doc.setTextColor(0)
  const studentName = student.fullName || ''
  const nameW = W - photoW - 5
  const studentNameLine = doc.splitTextToSize(studentName, nameW)[0] || ''
  doc.text(studentNameLine, heroTextX, y + 12.5)

  // Meta row
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  doc.setTextColor(100)
  const metaParts = []
  if (className) metaParts.push(className)
  if (student.admissionNumber) metaParts.push(`Adm ${student.admissionNumber}`)
  if (age !== null && age !== undefined) metaParts.push(`${age} yrs`)
  if (student.gender) metaParts.push(cap(student.gender))
  doc.text(metaParts.join('  ·  '), heroTextX, y + 18)

  // Session/term smaller
  doc.setFontSize(7.5)
  doc.setTextColor(130)
  const termParts = []
  if (term?.closingDate) termParts.push(`Term ended ${term.closingDate}`)
  if (term?.resumesOn) termParts.push(`Next term ${term.resumesOn}`)
  doc.text(termParts.join('  ·  '), heroTextX, y + 23)
  doc.setTextColor(0)

  y += heroH + 2

  // ── STAT CARDS (18mm) ──
  const statH = 18
  const statGap = 2.5
  const statCardW = (W - 3 * statGap) / 4
  const stats = [
    { label: 'AVERAGE', value: `${report.percentageAverage}%`, sub: `Class ${report.classAverage}%` },
    { label: 'POSITION', value: report.overallPosition ? ordinal(report.overallPosition) : '—', sub: `of ${report.classSize}` },
    { label: 'GRADE', value: report.overallGrade || '—', sub: report.overallRemark || '', accent: true },
    { label: 'ATTENDANCE', value: attendance?.percentage != null ? `${attendance.percentage}%` : '—',
      sub: attendance?.daysPresent != null ? `${attendance.daysPresent} of ${attendance.timesOpened} days` : '' },
  ]
  stats.forEach((s, i) => {
    const cx = M + i * (statCardW + statGap)
    if (s.accent) {
      doc.setFillColor(brand.r, brand.g, brand.b)
      doc.setDrawColor(brand.r, brand.g, brand.b)
    } else {
      doc.setFillColor(255, 255, 255)
      doc.setDrawColor(GRID[0], GRID[1], GRID[2])
    }
    doc.setLineWidth(0.25)
    doc.roundedRect(cx, y, statCardW, statH, 1.5, 1.5, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(s.accent ? 230 : 130, s.accent ? 230 : 130, s.accent ? 230 : 130)
    doc.text(s.label, cx + 3, y + 4.5)

    doc.setFontSize(16)
    if (s.accent) doc.setTextColor(255)
    else doc.setTextColor(brand.r, brand.g, brand.b)
    doc.text(String(s.value), cx + 3, y + 12)

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(6.5)
    if (s.accent) doc.setTextColor(230, 230, 230)
    else doc.setTextColor(120)
    if (s.sub) {
      const subLine = doc.splitTextToSize(String(s.sub), statCardW - 6)[0] || ''
      doc.text(subLine, cx + 3, y + 16)
    }
    doc.setTextColor(0)
  })
  y += statH + 3

  // ── Section title ──
  const drawSectionTitle = (label) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.5)
    doc.setTextColor(brand.r, brand.g, brand.b)
    doc.text(label.toUpperCase(), M, y + 2.5)
    doc.setDrawColor(brand.r, brand.g, brand.b)
    doc.setLineWidth(0.25)
    const labelW = doc.getTextWidth(label.toUpperCase())
    doc.line(M + labelW + 3, y + 2, M + W, y + 2)
    doc.setTextColor(0)
    y += 4.5
  }
  drawSectionTitle('Subject performance')

  // ── Minimalist subjects table ──
  const assessInfo = getAssessmentInfo(report)
  const codes = assessInfo.map(a => a.code)
  const totalMax = assessInfo.reduce((sum, a) => sum + (a.maxScore || 0), 0)

  const showCols = {
    pos:  config.showSubjectPosition !== false,
    avg:  config.showClassAverage !== false,
    high: config.showClassHighest !== false,
    low:  config.showClassLowest !== false,
  }
  const assessLabel = (a) => {
    const raw = a.name || a.code || ''
    const display = raw.length > 16 ? a.code : raw
    return a.maxScore ? `${display}\n(${a.maxScore})` : display
  }
  const headLabels = [
    'SUBJECT',
    ...assessInfo.map(assessLabel),
    `TOTAL\n(${totalMax})`,
    'GRADE',
    ...(showCols.pos  ? ['POSITION']    : []),
    ...(showCols.avg  ? ['CLASS\nAVG']  : []),
    ...(showCols.high ? ['CLASS\nHIGH'] : []),
    ...(showCols.low  ? ['CLASS\nLOW']  : []),
    'REMARK',
  ]
  const totalColIdx = 1 + codes.length
  const gradeColIdx = totalColIdx + 1
  const remarkColIdx = headLabels.length - 1

  const realRows = report.subjects.map(s => [
    s.subjectName,
    ...codes.map(c => scoreCell(s, c)),
    String(s.total), s.grade,
    ...(showCols.pos  ? [s.classPosition ? ordinal(s.classPosition) : '-'] : []),
    ...(showCols.avg  ? [String(s.classAverage)] : []),
    ...(showCols.high ? [String(s.classHighest)] : []),
    ...(showCols.low  ? [String(s.classLowest)]  : []),
    s.remark,
  ])
  const body = [...realRows]
  while (body.length < TARGET_SUBJECT_ROWS) body.push(new Array(headLabels.length).fill(''))

  const signatureRowH = (hasSignature || hasStamp) ? 12 : 0
  const commentCount = (showAdviser && adviser?.comment ? 1 : 0) +
                       (classTeacher?.comment ? 1 : 0) +
                       (headTeacher?.comment ? 1 : 0)
  const bottomReserve = 50 + (commentCount * 8) + signatureRowH + 4

  const tableSpace = PAGE.h - M - y - bottomReserve
  const perRow = Math.max(4, Math.min(6, (tableSpace - 12) / TARGET_SUBJECT_ROWS))
  const fontSize = perRow >= 5.5 ? 7 : perRow >= 5 ? 6.5 : 6

  autoTable(doc, {
    startY: y,
    head: [headLabels],
    body,
    margin: { left: M, right: M },
    tableWidth: 'auto',
    styles: {
      fontSize, cellPadding: 1.5, valign: 'middle', halign: 'center',
      minCellHeight: perRow, textColor: 40,
      lineColor: [230, 230, 230], lineWidth: 0.1,
      fillColor: [255, 255, 255],
    },
    headStyles: {
      fillColor: [255, 255, 255],
      textColor: [100, 100, 100],
      fontSize: 6,
      halign: 'center', valign: 'middle',
      fontStyle: 'bold',
      minCellHeight: 10,
      cellPadding: 1,
      lineColor: [brand.r, brand.g, brand.b],
      lineWidth: 0.4,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 42, textColor: 20 },
      [remarkColIdx]: { halign: 'left', cellWidth: 22, textColor: 100 },
    },
    alternateRowStyles: { fillColor: [250, 250, 250] },
    theme: 'plain',
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const isEmpty = !data.row.raw[0]
      if (isEmpty) return
      if (data.column.index === totalColIdx) {
        data.cell.styles.fontStyle = 'bold'
        data.cell.styles.textColor = [20, 20, 20]
      }
      if (data.column.index === gradeColIdx) {
        data.cell.text = ['']
      }
    },
    didDrawCell: (data) => {
      // Grade pill
      if (data.section === 'body' && data.column.index === gradeColIdx) {
        const grade = String(data.row.raw[gradeColIdx] || '').trim()
        if (!grade) return
        const c = gradeCellColors(grade)
        const cellW = data.cell.width
        const cellH = data.cell.height
        const pillW = Math.min(cellW * 0.82, 9)
        const pillH = Math.min(cellH * 0.65, 4.5)
        const px = data.cell.x + (cellW - pillW) / 2
        const py = data.cell.y + (cellH - pillH) / 2
        doc.setFillColor(c.bg[0], c.bg[1], c.bg[2])
        doc.roundedRect(px, py, pillW, pillH, pillH / 2, pillH / 2, 'F')
        doc.setFont('helvetica', 'bold')
        doc.setFontSize(6.5)
        doc.setTextColor(c.text[0], c.text[1], c.text[2])
        doc.text(grade, data.cell.x + cellW / 2, data.cell.y + cellH / 2 + 1.2, { align: 'center' })
        doc.setTextColor(0)
      }
    },
  })
  y = doc.lastAutoTable.finalY + 3

  drawSectionTitle('Character & scale')

  // ── Bottom section (3 cols with dot ratings) ──
  const bottomY = y
  const psy = psychomotor?.filter(s => s.rating > 0) || []
  const aff = affective?.filter(s => s.rating > 0) || []

  const col3W = (W - 6) / 3
  const col1X = M
  const col2X = M + col3W + 3
  const col3X = M + 2 * (col3W + 3)

  const drawTraitBlock = (x, sy, w, title, rows) => {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(brand.r, brand.g, brand.b)
    doc.text(title.toUpperCase(), x, sy + 2.5)
    doc.setTextColor(0)
    let ry = sy + 5
    const rowH = 3.6
    if (rows.length === 0) {
      doc.setFont('helvetica', 'italic')
      doc.setFontSize(6.5)
      doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
      doc.text('Not recorded', x, ry + 2)
      doc.setTextColor(0)
      return ry + 5
    }
    rows.forEach(([label, val], i) => {
      // Bottom border
      if (i > 0) {
        doc.setDrawColor(230, 230, 230)
        doc.setLineWidth(0.1)
        doc.line(x, ry - 0.3, x + w, ry - 0.3)
      }
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(7)
      doc.setTextColor(30)
      const trimmed = doc.splitTextToSize(String(label), w * 0.55)[0] || ''
      doc.text(trimmed, x, ry + 2.3)
      // Dot rating: 5 circles, filled to rating value
      const dotStart = x + w - 15
      const dotR = 0.9
      const dotGap = 2.6
      for (let d = 0; d < 5; d++) {
        const dx = dotStart + d * dotGap
        const dy = ry + 2
        if (d < val) {
          doc.setFillColor(brand.r, brand.g, brand.b)
          doc.circle(dx, dy, dotR, 'F')
        } else {
          doc.setFillColor(220, 220, 220)
          doc.circle(dx, dy, dotR, 'F')
        }
      }
      ry += rowH
    })
    return ry
  }

  let c1Y = bottomY, c2Y = bottomY, c3Y = bottomY
  if (config.showAffective !== false) {
    c1Y = drawTraitBlock(col1X, bottomY, col3W, 'Affective', aff.map(x => [x.name, x.rating]))
  }
  if (config.showPsychomotor !== false) {
    c2Y = drawTraitBlock(col2X, bottomY, col3W, 'Psychomotor', psy.map(x => [x.name, x.rating]))
  }

  const grading = school?.gradingScale || []
  if (grading.length > 0) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(brand.r, brand.g, brand.b)
    doc.text('GRADE SCALE', col3X, c3Y + 2.5)
    doc.setTextColor(0)
    c3Y += 5

    const gRowH = 3
    const gw1 = col3W * 0.32
    const gw2 = col3W * 0.15
    const gw3 = col3W * 0.15
    grading.slice(0, 8).forEach((g, i) => {
      if (i > 0) {
        doc.setDrawColor(230, 230, 230)
        doc.setLineWidth(0.1)
        doc.line(col3X, c3Y - 0.3, col3X + col3W, c3Y - 0.3)
      }
      const gc = gradeCellColors(g.grade)
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.2)
      doc.setTextColor(80)
      doc.text(`${g.min}-${g.max}%`, col3X, c3Y + 2)
      // Grade mini-pill
      doc.setFillColor(gc.bg[0], gc.bg[1], gc.bg[2])
      doc.roundedRect(col3X + gw1, c3Y + 0.4, 6, 2.3, 1.15, 1.15, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.8)
      doc.setTextColor(gc.text[0], gc.text[1], gc.text[2])
      doc.text(String(g.grade || ''), col3X + gw1 + 3, c3Y + 2, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.2)
      doc.setTextColor(100)
      const remark = doc.splitTextToSize(String(g.remark || ''), col3W - gw1 - gw2 - 2)[0] || ''
      doc.text(remark, col3X + gw1 + gw2 + 2, c3Y + 2)
      doc.setTextColor(0)
      c3Y += gRowH
    })
  }

  y = Math.max(c1Y, c2Y, c3Y) + 3

  // ── Quote-style comments ──
  const commentRows = []
  if (showAdviser && adviser?.comment) commentRows.push({ label: 'Academic adviser', comment: adviser.comment, signer: adviser.name || 'Academic Adviser' })
  if (config.showTeacherComment !== false && classTeacher?.comment) commentRows.push({ label: 'Class teacher', comment: classTeacher.comment, signer: classTeacher.name })
  if (config.showHeadTeacherComment !== false && headTeacher?.comment) commentRows.push({ label: headTeacher.title || 'Principal', comment: headTeacher.comment, signer: headTeacher.name })

  const commentsAvail = PAGE.h - M - y - 1
  const footerSpace = (hasSignature || hasStamp) ? 22 : 0
  const commentsSpace = commentsAvail - footerSpace
  if (commentsSpace >= 5 && commentRows.length > 0) {
    const rowH = Math.min(commentsSpace / commentRows.length, 8)
    commentRows.forEach((row, i) => {
      const cy = y + i * rowH
      // Divider line
      if (i > 0) {
        doc.setDrawColor(220, 220, 220)
        doc.setLineWidth(0.15)
        doc.line(M, cy, M + W, cy)
      }
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(5.5)
      doc.setTextColor(brand.r, brand.g, brand.b)
      doc.text(String(row.label).toUpperCase(), M, cy + 3)

      doc.setFont('helvetica', 'italic')
      doc.setFontSize(8)
      doc.setTextColor(40)
      const commentW = W - 55
      const lines = doc.splitTextToSize(String(row.comment || ''), commentW)
      doc.text(lines[0] || '', M, cy + 6)

      if (row.signer) {
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(120)
        doc.text(`— ${row.signer}`, M + W, cy + 6, { align: 'right' })
      }
      doc.setTextColor(0)
    })
    y += commentRows.length * rowH
  }

  // ── Signature footer ──
  const remainingFooter = PAGE.h - M - y
  if (remainingFooter >= 8 && (hasSignature || hasStamp)) {
    doc.setDrawColor(brand.r, brand.g, brand.b)
    doc.setLineWidth(0.35)
    doc.line(M, y, M + W, y)

    if (hasSignature) {
      const sigW = 40
      const sigH = Math.min(16, remainingFooter - 4)
      const sigX = M + W - sigW - (hasStamp ? 30 : 2)
      const sigY = y + 2
      try {
        doc.addImage(images.signature, detectImageFormat(images.signature),
          sigX, sigY, sigW, sigH, undefined, 'FAST')
        doc.setDrawColor(60, 60, 60)
        doc.setLineWidth(0.3)
        doc.line(sigX, sigY + sigH + 0.5, sigX + sigW, sigY + sigH + 0.5)
        doc.setFont('helvetica', 'normal')
        doc.setFontSize(6.5)
        doc.setTextColor(80)
        doc.text("Principal's signature", sigX + sigW / 2, sigY + sigH + 3, { align: 'center' })
        doc.setTextColor(0)
      } catch (err) { console.warn('Signature render failed:', err.message) }
    }
    if (hasStamp) {
      const stampSize = Math.min(24, remainingFooter - 3)
      const stampX = M + W - stampSize - 1
      const stampY = y + 2
      try {
        doc.addImage(images.stamp, detectImageFormat(images.stamp),
          stampX, stampY, stampSize, stampSize, undefined, 'FAST')
      } catch (err) { console.warn('Stamp render failed:', err.message) }
    }
  }

  return doc
}
