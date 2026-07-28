/**
 * Report card renderer — Classic design.
 *
 * v10 — external palettes + grade-tier coloring + custom brand override.
 * The layout is unchanged from previous rounds; what's new:
 *   - Palettes imported from ./reportPalettes.js (5 options)
 *   - Grade cell colored by tier (A green, B blue, C amber, D orange, F red)
 *   - Optional custom brand color override from config.customBrandColor
 *   - 17-row subject padding (unchanged)
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
function autoNameFontSize(nameStr) {
  if (!nameStr) return 17
  if (nameStr.length > 32) return 12
  if (nameStr.length > 25) return 14
  if (nameStr.length > 18) return 16
  return 17
}
const RATING_MEANINGS = {
  5: 'Excellent degree of observation',
  4: 'High level of observation',
  3: 'Acceptable level of observation',
  2: 'Minimal level of observation',
  1: 'No regard for observation',
}
const TARGET_SUBJECT_ROWS = 17
const MUTED = [140, 140, 140]

export function renderDucams(input) {
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
  const TOTAL_HL = [245, 228, 180]

  const contact = readContact(school)
  const PAGE = { w: 210, h: 297 }
  const M = 8
  const W = PAGE.w - 2 * M

  const showWH = config.showWeightHeight === true
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
  const headerH = 36
  const logoR = 16
  const logoCX = M + logoR + 1
  const logoCY = y + headerH / 2

  if (hasLogo) {
    try {
      doc.addImage(images.logo, detectImageFormat(images.logo),
        logoCX - logoR, logoCY - logoR, logoR * 2, logoR * 2, undefined, 'FAST')
    } catch (err) {
      console.warn('Logo render failed:', err.message)
      drawLogoPlaceholder()
    }
  } else {
    drawLogoPlaceholder()
  }

  function drawLogoPlaceholder() {
    doc.setFillColor(brand.r, brand.g, brand.b)
    doc.circle(logoCX, logoCY, logoR, 'F')
    doc.setDrawColor(BG[0], BG[1], BG[2])
    doc.setLineWidth(1.5)
    doc.circle(logoCX, logoCY, logoR - 2.5, 'S')
    if (school?.shortName) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(BG[0], BG[1], BG[2])
      doc.text(String(school.shortName).toUpperCase().slice(0, 8),
        logoCX, logoCY + 1.5, { align: 'center' })
      doc.setTextColor(0)
    }
  }

  const photoW = 26
  const photoH = 32
  const photoX = M + W - photoW
  const photoY = y + (headerH - photoH) / 2

  if (hasPhoto) {
    try {
      doc.addImage(images.studentPhoto, detectImageFormat(images.studentPhoto),
        photoX, photoY, photoW, photoH, undefined, 'FAST')
      doc.setDrawColor(GRID[0], GRID[1], GRID[2])
      doc.setLineWidth(0.4)
      doc.rect(photoX, photoY, photoW, photoH, 'S')
    } catch (err) {
      console.warn('Photo render failed:', err.message)
      drawPhotoPlaceholder()
    }
  } else {
    drawPhotoPlaceholder()
  }

  function drawPhotoPlaceholder() {
    doc.setFillColor(PANEL[0], PANEL[1], PANEL[2])
    doc.setDrawColor(GRID[0], GRID[1], GRID[2])
    doc.setLineWidth(0.4)
    doc.rect(photoX, photoY, photoW, photoH, 'FD')
    doc.setFillColor(220, 215, 200)
    doc.circle(photoX + photoW / 2, photoY + 9, 3.5, 'F')
    doc.rect(photoX + 4, photoY + 15, photoW - 8, 11, 'F')
  }

  const infoLeft = M + logoR * 2 + 5
  const infoRight = photoX - 3
  const infoWidth = infoRight - infoLeft
  const infoCenter = (infoLeft + infoRight) / 2

  const nameStr = String(school?.name || '').toUpperCase()
  const nameFontSize = autoNameFontSize(nameStr)

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(nameFontSize)
  doc.setTextColor(brand.r, brand.g, brand.b)
  const nameLines = doc.splitTextToSize(nameStr, infoWidth)

  let ny = y + 6
  nameLines.slice(0, 2).forEach(line => {
    doc.text(line, infoCenter, ny, { align: 'center' })
    ny += nameFontSize * 0.42
  })

  const decorW = 32
  const underlineY = ny - 4
  doc.setDrawColor(brand.r, brand.g, brand.b)
  doc.setLineWidth(0.6)
  doc.line(infoCenter - decorW / 2, underlineY, infoCenter + decorW / 2, underlineY)

  ny = underlineY + 5
  doc.setTextColor(0)
  if (school?.address) {
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9.5)
    const addrLines = doc.splitTextToSize(school.address, infoWidth)
    addrLines.slice(0, 2).forEach(line => {
      doc.text(line, infoCenter, ny, { align: 'center' })
      ny += 3.8
    })
  }

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(8.5)
  const contactParts = []
  if (contact.phone) contactParts.push(`Tel: ${contact.phone}`)
  if (contact.email) contactParts.push(contact.email)
  if (contactParts.length > 0) {
    doc.text(contactParts.join('  •  '), infoCenter, ny, { align: 'center' })
    ny += 3.5
  }

  if (school?.motto) {
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(8.5)
    doc.setTextColor(brand.r, brand.g, brand.b)
    const mottoLine = doc.splitTextToSize(`"${school.motto}"`, infoWidth)[0] || ''
    doc.text(mottoLine, infoCenter, ny, { align: 'center' })
    doc.setTextColor(0)
  }

  y += headerH

  doc.setDrawColor(brand.r, brand.g, brand.b)
  doc.setLineWidth(0.8)
  doc.line(M, y, M + W, y)
  doc.setLineWidth(0.25)
  doc.line(M, y + 1, M + W, y + 1)
  y += 4

  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(0)
  doc.text('STUDENT RESULT SHEET', PAGE.w / 2, y + 3, { align: 'center' })
  y += 6

  const drawInfoPanel = (x, py, w, h, rows) => {
    doc.setFillColor(PANEL[0], PANEL[1], PANEL[2])
    doc.setDrawColor(GRID[0], GRID[1], GRID[2])
    doc.setLineWidth(0.25)
    doc.roundedRect(x, py, w, h, 1, 1, 'FD')
    const rowH = h / Math.max(rows.length, 1)
    doc.setFontSize(7)
    doc.setTextColor(0)
    rows.forEach(([label, value], i) => {
      const ry = py + i * rowH + rowH / 2 + 0.8
      if (i > 0) {
        doc.setDrawColor(230, 225, 210)
        doc.setLineWidth(0.15)
        doc.line(x + 1, py + i * rowH, x + w - 1, py + i * rowH)
      }
      doc.setFont('helvetica', 'normal')
      doc.text(String(label), x + 1.8, ry)
      doc.setFont('helvetica', 'bold')
      const val = String(value ?? '')
      const truncated = doc.splitTextToSize(val, w * 0.5 - 3)[0] || ''
      doc.text(truncated, x + w * 0.48, ry)
    })
  }

  const gap = 1.5
  const p1w = (W - 2 * gap) / 3

  const row1H = 14
  drawInfoPanel(M, y, p1w, row1H, [
    ['Name of student', student.fullName || ''],
    ['Class', className || ''],
    ['Admission No.', student.admissionNumber || ''],
  ])
  drawInfoPanel(M + p1w + gap, y, p1w, row1H, [
    ['Session', term?.academicYear || ''],
    ['Term', term?.termNumber ? ordinal(term.termNumber) : (term?.name || '')],
    ['Next term begins', term?.resumesOn || ''],
  ])
  drawInfoPanel(M + 2 * (p1w + gap), y, p1w, row1H, [
    ['Age', age !== null && age !== undefined ? `${age} yrs` : ''],
    ['Gender', student.gender ? cap(student.gender) : ''],
    ['Term ended', term?.closingDate || ''],
  ])
  y += row1H + gap

  if (showWH && (student.weight || student.height)) {
    const stripH = 7
    doc.setFillColor(PANEL[0], PANEL[1], PANEL[2])
    doc.setDrawColor(GRID[0], GRID[1], GRID[2])
    doc.setLineWidth(0.25)
    doc.roundedRect(M, y, W, stripH, 1, 1, 'FD')
    doc.setFontSize(8)
    doc.setTextColor(0)
    const items = []
    if (student.weight) items.push(['Weight', `${student.weight} kg`])
    if (student.height) items.push(['Height', `${student.height} cm`])
    const itemW = W / Math.max(items.length, 1)
    items.forEach(([label, val], i) => {
      const cx = M + i * itemW + itemW / 2
      doc.setFont('helvetica', 'normal')
      doc.text(String(label) + ':', cx - 12, y + 4.5)
      doc.setFont('helvetica', 'bold')
      doc.text(String(val), cx + 3, y + 4.5)
    })
    y += stripH + gap
  }

  const row2H = 25
  drawInfoPanel(M, y, p1w, row2H, [
    ['Overall total score', String(report.totalObtained)],
    ["Student's average", `${report.percentageAverage}%`],
    ['Position in class', report.overallPosition ? ordinal(report.overallPosition) : '—'],
    ['Overall grade', report.overallGrade || '—'],
    ['Overall performance', report.overallRemark || ''],
  ])
  drawInfoPanel(M + p1w + gap, y, p1w, row2H, [
    ['Class size', String(report.classSize)],
    ['Class average score', `${report.classAverage}%`],
    ['Highest in class', report.classHighestPct != null ? `${report.classHighestPct}%` : `${report.percentageAverage}%`],
    ['Lowest in class', report.classLowestPct != null ? `${report.classLowestPct}%` : '—'],
    ['Subjects offered', String(report.subjects.length)],
  ])

  const rightX = M + 2 * (p1w + gap)
  doc.setFillColor(PANEL[0], PANEL[1], PANEL[2])
  doc.setDrawColor(GRID[0], GRID[1], GRID[2])
  doc.setLineWidth(0.25)
  doc.roundedRect(rightX, y, p1w, row2H, 1, 1, 'FD')
  const attItems = [
    ['Days school opened', attendance?.timesOpened ?? '—'],
    ['Days present',       attendance?.daysPresent ?? '—'],
    ['Days absent',        attendance?.daysAbsent ?? '—'],
    ['Attendance rate',    attendance?.percentage != null ? `${attendance.percentage}%` : '—'],
  ]
  const attRowH = 3.5
  doc.setFontSize(7)
  attItems.forEach(([label, val], i) => {
    const ry = y + i * attRowH + attRowH / 2 + 0.8
    if (i > 0) {
      doc.setDrawColor(230, 225, 210)
      doc.setLineWidth(0.15)
      doc.line(rightX + 1, y + i * attRowH, rightX + p1w - 1, y + i * attRowH)
    }
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(0)
    doc.text(String(label), rightX + 1.8, ry)
    doc.setFont('helvetica', 'bold')
    doc.text(String(val), rightX + p1w * 0.48, ry)
  })
  const promoted = report.overallGrade && /^[AB]/.test(report.overallGrade)
  const badgeH = row2H - attRowH * 4 - 2
  const badgeY = y + attRowH * 4 + 1
  if (badgeH > 4) {
    doc.setFillColor(brand.r, brand.g, brand.b)
    doc.roundedRect(rightX + 2, badgeY, p1w - 4, badgeH, 1, 1, 'F')
    doc.setTextColor(255)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.text(promoted ? 'PROMOTED' : 'RESULT ISSUED',
      rightX + p1w / 2, badgeY + badgeH / 2 + 1.5, { align: 'center' })
    doc.setTextColor(0)
  }

  y += row2H + 3

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
    ...(showCols.pos  ? ['POSITION']       : []),
    ...(showCols.avg  ? ['CLASS\nAVG']     : []),
    ...(showCols.high ? ['CLASS\nHIGH']    : []),
    ...(showCols.low  ? ['CLASS\nLOW']     : []),
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
  while (body.length < TARGET_SUBJECT_ROWS) {
    body.push(new Array(headLabels.length).fill(''))
  }

  const signatureRowH = (hasSignature || hasStamp) ? 8 : 0
  const commentCount = (showAdviser && adviser?.comment ? 1 : 0) +
                       (classTeacher?.comment ? 1 : 0) +
                       (headTeacher?.comment ? 1 : 0)
  const bottomReserve = 55 + (commentCount * 6.5) + signatureRowH + 4

  const tableSpace = PAGE.h - M - y - bottomReserve
  const perRow = Math.max(4, Math.min(7, (tableSpace - 14) / TARGET_SUBJECT_ROWS))
  const fontSize = perRow >= 6 ? 7.5 : perRow >= 5 ? 7 : perRow >= 4.5 ? 6.5 : 6

  autoTable(doc, {
    startY: y,
    head: [headLabels],
    body,
    margin: { left: M, right: M },
    tableWidth: 'auto',
    styles: {
      fontSize, cellPadding: 1, valign: 'middle', halign: 'center',
      minCellHeight: perRow, textColor: 0,
      lineColor: GRID, lineWidth: 0.15,
      fillColor: PANEL,
    },
    headStyles: {
      fillColor: [brand.r, brand.g, brand.b],
      textColor: 255,
      fontSize: 6.5,
      halign: 'center', valign: 'middle',
      fontStyle: 'bold',
      minCellHeight: 12,
      cellPadding: 1,
    },
    columnStyles: {
      0: { halign: 'left', fontStyle: 'bold', cellWidth: 42 },
      [remarkColIdx]: { halign: 'left', cellWidth: 22 },
    },
    alternateRowStyles: { fillColor: ALT },
    theme: 'grid',
    didParseCell: (data) => {
      if (data.section !== 'body') return
      const isEmpty = !data.row.raw[0]
      if (isEmpty) return
      if (data.column.index === totalColIdx) {
        data.cell.styles.fillColor = TOTAL_HL
        data.cell.styles.fontStyle = 'bold'
      }
      if (data.column.index === gradeColIdx) {
        const gradeStr = String(data.cell.raw || '')
        const gc = gradeCellColors(gradeStr)
        data.cell.styles.fillColor = gc.bg
        data.cell.styles.textColor = gc.text
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })
  y = doc.lastAutoTable.finalY + 3

  const bottomY = y
  const psy = psychomotor?.filter(s => s.rating > 0) || []
  const aff = affective?.filter(s => s.rating > 0) || []

  const col3W = (W - 4) / 3
  const col1X = M
  const col2X = M + col3W + 2
  const col3X = M + 2 * (col3W + 2)

  const drawSectionHeader = (x, sy, w, title) => {
    doc.setFillColor(brand.r, brand.g, brand.b)
    doc.rect(x, sy, w, 5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6.8)
    doc.setTextColor(255)
    doc.text(title, x + 2, sy + 3.5)
    doc.text('RATING', x + w - 2, sy + 3.5, { align: 'right' })
    doc.setTextColor(0)
    return sy + 5
  }

  const drawSimpleTable = (x, sy, w, title, rows) => {
    let ry = drawSectionHeader(x, sy, w, title)
    const rowH = 3.2
    rows.forEach(([label, val], i) => {
      doc.setFillColor(i % 2 === 0 ? ALT[0] : PANEL[0], i % 2 === 0 ? ALT[1] : PANEL[1], i % 2 === 0 ? ALT[2] : PANEL[2])
      doc.rect(x, ry, w, rowH, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(6.4)
      doc.setTextColor(0)
      const label1 = doc.splitTextToSize(String(label), w - 8)[0] || String(label)
      doc.text(label1, x + 2, ry + 2.2)
      doc.setFont('helvetica', 'bold')
      doc.text(String(val), x + w - 2, ry + 2.2, { align: 'right' })
      ry += rowH
    })
    doc.setDrawColor(GRID[0], GRID[1], GRID[2])
    doc.setLineWidth(0.2)
    doc.rect(x, sy, w, ry - sy, 'S')
    return ry
  }

  const drawEmptyStateSection = (x, sy, w, title) => {
    let ry = drawSectionHeader(x, sy, w, title)
    const emptyH = 10
    doc.setFillColor(PANEL[0], PANEL[1], PANEL[2])
    doc.rect(x, ry, w, emptyH, 'F')
    doc.setFont('helvetica', 'italic')
    doc.setFontSize(6.8)
    doc.setTextColor(MUTED[0], MUTED[1], MUTED[2])
    doc.text('Not recorded', x + w / 2, ry + emptyH / 2 + 0.5, { align: 'center' })
    doc.setTextColor(0)
    ry += emptyH
    doc.setDrawColor(GRID[0], GRID[1], GRID[2])
    doc.setLineWidth(0.2)
    doc.rect(x, sy, w, ry - sy, 'S')
    return ry
  }

  let c1Y = bottomY, c2Y = bottomY, c3Y = bottomY

  if (config.showAffective !== false) {
    if (aff.length > 0) {
      c1Y = drawSimpleTable(col1X, bottomY, col3W, 'AFFECTIVE TRAITS',
        aff.map(x => [x.name, x.rating]))
    } else {
      c1Y = drawEmptyStateSection(col1X, bottomY, col3W, 'AFFECTIVE TRAITS')
    }
  }

  if (config.showPsychomotor !== false) {
    if (psy.length > 0) {
      c2Y = drawSimpleTable(col2X, bottomY, col3W, 'PSYCHOMOTOR SKILLS',
        psy.map(x => [x.name, x.rating]))
    } else {
      c2Y = drawEmptyStateSection(col2X, bottomY, col3W, 'PSYCHOMOTOR SKILLS')
    }
  }

  const grading = school?.gradingScale || []
  if (grading.length > 0) {
    doc.setFillColor(brand.r, brand.g, brand.b)
    doc.rect(col3X, c3Y, col3W, 5, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(5.5)
    doc.setTextColor(255)
    const gw1 = col3W * 0.32
    const gw2 = col3W * 0.16
    const gw3 = col3W * 0.18
    doc.text('SCORE', col3X + 1, c3Y + 3.5)
    doc.text('GRADE', col3X + gw1 + 1, c3Y + 3.5)
    doc.text('POINT', col3X + gw1 + gw2 + 1, c3Y + 3.5)
    doc.text('MEANING', col3X + gw1 + gw2 + gw3 + 1, c3Y + 3.5)
    doc.setTextColor(0)
    c3Y += 5

    const gRowH = 2.7
    grading.slice(0, 9).forEach((g, i) => {
      const gc = gradeCellColors(g.grade)
      doc.setFillColor(gc.bg[0], gc.bg[1], gc.bg[2])
      doc.rect(col3X, c3Y, col3W, gRowH, 'F')
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.6)
      doc.setTextColor(gc.text[0], gc.text[1], gc.text[2])
      doc.text(`${g.min}-${g.max}%`, col3X + 1, c3Y + 1.9)
      doc.setFont('helvetica', 'bold')
      doc.text(String(g.grade || ''), col3X + gw1 + 1, c3Y + 1.9)
      doc.setFont('helvetica', 'normal')
      doc.text(gradePoint(g.grade), col3X + gw1 + gw2 + 1, c3Y + 1.9)
      const remark = doc.splitTextToSize(String(g.remark || ''), col3W - gw1 - gw2 - gw3 - 2)[0] || ''
      doc.text(remark, col3X + gw1 + gw2 + gw3 + 1, c3Y + 1.9)
      doc.setTextColor(0)
      c3Y += gRowH
    })
    doc.setDrawColor(GRID[0], GRID[1], GRID[2])
    doc.setLineWidth(0.2)
    doc.rect(col3X, bottomY, col3W, c3Y - bottomY, 'S')

    c3Y += 1
    doc.setFillColor(brand.r, brand.g, brand.b)
    doc.rect(col3X, c3Y, col3W, 4, 'F')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(6)
    doc.setTextColor(255)
    doc.text('RATING SCALE', col3X + col3W / 2, c3Y + 2.8, { align: 'center' })
    doc.setTextColor(0)
    c3Y += 4

    const rw1 = col3W * 0.1
    const rRowH = 2.7
    const startRating = c3Y
    for (let r = 5; r >= 1; r--) {
      const idx = 5 - r
      doc.setFillColor(idx % 2 === 0 ? ALT[0] : PANEL[0], idx % 2 === 0 ? ALT[1] : PANEL[1], idx % 2 === 0 ? ALT[2] : PANEL[2])
      doc.rect(col3X, c3Y, col3W, rRowH, 'F')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(6)
      doc.setTextColor(0)
      doc.text(String(r), col3X + rw1 / 2, c3Y + 1.9, { align: 'center' })
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(5.4)
      const line = doc.splitTextToSize(RATING_MEANINGS[r], col3W - rw1 - 2)[0] || ''
      doc.text(line, col3X + rw1 + 1, c3Y + 1.9)
      c3Y += rRowH
    }
    doc.setDrawColor(GRID[0], GRID[1], GRID[2])
    doc.setLineWidth(0.2)
    doc.rect(col3X, startRating - 4, col3W, c3Y - (startRating - 4), 'S')
  }

  y = Math.max(c1Y, c2Y, c3Y) + 3

  const commentRows = []
  if (showAdviser && adviser?.comment) {
    commentRows.push({ label: "Academic adviser's report", comment: adviser.comment, signer: adviser.name || 'Academic Adviser' })
  }
  if (config.showTeacherComment !== false && classTeacher?.comment) {
    commentRows.push({ label: "Class teacher's report", comment: classTeacher.comment, signer: classTeacher.name })
  }
  if (config.showHeadTeacherComment !== false && headTeacher?.comment) {
    commentRows.push({ label: `${headTeacher.title || 'Principal'}'s report`, comment: headTeacher.comment, signer: headTeacher.name })
  }

  const commentsAvail = PAGE.h - M - y - 1
  const footerSpace = (hasSignature || hasStamp) ? 18 : 0
  const commentsSpace = commentsAvail - footerSpace
  if (commentsSpace >= 5 && commentRows.length > 0) {
    const rowH = Math.min(commentsSpace / commentRows.length, 7)
    commentRows.forEach((row, i) => {
      const cy = y + i * rowH
      doc.setFillColor(PANEL[0], PANEL[1], PANEL[2])
      doc.setDrawColor(GRID[0], GRID[1], GRID[2])
      doc.setLineWidth(0.25)
      doc.rect(M, cy, W, rowH, 'FD')
      doc.setFillColor(ALT[0], ALT[1], ALT[2])
      doc.rect(M, cy, W * 0.28, rowH, 'F')
      doc.setDrawColor(GRID[0], GRID[1], GRID[2])
      doc.rect(M, cy, W * 0.28, rowH, 'S')
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(7.8)
      doc.setTextColor(0)
      doc.text(String(row.label), M + 2, cy + rowH / 2 + 1)
      doc.setFont('helvetica', 'normal')
      const commentX = M + W * 0.28 + 2
      const commentW = W - W * 0.28 - 4 - 50
      const lines = doc.splitTextToSize(String(row.comment || ''), commentW)
      doc.text(lines[0] || '', commentX, cy + rowH / 2 + 1)
      if (row.signer) {
        doc.setFont('helvetica', 'italic')
        doc.setFontSize(7)
        doc.setTextColor(120)
        doc.text(`— ${row.signer}`, M + W - 2, cy + rowH - 1.5, { align: 'right' })
        doc.setTextColor(0)
      }
    })
    y += commentRows.length * rowH
  }

  const remainingFooter = PAGE.h - M - y
  if (remainingFooter >= 8 && (hasSignature || hasStamp)) {
    if (hasSignature) {
      const sigW = 35
      const sigH = Math.min(14, remainingFooter - 2)
      const sigX = M + W - sigW - (hasStamp ? 26 : 2)
      const sigY = y + 1
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
      } catch (err) {
        console.warn('Signature render failed:', err.message)
      }
    }
    if (hasStamp) {
      const stampSize = Math.min(22, remainingFooter - 1)
      const stampX = M + W - stampSize - 1
      const stampY = y + 1
      try {
        doc.addImage(images.stamp, detectImageFormat(images.stamp),
          stampX, stampY, stampSize, stampSize, undefined, 'FAST')
      } catch (err) {
        console.warn('Stamp render failed:', err.message)
      }
    }
  }

  return doc
}
