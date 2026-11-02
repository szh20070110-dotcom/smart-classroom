import { describe, expect, it } from 'vitest'
import {
  dateKey,
  startOfWeek,
  weekBuckets,
  weekKey,
  weekLabel,
  weeklySubmissionTrend,
  weeklyTrend
} from '../src/domain/trend.js'

const endDate = new Date(2026, 10, 3, 12, 0)

describe('trend domain', () => {
  it('以周一为一周起点并保持本地日期', () => {
    const monday = startOfWeek(new Date(2026, 9, 21, 15, 30))

    expect(dateKey(monday)).toBe('2026-10-19')
    expect(monday.getHours()).toBe(0)
    expect(weekKey(new Date(2026, 9, 25, 23, 59))).toBe('2026-10-19')
    expect(weekKey(new Date(2026, 9, 26, 0, 0))).toBe('2026-10-26')
    expect(weekLabel(monday)).toBe('10月19日')
  })

  it('周桶连续升序且包含 endDate 所在周', () => {
    const buckets = weekBuckets(endDate, 3)

    expect(buckets.map(dateKey)).toEqual(['2026-10-19', '2026-10-26', '2026-11-02'])
    expect(weekBuckets(endDate, 0)).toHaveLength(1)
  })

  it('按周聚合出勤率、提交数与平均分', () => {
    const students = [
      { id: 's1', name: '林小雨' },
      { id: 's2', name: '陈子昂' }
    ]
    const sessions = [
      { id: 'c1', time: new Date(2026, 9, 20, 9, 0).toISOString() },
      { id: 'c2', time: new Date(2026, 9, 27, 9, 0).toISOString() }
    ]
    const assignments = [{ id: 'a1', points: 100 }]
    const attendance = [
      { sessionId: 'c1', studentId: 's1', status: 'present' },
      { sessionId: 'c1', studentId: 's2', status: 'present' },
      { sessionId: 'c2', studentId: 's1', status: 'present' }
    ]
    const submissions = [
      {
        id: 'x1',
        assignmentId: 'a1',
        studentId: 's1',
        submittedAt: new Date(2026, 9, 21, 20, 0).toISOString(),
        score: 90
      },
      {
        id: 'x2',
        assignmentId: 'a1',
        studentId: 's2',
        submittedAt: new Date(2026, 9, 28, 20, 0).toISOString(),
        score: null
      }
    ]

    const trend = weeklyTrend({
      students,
      sessions,
      assignments,
      attendance,
      submissions,
      endDate,
      weeks: 3
    })

    expect(trend.map((item) => item.label)).toEqual(['10月19日', '10月26日', '11月2日'])
    expect(trend.map((item) => item.sessions)).toEqual([1, 1, 0])
    expect(trend[0].attendanceRate).toBe(1)
    expect(trend[1].attendanceRate).toBe(0.5)
    expect(trend[2].attendanceRate).toBeNull()
    expect(trend[0].submissions).toBe(1)
    expect(trend[1].submissions).toBe(1)
    expect(trend[0].averageScore).toBe(90)
    expect(trend[1].averageScore).toBeNull()
    expect(trend[2].averageScore).toBeNull()
  })

  it('未批改提交不参与平均分，且区间外数据被忽略', () => {
    const trend = weeklyTrend({
      students: [{ id: 's1' }],
      sessions: [],
      assignments: [{ id: 'a1', points: 100 }],
      attendance: [],
      submissions: [
        {
          id: 'x1',
          assignmentId: 'a1',
          studentId: 's1',
          submittedAt: new Date(2026, 8, 1, 10, 0).toISOString(),
          score: 99
        },
        {
          id: 'x2',
          assignmentId: 'a1',
          studentId: 's1',
          submittedAt: new Date(2026, 10, 3, 10, 0).toISOString(),
          score: null
        }
      ],
      endDate,
      weeks: 3
    })

    expect(trend.map((item) => item.submissions)).toEqual([0, 0, 1])
    expect(trend.every((item) => item.averageScore === null)).toBe(true)
  })

  it('每周提交数趋势只统计周桶内记录', () => {
    const submissions = [
      { submittedAt: new Date(2026, 9, 19, 10, 0).toISOString() },
      { submittedAt: new Date(2026, 9, 20, 10, 0).toISOString() },
      { submittedAt: new Date(2026, 10, 4, 10, 0).toISOString() },
      { submittedAt: new Date(2026, 11, 1, 10, 0).toISOString() }
    ]

    const trend = weeklySubmissionTrend(submissions, endDate, 3)

    expect(trend.map((item) => item.value)).toEqual([2, 0, 1])
    expect(trend.map((item) => item.label)).toEqual(['10月19日', '10月26日', '11月2日'])
  })
})