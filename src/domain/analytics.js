import { attendanceOverview } from './attendance.js'
import { pendingGrading, submissionOverview } from './submissions.js'
import { gradedScoreRecords, scoreDistribution, scoreStats } from './grades.js'
import { weeklyTrend } from './trend.js'

export function todaySessions(sessions = [], now = new Date()) {
  const year = now.getFullYear()
  const month = now.getMonth()
  const day = now.getDate()

  return sessions
    .filter((session) => {
      const date = new Date(session.time)
      return (
        date.getFullYear() === year && date.getMonth() === month && date.getDate() === day
      )
    })
    .sort((a, b) => new Date(a.time) - new Date(b.time))
}

export function buildClassAnalytics({
  students = [],
  sessions = [],
  assignments = [],
  attendance = [],
  submissions = [],
  endDate = new Date(),
  weeks = 3
} = {}) {
  const attendanceStats = attendanceOverview(students, sessions, attendance)
  const submissionStats = submissionOverview(students, assignments, submissions)
  const scoreRecords = gradedScoreRecords(assignments, submissions)
  const scores = scoreRecords.map((record) => record.percent)

  const studentById = new Map(students.map((student) => [student.id, student]))
  const assignmentById = new Map(
    assignments.map((assignment) => [assignment.id, assignment])
  )

  const pending = pendingGrading(assignments, students, submissions)
    .map((submission) => ({
      ...submission,
      studentName: studentById.get(submission.studentId)?.name ?? '未知学生',
      assignmentTitle: assignmentById.get(submission.assignmentId)?.title ?? '未知作业',
      points: assignmentById.get(submission.assignmentId)?.points ?? 100
    }))
    .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))

  return {
    attendance: attendanceStats,
    submissions: submissionStats,
    grades: {
      ...scoreStats(scores),
      distribution: scoreDistribution(scores),
      records: scoreRecords
    },
    trend: weeklyTrend({
      students,
      sessions,
      assignments,
      attendance,
      submissions,
      endDate,
      weeks
    }),
    pending
  }
}

export function buildStudentAnalytics({
  student,
  students = [],
  sessions = [],
  assignments = [],
  attendance = [],
  submissions = []
} = {}) {
  if (!student) return null

  const attendanceStats = attendanceOverview(students, sessions, attendance)
  const mine = attendanceStats.byStudent.find((item) => item.studentId === student.id)
  const ownSubmissions = submissions.filter((item) => item.studentId === student.id)
  const scoreRecords = gradedScoreRecords(assignments, ownSubmissions)
  const submittedCount = assignments.filter((assignment) =>
    ownSubmissions.some((item) => item.assignmentId === assignment.id)
  ).length

  return {
    attendance: mine ?? { studentId: student.id, name: student.name, sessions: 0, attended: 0, rate: 0 },
    submissionRate: assignments.length ? submittedCount / assignments.length : 0,
    submittedCount,
    assignmentCount: assignments.length,
    grades: {
      ...scoreStats(scoreRecords.map((record) => record.percent)),
      records: scoreRecords
    },
    pendingCount: ownSubmissions.filter(
      (item) => typeof item.score !== 'number' || !Number.isFinite(item.score)
    ).length
  }
}