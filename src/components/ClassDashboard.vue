<script setup>
import { computed } from 'vue'
import { classroom, selectors } from '../store/classroom.js'
import { buildClassAnalytics, todaySessions } from '../domain/analytics.js'
import { attendanceOverview } from '../domain/attendance.js'
import { studentGradeSummary, round } from '../domain/grades.js'
import { formatDateTime, formatPercent, formatScore, formatShortDate, initials, scoreTone } from '../utils/format.js'
import BarChart from './charts/BarChart.vue'
import LineChart from './charts/LineChart.vue'
import RingChart from './charts/RingChart.vue'

const emit = defineEmits(['navigate'])

const currentClass = computed(() => selectors.currentClass())
const students = computed(() => selectors.classStudents())
const sessions = computed(() => selectors.classSessions())
const assignments = computed(() => selectors.classAssignments())
const attendance = computed(() => selectors.classAttendance())
const submissions = computed(() => selectors.classSubmissions())

const analytics = computed(() =>
  buildClassAnalytics({
    students: students.value,
    sessions: sessions.value,
    assignments: assignments.value,
    attendance: attendance.value,
    submissions: submissions.value,
    endDate: new Date(),
    weeks: 3
  })
)

const today = computed(() => todaySessions(sessions.value, new Date()))

const distributionItems = computed(() =>
  analytics.value.grades.distribution.map((item) => ({
    label: item.label,
    value: item.count,
    hint: `${formatPercent(item.ratio)} 的已批改成绩`
  }))
)

const trendLabels = computed(() => analytics.value.trend.map((item) => item.label))
const trendSeries = computed(() => [
  {
    name: '平均分',
    color: '#4f46e5',
    values: analytics.value.trend.map((item) => item.averageScore)
  },
  {
    name: '出勤率',
    color: '#0891b2',
    values: analytics.value.trend.map((item) =>
      item.attendanceRate === null ? null : round(item.attendanceRate * 100, 1)
    ),
    dashed: true
  }
])
const trendBars = computed(() =>
  analytics.value.trend.map((item) => ({ label: item.label, value: item.submissions }))
)

const sessionById = computed(
  () => new Map(sessions.value.map((session) => [session.id, session]))
)

const sessionRows = computed(() =>
  [...analytics.value.attendance.bySession]
    .map((item) => ({
      ...item,
      topic: sessionById.value.get(item.sessionId)?.topic ?? '未命名课堂',
      time: sessionById.value.get(item.sessionId)?.time ?? null
    }))
    .sort((a, b) => new Date(b.time) - new Date(a.time))
)

const roster = computed(() => {
  const overview = attendanceOverview(students.value, sessions.value, attendance.value)
  return students.value
    .map((student) => {
      const attendanceRow = overview.byStudent.find((item) => item.studentId === student.id)
      const grade = studentGradeSummary(student.id, assignments.value, submissions.value)
      return {
        ...student,
        attendanceRate: attendanceRow?.rate ?? 0,
        average: grade.average,
        gradedCount: grade.gradedCount,
        missingCount: grade.missingCount
      }
    })
    .sort((a, b) => b.average - a.average)
})

function goAssignments() {
  emit('navigate', 'assignments')
}
</script>

