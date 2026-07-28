/**
 * Report Card Computation
 * -----------------------
 * Pure functions. Given raw data, produce everything that appears on a
 * Nigerian standard report card:
 *  - Per-subject: total, grade, remark, class position, class average,
 *    class highest, class lowest
 *  - Overall: total obtained/possible, percentage, grade, position,
 *    class average, class highest, class lowest
 */

export function computeStudentSubjects(studentId, subjects, assessments, results) {
  return subjects.map(subject => {
    const subjectResults = results.filter(
      r => r.studentId === studentId && r.subjectId === subject.id
    )
    const assessmentScores = {}
    let total = 0
    let maxTotal = 0
    assessments.forEach(a => {
      const r = subjectResults.find(x => x.assessmentId === a.id)
      const score = r ? Number(r.score) : 0
      assessmentScores[a.id] = { code: a.code, name: a.name, score, maxScore: a.maxScore }
      total += score
      maxTotal += a.maxScore
    })
    return {
      subjectId: subject.id,
      subjectName: subject.name,
      subjectCode: subject.code,
      assessments: assessmentScores,
      total,
      maxTotal,
    }
  })
}

export function gradeFor(percentage, gradingScale) {
  const scale = gradingScale || []
  const match = scale.find(g => percentage >= g.min && percentage <= g.max)
  return match ? { grade: match.grade, remark: match.remark } : { grade: '-', remark: '-' }
}

export function computeClassReports({ students, subjects, assessments, results, gradingScale }) {
  const reports = new Map()

  const perStudentSubjects = students.map(student => ({
    student,
    subjects: computeStudentSubjects(student.id, subjects, assessments, results),
  }))

  // For each subject: average, positions, highest, lowest
  const subjectStats = new Map()
  subjects.forEach(subject => {
    const totals = perStudentSubjects.map(p => ({
      studentId: p.student.id,
      total: p.subjects.find(s => s.subjectId === subject.id)?.total || 0,
    }))
    const sum = totals.reduce((s, t) => s + t.total, 0)
    const average = totals.length > 0 ? sum / totals.length : 0
    const highest = totals.length > 0 ? Math.max(...totals.map(t => t.total)) : 0
    const lowest = totals.length > 0 ? Math.min(...totals.map(t => t.total)) : 0

    // Position: sort desc, handle ties
    const sorted = [...totals].sort((a, b) => b.total - a.total)
    const positions = new Map()
    let rank = 0
    let lastScore = null
    sorted.forEach((entry, i) => {
      if (entry.total !== lastScore) { rank = i + 1; lastScore = entry.total }
      positions.set(entry.studentId, rank)
    })

    subjectStats.set(subject.id, { average, positions, highest, lowest })
  })

  // Overall totals
  const overallTotals = perStudentSubjects.map(p => {
    const totalObtained = p.subjects.reduce((s, sub) => s + sub.total, 0)
    const totalPossible = p.subjects.reduce((s, sub) => s + sub.maxTotal, 0)
    return { studentId: p.student.id, totalObtained, totalPossible }
  })

  const percentages = overallTotals.map(o => ({
    studentId: o.studentId,
    percentage: o.totalPossible > 0 ? (o.totalObtained / o.totalPossible) * 100 : 0,
  }))
  const overallClassAverage = percentages.length > 0
    ? percentages.reduce((s, p) => s + p.percentage, 0) / percentages.length : 0
  const overallHighest = percentages.length > 0 ? Math.max(...percentages.map(p => p.percentage)) : 0
  const overallLowest = percentages.length > 0 ? Math.min(...percentages.map(p => p.percentage)) : 0

  const sortedOverall = [...percentages].sort((a, b) => b.percentage - a.percentage)
  const overallPositions = new Map()
  let currRank = 0
  let lastPct = null
  sortedOverall.forEach((entry, i) => {
    if (entry.percentage !== lastPct) { currRank = i + 1; lastPct = entry.percentage }
    overallPositions.set(entry.studentId, currRank)
  })

  perStudentSubjects.forEach(p => {
    const student = p.student
    const overallEntry = overallTotals.find(o => o.studentId === student.id)
    const pctEntry = percentages.find(pc => pc.studentId === student.id)
    const percentageAverage = pctEntry?.percentage || 0

    const enrichedSubjects = p.subjects.map(sub => {
      const stats = subjectStats.get(sub.subjectId)
      const percentage = sub.maxTotal > 0 ? (sub.total / sub.maxTotal) * 100 : 0
      const { grade, remark } = gradeFor(percentage, gradingScale)
      return {
        ...sub,
        percentage: Math.round(percentage * 10) / 10,
        grade, remark,
        classPosition: stats?.positions.get(student.id) || null,
        classAverage: Math.round((stats?.average || 0) * 10) / 10,
        classHighest: stats?.highest || 0,
        classLowest: stats?.lowest || 0,
      }
    })

    const { grade: overallGrade, remark: overallRemark } = gradeFor(percentageAverage, gradingScale)

    reports.set(student.id, {
      studentId: student.id,
      subjects: enrichedSubjects,
      totalObtained: overallEntry?.totalObtained || 0,
      totalPossible: overallEntry?.totalPossible || 0,
      percentageAverage: Math.round(percentageAverage * 10) / 10,
      overallGrade,
      overallRemark,
      overallPosition: overallPositions.get(student.id) || null,
      classSize: students.length,
      classAverage: Math.round(overallClassAverage * 10) / 10,
      classHighestPct: Math.round(overallHighest * 10) / 10,
      classLowestPct: Math.round(overallLowest * 10) / 10,
    })
  })

  return reports
}

export function ordinal(n) {
  if (!n) return '-'
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

/**
 * Calculate age from date of birth (as YYYY-MM-DD string or Date)
 */
export function calculateAge(dob, asOf = new Date()) {
  if (!dob) return null
  const birth = typeof dob === 'string' ? new Date(dob) : dob
  if (isNaN(birth.getTime())) return null
  const ref = asOf instanceof Date ? asOf : new Date(asOf)
  let age = ref.getFullYear() - birth.getFullYear()
  const m = ref.getMonth() - birth.getMonth()
  if (m < 0 || (m === 0 && ref.getDate() < birth.getDate())) age--
  return age >= 0 ? age : null
}

/**
 * Compute attendance percentage. Returns 0-100.
 */
export function attendancePercentage(present, opened) {
  const p = Number(present) || 0
  const o = Number(opened) || 0
  if (o === 0) return null
  return Math.round((p / o) * 100 * 10) / 10
}
