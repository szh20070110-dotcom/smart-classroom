import { describe, expect, it } from 'vitest'
import {
  assignmentSubmissionStats,
  findSubmission,
  isLateSubmission,
  pendingGrading,
  submissionOverview,
  submissionRateOfStudent
} from '../src/domain/submissions.js'

const students = [
  { id: 's1', name: '林小雨' },
  { id: 's2', name: '陈子昂' },
  { id: 's3', name: '周思远' }
]

const assignment = {
  id: 'a1',
  title: '作业一',
  dueAt: '2026-10-20T00:00:00.000Z',
  points: 100
}

describe('submissions domain', () => {
  it('同一学生多次提交时取最新一次并统计提交率', () => {
    const submissions = [
      { id: 'x1', assignmentId: 'a1', studentId: 's1', submittedAt: '2026-10-18T10:00:00.000Z' },
      { id: 'x2', assignmentId: 'a1', studentId: 's1', submittedAt: '2026-10-19T10:00:00.000Z' },
      { id: 'x3', assignmentId: 'a1', studentId: 's2', submittedAt: '2026-10-19T12:00:00.000Z' }
    ]

    const stats = assignmentSubmissionStats(assignment, students, submissions)

    expect(stats.submitted).toBe(2)
    expect(stats.expected).toBe(3)
    expect(stats.pending).toBe(1)
    expect(stats.rate).toBeCloseTo(2 / 3, 5)
  })

  it('按截止时刻区分按时与逾期，截止当刻不算逾期', () => {
    const exactlyDue = { submittedAt: '2026-10-20T00:00:00.000Z' }
    const oneMsLate = { submittedAt: '2026-10-20T00:00:00.001Z' }

    expect(isLateSubmission(exactlyDue, assignment)).toBe(false)
    expect(isLateSubmission(oneMsLate, assignment)).toBe(true)
    expect(isLateSubmission({ submittedAt: null }, assignment)).toBe(false)

    const stats = assignmentSubmissionStats(assignment, students, [
      { id: 'x1', assignmentId: 'a1', studentId: 's1', submittedAt: '2026-10-20T00:00:00.001Z' },
      { id: 'x2', assignmentId: 'a1', studentId: 's2', submittedAt: '2026-10-19T00:00:00.000Z' },
      { id: 'x3', assignmentId: 'a1', studentId: 's3', submittedAt: '2026-10-19T00:00:00.000Z' }
    ])

    expect(stats.late).toBe(1)
    expect(stats.onTime).toBe(2)
  })

  it('总览按作业求和并给出总体提交率', () => {
    const assignments = [
      { id: 'a1', title: '作业一', dueAt: '2026-10-20T00:00:00.000Z' },
      { id: 'a2', title: '作业二', dueAt: '2026-10-27T00:00:00.000Z' }
    ]
    const submissions = [
      { id: 'x1', assignmentId: 'a1', studentId: 's1', submittedAt: '2026-10-18T00:00:00.000Z' },
      { id: 'x2', assignmentId: 'a1', studentId: 's2', submittedAt: '2026-10-19T00:00:00.000Z' },
      { id: 'x3', assignmentId: 'a2', studentId: 's1', submittedAt: '2026-10-25T00:00:00.000Z' }
    ]

    const overview = submissionOverview(students, assignments, submissions)

    expect(overview.expected).toBe(6)
    expect(overview.submitted).toBe(3)
    expect(overview.rate).toBe(0.5)
    expect(overview.byAssignment.map((item) => item.submitted)).toEqual([2, 1])
  })

  it('待批改只包含本班作业且尚未打分的提交', () => {
    const assignments = [{ id: 'a1' }, { id: 'a2' }]
    const submissions = [
      { id: 'x1', assignmentId: 'a1', studentId: 's1', score: null },
      { id: 'x2', assignmentId: 'a1', studentId: 's2', score: 88 },
      { id: 'x3', assignmentId: 'a2', studentId: 's1', score: null },
      { id: 'x4', assignmentId: 'a9', studentId: 's1', score: null },
      { id: 'x5', assignmentId: 'a1', studentId: 'ghost', score: null }
    ]

    const pending = pendingGrading(assignments, students, submissions)

    expect(pending.map((item) => item.id)).toEqual(['x1', 'x3'])
  })

  it('findSubmission 与个人提交率支持缺失数据', () => {
    const submissions = [
      { id: 'x1', assignmentId: 'a1', studentId: 's1', submittedAt: '2026-10-18T00:00:00.000Z' }
    ]

    expect(findSubmission('a1', 's1', submissions)?.id).toBe('x1')
    expect(findSubmission('a1', 's2', submissions)).toBeNull()
    expect(submissionRateOfStudent('s1', [{ id: 'a1' }, { id: 'a2' }], submissions)).toBe(0.5)
    expect(submissionRateOfStudent('s2', [], submissions)).toBe(0)
  })
})