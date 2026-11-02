export const ATTENDANCE_STATUSES = ['present', 'late', 'absent', 'leave']
export const ATTENDED_STATUSES = ['present', 'late']

export const ATTENDANCE_LABELS = {
  present: '已签到',
  late: '迟到',
  absent: '缺勤',
  leave: '请假'
}

export function normalizeAttendanceStatus(status) {
  return ATTENDANCE_STATUSES.includes(status) ? status : 'absent'
}

export function isAttended(record) {
  return Boolean(record) && ATTENDED_STATUSES.includes(normalizeAttendanceStatus(record.status))
}

function ratio(part, total) {
  if (!total || total <= 0) return 0
  return part / total
}

/**
 * 单次课堂点名统计。
 * 未签到的学生按缺勤计入，请假独立统计且不计入出勤。
 */
export function sessionAttendance(session, students = [], records = []) {
  const rosterStudents = students.filter(Boolean)
  const studentIds = new Set(rosterStudents.map((student) => student.id))
  const recordByStudent = new Map()

  for (const record of records) {
    if (!record || record.sessionId !== session.id) continue
    if (!studentIds.has(record.studentId)) continue
    if (recordByStudent.has(record.studentId)) continue
    recordByStudent.set(record.studentId, record)
  }

  const roster = rosterStudents.map((student) => {
    const record = recordByStudent.get(student.id) ?? null
    const status = record ? normalizeAttendanceStatus(record.status) : 'absent'
    return {
      studentId: student.id,
      name: student.name,
      status,
      checkedIn: Boolean(record),
      checkedAt: record?.checkedAt ?? null
    }
  })

  const counts = { present: 0, late: 0, absent: 0, leave: 0 }
  for (const entry of roster) counts[entry.status] += 1

  const attended = counts.present + counts.late

  return {
    sessionId: session.id,
    total: roster.length,
    present: counts.present,
    late: counts.late,
    leave: counts.leave,
    absent: counts.absent,
    attended,
    rate: ratio(attended, roster.length),
    roster
  }
}

/**
 * 整个班级的点名总览，同时给出每次课与每名学生的出勤率。
 */
export function attendanceOverview(students = [], sessions = [], records = []) {
  const rosterStudents = students.filter(Boolean)
  const bySession = sessions.map((session) => sessionAttendance(session, rosterStudents, records))

  const totalSlots = bySession.reduce((sum, item) => sum + item.total, 0)
  const attended = bySession.reduce((sum, item) => sum + item.attended, 0)

  const byStudent = rosterStudents.map((student) => {
    const entries = bySession
      .map((item) => item.roster.find((entry) => entry.studentId === student.id))
      .filter(Boolean)
    const attendedCount = entries.filter((entry) => ATTENDED_STATUSES.includes(entry.status)).length

    return {
      studentId: student.id,
      name: student.name,
      sessions: entries.length,
      attended: attendedCount,
      rate: ratio(attendedCount, entries.length)
    }
  })

  return {
    totalSlots,
    attended,
    missed: Math.max(totalSlots - attended, 0),
    rate: ratio(attended, totalSlots),
    bySession,
    byStudent
  }
}

export function attendanceRateOfStudent(studentId, students = [], sessions = [], records = []) {
  const overview = attendanceOverview(students, sessions, records)
  return overview.byStudent.find((item) => item.studentId === studentId) ?? null
}