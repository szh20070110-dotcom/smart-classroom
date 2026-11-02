<script setup>
import { computed, reactive, ref } from 'vue'
import { actions, selectors } from '../store/classroom.js'
import {
  ATTENDANCE_LABELS,
  normalizeAttendanceStatus,
  sessionAttendance
} from '../domain/attendance.js'
import { todaySessions } from '../domain/analytics.js'
import {
  addDaysInput,
  formatDateTime,
  formatPercent,
  formatWeekday,
  initials,
  isToday,
  parseKnowledgePoints
} from '../utils/format.js'

const students = computed(() => selectors.classStudents())
const sessions = computed(() => selectors.classSessions())
const attendance = computed(() => selectors.classAttendance())
const currentClass = computed(() => selectors.currentClass())

const form = reactive({
  topic: '',
  time: addDaysInput(1, 9, 0),
  points: '',
  capacity: 30
})

const error = ref('')
const feedback = ref('')
const expanded = ref('')

const today = computed(() => todaySessions(sessions.value, new Date()))

const cards = computed(() =>
  [...sessions.value]
    .sort((a, b) => new Date(b.time) - new Date(a.time))
    .map((session) => {
      const stats = sessionAttendance(session, students.value, attendance.value)
      return {
        ...session,
        stats,
        isToday: isToday(session.time),
        upcoming: new Date(session.time).getTime() > Date.now()
      }
    })
)

function submitSession() {
  error.value = ''
  feedback.value = ''
  const result = actions.createSession({
    classId: currentClass.value?.id,
    topic: form.topic,
    time: form.time,
    knowledgePoints: parseKnowledgePoints(form.points),
    capacity: form.capacity
  })
  if (!result.ok) {
    error.value = result.error
    return
  }
  feedback.value = `课堂「${result.session.topic}」已创建，可以开始点名了。`
  form.topic = ''
  form.points = ''
}

function toggleDetail(sessionId) {
  expanded.value = expanded.value === sessionId ? '' : sessionId
}

function statusClass(status) {
  return status === 'present' ? 'badge-success' : status === 'late' ? 'badge-warn' : 'badge-danger'
}
</script>