<template>
  <section>
    <header class="page-head">
      <div>
        <div class="page-eyebrow">Overview</div>
        <h1 class="page-title">班级数据看板</h1>
        <p class="page-desc">
          出勤、提交、成绩与趋势实时汇总，全部图表由 SVG 手绘，无第三方图表库。
        </p>
      </div>
      <div class="row">
        <span v-if="currentClass" class="badge badge-brand">{{ currentClass.name }}</span>
        <span class="badge">{{ students.length }} 名学生</span>
        <span class="badge badge-accent">今日 {{ today.length }} 节课</span>
      </div>
    </header>

    <div class="stack">
      <div class="stat-grid">
        <article class="stat" style="--tint: var(--success-soft)">
          <div class="stat-label">整体出勤率</div>
          <div class="stat-value">{{ formatPercent(analytics.attendance.rate, 1) }}</div>
          <div class="stat-foot">
            到课 {{ analytics.attendance.attended }}/{{ analytics.attendance.totalSlots }} 人次
          </div>
        </article>
        <article class="stat" style="--tint: var(--accent-soft)">
          <div class="stat-label">作业提交率</div>
          <div class="stat-value">{{ formatPercent(analytics.submissions.rate) }}</div>
          <div class="stat-foot">
            已交 {{ analytics.submissions.submitted }}/{{ analytics.submissions.expected }} 份
          </div>
        </article>
        <article class="stat" style="--tint: var(--brand-soft)">
          <div class="stat-label">已批改平均分</div>
          <div class="stat-value">
            {{ analytics.grades.count ? formatScore(analytics.grades.average) : '—' }}
          </div>
          <div class="stat-foot">
            基于 {{ analytics.grades.count }} 份已批改作业 · 百分制
          </div>
        </article>
        <article class="stat" style="--tint: var(--warn-soft)">
          <div class="stat-label">待批改</div>
          <div class="stat-value">{{ analytics.pending.length }}</div>
          <div class="stat-foot">批改后平均分与分布即时更新</div>
        </article>
      </div>

      <div class="grid-2">
        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">分数分布</div>
              <div class="card-sub">已批改作业按百分制落入 5 个分数段</div>
            </div>
            <span class="badge badge-brand">最高 {{ formatScore(analytics.grades.highest) }}</span>
          </div>
          <BarChart :items="distributionItems" color="#4f46e5" :height="230" />
          <div class="meta-line" style="margin-top: 10px">
            <span>及格率 {{ formatPercent(analytics.grades.passRate) }}</span>
            <span>最低 {{ formatScore(analytics.grades.lowest) }}</span>
            <span>样本 {{ analytics.grades.count }} 份</span>
          </div>
        </article>

        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">出勤概览</div>
              <div class="card-sub">点名统计按课堂人次计算</div>
            </div>
          </div>
          <div class="attendance-summary">
            <RingChart
              :value="analytics.attendance.rate"
              label="出勤率"
              :caption="`${analytics.attendance.attended}/${analytics.attendance.totalSlots}`"
              color="#15803d"
              :size="168"
            />
            <div class="attendance-metrics">
              <div class="metric">
                <span>应到人次</span>
                <strong>{{ analytics.attendance.totalSlots }}</strong>
              </div>
              <div class="metric">
                <span>实际到课</span>
                <strong>{{ analytics.attendance.attended }}</strong>
              </div>
              <div class="metric">
                <span>缺勤 / 未签</span>
                <strong>{{ analytics.attendance.missed }}</strong>
              </div>
              <div class="metric">
                <span>今日课堂</span>
                <strong>{{ today.length }}</strong>
              </div>
            </div>
          </div>
        </article>
      </div>

      <article class="card">
        <div class="card-head">
          <div>
            <div class="card-title">按周趋势</div>
            <div class="card-sub">近 3 周的作业平均分、课堂出勤率与每周提交量</div>
          </div>
          <span class="badge badge-accent">周一开始统计</span>
        </div>
        <LineChart
          :labels="trendLabels"
          :series="trendSeries"
          :bars="trendBars"
          :max="100"
          unit="%"
          :height="280"
        />
      </article>

      <div class="grid-2">
        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">作业提交率</div>
              <div class="card-sub">按每次作业统计</div>
            </div>
          </div>

          <div v-if="!analytics.submissions.byAssignment.length" class="empty">还没有作业。</div>
          <div v-else class="rate-list">
            <div v-for="item in analytics.submissions.byAssignment" :key="item.assignmentId" class="rate-item">
              <div class="rate-top">
                <strong class="rate-title">{{ item.title }}</strong>
                <span class="small" style="font-weight: 700">{{ formatPercent(item.rate) }}</span>
              </div>
              <div class="progress">
                <span :style="{ width: `${item.rate * 100}%` }" />
              </div>
              <div class="meta-line">
                <span>已交 {{ item.submitted }}/{{ item.expected }}</span>
                <span>按时 {{ item.onTime }}</span>
                <span v-if="item.late">逾期 {{ item.late }}</span>
                <span v-if="item.pending">未交 {{ item.pending }}</span>
              </div>
            </div>
          </div>
        </article>

        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">课堂出勤</div>
              <div class="card-sub">每次课堂的到课与缺勤</div>
            </div>
          </div>

          <div v-if="!sessionRows.length" class="empty">还没有课堂。</div>
          <div v-else class="rate-list">
            <div v-for="item in sessionRows" :key="item.sessionId" class="rate-item">
              <div class="rate-top">
                <strong class="rate-title">{{ item.topic }}</strong>
                <span class="small" style="font-weight: 700">{{ formatPercent(item.rate) }}</span>
              </div>
              <div class="progress success">
                <span :style="{ width: `${item.rate * 100}%` }" />
              </div>
              <div class="meta-line">
                <span>{{ item.time ? formatShortDate(item.time) : '—' }}</span>
                <span>到课 {{ item.attended }}/{{ item.total }}</span>
                <span v-if="item.late">迟到 {{ item.late }}</span>
                <span v-if="item.absent">未签 {{ item.absent }}</span>
              </div>
            </div>
          </div>
        </article>
      </div>

      <div class="grid-2">
        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">学生表现</div>
              <div class="card-sub">按已批改平均分排序</div>
            </div>
          </div>

          <div v-if="!roster.length" class="empty">还没有学生加入。</div>
          <div v-else class="performance-list">
            <div v-for="(item, index) in roster" :key="item.id" class="performance-item">
              <span class="rank">{{ index + 1 }}</span>
              <span class="avatar" :class="index === 0 ? 'success' : index === 1 ? 'accent' : ''">
                {{ initials(item.name) }}
              </span>
              <div style="min-width: 0; flex: 1">
                <div class="row" style="gap: 8px">
                  <strong>{{ item.name }}</strong>
                  <span v-if="item.missingCount" class="badge badge-warn">缺交 {{ item.missingCount }}</span>
                </div>
                <div class="meta-line">
                  <span>出勤 {{ formatPercent(item.attendanceRate) }}</span>
                  <span>批改 {{ item.gradedCount }} 次</span>
                </div>
              </div>
              <span class="score" :class="scoreTone(item.average)">
                {{ item.gradedCount ? formatScore(item.average) : '—' }}
              </span>
            </div>
          </div>
        </article>

        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">待批改队列</div>
              <div class="card-sub">{{ analytics.pending.length }} 份提交等待评分</div>
            </div>
            <button class="btn btn-sm" @click="goAssignments">去批改</button>
          </div>

          <div v-if="!analytics.pending.length" class="empty">所有提交都已批改完成。</div>
          <div v-else class="pending-list">
            <div v-for="item in analytics.pending.slice(0, 5)" :key="item.id" class="pending-item">
              <span class="avatar accent">{{ initials(item.studentName) }}</span>
              <div style="min-width: 0; flex: 1">
                <strong>{{ item.studentName }}</strong>
                <div class="meta-line">
                  <span>{{ item.assignmentTitle }}</span>
                  <span>{{ formatDateTime(item.submittedAt) }}</span>
                </div>
              </div>
              <span class="badge badge-warn">待批</span>
            </div>
            <div v-if="analytics.pending.length > 5" class="small muted" style="margin-top: 10px">
              还有 {{ analytics.pending.length - 5 }} 份未展示，进入批改台查看全部。
            </div>
          </div>
        </article>
      </div>
    </div>
  </section>
