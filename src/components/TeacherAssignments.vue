<script setup>
import { computed, reactive, ref, watch } from 'vue'
import { actions, selectors } from '../store/classroom.js'
import {
  assignmentSubmissionStats,
  isGradedSubmission,
  isLateSubmission
} from '../domain/submissions.js'
import {
  addDaysInput,
  formatDateTime,
  formatPercent,
  formatScore,
  initials
} from '../utils/format.js'

const students = computed(() => selectors.classStudents())
const assignments = computed(() => selectors.classAssignments())
const submissions = computed(() => selectors.classSubmissions())
const currentClass = computed(() => selectors.currentClass())

const form = reactive({
  title: '',
  questions: '',
  dueAt: addDaysInput(3, 23, 59),
  points: 100
})

const error = ref('')
const feedback = ref('')
const pageNote = ref(null)
const selectedId = ref(
  assignments.value.find((assignment) =>
    submissions.value.some(
      (submission) =>
        submission.assignmentId === assignment.id && !isGradedSubmission(submission)
    )
  )?.id ?? ''
)
const filter = ref('pending')
const drafts = reactive({})
const notes = reactive({})

const cards = computed(() =>
  assignments.value.map((assignment) => {
    const stats = assignmentSubmissionStats(assignment, students.value, submissions.value)
    const rows = submissions.value.filter((item) => item.assignmentId === assignment.id)
    return {
      ...assignment,
      stats,
      pending: rows.filter((item) => !isGradedSubmission(item)).length,
      graded: rows.filter((item) => isGradedSubmission(item)).length
    }
  })
)

const selectedAssignment = computed(
  () => cards.value.find((item) => item.id === selectedId.value) ?? cards.value[0] ?? null
)

const selectedSubmissions = computed(() => {
  if (!selectedAssignment.value) return []
  const rows = submissions.value
    .filter((item) => item.assignmentId === selectedAssignment.value.id)
    .map((item) => ({
      ...item,
      studentName: selectors.studentById(item.studentId)?.name ?? '未知学生',
      graded: isGradedSubmission(item),
      late: isLateSubmission(item, selectedAssignment.value)
    }))
    .sort((a, b) => {
      if (a.graded !== b.graded) return a.graded ? 1 : -1
      return new Date(b.submittedAt) - new Date(a.submittedAt)
    })

  if (filter.value === 'pending') return rows.filter((item) => !item.graded)
  if (filter.value === 'graded') return rows.filter((item) => item.graded)
  return rows
})

watch(
  selectedSubmissions,
  (rows) => {
    for (const row of rows) {
      if (!drafts[row.id]) {
        drafts[row.id] = {
          score: typeof row.score === 'number' ? row.score : '',
          comment: row.comment ?? ''
        }
      }
    }
  },
  { immediate: true }
)

function submitAssignmentForm() {
  error.value = ''
  feedback.value = ''
  const result = actions.createAssignment({
    classId: currentClass.value?.id,
    title: form.title,
    questions: form.questions,
    dueAt: form.dueAt,
    points: form.points
  })
  if (!result.ok) {
    error.value = result.error
    return
  }
  feedback.value = `作业「${result.assignment.title}」已发布，学生端可立即提交。`
  form.title = ''
  form.questions = ''
  selectedId.value = result.assignment.id
  filter.value = 'pending'
}

function chooseAssignment(assignmentId) {
  selectedId.value = assignmentId
  filter.value = 'pending'
}

function saveGrade(row) {
  error.value = ''
  const draft = drafts[row.id]
  const result = actions.gradeSubmission({
    submissionId: row.id,
    score: draft.score,
    comment: draft.comment
  })

  if (!result.ok) {
    notes[row.id] = { type: 'danger', text: result.error }
    return
  }

  notes[row.id] = { type: 'success', text: '评分已保存' }
  pageNote.value = {
    type: 'success',
    text: `已保存 ${row.studentName} 的评分${
      typeof result.submission.score === 'number' ? `：${result.submission.score} 分` : ''
    }。`
  }
  setTimeout(() => {
    if (notes[row.id]?.text === '评分已保存') delete notes[row.id]
  }, 2200)
  setTimeout(() => {
    pageNote.value = null
  }, 2600)
}

function statusBadge(row) {
  if (row.graded) return { class: 'badge-success', text: '已批改' }
  return { class: 'badge-warn', text: '待批改' }
}
</script>

