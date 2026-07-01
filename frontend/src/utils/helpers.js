// src/utils/helpers.js
// UPDATED per backend integration guide:
//   • isOverdue() now checks status === 'overdue' (backend sends this)
//   • statusBadge() updated for 4-state system: pending|submitted|completed|overdue
//   • getTaskTitle() updated — personal tasks removed, assignment nested object is primary
//   • deadlinePill() updated to use status field

import { format, parseISO } from 'date-fns'

// ── Priority helpers ────────────────────────────────────────────────────────
export function priorityToLevel(n) {
    if (n >= 4) return 'high'
    if (n >= 2) return 'medium'
    return 'low'
}
export function levelToPriority(level) {
    return { high: 5, medium: 3, low: 1 }[level] ?? 3
}
export function priorityColor(n) {
    const level = typeof n === 'number' ? priorityToLevel(n) : n
    return { high: '#e05252', medium: '#d4a93c', low: '#3cb87a' }[level] ?? '#b0a898'
}
export function priorityLabel(n) {
    return priorityToLevel(typeof n === 'number' ? n : levelToPriority(n))
}

// ── Task title ──────────────────────────────────────────────────────────────
// Personal tasks removed from backend — display_title or assignment.title
export function getTaskTitle(task) {
    return task.display_title || task.assignment?.title || task.title || 'Untitled'
}

// ── Due date ────────────────────────────────────────────────────────────────
export function getTaskDueDate(task) {
    return task.due_date || task.assignment?.due_date || null
}
export function getTaskDueDateBS(task) {
    return task.due_date_bs || null
}

// ── Status helpers (4-state) ────────────────────────────────────────────────
export function isOverdue(task) {
    return task.status === 'overdue'
}
export function isCompleted(task) {
    return task.status === 'completed'
}
export function isSubmitted(task) {
    return task.status === 'submitted'
}
export function isPending(task) {
    return task.status === 'pending' || !task.status
}

// ── 4-state status badge ────────────────────────────────────────────────────
// Replaces old boolean statusBadge(isCompleted)
export function statusBadge(task) {
    switch (task.status) {
        case 'completed':
            return { label: 'Completed', color: '#166534', bg: '#e0f7ee', border: '#bbf7d0' }
        case 'submitted':
            return { label: 'Submitted', color: '#1e40af', bg: '#eff3fd', border: '#bfdbfe' }
        case 'overdue':
            return { label: 'Overdue',   color: '#991b1b', bg: '#fde8e8', border: '#fecaca' }
        default:
            return { label: 'Pending',   color: '#92400e', bg: '#fff8e6', border: '#fde68a' }
    }
}

// ── Deadline pill ────────────────────────────────────────────────────────────
export function deadlinePill(task) {
    if (task.status === 'completed') return { label: 'Done', color: '#166534', bg: '#e0f7ee' }
    if (task.status === 'submitted') return { label: 'Awaiting Review', color: '#1e40af', bg: '#eff3fd' }
    if (task.status === 'overdue')   return { label: 'Overdue', color: '#991b1b', bg: '#fde8e8' }
    const due = getTaskDueDate(task)
    if (!due) return { label: 'No date', color: '#6b7280', bg: '#f3f4f6' }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const d = Math.ceil((new Date(due + 'T00:00:00') - today) / 86400000)
    if (d < 0)   return { label: `${Math.abs(d)}d overdue`, color: '#991b1b', bg: '#fde8e8' }
    if (d === 0) return { label: 'Due today',  color: '#991b1b', bg: '#fde8e8' }
    if (d <= 3)  return { label: `${d}d left`,  color: '#92400e', bg: '#fff8e6' }
    if (d <= 7)  return { label: `${d}d left`,  color: '#92400e', bg: '#fffbeb' }
    return             { label: `${d}d left`,  color: '#166534', bg: '#e0f7ee' }
}

// ── Days until a date string ─────────────────────────────────────────────────
export function daysUntil(dateStr) {
    if (!dateStr) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000)
}

// ── Format date ──────────────────────────────────────────────────────────────
export function fmtDate(s) {
    if (!s) return '—'
    try { return format(parseISO(s), 'd MMM yyyy') }
    catch { return s }
}

// ── BS month names ────────────────────────────────────────────────────────────
export const BS_MONTHS = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan',
    'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
    'Poush', 'Magh', 'Falgun', 'Chaitra',
]

// ── API error extractor ───────────────────────────────────────────────────────
export function apiError(err) {
    const d = err?.response?.data
    if (!d) return err?.message || 'An error occurred'
    if (typeof d === 'string') return d
    if (d.detail) return d.detail
    const messages = Object.entries(d)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    return messages.join(' | ')
}
