import { reactive, watch } from 'vue'
import { createSeedState } from '../data/seed.js'
import { uid } from '../utils/format.js'

export const STORAGE_KEY = 'smart-classroom:v1'
const STATE_VERSION = 1

function safeStorage() {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null
  } catch {
    return null
  }
}

function normalizeState(candidate) {
  if (!candidate || typeof candidate !== 'object') return null

  const collections = ['classes', 'students', 'sessions', 'assignments', 'attendance', 'submissions']
  for (const key of collections) {
    if (!Array.isArray(candidate[key])) return null
  }

  const classes = candidate.classes
  const students = candidate.students
  const firstClassId = classes[0]?.id ?? null
  const ui = candidate.ui ?? {}

  const currentClassId = classes.some((item) => item.id === ui.currentClassId)
    ? ui.currentClassId
    : firstClassId

  const classStudents = students.filter((student) => student.classId === currentClassId)
  const currentStudentId = classStudents.some((item) => item.id === ui.currentStudentId)
    ? ui.currentStudentId
    : classStudents[0]?.id ?? null

  return {
    version: STATE_VERSION,
    ui: {
      role: ui.role === 'student' ? 'student' : 'teacher',
      currentClassId,
      currentStudentId
    },
    classes,
    students,
    sessions: candidate.sessions,
    assignments: candidate.assignments,
    attendance: candidate.attendance,
    submissions: candidate.submissions,
    meta: candidate.meta ?? { source: 'local' }
  }
}

export function loadState() {
  const storage = safeStorage()
  if (!storage) return createSeedState()

  try {
    const raw = storage.getItem(STORAGE_KEY)
    if (!raw) return createSeedState()
    return normalizeState(JSON.parse(raw)) ?? createSeedState()
  } catch {
    return createSeedState()
  }
}

export const classroom = reactive(loadState())

watch(
  classroom,
  (value) => {
    const storage = safeStorage()
    if (!storage) return
    try {
      storage.setItem(STORAGE_KEY, JSON.stringify(value))
    } catch {
      /* 存储配额不足时保持内存态可用 */
    }
  },
  { deep: true, immediate: true }
)

function nowISO() {
  return new Date().toISOString()
}

function makeClassCode() {
  let code = ''
  do {
    code = `SC-${Math.floor(1000 + Math.random() * 9000)}`
  } while (classroom.classes.some((item) => item.code === code))
  return code
}

function replaceState(next) {
  for (const key of Object.keys(classroom)) delete classroom[key]
  Object.assign(classroom, next)
}

export const selectors = {
  currentClass() {
    return (
      classroom.classes.find((item) => item.id === classroom.ui.currentClassId) ??
      classroom.classes[0] ??
      null
    )
  },
  classStudents(classId = classroom.ui.currentClassId) {
    return classroom.students.filter((item) => item.classId === classId)
  },
  classSessions(classId = classroom.ui.currentClassId) {
    return classroom.sessions
      .filter((item) => item.classId === classId)
      .sort((a, b) => new Date(a.time) - new Date(b.time))
  },
  classAssignments(classId = classroom.ui.currentClassId) {
    return classroom.assignments
      .filter((item) => item.classId === classId)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
  },
  classAttendance(classId = classroom.ui.currentClassId) {
    const sessionIds = new Set(
      classroom.sessions.filter((item) => item.classId === classId).map((item) => item.id)
    )
    return classroom.attendance.filter((item) => sessionIds.has(item.sessionId))
  },
  classSubmissions(classId = classroom.ui.currentClassId) {
    const assignmentIds = new Set(
      classroom.assignments.filter((item) => item.classId === classId).map((item) => item.id)
    )
    return classroom.submissions.filter((item) => assignmentIds.has(item.assignmentId))
  },
  currentStudent() {
    return classroom.students.find((item) => item.id === classroom.ui.currentStudentId) ?? null
  },
  studentById(studentId) {
    return classroom.students.find((item) => item.id === studentId) ?? null
  }
}

