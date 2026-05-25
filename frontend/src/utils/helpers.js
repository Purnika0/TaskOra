// src/utils/helpers.js
// Pure utility functions.
// Handles field name differences between backend and UI display.

import { format, parseISO, differenceInDays } from 'date-fns'

// ── Priority: backend uses int 1-5, UI shows labels ─────────
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

// ── Task display title (personal vs assigned) ────────────────
export function getTaskTitle(task) {
    return task.display_title || task.title || task.assignment?.title || 'Untitled'
}

export function getTaskDueDate(task) {
    return task.due_date || task.assignment?.due_date || null
}

export function getTaskDueDateBS(task) {
    return task.due_date_bs || null
}

// ── Overdue detection ────────────────────────────────────────
export function isOverdue(task) {
    if (task.is_completed) return false
    const due = getTaskDueDate(task)
    if (!due) return false
    return due < new Date().toISOString().split('T')[0]
}

// ── Deadline pill ────────────────────────────────────────────
export function deadlinePill(task) {
    if (task.is_completed) return { label: 'Done', cls: 'bg-green-50 text-green-600' }
    const due = getTaskDueDate(task)
    if (!due) return { label: 'No date', cls: 'bg-gray-100 text-gray-400' }
    const today = new Date(); today.setHours(0, 0, 0, 0)
    const d = Math.ceil((new Date(due + 'T00:00:00') - today) / 86400000)
    if (d < 0)  return { label: `${Math.abs(d)}d overdue`, cls: 'bg-red-50 text-red-600' }
    if (d === 0) return { label: 'Due today', cls: 'bg-red-50 text-red-600' }
    if (d <= 3)  return { label: `${d}d left`, cls: 'bg-orange-50 text-orange-600' }
    if (d <= 7)  return { label: `${d}d left`, cls: 'bg-yellow-50 text-yellow-600' }
    return { label: `${d}d left`, cls: 'bg-green-50 text-green-600' }
}

export function daysUntil(dateStr) {
    if (!dateStr) return null
    const today = new Date(); today.setHours(0, 0, 0, 0)
    return Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000)
}

// ── Status badge ─────────────────────────────────────────────
export function statusBadge(isCompleted) {
    return isCompleted
    ? { label: 'Completed', cls: 'bg-green-50 text-green-600 border border-green-200' }
    : { label: 'Pending',   cls: 'bg-gray-100  text-gray-500  border border-gray-200' }
}

// ── Format date string ───────────────────────────────────────
export function fmtDate(s) {
    if (!s) return '—'
    try { return format(parseISO(s), 'd MMM yyyy') }
    catch { return s }
    }

// ── BS month names ───────────────────────────────────────────
export const BS_MONTHS = [
    'Baisakh', 'Jestha', 'Ashadh', 'Shrawan',
    'Bhadra', 'Ashwin', 'Kartik', 'Mangsir',
    'Poush', 'Magh', 'Falgun', 'Chaitra',
    ]

// ── API error message extractor ──────────────────────────────
export function apiError(err) {
    const d = err?.response?.data
    if (!d) return err?.message || 'An error occurred'
    if (typeof d === 'string') return d
    if (d.detail) return d.detail
    // DRF validation errors are objects: { field: [msg, ...] }
    const messages = Object.entries(d)
        .map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`)
    return messages.join(' | ')
}
