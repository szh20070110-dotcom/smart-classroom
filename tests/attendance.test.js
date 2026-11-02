import { describe, expect, it } from 'vitest'
import {
  attendanceOverview,
  isAttended,
  normalizeAttendanceStatus,
  sessionAttendance
} from '../src/domain/attendance.js'

const students = [
  { id: 's1', name: '林小雨' },
  { id: 's2', name: '陈子昂' },
  { id: 's3', name: '周思远' }
]

const session = { id: 'c1', time: '2026-10-20T09:00:00+08:00' }

describe('attendance domain', () => {
  it('未签到按缺勤统计，迟到计入到课', () => {
    const records = [
      { sessionId: 'c1', studentId: 's1', status: 'present' },
      { sessionId: 'c1', studentId: 's2', status: 'late' }
    ]

    const stats = sessionAttendance(session, students, records)

    expect(stats.total).toBe(3)
    expect(stats.present).toBe(1)
    expect(stats.late).toBe(1)
    expect(stats.absent).toBe(1)
    expect(stats.attended).toBe(2)
    expect(stats.rate).toBeCloseTo(2 / 3, 5)
    expect(stats.roster.find((item) => item.studentId === 's3').checkedIn).toBe(false)
  })

  it('忽略其他课堂、陌生学生与重复签到记录', () => {
    const records = [
      { sessionId: 'c1', studentId: 's1', status: 'present' },
      { sessionId: 'c1', studentId: 's1', status: 'absent' },
      { sessionId: 'c2', studentId: 's2', status: 'present' },
      { sessionId: 'c1', studentId: 'ghost', status: 'present' }
    ]

    const stats = sessionAttendance(session, students, records)

    expect(stats.present).toBe(1)
    expect(stats.absent).toBe(2)
    expect(stats.roster).toHaveLength(3)
  })

  it('空名单不会产生除零错误', () => {
    const stats = sessionAttendance(session, [], [{ sessionId: 'c1', studentId: 's1', status: 'present' }])
    expect(stats.total).toBe(0)
    expect(stats.rate).toBe(0)
    expect(stats.attended).toBe(0)
  })

  it('班级总览汇总每次课堂的出勤人次与比率', () => {
    const sessions = [
      { id: 'c1' },
      { id: 'c2' },
      { id: 'c3' }
    ]
    const records = [
      { sessionId: 'c1', studentId: 's1', status: 'present' },
      { sessionId: 'c1', studentId: 's2', status: 'present' },
      { sessionId: 'c1', studentId: 's3', status: 'present' },
      { sessionId: 'c2', studentId: 's1', status: 'present' },
      { sessionId: 'c2', studentId: 's2', status: 'late' },
      { sessionId: 'c3', studentId: 's1', status: 'leave' }
    ]

    const overview = attendanceOverview(students, sessions, records)

    expect(overview.totalSlots).toBe(9)
    expect(overview.attended).toBe(5)
    expect(overview.missed).toBe(4)
    expect(overview.rate).toBeCloseTo(5 / 9, 5)
    expect(overview.bySession.map((item) => item.attended)).toEqual([3, 2, 0])
  })

  it('按学生统计出勤率，请假不算到课', () => {
    const sessions = [{ id: 'c1' }, { id: 'c2' }]
    const records = [
      { sessionId: 'c1', studentId: 's1', status: 'present' },
      { sessionId: 'c2', studentId: 's1', status: 'leave' },
      { sessionId: 'c1', studentId: 's2', status: 'present' },
      { sessionId: 'c2', studentId: 's2', status: 'present' }
    ]

    const overview = attendanceOverview(students, sessions, records)
    const first = overview.byStudent.find((item) => item.studentId === 's1')
    const second = overview.byStudent.find((item) => item.studentId === 's2')

    expect(first.attended).toBe(1)
    expect(first.rate).toBe(0.5)
    expect(second.rate).toBe(1)
    expect(overview.byStudent.find((item) => item.studentId === 's3').rate).toBe(0)
  })

  it('状态归一化与到课判断覆盖非法值', () => {
    expect(normalizeAttendanceStatus('present')).toBe('present')
    expect(normalizeAttendanceStatus('unknown')).toBe('absent')
    expect(isAttended({ status: 'late' })).toBe(true)
    expect(isAttended({ status: 'leave' })).toBe(false)
    expect(isAttended(null)).toBe(false)
  })
})