<script setup>
import { computed, ref } from 'vue'
import { classroom, actions, selectors } from './store/classroom.js'
import { pendingGrading } from './domain/submissions.js'
import ClassDashboard from './components/ClassDashboard.vue'
import TeacherClasses from './components/TeacherClasses.vue'
import TeacherSessions from './components/TeacherSessions.vue'
import TeacherAssignments from './components/TeacherAssignments.vue'
import StudentHome from './components/StudentHome.vue'
import StudentAssignments from './components/StudentAssignments.vue'
import StudentGrades from './components/StudentGrades.vue'

const teacherViews = [
  { id: 'dashboard', label: '数据看板' },
  { id: 'classes', label: '班级管理' },
  { id: 'sessions', label: '课堂管理' },
  { id: 'assignments', label: '作业与批改' }
]

const studentViews = [
  { id: 'home', label: '今日课堂' },
  { id: 'student-assignments', label: '我的作业' },
  { id: 'grades', label: '成绩与评语' }
]

const viewMap = {
  dashboard: ClassDashboard,
  classes: TeacherClasses,
  sessions: TeacherSessions,
  assignments: TeacherAssignments,
  home: StudentHome,
  'student-assignments': StudentAssignments,
  grades: StudentGrades
}

const activeView = ref(classroom.ui.role === 'teacher' ? 'dashboard' : 'home')
const isTeacher = computed(() => classroom.ui.role === 'teacher')
const navItems = computed(() => (isTeacher.value ? teacherViews : studentViews))
const currentView = computed(() => viewMap[activeView.value] ?? ClassDashboard)

const currentClass = computed(() => selectors.currentClass())
const currentStudent = computed(() => selectors.currentStudent())
const classStudents = computed(() => selectors.classStudents())
const classAssignments = computed(() => selectors.classAssignments())
const classSubmissions = computed(() => selectors.classSubmissions())

const pendingCount = computed(
  () =>
    pendingGrading(classAssignments.value, classStudents.value, classSubmissions.value).length
)

const studentTodoCount = computed(() => {
  if (!currentStudent.value) return 0
  const mine = classSubmissions.value.filter(
    (item) => item.studentId === currentStudent.value.id
  )
  return classAssignments.value.filter(
    (assignment) => !mine.some((item) => item.assignmentId === assignment.id)
  ).length
})

function badgeFor(viewId) {
  if (viewId === 'assignments' && pendingCount.value > 0) return pendingCount.value
  if (viewId === 'student-assignments' && studentTodoCount.value > 0) return studentTodoCount.value
  return 0
}

function switchRole(role) {
  actions.setRole(role)
  activeView.value = role === 'teacher' ? 'dashboard' : 'home'
}

function changeClass(event) {
  actions.selectClass(event.target.value)
}

function changeStudent(event) {
  actions.selectStudent(event.target.value)
}

function go(viewId) {
  if (viewMap[viewId]) activeView.value = viewId
}

function resetDemo() {
  if (window.confirm('确定要恢复预置演示数据吗？当前新增的班级、作业与提交会被清空。')) {
    actions.resetDemo()
    activeView.value = 'dashboard'
  }
}
</script>

<template>
  <div class="app">
    <aside class="sidebar">
      <div class="brand">
        <div class="brand-mark">AI</div>
        <div>
          <div class="brand-name">智慧课堂工作台</div>
          <div class="brand-sub">Smart Classroom</div>
        </div>
      </div>

      <div class="role-switch">
        <button :class="{ active: isTeacher }" @click="switchRole('teacher')">教师端</button>
        <button :class="{ active: !isTeacher }" @click="switchRole('student')">学生端</button>
      </div>

      <nav class="nav">
        <div class="nav-label">{{ isTeacher ? '教学工作区' : '学习工作区' }}</div>
        <button
          v-for="item in navItems"
          :key="item.id"
          class="nav-item"
          :class="{ active: activeView === item.id }"
          @click="activeView = item.id"
        >
          {{ item.label }}
          <span v-if="badgeFor(item.id)" class="nav-badge">{{ badgeFor(item.id) }}</span>
        </button>
      </nav>

      <div v-if="currentClass" class="sidebar-card">
        <template v-if="isTeacher">
          <h4>当前班级</h4>
          <strong>{{ currentClass.name }}</strong>
          <div class="meta">{{ currentClass.semester }} · {{ classStudents.length }}/{{ currentClass.capacity }} 人</div>
          <select
            class="sidebar-select"
            :value="classroom.ui.currentClassId"
            @change="changeClass"
          >
            <option v-for="item in classroom.classes" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>
        </template>
        <template v-else>
          <h4>我的身份</h4>
          <strong>{{ currentStudent?.name ?? '尚未选择学生' }}</strong>
          <div class="meta">{{ currentClass.name }}</div>
          <select
            v-if="classStudents.length"
            class="sidebar-select"
            :value="classroom.ui.currentStudentId"
            @change="changeStudent"
          >
            <option v-for="item in classStudents" :key="item.id" :value="item.id">
              {{ item.name }}
            </option>
          </select>
          <div v-else class="meta">请先在“今日课堂”页加入班级</div>
        </template>
      </div>

      <div class="sidebar-foot">
        <span>数据保存在本机</span>
        <button class="btn btn-sm btn-ghost" @click="resetDemo">重置演示</button>
      </div>
    </aside>

    <main class="main">
      <component
        :is="currentView"
        :key="`${classroom.ui.role}-${activeView}-${classroom.ui.currentClassId}-${classroom.ui.currentStudentId}`"
        class="fade-in"
        @navigate="go"
      />
    </main>
  </div>
</template>