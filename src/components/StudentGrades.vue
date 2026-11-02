<script setup>
import { computed } from 'vue'
import { selectors } from '../store/classroom.js'
import {
  ATTENDANCE_LABELS,
  sessionAttendance
} from '../domain/attendance.js'
import { buildStudentAnalytics } from '../domain/analytics.js'
import { studentGradeSummary } from '../domain/grades.js'
import { formatDateTime, formatPercent, formatScore, initials, scoreTone } from '../utils/format.js'
import EmptyState from './EmptyState.vue'
import LineChart from './charts/LineChart.vue'
import RingChart from './charts/RingChart.vue'

const student = computed(() => selectors.currentStudent())
const students = computed(() => selectors.classStudents())
const sessions = computed(() => selectors.classSessions())
const assignments = computed(() => selectors.classAssignments())
const attendance = computed(() => selectors.classAttendance())
const submissions = computed(() => selectors.classSubmissions())
const currentClass = computed(() => selectors.currentClass())

const analytics = computed(() =>
  student.value
    ? buildStudentAnalytics({
        student: student.value,
        students: students.value,
        sessions: sessions.value,
        assignments: assignments.value,
        attendance: attendance.value,
        submissions: submissions.value
      })
    : null
)

const summary = computed(() =>
  student.value ? studentGradeSummary(student.value.id, assignments.value, submissions.value) : null
)

const gradeRows = computed(() =>
  student.value
    ? assignments.value
        .filter(Boolean)
        .map((assignment) => {
          const submission = submissions.value.find(
            (item) => item.assignmentId === assignment.id && item.studentId === student.value.id
          )
          const graded = typeof submission?.score === 'number'
          return {
            id: assignment.id,
            title: assignment.title,
            dueAt: assignment.dueAt,
            points: assignment.points,
            score: graded ? submission.score : null,
            percent: graded ? Math.round((submission.score / assignment.points) * 1000) / 10 : null,
            comment: submission?.comment ?? '',
            submittedAt: submission?.submittedAt ?? null,
            status: !submission ? 'missing' : graded ? 'graded' : 'pending'
          }
        })
        .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    : []
)

const chartLabels = computed(() => gradeRows.value.map((_, index) => `第 ${index + 1} 次`))
const chartValues = computed(() => gradeRows.value.map((row) => row.percent))

const attendanceRows = computed(() => {
  if (!student.value) return []
  return sessions.value
    .map((session) => {
      const stats = sessionAttendance(session, students.value, attendance.value)
      const entry = stats.roster.find((item) => item.studentId === student.value.id)
      return {
        sessionId: session.id,
        topic: session.topic,
        time: session.time,
        status: entry?.status ?? 'absent',
        checkedAt: entry?.checkedAt ?? null
      }
    })
    .sort((a, b) => new Date(b.time) - new Date(a.time))
})

const comments = computed(() =>
  gradeRows.value.filter((row) => row.status === 'graded' && row.comment)
)
</script>