<template>
  <section>
    <header class="page-head">
      <div>
        <div class="page-eyebrow">Assignments</div>
        <h1 class="page-title">作业与批改</h1>
        <p class="page-desc">发布作业、跟踪提交率，并在同一页完成打分与评语。</p>
      </div>
      <div class="row">
        <span class="badge badge-brand">共 {{ assignments.length }} 次作业</span>
        <span class="badge badge-warn">待批 {{ cards.reduce((sum, item) => sum + item.pending, 0) }} 份</span>
      </div>
    </header>

    <div class="stack">
      <div class="grid-2">
        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">发布作业</div>
              <div class="card-sub">题目会完整展示给学生</div>
            </div>
          </div>

          <form class="form-grid" @submit.prevent="submitAssignmentForm">
            <div class="field span-2">
              <label for="assignment-title">作业标题</label>
              <input id="assignment-title" v-model="form.title" class="input" placeholder="如：作业四 · 用条形图讲一个故事" />
            </div>
            <div class="field span-2">
              <label for="assignment-questions">题目要求</label>
              <textarea id="assignment-questions" v-model="form.questions" class="textarea" placeholder="写清楚任务、数据与作答要求…" />
            </div>
            <div class="field">
              <label for="assignment-due">截止时间</label>
              <input id="assignment-due" v-model="form.dueAt" class="input" type="datetime-local" />
            </div>
            <div class="field">
              <label for="assignment-points">分值</label>
              <input id="assignment-points" v-model.number="form.points" class="input" type="number" min="1" max="1000" />
            </div>

            <div v-if="error" class="callout danger span-2">{{ error }}</div>
            <div v-if="feedback" class="callout success span-2">{{ feedback }}</div>

            <div class="span-2 row">
              <button class="btn btn-primary" type="submit">发布作业</button>
              <span class="small muted">截止后仍可提交，但会标记为逾期</span>
            </div>
          </form>
        </article>

        <article class="card">
          <div class="card-head">
            <div>
              <div class="card-title">作业跟踪</div>
              <div class="card-sub">提交率 = 已提交人数 / 班级人数</div>
            </div>
          </div>

          <div v-if="!cards.length" class="empty">还没有作业。</div>
          <div v-else class="list">
            <div v-for="item in cards" :key="item.id" class="list-item assignment-row">
              <div style="min-width: 0; flex: 1">
                <div class="row" style="gap: 8px">
                  <strong>{{ item.title }}</strong>
                  <span v-if="item.pending" class="badge badge-warn">待批 {{ item.pending }}</span>
                </div>
                <div class="meta-line">
                  <span>截止 {{ formatDateTime(item.dueAt) }}</span>
                  <span>{{ item.points }} 分</span>
                  <span>已批 {{ item.graded }} 份</span>
                </div>
                <div class="row" style="margin-top: 8px; gap: 10px">
                  <div class="progress" style="flex: 1">
                    <span :style="{ width: `${item.stats.rate * 100}%` }" />
                  </div>
                  <span class="small" style="font-weight: 700">{{ formatPercent(item.stats.rate) }}</span>
                </div>
              </div>
              <button class="btn btn-sm" @click="chooseAssignment(item.id)">批改</button>
            </div>
          </div>
        </article>
      </div>

      <article v-if="selectedAssignment" class="card">
        <div class="card-head">
          <div>
            <div class="card-title">批改台 · {{ selectedAssignment.title }}</div>
            <div class="card-sub">
              已提交 {{ selectedAssignment.stats.submitted }}/{{ selectedAssignment.stats.expected }} ·
              满分 {{ selectedAssignment.points }} 分
            </div>
          </div>
          <div class="pill-tabs">
            <button :class="{ active: filter === 'pending' }" @click="filter = 'pending'">待批改</button>
            <button :class="{ active: filter === 'graded' }" @click="filter = 'graded'">已批改</button>
            <button :class="{ active: filter === 'all' }" @click="filter = 'all'">全部</button>
          </div>
        </div>

        <div v-if="pageNote" class="callout" :class="pageNote.type">
          {{ pageNote.text }}
        </div>

        <div v-if="!selectedSubmissions.length" class="empty">
          {{ filter === 'pending' ? '这份作业的提交都已批改完成。' : '暂无符合条件的提交。' }}
        </div>

        <div v-else class="grade-list">
          <div v-for="row in selectedSubmissions" :key="row.id" class="grade-card">
            <div class="grade-head">
              <span class="avatar">{{ initials(row.studentName) }}</span>
              <div>
                <div class="row" style="gap: 8px">
                  <strong>{{ row.studentName }}</strong>
                  <span class="badge" :class="statusBadge(row).class">{{ statusBadge(row).text }}</span>
                  <span v-if="row.late" class="badge badge-danger">逾期提交</span>
                </div>
                <div class="small muted">提交于 {{ formatDateTime(row.submittedAt) }}</div>
              </div>
              <div class="spacer" />
              <div v-if="row.graded" class="grade-score">
                <span class="score high">{{ formatScore(row.score) }}</span>
                <span class="small muted">/ {{ selectedAssignment.points }}</span>
              </div>
            </div>

            <div class="answer-box">{{ row.answer }}</div>

            <div class="grade-form">
              <div class="field" style="max-width: 130px">
                <label :for="`score-${row.id}`">打分（0-{{ selectedAssignment.points }}）</label>
                <input
                  :id="`score-${row.id}`"
                  v-model="drafts[row.id].score"
                  class="input"
                  type="number"
                  min="0"
                  :max="selectedAssignment.points"
                  step="0.5"
                />
              </div>
              <div class="field" style="flex: 1">
                <label :for="`comment-${row.id}`">评语</label>
                <input
                  :id="`comment-${row.id}`"
                  v-model="drafts[row.id].comment"
                  class="input"
                  placeholder="写一句具体、可执行的反馈…"
                />
              </div>
              <button class="btn btn-primary btn-sm grade-save" @click="saveGrade(row)">
                {{ row.graded ? '更新评分' : '保存评分' }}
              </button>
            </div>

            <div
              v-if="notes[row.id]"
              class="callout"
              :class="notes[row.id].type"
              style="margin-top: 10px; padding: 9px 12px"
            >
              {{ notes[row.id].text }}
            </div>
          </div>
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.assignment-row {
  align-items: flex-start;
}

.grade-list {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.grade-card {
  padding: 16px;
  border: 1px solid var(--line);
  border-radius: 14px;
  background: var(--surface-soft);
}

.grade-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
}

.grade-score {
  display: flex;
  align-items: baseline;
  gap: 4px;
}

.grade-score .score {
  font-size: 24px;
}

.grade-form {
  display: flex;
  align-items: flex-end;
  gap: 12px;
  margin-top: 12px;
  flex-wrap: wrap;
}

.grade-save {
  height: 38px;
  margin-bottom: 1px;
}

@media (max-width: 720px) {
  .grade-form {
    flex-direction: column;
    align-items: stretch;
  }

  .grade-form .field {
    max-width: none !important;
  }
}
</style>