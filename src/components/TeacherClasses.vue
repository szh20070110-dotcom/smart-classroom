<script setup>
import { computed, reactive, ref } from 'vue'
import { classroom, actions, selectors } from '../store/classroom.js'
import { attendanceOverview } from '../domain/attendance.js'
import { studentGradeSummary } from '../domain/grades.js'
import { formatDate, formatPercent, formatScore, initials } from '../utils/format.js'

const form = reactive({
  name: '',
  semester: '2027 春季学期',
  capacity: 45
})

const feedback = ref('')
const error = ref('')
const copied = ref('')

const students = computed(() => selectors.classStudents())
const sessions = computed(() => selectors.classSessions())
const assignments = computed(() => selectors.classAssignments())
const attendance = computed(() => selectors.classAttendance())
const submissions = computed(() => selectors.classSubmissions())
const currentClass = computed(() => selectors.currentClass())

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
        gradedCount: grade.gradedCount
      }
    })
    .sort((a, b) => b.average - a.average)
})

function submitClass() {
  error.value = ''
  feedback.value = ''
  const result = actions.createClass(form)
  if (!result.ok) {
    error.value = result.error
    return
  }
  feedback.value = `班级「${result.class.name}」创建成功，班级码 ${result.class.code}，可发给学生加入。`
  form.name = ''
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code)
    copied.value = code
    setTimeout(() => {
      if (copied.value === code) copied.value = ''
    }, 1800)
  } catch {
    copied.value = ''
    error.value = '当前浏览器不允许访问剪贴板，请手动复制班级码。'
  }
}
</script>

<template>
  <section>
    <header class="page-head">
      <div>
        <div class="page-eyebrow">Classes</div>
        <h1 class="page-title">班级管理</h1>
        <p class="page-desc">创建班级、查看班级码与学生画像，学生凭班级码即可加入。</p>
      </div>
      <div v-if="currentClass" class="row">
        <span class="badge badge-brand">{{ currentClass.semester }}</span>
        <span class="badge">{{ students.length }}/{{ currentClass.capacity }} 人</span>
      </div>
    </header>

    <div class="stack">
      <div class="grid-2">
        <article v-if="currentClass" class="card">
          <div class="card-head">
            <div>
              <div class="card-title">{{ currentClass.name }}</div>
              <div class="card-sub">创建于 {{ formatDate(currentClass.createdAt) }}</div>
            </div>
            <span class="badge badge-success">进行中</span>
          </div>

          <div class="row" style="gap: 14px">
            <span class="code-chip">{{ currentClass.code }}</span>
            <button class="btn btn-sm" @click="copyCode(currentClass.code)">
              {{ copied === currentClass.code ? '已复制' : '复制班级码' }}
            </button>
          </div>

          <hr class="divider" />

          <div class="meta-line">
            <span>学期：{{ currentClass.semester }}</span>
            <span>容量：{{ currentClass.capacity }} 人</span>
            <span>已加入：{{ students.length }} 人</span>
          </div>

          <div style="margin-top: 14px" class="progress">
            <span :style="{ width: `${Math.min((students.length / currentClass.capacity) * 100, 100)}%` }" />
          </div>
          <div class="small muted" style="margin-top: 6px">
            班级容量使用率 {{ formatPercent(students.length / currentClass.capacity) }}
          </div>
        </article>

        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">创建新班级</div>
              <div class="card-sub">系统会自动生成一个唯一班级码</div>
            </div>
          </div>

          <form class="form-grid" @submit.prevent="submitClass">
            <div class="field span-2">
              <label for="class-name">班级名称</label>
              <input id="class-name" v-model="form.name" class="input" placeholder="如：高二(4)班 · 数据素养" />
            </div>
            <div class="field">
              <label for="class-semester">学期</label>
              <input id="class-semester" v-model="form.semester" class="input" placeholder="2027 春季学期" />
            </div>
            <div class="field">
              <label for="class-capacity">班级人数</label>
              <input id="class-capacity" v-model.number="form.capacity" class="input" type="number" min="1" max="200" />
            </div>

            <div v-if="error" class="callout danger span-2">{{ error }}</div>
            <div v-if="feedback" class="callout success span-2">{{ feedback }}</div>

            <div class="span-2 row">
              <button class="btn btn-primary" type="submit">创建班级</button>
              <span class="small muted">创建后会自动切换到新班级</span>
            </div>
          </form>
        </article>
      </div>

      <article class="card">
        <div class="card-head">
          <div>
            <div class="card-title">班级列表</div>
            <div class="card-sub">点击卡片切换当前班级</div>
          </div>
        </div>

        <div class="class-list">
          <button
            v-for="item in classroom.classes"
            :key="item.id"
            class="class-item"
            :class="{ active: item.id === classroom.ui.currentClassId }"
            @click="actions.selectClass(item.id)"
          >
            <div>
              <strong>{{ item.name }}</strong>
              <div class="small muted">{{ item.semester }} · {{ item.capacity }} 人容量</div>
            </div>
            <span class="code-chip small-chip">{{ item.code }}</span>
          </button>
        </div>
      </article>

      <article class="card">
        <div class="card-head">
          <div>
            <div class="card-title">学生名单</div>
            <div class="card-sub">按平均分排序 · 共 {{ roster.length }} 人</div>
          </div>
          <span class="badge badge-accent">班级数据</span>
        </div>

        <div v-if="!roster.length" class="empty">还没有学生加入，把班级码发给学生即可。</div>

        <table v-else class="table">
          <thead>
            <tr>
              <th>学生</th>
              <th>加入时间</th>
              <th>出勤率</th>
              <th>已批改</th>
              <th>平均分</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="student in roster" :key="student.id">
              <td>
                <div class="row" style="gap: 10px">
                  <span class="avatar">{{ initials(student.name) }}</span>
                  <span>{{ student.name }}</span>
                </div>
              </td>
              <td class="small muted">{{ formatDate(student.joinedAt) }}</td>
              <td>
                <div class="row" style="gap: 8px">
                  <div class="progress" style="width: 84px">
                    <span :style="{ width: `${student.attendanceRate * 100}%` }" />
                  </div>
                  <span class="small">{{ formatPercent(student.attendanceRate) }}</span>
                </div>
              </td>
              <td class="small muted">{{ student.gradedCount }} 次</td>
              <td>
                <span class="score" :class="student.average >= 85 ? 'high' : student.average >= 60 ? 'mid' : 'low'">
                  {{ formatScore(student.average) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </article>
    </div>
  </section>
</template>

<style scoped>
.class-list {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 12px;
}

.class-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  text-align: left;
  border: 1px solid var(--line);
  border-radius: 13px;
  background: var(--surface-soft);
  cursor: pointer;
  transition: 0.18s ease;
}

.class-item:hover {
  border-color: #c7cdf0;
  background: #f4f5ff;
}

.class-item.active {
  border-color: rgba(79, 70, 229, 0.55);
  background: var(--brand-soft);
  box-shadow: 0 8px 20px rgba(79, 70, 229, 0.1);
}

.small-chip {
  font-size: 11px;
  padding: 5px 10px;
  letter-spacing: 1px;
}
</style>