<template>
  <section>
    <header class="page-head">
      <div>
        <div class="page-eyebrow">Sessions</div>
        <h1 class="page-title">课堂管理</h1>
        <p class="page-desc">安排课题、知识点与课堂容量，签到数据会实时进入班级看板。</p>
      </div>
      <div class="row">
        <span class="badge badge-accent">今日 {{ today.length }} 节课</span>
        <span class="badge">累计 {{ sessions.length }} 节课</span>
      </div>
    </header>

    <div class="stack">
      <div class="grid-2">
        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">创建课堂</div>
              <div class="card-sub">知识点用逗号分隔即可自动拆成标签</div>
            </div>
          </div>

          <form class="form-grid" @submit.prevent="submitSession">
            <div class="field span-2">
              <label for="session-topic">课堂课题</label>
              <input id="session-topic" v-model="form.topic" class="input" placeholder="如：统计图表：读懂一张图" />
            </div>
            <div class="field">
              <label for="session-time">上课时间</label>
              <input id="session-time" v-model="form.time" class="input" type="datetime-local" />
            </div>
            <div class="field">
              <label for="session-capacity">课堂容量</label>
              <input id="session-capacity" v-model.number="form.capacity" class="input" type="number" min="1" max="200" />
            </div>
            <div class="field span-2">
              <label for="session-points">知识点</label>
              <input id="session-points" v-model="form.points" class="input" placeholder="统计图表, 数据解读, 图表选择" />
            </div>

            <div v-if="error" class="callout danger span-2">{{ error }}</div>
            <div v-if="feedback" class="callout success span-2">{{ feedback }}</div>

            <div class="span-2 row">
              <button class="btn btn-primary" type="submit">发布课堂</button>
              <span class="small muted">学生端只展示「今日课堂」</span>
            </div>
          </form>
        </article>

        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">今日课堂</div>
              <div class="card-sub">用于快速查看今天的课与签到进度</div>
            </div>
          </div>

          <div v-if="!today.length" class="empty">今天没有排课，可以在左侧创建一节。</div>
          <div v-else class="list">
            <div v-for="session in today" :key="session.id" class="list-item">
              <div class="avatar accent">{{ formatWeekday(session.time).slice(-1) }}</div>
              <div style="min-width: 0">
                <strong>{{ session.topic }}</strong>
                <div class="meta-line">
                  <span>{{ formatDateTime(session.time) }}</span>
                  <span>容量 {{ session.capacity }}</span>
                </div>
              </div>
              <div class="spacer" />
              <span class="badge badge-brand">今日</span>
            </div>
          </div>
        </article>
      </div>

      <article class="card">
        <div class="card-head">
          <div>
            <div class="card-title">课堂与点名</div>
            <div class="card-sub">点击课堂行展开签到明细</div>
          </div>
        </div>

        <div v-if="!cards.length" class="empty">还没有课堂记录。</div>

        <div v-else class="session-list">
          <div v-for="session in cards" :key="session.id" class="session-block">
            <button class="session-head" @click="toggleDetail(session.id)">
              <div class="session-date">
                <strong>{{ new Date(session.time).getDate() }}</strong>
                <span>{{ new Date(session.time).getMonth() + 1 }}月</span>
              </div>

              <div class="session-main">
                <div class="row" style="gap: 8px">
                  <strong>{{ session.topic }}</strong>
                  <span v-if="session.isToday" class="badge badge-brand">今日</span>
                  <span v-else-if="session.upcoming" class="badge badge-accent">未开始</span>
                  <span v-else class="badge">已结束</span>
                </div>
                <div class="meta-line">
                  <span>{{ formatDateTime(session.time) }} {{ formatWeekday(session.time) }}</span>
                  <span>容量 {{ session.capacity }}</span>
                  <span>签到 {{ session.stats.attended }}/{{ session.stats.total }}</span>
                </div>
                <div class="tag-list" style="margin-top: 8px">
                  <span v-for="point in session.knowledgePoints" :key="point" class="tag">{{ point }}</span>
                </div>
              </div>

              <div class="session-rate">
                <strong>{{ formatPercent(session.stats.rate) }}</strong>
                <div class="progress" style="width: 110px">
                  <span :style="{ width: `${session.stats.rate * 100}%` }" />
                </div>
                <span class="small muted">{{ expanded === session.id ? '收起明细' : '查看明细' }}</span>
              </div>
            </button>

            <div v-if="expanded === session.id" class="roster">
              <div v-for="entry in session.stats.roster" :key="entry.studentId" class="roster-item">
                <span class="avatar">{{ initials(entry.name) }}</span>
                <div>
                  <strong>{{ entry.name }}</strong>
                  <div class="small muted">
                    {{ entry.checkedAt ? `签到于 ${formatDateTime(entry.checkedAt)}` : '未签到' }}
                  </div>
                </div>
                <div class="spacer" />
                <span class="badge" :class="statusClass(normalizeAttendanceStatus(entry.status))">
                  {{ ATTENDANCE_LABELS[entry.status] }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.session-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.session-block {
  border: 1px solid var(--line);
  border-radius: 14px;
  overflow: hidden;
  background: var(--surface);
}

.session-head {
  display: flex;
  align-items: center;
  gap: 16px;
  width: 100%;
  padding: 16px;
  border: 0;
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.18s ease;
}

.session-head:hover {
  background: var(--surface-soft);
}

.session-date {
  flex: 0 0 48px;
  height: 52px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--brand-soft);
  color: var(--brand-deep);
  line-height: 1.1;
}

.session-date strong {
  font-size: 19px;
  font-weight: 750;
}

.session-date span {
  font-size: 10px;
  margin-top: 3px;
}

.session-main {
  min-width: 0;
  flex: 1;
}

.session-rate {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 5px;
  flex: 0 0 auto;
}

.session-rate strong {
  font-size: 16px;
  font-weight: 750;
}

.roster {
  padding: 6px 16px 14px;
  border-top: 1px dashed var(--line);
  background: var(--surface-soft);
}

.roster-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--line);
}

.roster-item:last-child {
  border-bottom: 0;
}

.roster-item .avatar {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  font-size: 11px;
}

@media (max-width: 720px) {
  .session-head {
    flex-wrap: wrap;
  }

  .session-rate {
    align-items: flex-start;
    width: 100%;
    flex-direction: row;
    align-items: center;
  }
}
</style>