function pad(value) {
  return String(value).padStart(2, '0')
}

function safeDate(value) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDate(value) {
  const date = safeDate(value)
  if (!date) return '—'
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatShortDate(value) {
  const date = safeDate(value)
  if (!date) return '—'
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatTime(value) {
  const date = safeDate(value)
  if (!date) return '—'
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`
}

export function formatDateTime(value) {
  const date = safeDate(value)
  if (!date) return '—'
  return `${date.getMonth() + 1}月${date.getDate()}日 ${pad(date.getHours())}:${pad(
    date.getMinutes()
  )}`
}

export function formatWeekday(value) {
  const date = safeDate(value)
  if (!date) return ''
  return `周${'日一二三四五六'[date.getDay()]}`
}

export function toInputDateTime(value = new Date()) {
  const date = safeDate(value) ?? new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`
}

export function toInputDate(value = new Date()) {
  const date = safeDate(value) ?? new Date()
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}

export function nowInputDateTime() {
  return toInputDateTime(new Date())
}

export function addDaysInput(days, hour = 23, minute = 59) {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, minute, 0, 0)
  return toInputDateTime(date)
}

export function formatPercent(value, digits = 0) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${(value * 100).toFixed(digits)}%`
}

export function formatScore(value) {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return Number.isInteger(value) ? String(value) : value.toFixed(1)
}

export function isToday(value, now = new Date()) {
  const date = safeDate(value)
  if (!date) return false
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  )
}

export function scoreTone(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return ''
  if (score >= 85) return 'high'
  if (score >= 60) return 'mid'
  return 'low'
}

export function parseKnowledgePoints(text = '') {
  return [
    ...new Set(
      String(text)
        .split(/[,，、;；\n]/)
        .map((item) => item.trim())
        .filter(Boolean)
    )
  ]
}

export function initials(name = '') {
  return String(name).trim().slice(0, 1) || '学'
}

export function uid(prefix = 'id') {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}