<script setup>
import { computed, reactive, watch } from 'vue'
import { actions, selectors } from '../store/classroom.js'
import { findSubmission, isGradedSubmission, isLateSubmission } from '../domain/submissions.js'
import { formatDateTime, formatScore, scoreTone } from '../utils/format.js'

const student = computed(() => selectors.currentStudent())
const assignments = computed(() => selectors.classAssignments())
const submissions = computed(() => selectors.classSubmissions())
const currentClass = computed(() => selectors.currentClass())

const drafts = reactive({})
const notes = reactive({})

const cards = computed(() =>
  assignments.value
    .map((assignment) => {
      const submission = student.value
        ? findSubmission(assignment.id, student.value.id, submissions.value)
        : null
      const graded = isGradedSubmission(submission)
      return {
        ...assignment,
        submission,
        graded,
        status: !submission ? 'missing' : graded ? 'graded' : 'pending',
        overdue: new Date(assignment.dueAt) < new Date(),
        late: submission ? isLateSubmission(submission, assignment) : false
      }
    })
    .sort((a, b) => new Date(a.dueAt) - new Date(b.dueAt))
)

watch(
  cards,
  (items) => {
    for (const item of items) {
      if (!drafts[item.id]) {
        drafts[item.id] = { answer: item.submission?.answer ?? '' }
      }
    }
  },
  { immediate: true }
)

const doneCount = computed(() => cards.value.filter((item) => item.status !== 'missing').length)
const gradedCount = computed(() => cards.value.filter((item) => item.status === 'graded').length)

function submitWork(item) {
  if (!student.value) return

  const result = actions.submitAssignment({
    assignmentId: item.id,
    studentId: student.value.id,
    answer: drafts[item.id].answer
  })

  if (!result.ok) {
    notes[item.id] = { type: 'danger', text: result.error }
    return
  }

  notes[item.id] = {
    type: 'success',
    text: result.updated ? '答案已更新，等待老师批改。' : '提交成功，等待老师批改。'
  }
  setTimeout(() => {
    if (notes[item.id]?.text.includes('等待老师批改')) delete notes[item.id]
  }, 2600)
}
</script>

<template>
  <section>
    <header class="page-head">
      <div>
        <div class="page-eyebrow">Assignments</div>
        <h1 class="page-title">我的作业</h1>
        <p class="page-desc">
          {{ currentClass ? `${currentClass.name} · 共 ${cards.length} 次作业` : '加入班级后即可提交作业。' }}
        </p>
      </div>
      <div class="row">
        <span class="badge badge-success">已提交 {{ doneCount }}</span>
        <span class="badge badge-brand">已批改 {{ gradedCount }}</span>
        <span v-if="doneCount < cards.length" class="badge badge-warn">待提交 {{ cards.length - doneCount }}</span>
      </div>
    </header>

    <div v-if="!student" class="card">
      <div class="empty">请先在「今日课堂」页输入班级码加入班级。</div>
    </div>

    <div v-else class="stack">
      <div v-if="!cards.length" class="card">
        <div class="empty">当前班级还没有作业。</div>
      </div>

      <article v-for="item in cards" :key="item.id" class="card assignment-card">
        <div class="card-head">
          <div>
            <div class="row" style="gap: 8px">
              <div class="card-title">{{ item.title }}</div>
              <span v-if="item.status === 'graded'" class="badge badge-success">已批改</span>
              <span v-else-if="item.status === 'pending'" class="badge badge-accent">待批改</span>
              <span v-else class="badge badge-warn">未提交</span>
              <span v-if="item.late" class="badge badge-danger">逾期提交</span>
              <span v-else-if="item.overdue && item.status === 'missing'" class="badge badge-danger">已截止</span>
            </div>
            <div class="meta-line" style="margin-top: 6px">
              <span>截止 {{ formatDateTime(item.dueAt) }}</span>
              <span>满分 {{ item.points }} 分</span>
              <span v-if="item.submission">提交于 {{ formatDateTime(item.submission.submittedAt) }}</span>
            </div>
          </div>

          <div v-if="item.graded" class="score-wrap">
            <span class="score" :class="scoreTone(item.submission.score)">
              {{ formatScore(item.submission.score) }}
            </span>
            <span class="small muted">/ {{ item.points }}</span>
          </div>
        </div>

        <div class="question-box">
          <div class="question-label">题目要求</div>
          <p>{{ item.questions }}</p>
        </div>

        <div v-if="item.status === 'graded'" class="graded-block">
          <div class="answer-box">{{ item.submission.answer }}</div>
          <div class="comment-box">
            <span class="comment-label">老师评语</span>
            <p>{{ item.submission.comment || '老师没有留下文字评语。' }}</p>
          </div>
        </div>

        <div v-else class="answer-form">
          <div class="field">
            <label :for="`answer-${item.id}`">
              {{ item.status === 'pending' ? '修改你的答案' : '你的答案' }}
            </label>
            <textarea
              :id="`answer-${item.id}`"
              v-model="drafts[item.id].answer"
              class="textarea"
              placeholder="写下你的思路、数据与结论…"
            />
            <span class="field-hint">
              {{ item.status === 'pending' ? '已提交，老师批改前仍可修改。' : '提交后老师批改前仍可修改。' }}
            </span>
          </div>

          <div class="row">
            <button class="btn btn-primary" :disabled="!drafts[item.id].answer.trim()" @click="submitWork(item)">
              {{ item.status === 'pending' ? '更新提交' : '提交作业' }}
            </button>
            <span v-if="item.overdue" class="small" style="color: var(--warn)">已过截止时间，补交会被标记为逾期</span>
          </div>
        </div>

        <div v-if="notes[item.id]" class="callout" :class="notes[item.id].type" style="margin-top: 12px">
          {{ notes[item.id].text }}
        </div>
      </article>
    </div>
  </section>
</template>

<style scoped>
.assignment-card {
  position: relative;
  overflow: hidden;
}

.assignment-card::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, var(--brand), #8b7cf8);
}

.question-box {
  padding: 14px 16px;
  border-radius: 12px;
  background: #f7f8fd;
  border: 1px solid var(--line);
}

.question-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.6px;
  color: var(--muted);
  text-transform: uppercase;
  margin-bottom: 6px;
}

.question-box p {
  font-size: 13px;
  line-height: 1.75;
  color: var(--ink-soft);
}

.answer-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-top: 14px;
}

.graded-block {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 14px;
}

.comment-box {
  padding: 12px 14px;
  border-radius: 12px;
  background: var(--success-soft);
  border: 1px solid rgba(21, 128, 61, 0.12);
}

.comment-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  color: var(--success);
  margin-bottom: 4px;
}

.comment-box p {
  font-size: 13px;
  color: #166534;
  line-height: 1.7;
}

.score-wrap {
  display: flex;
  align-items: baseline;
  gap: 4px;
  flex: 0 0 auto;
}

.score-wrap .score {
  font-size: 30px;
  letter-spacing: -1px;
}
</style>