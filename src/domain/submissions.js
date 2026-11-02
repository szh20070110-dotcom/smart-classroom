export function findSubmission(assignmentId, studentId, submissions = []) {
  return (
    submissions.find(
      (submission) => submission.assignmentId === assignmentId && submission.studentId === studentId
    ) ?? null
  )
}

export function isLateSubmission(submission, assignment) {
  if (!submission?.submittedAt || !assignment?.dueAt) return false
  return new Date(submission.submittedAt).getTime() > new Date(assignment.dueAt).getTime()
}

export function isGradedSubmission(submission) {
  return Boolean(submission) && typeof submission.score === 'number' && Number.isFinite(submission.score)
}

function latestByStudent(assignmentId, studentIds, submissions) {
  const result = new Map()

  for (const submission of submissions) {
    if (!submission || submission.assignmentId !== assignmentId) continue
    if (!studentIds.has(submission.studentId)) continue
    const previous = result.get(submission.studentId)
    const currentTime = new Date(submission.submittedAt ?? 0).getTime()
    const previousTime = previous ? new Date(previous.submittedAt ?? 0).getTime() : -1
    if (!previous || currentTime >= previousTime) result.set(submission.studentId, submission)
  }

  return result
}

/**
 * 单次作业的提交情况。按学生去重，重复提交取最后一次。
 */
export function assignmentSubmissionStats(assignment, students = [], submissions = []) {
  const studentIds = new Set(students.filter(Boolean).map((student) => student.id))
  const submittedByStudent = latestByStudent(assignment.id, studentIds, submissions)

  let onTime = 0
  let late = 0
  for (const submission of submittedByStudent.values()) {
    if (isLateSubmission(submission, assignment)) late += 1
    else onTime += 1
  }

  const expected = studentIds.size
  const submitted = submittedByStudent.size

  return {
    assignmentId: assignment.id,
    title: assignment.title,
    expected,
    submitted,
    onTime,
    late,
    pending: Math.max(expected - submitted, 0),
    rate: expected > 0 ? submitted / expected : 0
  }
}

export function submissionOverview(students = [], assignments = [], submissions = []) {
  const byAssignment = assignments.map((assignment) =>
    assignmentSubmissionStats(assignment, students, submissions)
  )

  const expected = byAssignment.reduce((sum, item) => sum + item.expected, 0)
  const submitted = byAssignment.reduce((sum, item) => sum + item.submitted, 0)
  const late = byAssignment.reduce((sum, item) => sum + item.late, 0)

  return {
    expected,
    submitted,
    late,
    rate: expected > 0 ? submitted / expected : 0,
    byAssignment
  }
}

/**
 * 待批改：已提交但尚未打分的记录。
 */
export function pendingGrading(assignments = [], students = [], submissions = []) {
  const assignmentById = new Map(assignments.map((assignment) => [assignment.id, assignment]))
  const studentIds = new Set(students.filter(Boolean).map((student) => student.id))

  return submissions.filter(
    (submission) =>
      submission &&
      assignmentById.has(submission.assignmentId) &&
      studentIds.has(submission.studentId) &&
      !isGradedSubmission(submission)
  )
}

export function submissionRateOfStudent(studentId, assignments = [], submissions = []) {
  const relevant = assignments.filter(Boolean)
  if (!relevant.length) return 0

  const submitted = relevant.filter((assignment) =>
    findSubmission(assignment.id, studentId, submissions)
  ).length

  return submitted / relevant.length
}