export const actions = {
  setRole(role) {
    classroom.ui.role = role === 'student' ? 'student' : 'teacher'
    if (role === 'student' && !classroom.ui.currentStudentId) {
      const first = selectors.classStudents()[0]
      classroom.ui.currentStudentId = first?.id ?? null
    }
  },

  selectClass(classId) {
    if (!classroom.classes.some((item) => item.id === classId)) return
    classroom.ui.currentClassId = classId
    const first = selectors.classStudents(classId)[0]
    classroom.ui.currentStudentId = first?.id ?? null
  },

  selectStudent(studentId) {
    const student = selectors.studentById(studentId)
    if (!student) return
    classroom.ui.currentStudentId = student.id
    classroom.ui.currentClassId = student.classId
  },

  createClass({ name, semester, capacity }) {
    const cleanName = String(name ?? '').trim()
    if (!cleanName) return { ok: false, error: '请填写班级名称。' }

    const size = Number(capacity)
    if (!Number.isFinite(size) || size < 1 || size > 200) {
      return { ok: false, error: '班级人数需在 1 - 200 之间。' }
    }

    const item = {
      id: uid('cls'),
      name: cleanName,
      semester: String(semester ?? '').trim() || '未填写学期',
      capacity: Math.floor(size),
      code: makeClassCode(),
      createdAt: nowISO()
    }

    classroom.classes.push(item)
    classroom.ui.currentClassId = item.id
    classroom.ui.currentStudentId = null
    return { ok: true, class: item }
  },

  createSession({ classId, topic, time, knowledgePoints, capacity }) {
    const cleanTopic = String(topic ?? '').trim()
    if (!cleanTopic) return { ok: false, error: '请填写课堂课题。' }
    if (!classId || !classroom.classes.some((item) => item.id === classId)) {
      return { ok: false, error: '请先选择班级。' }
    }

    const start = new Date(time)
    if (Number.isNaN(start.getTime())) return { ok: false, error: '请选择有效的上课时间。' }

    const size = Number(capacity)
    const item = {
      id: uid('ses'),
      classId,
      topic: cleanTopic,
      time: start.toISOString(),
      knowledgePoints: Array.isArray(knowledgePoints) ? knowledgePoints : [],
      capacity: Number.isFinite(size) && size > 0 ? Math.floor(size) : 30,
      createdAt: nowISO()
    }

    classroom.sessions.push(item)
    return { ok: true, session: item }
  },

  createAssignment({ classId, title, questions, dueAt, points }) {
    const cleanTitle = String(title ?? '').trim()
    const cleanQuestions = String(questions ?? '').trim()
    if (!cleanTitle) return { ok: false, error: '请填写作业标题。' }
    if (!cleanQuestions) return { ok: false, error: '请填写作业题目。' }
    if (!classId || !classroom.classes.some((item) => item.id === classId)) {
      return { ok: false, error: '请先选择班级。' }
    }

    const due = new Date(dueAt)
    if (Number.isNaN(due.getTime())) return { ok: false, error: '请选择有效的截止时间。' }

    const total = Number(points)
    if (!Number.isFinite(total) || total <= 0 || total > 1000) {
      return { ok: false, error: '作业分值需在 1 - 1000 之间。' }
    }

    const item = {
      id: uid('asg'),
      classId,
      sessionId: null,
      title: cleanTitle,
      questions: cleanQuestions,
      dueAt: due.toISOString(),
      points: Math.floor(total),
      createdAt: nowISO()
    }

    classroom.assignments.push(item)
    return { ok: true, assignment: item }
  },

  joinClass({ code, name }) {
    const cleanCode = String(code ?? '').trim().toUpperCase()
    const cleanName = String(name ?? '').trim()

    if (!cleanName) return { ok: false, error: '请填写你的姓名。' }

    const target = classroom.classes.find(
      (item) => String(item.code).toUpperCase() === cleanCode
    )
    if (!target) return { ok: false, error: '班级码不存在，请向老师确认。' }

    const existing = classroom.students.find(
      (item) => item.classId === target.id && item.name === cleanName
    )
    if (existing) {
      classroom.ui.role = 'student'
      classroom.ui.currentClassId = target.id
      classroom.ui.currentStudentId = existing.id
      return { ok: true, student: existing, class: target, existing: true }
    }

    const count = classroom.students.filter((item) => item.classId === target.id).length
    if (count >= target.capacity) {
      return { ok: false, error: '该班级人数已满，请联系老师。' }
    }

    const student = {
      id: uid('stu'),
      classId: target.id,
      name: cleanName,
      joinedAt: nowISO()
    }

    classroom.students.push(student)
    classroom.ui.role = 'student'
    classroom.ui.currentClassId = target.id
    classroom.ui.currentStudentId = student.id
    return { ok: true, student, class: target, existing: false }
  },

  checkIn({ sessionId, studentId }) {
    const session = classroom.sessions.find((item) => item.id === sessionId)
    const student = selectors.studentById(studentId)
    if (!session || !student) return { ok: false, error: '课堂或学生不存在。' }
    if (student.classId !== session.classId) return { ok: false, error: '你不属于该班级。' }

    const existing = classroom.attendance.find(
      (item) => item.sessionId === sessionId && item.studentId === studentId
    )
    if (existing) return { ok: false, error: '本节课已经签到过啦。', status: existing.status }

    const lateThreshold = new Date(session.time).getTime() + 15 * 60 * 1000
    const status = Date.now() > lateThreshold ? 'late' : 'present'
    const record = {
      id: uid('att'),
      sessionId,
      studentId,
      status,
      checkedAt: nowISO()
    }

    classroom.attendance.push(record)
    return { ok: true, record, status }
  },

  submitAssignment({ assignmentId, studentId, answer }) {
    const cleanAnswer = String(answer ?? '').trim()
    if (!cleanAnswer) return { ok: false, error: '请填写答案后再提交。' }

    const assignment = classroom.assignments.find((item) => item.id === assignmentId)
    const student = selectors.studentById(studentId)
    if (!assignment || !student) return { ok: false, error: '作业或学生不存在。' }
    if (student.classId !== assignment.classId) return { ok: false, error: '你不属于该班级。' }

    const existing = classroom.submissions.find(
      (item) => item.assignmentId === assignmentId && item.studentId === studentId
    )

    if (existing) {
      if (typeof existing.score === 'number' && Number.isFinite(existing.score)) {
        return { ok: false, error: '该作业已批改，不能再次修改。' }
      }
      existing.answer = cleanAnswer
      existing.submittedAt = nowISO()
      return { ok: true, submission: existing, updated: true }
    }

    const submission = {
      id: uid('sub'),
      assignmentId,
      studentId,
      answer: cleanAnswer,
      submittedAt: nowISO(),
      score: null,
      comment: '',
      gradedAt: null
    }

    classroom.submissions.push(submission)
    return { ok: true, submission, updated: false }
  },

  gradeSubmission({ submissionId, score, comment }) {
    const submission = classroom.submissions.find((item) => item.id === submissionId)
    if (!submission) return { ok: false, error: '提交记录不存在。' }

    const assignment = classroom.assignments.find(
      (item) => item.id === submission.assignmentId
    )
    const max = assignment?.points ?? 100
    const value = Number(score)

    if (!Number.isFinite(value) || value < 0 || value > max) {
      return { ok: false, error: `分数需在 0 - ${max} 之间。` }
    }

    submission.score = Math.round(value * 10) / 10
    submission.comment = String(comment ?? '').trim()
    submission.gradedAt = nowISO()
    return { ok: true, submission }
  },

  resetDemo() {
    const storage = safeStorage()
    storage?.removeItem(STORAGE_KEY)
    replaceState(createSeedState())
  }
}