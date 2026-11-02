import { sessionAttendance } from './attendance.js'
import { gradedScoreRecords, mean, round } from './grades.js'

export const DAY_MS = 24 * 60 * 60 * 1000

function toDate(value) {
  const date = value instanceof Date ? new Date(value) : new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

/**
 * 以周一为起点，返回当天 00:00 的 Date。
 */
export function startOfWeek(value = new Date()) {
  const date = toDate(value) ?? new Date()
  const offset = (date.getDay() + 6) % 7
  date.setHours(0, 0, 0, 0)
  date.setDate(date.getDate() - offset)
  return date
}

export function dateKey(value) {
  const date = toDate(value)
  if (!date) return ''
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function weekKey(value) {
  return dateKey(startOfWeek(value))
}

export function weekLabel(value) {
  const date = startOfWeek(value)
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

/**
 * 生成连续的周桶（升序），最后一个桶是 endDate 所在周。
 */
export function weekBuckets(endDate = new Date(), count = 3) {
  const end = startOfWeek(endDate)
  const size = Math.max(1, Math.floor(count))
  return Array.from({ length: size }, (_, index) => {
    const start = new Date(end)
    start.setDate(start.getDate() - (size - 1 - index) * 7)
    return start
  })
}

/**
 * 按周聚合：提交数、平均分、出勤率。
 * 平均分为百分制；没有批改数据的周为 null，方便折线图断点。
 */
export function weeklyTrend({
  students = [],
  sessions = [],
  assignments = [],
  attendance = [],
  submissions = [],
  endDate = new Date(),
  weeks = 3
} = {}) {
  const buckets = weekBuckets(endDate, weeks)
  const bucketMap = new Map(
    buckets.map((start, index) => [
      dateKey(start),
      {
        index,
        weekStart: dateKey(start),
        label: weekLabel(start),
        sessionCount: 0,
        attendedSlots: 0,
        totalSlots: 0,
        submissionCount: 0,
        gradedPercents: []
      }
    ])
  )

  for (const session of sessions) {
    const key = weekKey(session.time)
    const bucket = bucketMap.get(key)
    if (!bucket) continue
    const stats = sessionAttendance(session, students, attendance)
    bucket.sessionCount += 1
    bucket.totalSlots += stats.total
    bucket.attendedSlots += stats.attended
  }

  for (const submission of submissions) {
    const key = weekKey(submission.submittedAt)
    const bucket = bucketMap.get(key)
    if (!bucket) continue
    bucket.submissionCount += 1
  }

  for (const record of gradedScoreRecords(assignments, submissions)) {
    const submission = submissions.find((item) => item.id === record.submissionId)
    if (!submission?.submittedAt) continue
    const bucket = bucketMap.get(weekKey(submission.submittedAt))
    if (!bucket) continue
    bucket.gradedPercents.push(record.percent)
  }

  return buckets.map((start) => {
    const bucket = bucketMap.get(dateKey(start))
    return {
      weekStart: bucket.weekStart,
      label: bucket.label,
      sessions: bucket.sessionCount,
      submissions: bucket.submissionCount,
      attendanceRate: bucket.totalSlots > 0 ? round(bucket.attendedSlots / bucket.totalSlots, 3) : null,
      averageScore: bucket.gradedPercents.length
        ? round(mean(bucket.gradedPercents), 1)
        : null
    }
  })
}

export function weeklySubmissionTrend(submissions = [], endDate = new Date(), weeks = 3) {
  const buckets = weekBuckets(endDate, weeks)
  const counts = new Map(buckets.map((start) => [dateKey(start), 0]))

  for (const submission of submissions) {
    const key = weekKey(submission.submittedAt)
    if (counts.has(key)) counts.set(key, counts.get(key) + 1)
  }

  return buckets.map((start) => ({
    weekStart: dateKey(start),
    label: weekLabel(start),
    value: counts.get(dateKey(start))
  }))
}