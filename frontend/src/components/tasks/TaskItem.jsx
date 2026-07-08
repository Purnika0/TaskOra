// src/components/tasks/TaskItem.jsx
// Rewritten to match the current backend (Task has: status, assignment{...}, submission_file,
// submission_text, submitted_at, teacher_feedback, completed_at).
//
// Dual-mode renderer.
//   compact=false → rich card  (card view in TaskManagement)
//   compact=true  → <tr> row   (table view in TaskManagement)
//
// Students cannot edit/delete tasks or toggle completion directly — a task's status changes
// only via submission (student) or review (teacher, on a different page). So this component
// now shows a status badge + a "Submit" action (when actionable), and an expandable details
// row/section showing the assignment description, type, and teacher feedback (if any).
//
// Subtasks removed entirely — no subtask model/endpoint exists on the backend.

import React, { useState, useRef, useEffect } from 'react'
import { ChevronDown, ChevronUp, Upload, Paperclip, MessageSquare } from 'lucide-react'
import {
    getTaskTitle, getTaskDueDate, priorityColor, priorityLabel,
    deadlinePill, statusBadge, isOverdue, isActionable as isActionableFallback,
} from '../../utils/helpers.js'
import { urgencyLabel, urgencyColor, urgencyBg } from '../../utils/urgencyLabel.js'

// isActionable isn't exported from helpers.js — mirror the same rule used in useTasks.js
function isActionable(task) {
    return task.status === 'pending' || task.status === 'overdue' || task.status === 'rejected'
}

function SubmitModal({ task, onClose, onSubmit }) {
    const [text,       setText]       = useState('')
    const [file,        setFile]      = useState(null)
    const [submitting,  setSubmitting] = useState(false)
    const [error,       setError]     = useState('')

    async function handleSubmit(e) {
        e.preventDefault()
        if (!text.trim() && !file) {
            setError('Provide a written response, a file, or both.')
            return
        }
        setSubmitting(true); setError('')
        try {
            const formData = new FormData()
            if (text.trim()) formData.append('submission_text', text.trim())
            if (file) formData.append('submission_file', file)
            await onSubmit(task.id, formData)
            onClose()
        } catch (err) {
            const d = err?.response?.data
            setError(d?.detail || (d && Object.values(d).flat()[0]) || 'Failed to submit. Please try again.')
        } finally { setSubmitting(false) }
    }

    return (
        <div style={{
            position: 'fixed', inset: 0, background: 'rgba(26,31,53,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
        }} onClick={onClose}>
            <div onClick={e => e.stopPropagation()} style={{
                background: '#fff', borderRadius: 14, padding: 22, width: '100%', maxWidth: 440,
                boxShadow: '0 10px 40px rgba(0,0,0,0.18)',
            }}>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: '#1a1f35', margin: '0 0 4px' }}>
                    {task.status === 'rejected' ? 'Resubmit' : 'Submit'} — {getTaskTitle(task)}
                </h3>
                <p style={{ fontSize: 12, color: '#8a7e6e', margin: '0 0 16px' }}>
                    Provide a written response, a file, or both.
                </p>
                {task.status === 'rejected' && task.teacher_feedback && (
                    <div style={{ background: '#fde8e8', border: '1px solid #fecaca', borderRadius: 8, padding: '9px 12px', marginBottom: 14 }}>
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#991b1b', margin: '0 0 3px' }}>Teacher feedback</p>
                        <p style={{ fontSize: 12, color: '#7f1d1d', margin: 0, lineHeight: 1.5 }}>{task.teacher_feedback}</p>
                    </div>
                )}
                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <textarea
                        value={text} onChange={e => setText(e.target.value)}
                        placeholder="Write your response (optional if attaching a file)…"
                        rows={4}
                        style={{
                            width: '100%', border: '1.5px solid #e2dbd0', borderRadius: 8, padding: '10px 12px',
                            fontSize: 13, fontFamily: 'var(--font-body)', resize: 'vertical', boxSizing: 'border-box', outline: 'none',
                        }}
                    />
                    <label style={{
                        display: 'flex', alignItems: 'center', gap: 8, fontSize: 12, color: '#6a6052',
                        border: '1.5px dashed #e2dbd0', borderRadius: 8, padding: '10px 12px', cursor: 'pointer',
                    }}>
                        <Paperclip size={13}/>
                        {file ? file.name : 'Attach a file (optional)'}
                        <input type="file" hidden onChange={e => setFile(e.target.files?.[0] || null)}/>
                    </label>
                    {error && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{error}</p>}
                    <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
                        <button type="button" onClick={onClose} disabled={submitting}
                            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: '1.5px solid #e2dbd0', background: '#fff', color: '#6a6052', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                            Cancel
                        </button>
                        <button type="submit" disabled={submitting}
                            style={{ flex: 1, padding: '9px 0', borderRadius: 8, border: 'none', background: '#1a1f35', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer', opacity: submitting ? 0.7 : 1 }}>
                            {submitting ? 'Submitting…' : 'Submit'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

function DetailsBlock({ task }) {
    const assignment = task.assignment || {}
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {assignment.description ? (
                <p style={{ fontSize: 12, color: '#5a5142', lineHeight: 1.6, margin: 0 }}>{assignment.description}</p>
            ) : (
                <p style={{ fontSize: 12, color: '#b0a898', margin: 0, fontStyle: 'italic' }}>No description provided.</p>
            )}
            <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 11, color: '#8a7e6e' }}>
                {assignment.task_type && <span style={{ textTransform: 'capitalize' }}>Type: {assignment.task_type}</span>}
                {assignment.estimated_hours != null && <span>Est. {assignment.estimated_hours}h</span>}
                {assignment.course_name && <span>Course: {assignment.course_name}</span>}
            </div>
            {task.status === 'submitted' && task.submitted_at && (
                <p style={{ fontSize: 11, color: '#3b6fd4', margin: 0 }}>Submitted — awaiting review.</p>
            )}
            {(task.status === 'completed' || task.status === 'rejected') && task.teacher_feedback && (
                <div style={{
                    display: 'flex', gap: 6, alignItems: 'flex-start',
                    background: task.status === 'rejected' ? '#fde8e8' : '#e0f7ee',
                    border: `1px solid ${task.status === 'rejected' ? '#fecaca' : '#bbf7d0'}`,
                    borderRadius: 8, padding: '8px 10px',
                }}>
                    <MessageSquare size={12} style={{ marginTop: 1, flexShrink: 0, color: task.status === 'rejected' ? '#991b1b' : '#166534' }}/>
                    <p style={{ fontSize: 11.5, color: task.status === 'rejected' ? '#7f1d1d' : '#14532d', margin: 0, lineHeight: 1.5 }}>
                        {task.teacher_feedback}
                    </p>
                </div>
            )}
            {task.submission_file && (
                <a href={task.submission_file} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: 11, color: '#3b6fd4', display: 'inline-flex', alignItems: 'center', gap: 4, width: 'fit-content' }}>
                    <Paperclip size={11}/> {task.file_name || 'View submitted file'}
                </a>
            )}
        </div>
    )
}

