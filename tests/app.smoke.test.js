// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { createApp, nextTick } from 'vue'
import App from '../src/App.vue'
import { actions, classroom } from '../src/store/classroom.js'

let mounted = null

function mountApp() {
  const el = document.createElement('div')
  document.body.appendChild(el)
  const app = createApp(App)
  app.mount(el)
  mounted = { app, el }
  return mounted
}

beforeEach(() => {
  actions.resetDemo()
})

afterEach(() => {
  if (mounted) {
    mounted.app.unmount()
    mounted.el.remove()
    mounted = null
  }
})

describe('app smoke', () => {
  it('首次打开渲染预置班级与数据看板', async () => {
    const { el } = mountApp()
    await nextTick()

    expect(el.textContent).toContain('班级数据看板')
    expect(el.textContent).toContain('高二(3)班')
    expect(el.textContent).toContain('88.9%')
    expect(el.querySelectorAll('.stat').length).toBeGreaterThanOrEqual(4)
  })

  it('学生端可以完成今日课堂签到', async () => {
    actions.setRole('student')
    const { el } = mountApp()
    await nextTick()

    expect(el.textContent).toContain('你好，赵一鸣')

    const button = [...el.querySelectorAll('button')].find((item) =>
      item.textContent.includes('课堂签到') || item.textContent.includes('迟到签到')
    )
    expect(button).toBeTruthy()

    button.click()
    await nextTick()

    const record = classroom.attendance.find(
      (item) => item.sessionId === 'ses-3' && item.studentId === 'stu-5'
    )
    expect(record).toBeTruthy()
    expect(['present', 'late']).toContain(record.status)
    expect(el.textContent).toContain('已完成签到')
  })

  it('教师端四个视图与学生端三个视图均可渲染', async () => {
    const { el } = mountApp()
    await nextTick()

    const clickNav = async (label) => {
      const button = [...el.querySelectorAll('.nav-item')].find((item) =>
        item.textContent.includes(label)
      )
      expect(button, `导航项 ${label}`).toBeTruthy()
      button.click()
      await nextTick()
    }

    await clickNav('班级管理')
    expect(el.textContent).toContain('创建新班级')
    expect(el.textContent).toContain('学生名单')

    await clickNav('课堂管理')
    expect(el.textContent).toContain('创建课堂')
    expect(el.textContent).toContain('课堂与点名')

    await clickNav('作业与批改')
    expect(el.textContent).toContain('发布作业')
    expect(el.textContent).toContain('批改台')

    const studentRole = [...el.querySelectorAll('.role-switch button')].find((item) =>
      item.textContent.includes('学生端')
    )
    studentRole.click()
    await nextTick()
    expect(el.textContent).toContain('今日学习简报')

    await clickNav('我的作业')
    expect(el.textContent).toContain('作业三 · 给校运会数据选一张图')

    await clickNav('成绩与评语')
    expect(el.textContent).toContain('成绩单')
    expect(el.textContent).toContain('老师评语')
  })

  it('教师可以在批改台保存分数与评语', async () => {
    const { el } = mountApp()
    await nextTick()

    const nav = [...el.querySelectorAll('.nav-item')].find((item) =>
      item.textContent.includes('作业与批改')
    )
    nav.click()
    await nextTick()

    const gradedBefore = classroom.submissions.filter(
      (item) => item.assignmentId === 'asg-2' && typeof item.score === 'number'
    ).length

    const card = el.querySelector('.grade-card')
    expect(card).toBeTruthy()

    const scoreInput = card.querySelector('input[type="number"]')
    const commentInput = card.querySelectorAll('input')[1]
    scoreInput.value = '82'
    scoreInput.dispatchEvent(new Event('input', { bubbles: true }))
    commentInput.value = '补充实验次数后会更有说服力。'
    commentInput.dispatchEvent(new Event('input', { bubbles: true }))
    await nextTick()

    const save = [...card.querySelectorAll('button')].find((item) =>
      item.textContent.includes('保存评分')
    )
    save.click()
    await nextTick()

    const gradedAfter = classroom.submissions.filter(
      (item) => item.assignmentId === 'asg-2' && typeof item.score === 'number'
    ).length

    expect(gradedAfter).toBe(gradedBefore + 1)
    expect(el.textContent).toContain('已保存')
  })
})