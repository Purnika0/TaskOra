// Shared date/timezone, priority, task-status, and formatting helpers used
// across the app. Task status is a 5-state string:
//   'pending' | 'submitted' | 'completed' | 'rejected' | 'overdue'

import { adToBS, BS_MONTH_NAMES } from './bsCalendar.js'

// ── "Today" in Nepal local time ──────────────────────────────────────────────
// Never use `new Date().toISOString()` for "today's date" — that reads UTC,
// which drifts a day off from Nepal (UTC+5:45) for part of every day.
// This is the one place "today" should be computed from, everywhere in the app.
export function todayNepalISO() {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit',
    }).formatToParts(new Date())
    const get = t => parts.find(p => p.type === t)?.value
    return `${get('year')}-${get('month')}-${get('day')}`
}

// A Date object whose getFullYear()/getMonth()/getDate() reflect Nepal's
// current calendar date, regardless of the browser/device's own timezone.
// Use this (not `new Date()`) anywhere "today" feeds into adToBS() or any
// other date-only comparison — it keeps the app on Nepal time everywhere.
export function nepalNow() {
    return new Date(todayNepalISO() + 'T00:00:00')
}

// Current hour (0-23) in Nepal local time — use for time-of-day greetings
// ("Good morning" etc.) so they're correct regardless of the device's own tz.
export function nepalHour() {
    const parts = new Intl.DateTimeFormat('en-US', {
        timeZone: 'Asia/Kathmandu', hour: 'numeric', hour12: false,
    }).formatToParts(new Date())
    return Number(parts.find(p => p.type === 'hour')?.value ?? new Date().getHours())
}

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
// Do not add a 3-level priorityLabel(n) here. The API's `priority_label`
// field (or `priorityLabelFor()` in constants/assignmentChoices.js) is the
// 5-level source of truth — a separate 3-bucket helper causes the same
// assignment to show two different priority words on one screen.

// ── Task title ──────────────────────────────────────────────────────────────
// No standalone personal-task title exists — falls back through display_title,
// then the parent assignment's title.
export function getTaskTitle(task) {
    return task.display_title || task.assignment?.title || task.title || 'Untitled'
}

// ── Due date ────────────────────────────────────────────────────────────────
export function getTaskDueDate(task) {
    return task.due_date || task.assignment?.due_date || null
}

// ── Status helpers (5-state) ────────────────────────────────────────────────
export function isOverdue(task) {
    return task.status === 'overdue'
}
export function isCompleted(task) {
    return task.status === 'completed'
}
export function isSubmitted(task) {
    return task.status === 'submitted'
}
export function isRejected(task) {
    return task.status === 'rejected'
}
export function isPending(task) {
    return task.status === 'pending' || !task.status
}

// ── 5-state status badge ────────────────────────────────────────────────────
export function statusBadge(task) {
    switch (task.status) {
        case 'completed':
            return { label: 'Completed', color: '#166534', bg: '#e0f7ee', border: '#bbf7d0' }
        case 'submitted':
            return { label: 'Submitted', color: '#1e40af', bg: '#eff3fd', border: '#bfdbfe' }
        case 'rejected':
            return { label: 'Rejected',  color: '#991b1b', bg: '#fde8e8', border: '#fecaca' }
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
    if (task.status === 'rejected')  return { label: 'Needs Revision', color: '#991b1b', bg: '#fde8e8' }
    if (task.status === 'overdue')   return { label: 'Overdue', color: '#991b1b', bg: '#fde8e8' }
    const due = getTaskDueDate(task)
    if (!due) return { label: 'No date', color: '#6b7280', bg: '#f3f4f6' }
    const today = new Date(todayNepalISO() + 'T00:00:00')
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
    const today = new Date(todayNepalISO() + 'T00:00:00')
    return Math.ceil((new Date(dateStr + 'T00:00:00') - today) / 86400000)
}

// ── Format date — always displayed in Bikram Sambat (BS) ────────────────────
// Accepts an AD ISO date string ('YYYY-MM-DD') — which is what the backend
// always sends/stores — and renders it in BS, e.g. "15 Ashadh 2082".
// This is the ONLY date formatter that should be used to display dates
// anywhere in the UI; never render a raw AD date string directly.
export function fmtDate(s) {
    if (!s) return '—'
    try {
        let y, m, d
        if (s.includes('T') || s.includes(' ')) {
            // Full datetime string — read the calendar date as it falls in
            // Nepal local time (Asia/Kathmandu), not the browser's timezone.
            const dt = new Date(s)
            const parts = new Intl.DateTimeFormat('en-CA', {
                timeZone: 'Asia/Kathmandu', year: 'numeric', month: '2-digit', day: '2-digit',
            }).formatToParts(dt)
            const get = t => parts.find(p => p.type === t)?.value
            y = Number(get('year')); m = Number(get('month')); d = Number(get('day'))
        } else {
            [y, m, d] = s.split('-').map(Number)
        }
        const bs = adToBS(new Date(y, m - 1, d))
        const mn = BS_MONTH_NAMES[bs.month - 1]
        return `${bs.day} ${mn?.en} ${bs.year}`
    } catch {
        return s
    }
}

// ── Due date — prefer the backend's BS conversion ───────────────────────────
// AssignmentSerializer and TaskSerializer both send due_date_bs, precomputed
// server-side (holidays/bs_calendar.py, wrapping the nepali_datetime package).
// Prefer this over recomputing the BS date from due_date via adToBS().
// Accepts a Task (checks task.due_date_bs, then task.assignment.due_date_bs)
// or an Assignment (due_date_bs directly). Falls back to fmtDate() if
// due_date_bs isn't present, so nothing breaks if called on something else.
export function dueDateBS(entity) {
    const bs = entity?.due_date_bs || entity?.assignment?.due_date_bs
    if (bs && bs.year && bs.month && bs.day) {
        const mn = BS_MONTH_NAMES[bs.month - 1]
        return `${bs.day} ${mn?.en} ${bs.year}`
    }
    return fmtDate(getTaskDueDate(entity) || entity?.due_date)
}

// ── Format date + time — BS date, Nepal-local time ──────────────────────────
// For timestamp fields (submitted_at, created_at, date_joined, etc.) where
// the time of day also matters. Date portion is always BS.
export function fmtDateTime(s) {
    if (!s) return '—'
    try {
        const dt = new Date(s)
        const dateStr = fmtDate(s)
        const timeStr = new Intl.DateTimeFormat('en-US', {
            timeZone: 'Asia/Kathmandu', hour: 'numeric', minute: '2-digit', hour12: true,
        }).format(dt)
        return `${dateStr}, ${timeStr}`
    } catch {
        return s
    }
}

// ── Current BS year — for footers/headers that show a copyright or "today" year ─
export function currentBSYear() {
    return adToBS(nepalNow()).year
}

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

// ── Student display name — shared by StudentList and ReviewPanel ──────────────
// Usernames may be dotted with a numeric suffix (e.g. "john.doe.3"); falls back
// to a title-cased version of the username when no display name is set.
export function formatStudentDisplayName(sub) {
    const rawUsername = sub.student_username || ""
    const formattedName = rawUsername
        ? rawUsername
            .replace(/\.\d+$/, "")
            .split(".")
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(" ")
        : ""

    return (sub.student_name && sub.student_name.trim() !== "") ? sub.student_name :
        formattedName ? formattedName :
        rawUsername ? rawUsername :
        `Student #${sub.student || sub.id}`
}