export default function TaskItem({ task, onSubmit, index, compact = false }) {
    const [showDetails, setShowDetails] = useState(false)
    const [showSubmit,  setShowSubmit]  = useState(false)

    const overdue  = isOverdue(task)
    const pill     = deadlinePill(task)
    const badge    = statusBadge(task)
    const title    = getTaskTitle(task)
    const dueDate  = getTaskDueDate(task)
    const priority = task.assignment?.priority
    const pColor   = priorityColor(priority)
    const pLabel   = priorityLabel(priority)
    const uScore   = task.priority_score
    const uColor   = urgencyColor(uScore)
    const uLabel   = urgencyLabel(uScore)
    const actionable = isActionable(task)

    // ── Compact table row ──────────────────────────────────────
    if (compact) {
        return (
            <>
                <tr className="group hover:bg-[#faf8f5] transition-colors">
                    <td className="pl-4 text-[#b0a898] text-xs font-semibold w-8">{index + 1}.</td>
                    <td className="py-3 pr-2">
                        <div style={{ minWidth: 0 }}>
                            <p style={{
                                fontSize: 13, fontWeight: 500, lineHeight: 1.35, margin: 0,
                                color: overdue ? '#e05252' : '#1a1f35',
                                fontFamily: 'var(--font-display)',
                            }}>
                                {title}
                            </p>
                            <button
                                type="button"
                                onClick={() => setShowDetails(v => !v)}
                                aria-label={`${showDetails ? 'Hide' : 'Show'} details for "${title}"`}
                                style={{
                                    display: 'inline-flex', alignItems: 'center', gap: 4, marginTop: 3,
                                    fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 6,
                                    border: '1.5px solid', cursor: 'pointer', transition: 'all 0.13s',
                                    fontFamily: 'var(--font-body)',
                                    borderColor: showDetails ? '#3b6fd4' : '#e2dbd0',
                                    background: showDetails ? '#e8eeff' : '#f5f2ed',
                                    color: showDetails ? '#3b6fd4' : '#8a7e6e',
                                }}
                            >
                                Details {showDetails ? <ChevronUp size={9}/> : <ChevronDown size={9}/>}
                            </button>
                        </div>
                    </td>
                    <td className="pr-3">
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title="Importance — set by the teacher">
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: pColor, flexShrink: 0 }}/>
                                <span style={{ fontSize: 11, fontWeight: 700, color: pColor, textTransform: 'capitalize' }}>{pLabel}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }} title="Urgency — computed from due date, importance, and workload">
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: uColor, flexShrink: 0 }}/>
                                <span style={{ fontSize: 10, fontWeight: 600, color: uColor }}>{uLabel} urgency</span>
                            </div>
                        </div>
                    </td>
                    <td className="pr-3" style={{ fontSize: 12, color: '#8a7e6e', whiteSpace: 'nowrap' }}>{dueDate || '—'}</td>
                    <td>
                        <span style={{
                            display: 'inline-flex', fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                            color: badge.color, background: badge.bg, border: `1px solid ${badge.border}`,
                        }}>
                            {badge.label}
                        </span>
                    </td>
                    <td className="pr-4" style={{ width: 90 }}>
                        {actionable && (
                            <button
                                onClick={() => setShowSubmit(true)}
                                aria-label={`Submit "${title}"`}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4, padding: '5px 10px',
                                    borderRadius: 6, border: 'none', background: '#1a1f35', color: '#fff',
                                    fontSize: 11, fontWeight: 600, cursor: 'pointer',
                                }}
                            >
                                <Upload size={10}/> {task.status === 'rejected' ? 'Resubmit' : 'Submit'}
                            </button>
                        )}
                    </td>
                </tr>

                {showDetails && (
                    <tr>
                        <td colSpan={6} style={{ padding: '10px 20px 14px 20px', background: '#fafaf8', borderBottom: '1px solid #f0ece4' }}>
                            <DetailsBlock task={task}/>
                        </td>
                    </tr>
                )}

                {showSubmit && (
                    <SubmitModal task={task} onClose={() => setShowSubmit(false)} onSubmit={onSubmit}/>
                )}
            </>
        )
    }

    // ── Card mode ──────────────────────────────────────────────
    return (
        <div className={`bg-white border rounded-xl p-4 transition-all duration-200 hover:shadow-md group ${
            overdue
                ? 'border-l-4 border-l-[#e05252] border-t-[#e0d9ce] border-r-[#e0d9ce] border-b-[#e0d9ce]'
                : 'border-[#e0d9ce] hover:border-[#1a1f35]/20'
        }`}>
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold font-display leading-snug text-[#1a1f35]">
                        {title}
                    </p>
                    {actionable && (
                        <button
                            onClick={() => setShowSubmit(true)}
                            aria-label={`Submit "${title}"`}
                            className="shrink-0 flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1a1f35] text-white text-[11px] font-semibold"
                        >
                            <Upload size={10}/> {task.status === 'rejected' ? 'Resubmit' : 'Submit'}
                        </button>
                    )}
                </div>

                {task.assignment?.description && (
                    <p className="mt-0.5 text-xs text-[#b0a898] line-clamp-2">{task.assignment.description}</p>
                )}

                <button
                    onClick={() => setShowDetails(v => !v)}
                    className="flex items-center gap-1 mt-1.5 text-[10px] text-[#8a7e6e] hover:text-[#1a1f35] transition-colors"
                >
                    {showDetails ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                    {showDetails ? 'Hide details' : 'View details'}
                </button>

                {showDetails && (
                    <div className="mt-2">
                        <DetailsBlock task={task}/>
                    </div>
                )}

                {/* Meta pills */}
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="flex items-center gap-1" title="Importance — set by the teacher">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: pColor }}/>
                        <span className="text-[10px] font-bold capitalize" style={{ color: pColor }}>{pLabel}</span>
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ color: uColor, background: urgencyBg(uScore) }}
                        title="Urgency — computed from due date, importance, and workload">
                        {uLabel} urgency
                    </span>
                    <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ color: badge.color, background: badge.bg, border: `1px solid ${badge.border}` }}>
                        {badge.label}
                    </span>
                    {task.assignment?.task_type && (
                        <span className="text-[10px] text-[#b0a898] bg-[#f5f0e8] px-1.5 py-0.5 rounded-full capitalize">
                            {task.assignment.task_type}
                        </span>
                    )}
                    <span className="ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full"
                        style={{ color: pill.color, background: pill.bg }}>
                        {pill.label}
                    </span>
                </div>
            </div>

            {showSubmit && (
                <SubmitModal task={task} onClose={() => setShowSubmit(false)} onSubmit={onSubmit}/>
            )}
        </div>
    )
}