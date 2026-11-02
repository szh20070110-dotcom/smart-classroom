import { describe, expect, it } from 'vitest'
import {
  DEFAULT_SCORE_BUCKETS,
  gradedScoreRecords,
  isGraded,
  mean,
  round,
  scoreDistribution,
  scoreStats,
  studentGradeSummary
} from '../src/domain/grades.js'

describe('grades domain', () => {
  it('mean 忽略非数字并支持空数组', () => {
    expect(mean([80, 90, 100])).toBe(90)
    expect(mean([80, null, undefined, '90', 100])).toBe(90)
    expect(mean([])).toBe(0)
    expect(round(83.3333, 1)).toBe(83.3)
  })

  it('平均分、最高分、最低分与及格率', () => {
    const stats = scoreStats([59, 60, 80, 100])

    expect(stats.count).toBe(4)
    expect(stats.average).toBe(74.8)
    expect(stats.highest).toBe(100)
    expect(stats.lowest).toBe(59)
    expect(stats.passRate).toBe(0.75)
    expect(scoreStats([])).toEqual({
      count: 0,
      average: 0,
      highest: 0,
      lowest: 0,
      passRate: 0
    })
  })

  it('分数分布覆盖每个区间边界并做百分制截断', () => {
    const rows = scoreDistribution([0, 59, 60, 69, 70, 79, 80, 89, 90, 100, 101])

    expect(rows).toHaveLength(5)
    expect(rows.map((row) => row.count)).toEqual([2, 2, 2, 2, 3])
    expect(rows[0].ratio).toBeCloseTo(2 / 11, 5)
    expect(rows[4].min).toBe(90)
    expect(rows[4].max).toBe(100)
  })

  it('不同分值的作业统一折算为百分制', () => {
    const assignments = [
      { id: 'a1', points: 20 },
      { id: 'a2', points: 50 },
      { id: 'a3', points: 0 }
    ]
    const submissions = [
      { id: 'x1', assignmentId: 'a1', studentId: 's1', score: 15 },
      { id: 'x2', assignmentId: 'a2', studentId: 's1', score: 40 },
      { id: 'x3', assignmentId: 'a3', studentId: 's1', score: 80 },
      { id: 'x4', assignmentId: 'a1', studentId: 's1', score: null }
    ]

    const records = gradedScoreRecords(assignments, submissions)

    expect(records).toHaveLength(3)
    expect(records.map((record) => record.percent)).toEqual([75, 80, 80])
    expect(gradedScoreRecords(assignments, submissions, { studentId: 's2' })).toHaveLength(0)
    expect(gradedScoreRecords(assignments, submissions, { assignmentId: 'a2' })[0].percent).toBe(80)
  })

  it('超出满分或为负的分数会被截断到 0-100', () => {
    const assignments = [{ id: 'a1', points: 100 }]
    const submissions = [
      { id: 'x1', assignmentId: 'a1', studentId: 's1', score: 130 },
      { id: 'x2', assignmentId: 'a1', studentId: 's2', score: -5 }
    ]

    const records = gradedScoreRecords(assignments, submissions)

    expect(records.map((record) => record.percent)).toEqual([100, 0])
    expect(isGraded({ score: 0 })).toBe(true)
    expect(isGraded({ score: null })).toBe(false)
  })

  it('学生成绩单区分已批改、待批改与未提交', () => {
    const assignments = [
      { id: 'a1', title: '作业一', points: 100 },
      { id: 'a2', title: '作业二', points: 100 },
      { id: 'a3', title: '作业三', points: 100 }
    ]
    const submissions = [
      { assignmentId: 'a1', studentId: 's1', score: 80 },
      { assignmentId: 'a2', studentId: 's1', score: null },
      { assignmentId: 'a1', studentId: 's2', score: 100 }
    ]

    const summary = studentGradeSummary('s1', assignments, submissions)

    expect(summary.gradedCount).toBe(1)
    expect(summary.pendingCount).toBe(1)
    expect(summary.missingCount).toBe(1)
    expect(summary.submittedCount).toBe(2)
    expect(summary.average).toBe(80)
    expect(summary.rows.map((row) => row.status)).toEqual(['graded', 'pending', 'missing'])
  })

  it('默认分布区间覆盖 0 到 100 且无重叠', () => {
    expect(DEFAULT_SCORE_BUCKETS).toHaveLength(5)
    for (let index = 1; index < DEFAULT_SCORE_BUCKETS.length; index += 1) {
      expect(DEFAULT_SCORE_BUCKETS[index].min).toBe(DEFAULT_SCORE_BUCKETS[index - 1].max + 1)
    }
  })
})