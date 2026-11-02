export const DEFAULT_SCORE_BUCKETS = [
  { label: '0-59', min: 0, max: 59 },
  { label: '60-69', min: 60, max: 69 },
  { label: '70-79', min: 70, max: 79 },
  { label: '80-89', min: 80, max: 89 },
  { label: '90-100', min: 90, max: 100 }
]

export function isGraded(submission) {
  return Boolean(submission) && typeof submission.score === 'number' && Number.isFinite(submission.score)
}

export function mean(values = []) {
  const numbers = values.filter((value) => typeof value === 'number' && Number.isFinite(value))
  if (!numbers.length) return 0
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length
}

export function round(value, digits = 1) {
  if (!Number.isFinite(value)) return 0
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

export function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

/**
 * 把不同分值的作业统一换算为百分制，避免权重失衡。
 */
export function gradedScoreRecords(assignments = [], submissions = [], options = {}) {
  const { assignmentId = null, studentId = null } = options
  const assignmentById = new Map(
    assignments.filter(Boolean).map((assignment) => [assignment.id, assignment])
  )

  return submissions
    .filter((submission) => submission && isGraded(submission))
    .filter((submission) => assignmentById.has(submission.assignmentId))
    .filter((submission) => !assignmentId || submission.assignmentId === assignmentId)
    .filter((submission) => !studentId || submission.studentId === studentId)
    .map((submission) => {
      const assignment = assignmentById.get(submission.assignmentId)
      const points = Number(assignment.points) > 0 ? Number(assignment.points) : 100
      const percent = clamp((submission.score / points) * 100, 0, 100)
      return {
        submissionId: submission.id,
        assignmentId: submission.assignmentId,
        studentId: submission.studentId,
        score: submission.score,
        points,
        percent: round(percent, 2)
      }
    })
}

export function scoreStats(scores = []) {
  const numbers = scores
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .map((value) => clamp(value, 0, 100))

  if (!numbers.length) {
    return { count: 0, average: 0, highest: 0, lowest: 0, passRate: 0 }
  }

  const total = numbers.reduce((sum, value) => sum + value, 0)
  const passed = numbers.filter((value) => value >= 60).length

  return {
    count: numbers.length,
    average: round(total / numbers.length, 1),
    highest: round(Math.max(...numbers), 1),
    lowest: round(Math.min(...numbers), 1),
    passRate: round(passed / numbers.length, 3)
  }
}

/**
 * 分数分布：默认 5 个区间，返回数量与占比，可直接驱动 SVG 直方图。
 */
export function scoreDistribution(scores = [], buckets = DEFAULT_SCORE_BUCKETS) {
  const numbers = scores
    .filter((value) => typeof value === 'number' && Number.isFinite(value))
    .map((value) => clamp(value, 0, 100))

  const rows = buckets.map((bucket) => ({
    ...bucket,
    count: numbers.filter((value) => value >= bucket.min && value <= bucket.max).length
  }))

  return rows.map((row) => ({
    ...row,
    ratio: numbers.length > 0 ? row.count / numbers.length : 0
  }))
}

export function studentGradeSummary(studentId, assignments = [], submissions = []) {
  const rows = assignments.filter(Boolean).map((assignment) => {
    const submission =
      submissions.find(
        (item) => item.assignmentId === assignment.id && item.studentId === studentId
      ) ?? null
    const graded = isGraded(submission)
    const points = Number(assignment.points) > 0 ? Number(assignment.points) : 100

    return {
      assignmentId: assignment.id,
      title: assignment.title,
      dueAt: assignment.dueAt,
      points,
      submittedAt: submission?.submittedAt ?? null,
      status: !submission ? 'missing' : graded ? 'graded' : 'pending',
      score: graded ? submission.score : null,
      percent: graded ? round(clamp((submission.score / points) * 100, 0, 100), 1) : null,
      comment: submission?.comment ?? ''
    }
  })

  const gradedRows = rows.filter((row) => row.percent !== null)

  return {
    studentId,
    rows,
    average: round(mean(gradedRows.map((row) => row.percent)), 1),
    gradedCount: gradedRows.length,
    pendingCount: rows.filter((row) => row.status === 'pending').length,
    missingCount: rows.filter((row) => row.status === 'missing').length,
    submittedCount: rows.filter((row) => row.status !== 'missing').length
  }
}