<script setup>
import { computed, reactive, ref } from 'vue'
import { classroom, actions, selectors } from '../store/classroom.js'
import { ATTENDANCE_LABELS } from '../domain/attendance.js'
import { buildStudentAnalytics, todaySessions } from '../domain/analytics.js'
import { findSubmission, isGradedSubmission, isLateSubmission } from '../domain/submissions.js'
import {
  formatDateTime,
  formatPercent,
  formatScore,
  formatTime,
  formatWeekday,
  initials
} from '../utils/format.js'

const emit = defineEmits(['navigate'])

const student = computed(() => selectors.currentStudent())
const currentClass = computed(() => selectors.currentClass())
const students = computed(() => selectors.classStudents())
const sessions = computed(() => selectors.classSessions())
const assignments = computed(() => selectors.classAssignments())
const attendance = computed(() => selectors.classAttendance())
const submissions = computed(() => selectors.classSubmissions())

const checkinNotes = reactive({})
const joinFeedback = ref(null)
const joinForm = reactive({
  code: classroom.classes[0]?.code ?? '',
  name: ''
})

const today = computed(() => todaySessions(sessions.value, new Date()))

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

const mySubmissions = computed(() =>
  student.value
    ? submissions.value.filter((item) => item.studentId === student.value.id)
    : []
)

const upcoming = computed(() => {
  if (!student.value) return []
  return [...assignments.value]
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
    .map((assignment) => {
      const submission = findSubmission(assignment.id, student.value.id, mySubmissions.value)
      return {
        ...assignment,
        submission,
        status: !submission ? 'missing' : isGradedSubmission(submission) ? 'graded' : 'pending'
      }
    })
})

function recordFor(sessionId) {
  if (!student.value) return null
  return (
    attendance.value.find(
      (item) => item.sessionId === sessionId && item.studentId === student.value.id
    ) ?? null
  )
}

function isLateWindow(session) {
  return Date.now() > new Date(session.time).getTime() + 15 * 60 * 1000
}

function checkIn(session) {
  if (!student.value) {
    checkinNotes[session.id] = { type: 'danger', text: '请先加入班级后再签到。' }
    return
  }

  const result = actions.checkIn({
    sessionId: session.id,
    studentId: student.value.id
  })

  checkinNotes[session.id] = result.ok
    ? {
        type: 'success',
        text:
          result.status === 'late'
            ? `签到成功，已记录为「迟到」（${formatTime(new Date())}）。`
            : `签到成功，已记录为「已签到」（${formatTime(new Date())}）。`
      }
    : { type: 'danger', text: result.error }
}

function joinClass() {
  const result = actions.joinClass(joinForm)
  joinFeedback.value = result.ok
    ? {
        type: 'success',
        text: result.existing
          ? `已回到「${result.class.name}」，当前身份：${result.student.name}。`
          : `成功加入「${result.class.name}」，欢迎你，${result.student.name}！`
      }
    : { type: 'danger', text: result.error }

  if (result.ok && !result.existing) joinForm.name = ''
}

function statusMeta(assignment) {
  if (assignment.status === 'graded') {
    return { text: `已批改 ${formatScore(assignment.submission.score)} 分`, class: 'badge-success' }
  }
  if (assignment.status === 'pending') {
    return { text: '已提交 · 待批改', class: 'badge-accent' }
  }
  return isLateSubmission(null, assignment) || new Date(assignment.dueAt) < new Date()
    ? { text: '已截止 · 可补交', class: 'badge-danger' }
    : { text: '待提交', class: 'badge-warn' }
}
</script>