</template>

<style scoped>
.attendance-summary {
  display: flex;
  align-items: center;
  gap: 26px;
  flex-wrap: wrap;
}

.attendance-metrics {
  flex: 1;
  min-width: 180px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.metric {
  padding: 10px 12px;
  border-radius: 11px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
}

.metric span {
  display: block;
  font-size: 11px;
  color: var(--muted);
}

.metric strong {
  display: block;
  margin-top: 2px;
  font-size: 19px;
  font-weight: 750;
}

.rate-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.rate-item {
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--surface-soft);
  border: 1px solid var(--line);
}

.rate-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
}

.rate-title {
  font-size: 12.5px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.rate-item .meta-line {
  margin-top: 7px;
}

.performance-list,
.pending-list {
  display: flex;
  flex-direction: column;
}

.performance-item,
.pending-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 11px 0;
  border-bottom: 1px dashed var(--line);
}

.performance-item:last-child,
.pending-item:last-child {
  border-bottom: 0;
  padding-bottom: 0;
}

.performance-item:first-child,
.pending-item:first-child {
  padding-top: 0;
}

.rank {
  width: 20px;
  flex: 0 0 20px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: var(--muted);
}

.performance-item .score {
  font-size: 17px;
}

.pending-item .avatar,
.performance-item .avatar {
  width: 32px;
  height: 32px;
  flex: 0 0 32px;
  font-size: 11px;
}
</style>