<template>
  <section>
    <header class="page-head">
      <div>
        <div class="page-eyebrow">My Records</div>
        <h1 class="page-title">成绩与评语</h1>
        <p class="page-desc">
          {{ currentClass ? `${currentClass.name} · 所有分数按百分制折算` : '加入班级后查看你的学习记录。' }}
        </p>
      </div>
      <span v-if="student" class="badge badge-brand">{{ student.name }}</span>
    </header>

    <EmptyState v-if="!student">请先在「今日课堂」页加入班级。</EmptyState>

    <div v-else class="stack">
      <div class="stat-grid">
        <article class="stat" style="--tint: var(--brand-soft)">
          <div class="stat-label">已批改平均分</div>
          <div class="stat-value">{{ summary.gradedCount ? formatScore(summary.average) : '—' }}</div>
          <div class="stat-foot">共 {{ summary.gradedCount }} 次批改 · 百分制</div>
        </article>
        <article class="stat" style="--tint: var(--success-soft)">
          <div class="stat-label">出勤率</div>
          <div class="stat-value">{{ formatPercent(analytics.attendance.rate) }}</div>
          <div class="stat-foot">
            到课 {{ analytics.attendance.attended }}/{{ analytics.attendance.sessions }} 次
          </div>
        </article>
        <article class="stat" style="--tint: var(--accent-soft)">
          <div class="stat-label">作业提交率</div>
          <div class="stat-value">{{ formatPercent(analytics.submissionRate) }}</div>
          <div class="stat-foot">
            已交 {{ analytics.submittedCount }}/{{ analytics.assignmentCount }} 次
          </div>
        </article>
        <article class="stat" style="--tint: var(--warn-soft)">
          <div class="stat-label">待批改</div>
          <div class="stat-value">{{ analytics.pendingCount }}</div>
          <div class="stat-foot">老师批改后自动更新</div>
        </article>
      </div>

      <div class="grid-2">
        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">成绩趋势</div>
              <div class="card-sub">按作业顺序折算为百分制</div>
            </div>
            <span class="badge badge-accent">{{ summary.gradedCount }} 个数据点</span>
          </div>

          <div v-if="!summary.gradedCount" class="empty">还没有已批改的作业，先完成并等待老师批改。</div>
          <LineChart v-else :labels="chartLabels" :series="[{ name: '百分制得分', color: '#4f46e5', values: chartValues }]" :max="100" />
        </article>

        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">课堂出勤</div>
              <div class="card-sub">迟到计入到课，但不计入全勤</div>
            </div>
          </div>

          <div class="attendance-layout">
            <RingChart
              :value="analytics.attendance.rate"
              label="出勤率"
              :caption="`${analytics.attendance.attended}/${analytics.attendance.sessions} 次`"
              color="#15803d"
              :size="148"
            />

            <div class="attendance-list">
              <div v-for="row in attendanceRows" :key="row.sessionId" class="attendance-item">
                <div style="min-width: 0">
                  <strong class="small">{{ row.topic }}</strong>
                  <div class="small muted">{{ formatDateTime(row.time) }}</div>
                </div>
                <span
                  class="badge"
                  :class="row.status === 'present' ? 'badge-success' : row.status === 'late' ? 'badge-warn' : 'badge-danger'"
                >
                  {{ ATTENDANCE_LABELS[row.status] }}
                </span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <article class="card">
        <div class="card-head">
          <div>
            <div class="card-title">成绩单</div>
            <div class="card-sub">含未提交与待批改状态</div>
          </div>
          <span class="badge badge-success">平均 {{ summary.gradedCount ? formatScore(summary.average) : '—' }}</span>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>作业</th>
              <th>截止时间</th>
              <th>状态</th>
              <th>得分</th>
              <th>百分制</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in gradeRows" :key="row.id">
              <td><strong>{{ row.title }}</strong></td>
              <td class="small muted">{{ formatDateTime(row.dueAt) }}</td>
              <td>
                <span
                  class="badge"
                  :class="row.status === 'graded' ? 'badge-success' : row.status === 'pending' ? 'badge-accent' : 'badge-warn'"
                >
                  {{ row.status === 'graded' ? '已批改' : row.status === 'pending' ? '待批改' : '未提交' }}
                </span>
              </td>
              <td>
                <span v-if="row.score !== null" class="score" :class="scoreTone(row.score)">
                  {{ formatScore(row.score) }}
                </span>
                <span v-else class="muted">—</span>
                <span class="small muted"> / {{ row.points }}</span>
              </td>
              <td>
                <span v-if="row.percent !== null" class="score" :class="scoreTone(row.percent)">
                  {{ formatScore(row.percent) }}
                </span>
                <span v-else class="muted">—</span>
              </td>
            </tr>
          </tbody>
        </table>
      </article>

      <article class="card">
        <div class="card-head">
          <div>
            <div class="card-title">老师评语</div>
            <div class="card-sub">来自已批改作业的具体反馈</div>
          </div>
        </div>

        <div v-if="!comments.length" class="empty">还没有评语。</div>
        <div v-else class="comment-list">
          <div v-for="row in comments" :key="row.id" class="comment-item">
            <span class="avatar success">{{ initials(student.name) }}</span>
            <div style="min-width: 0">
              <div class="row" style="gap: 8px">
                <strong>{{ row.title }}</strong>
                <span class="badge badge-brand">{{ formatScore(row.score) }} 分</span>
              </div>
              <p>{{ row.comment }}</p>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.attendance-layout {
  display: flex;
  align-items: center;
  gap: 24px;
  flex-wrap: wrap;
}

.attendance-list {
  flex: 1;
  min-width: 200px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.attendance-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line);
}

.attendance-item:last-child {
  border-bottom: 0;
}

.attendance-item strong {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 220px;
}

.comment-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.comment-item {
  display: flex;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 13px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
}

.comment-item p {
  margin-top: 6px;
  font-size: 12.5px;
  line-height: 1.7;
  color: var(--ink-soft);
}
</style>