<template>
  <section>
    <header class="page-head">
      <div>
        <div class="page-eyebrow">Student Workspace</div>
        <h1 class="page-title">
          {{ student ? `你好，${student.name}` : '欢迎来到智慧课堂' }}
        </h1>
        <p class="page-desc">
          {{ currentClass ? `${currentClass.name} · ${currentClass.semester}` : '输入班级码加入一个班级，开始今天的学习。' }}
        </p>
      </div>
      <div class="row">
        <span v-if="currentClass" class="badge badge-brand">班级码 {{ currentClass.code }}</span>
        <span class="badge">{{ formatWeekday(new Date()) }}</span>
      </div>
    </header>

    <div class="stack">
      <div v-if="student" class="hero">
        <h2>今日学习简报</h2>
        <p>{{ today.length ? `今天有 ${today.length} 节课堂，记得先签到。` : '今天没有排课，可以提前看看待交作业。' }}</p>

        <div class="hero-stats">
          <div class="hero-stat">
            <strong>{{ today.length }}</strong>
            <span>今日课堂</span>
          </div>
          <div class="hero-stat">
            <strong>{{ formatPercent(analytics?.attendance.rate ?? 0) }}</strong>
            <span>我的出勤率</span>
          </div>
          <div class="hero-stat">
            <strong>{{ formatPercent(analytics?.submissionRate ?? 0) }}</strong>
            <span>作业提交率</span>
          </div>
          <div class="hero-stat">
            <strong>{{ analytics?.grades.count ? formatScore(analytics.grades.average) : '—' }}</strong>
            <span>已批改平均分</span>
          </div>
        </div>
      </div>

      <div v-else class="hero">
        <h2>先加入你的班级</h2>
        <p>向老师获取班级码，加入后即可签到、提交作业并查看成绩。</p>
        <div class="hero-stats">
          <div class="hero-stat">
            <strong>6</strong>
            <span>示例班级学生</span>
          </div>
          <div class="hero-stat">
            <strong>3</strong>
            <span>已排课堂</span>
          </div>
          <div class="hero-stat">
            <strong>3</strong>
            <span>已发布作业</span>
          </div>
        </div>
      </div>

      <div class="grid-2">
        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">今日课堂</div>
              <div class="card-sub">课堂开始 15 分钟后签到会标记为迟到</div>
            </div>
            <span class="badge badge-brand">{{ today.length }} 节</span>
          </div>

          <div v-if="!currentClass" class="empty">加入班级后，这里会显示今天的课堂。</div>
          <div v-else-if="!today.length" class="empty">今天没有课堂安排。</div>

          <div v-else class="list">
            <div v-for="session in today" :key="session.id" class="today-card">
              <div class="today-head">
                <div class="session-time">
                  <strong>{{ formatTime(session.time) }}</strong>
                  <span>开始</span>
                </div>
                <div style="min-width: 0; flex: 1">
                  <strong>{{ session.topic }}</strong>
                  <div class="meta-line">
                    <span>{{ formatDateTime(session.time) }}</span>
                    <span>容量 {{ session.capacity }}</span>
                  </div>
                </div>
                <span v-if="recordFor(session.id)" class="badge" :class="recordFor(session.id).status === 'late' ? 'badge-warn' : 'badge-success'">
                  {{ ATTENDANCE_LABELS[recordFor(session.id).status] }}
                </span>
              </div>

              <div class="tag-list" style="margin-top: 10px">
                <span v-for="point in session.knowledgePoints" :key="point" class="tag">{{ point }}</span>
              </div>

              <div class="row" style="margin-top: 14px">
                <button
                  class="btn btn-primary"
                  :disabled="Boolean(recordFor(session.id))"
                  @click="checkIn(session)"
                >
                  {{ recordFor(session.id) ? '已完成签到' : isLateWindow(session) ? '迟到签到' : '课堂签到' }}
                </button>
                <span class="small muted">
                  {{
                    recordFor(session.id)
                      ? `签到时间 ${formatTime(recordFor(session.id).checkedAt)}`
                      : '点击按钮记录本次课堂出勤'
                  }}
                </span>
              </div>

              <div
                v-if="checkinNotes[session.id]"
                class="callout"
                :class="checkinNotes[session.id].type"
                style="margin-top: 12px; padding: 9px 12px"
              >
                {{ checkinNotes[session.id].text }}
              </div>
            </div>
          </div>
        </article>

        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">加入班级</div>
              <div class="card-sub">输入老师提供的班级码与姓名</div>
            </div>
            <span class="badge">演示班级码 {{ classroom.classes[0]?.code ?? '—' }}</span>
          </div>

          <form class="join-form" @submit.prevent="joinClass">
            <div class="field">
              <label for="join-code">班级码</label>
              <input id="join-code" v-model="joinForm.code" class="input" placeholder="如 SC-2026" />
            </div>
            <div class="field">
              <label for="join-name">你的姓名</label>
              <input id="join-name" v-model="joinForm.name" class="input" placeholder="输入真实姓名" />
            </div>
            <button class="btn btn-primary" type="submit">加入班级</button>
          </form>

          <div
            v-if="joinFeedback"
            class="callout"
            :class="joinFeedback.type"
            style="margin-top: 12px"
          >
            {{ joinFeedback.text }}
          </div>

          <hr class="divider" />

          <div v-if="student" class="roster-mini">
            <div class="card-title" style="font-size: 13px">同班同学</div>
            <div class="roster-mini-list">
              <div v-for="classmate in students" :key="classmate.id" class="roster-mini-item">
                <span class="avatar" :class="{ success: classmate.id === student.id }">
                  {{ initials(classmate.name) }}
                </span>
                <span class="small">{{ classmate.name }}</span>
                <span v-if="classmate.id === student.id" class="badge badge-brand">我</span>
              </div>
            </div>
          </div>
          <div v-else class="empty">还没有加入班级，加入后就能看到同班同学。</div>
        </article>
      </div>

      <article class="card">
        <div class="card-head">
          <div>
            <div class="card-title">作业提醒</div>
            <div class="card-sub">按截止时间排序</div>
          </div>
          <button class="btn btn-sm" @click="emit('navigate', 'student-assignments')">去提交作业</button>
        </div>

        <div v-if="!upcoming.length" class="empty">当前班级还没有作业。</div>
        <div v-else class="list">
          <div v-for="item in upcoming.slice(0, 3)" :key="item.id" class="list-item">
            <span class="avatar" :class="item.status === 'graded' ? 'success' : 'accent'">
              {{ item.status === 'graded' ? '✓' : item.status === 'pending' ? '…' : '!' }}
            </span>
            <div style="min-width: 0; flex: 1">
              <div class="row" style="gap: 8px">
                <strong>{{ item.title }}</strong>
                <span class="badge" :class="statusMeta(item).class">{{ statusMeta(item).text }}</span>
                <span v-if="item.status === 'missing' && new Date(item.dueAt) < new Date()" class="badge badge-danger">逾期</span>
              </div>
              <div class="meta-line">
                <span>截止 {{ formatDateTime(item.dueAt) }}</span>
                <span>满分 {{ item.points }}</span>
              </div>
            </div>
            <button class="btn btn-sm" @click="emit('navigate', 'student-assignments')">
              {{ item.status === 'missing' ? '去完成' : '查看' }}
            </button>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.today-card {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface-soft);
}

.today-card + .today-card {
  margin-top: 12px;
}

.today-head {
  display: flex;
  align-items: center;
  gap: 14px;
}

.session-time {
  flex: 0 0 auto;
  width: 56px;
  height: 56px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 13px;
  background: linear-gradient(150deg, var(--brand), #7c6cf6);
  color: #fff;
  line-height: 1.15;
}

.session-time strong {
  font-size: 15px;
  font-weight: 750;
}

.session-time span {
  font-size: 10px;
  opacity: 0.72;
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.roster-mini-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 10px;
}

.roster-mini-item {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 5px 9px 5px 5px;
  border: 1px solid var(--line);
  border-radius: 999px;
  background: var(--surface-soft);
}

.roster-mini-item .avatar {
  width: 24px;
  height: 24px;
  flex: 0 0 24px;
  font-size: 10px;
  border-radius: 50%;
}
</style>