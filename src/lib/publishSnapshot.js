/**
 * Publish snapshot builder
 * ------------------------
 * When a report card is published, we freeze the computed data (positions,
 * class averages, highest, lowest) inside the doc so future score edits
 * don't retroactively change published reports.
 */

export function buildPublishSnapshot({ report, subjects }) {
  return {
    totalObtained: report.totalObtained,
    totalPossible: report.totalPossible,
    percentageAverage: report.percentageAverage,
    overallGrade: report.overallGrade,
    overallRemark: report.overallRemark,
    overallPosition: report.overallPosition,
    classSize: report.classSize,
    classAverage: report.classAverage,
    classHighestPct: report.classHighestPct,
    classLowestPct: report.classLowestPct,
    subjects: subjects.map(s => ({
      subjectId: s.subjectId,
      subjectName: s.subjectName,
      subjectCode: s.subjectCode,
      assessments: Array.isArray(s.assessments) ? s.assessments : Object.entries(s.assessments).map(([id, a]) => ({
        assessmentId: id, code: a.code, name: a.name, score: a.score, maxScore: a.maxScore,
      })),
      total: s.total,
      maxTotal: s.maxTotal,
      percentage: s.percentage,
      grade: s.grade,
      remark: s.remark,
      classPosition: s.classPosition,
      classAverage: s.classAverage,
      classHighest: s.classHighest,
      classLowest: s.classLowest,
    })),
  }
}
