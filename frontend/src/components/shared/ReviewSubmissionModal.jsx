// src/components/shared/ReviewSubmissionModal.jsx
// Shared review/approve/reject modal for a single student submission.
// Used by:
//   • AssignmentSubmissions.jsx  (per-assignment submissions list)
//   • SubmissionsInboxPage.jsx   (cross-course "To Review" inbox)
// Keeping this in one place means both pages always show the exact same
// submission content (text / file / feedback) and reviewing behavior.

import React, { useState } from 'react'
import { Paperclip, MessageSquare, Check, X } from 'lucide-react'
import tasksService from '../../services/tasks.service.js'
import { statusLabel, statusColor, statusBg } from '../../hooks/useTasks.js'
import { useToast } from '../../context/ToastContext.jsx'
import { apiError } from '../../utils/helpers.js'

export default function ReviewSubmissionModal({ task, onClose, onReviewed }) {
    const readOnly = task.status !== 'submitted'
    const [feedback, setFeedback] = useState(task.teacher_feedback || '')
    const [saving,   setSaving]   = useState(null) // 'approve' | 'reject' | null
    const [error,    setError]    = useState('')
    const toast = useToast()

    async function handleReview(action) {
        setSaving(action)
        setError('')
        try {
            const updated = await tasksService.reviewSubmission(task.id, action, feedback.trim())
            toast.success(action === 'approve' ? 'Submission approved' : 'Sent back for revision')
            onReviewed(updated)
        } catch (err) {
            setError(apiError(err))
        } finally { setSaving(null) }
    }

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:16 }}
            className="anim-fade-in" onClick={onClose}>
            <div style={{ background:'var(--color-surface)', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden' }}
                className="anim-scale-in" onClick={e => e.stopPropagation()}>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--color-border)' }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--color-text)', margin:0 }}>
                            {readOnly ? 'Submission' : 'Review Submission'}
                        </h3>
                        <p style={{ fontSize:11, color:'var(--color-text-secondary)', margin:'2px 0 0' }}>
                            {task.student_name || task.student_username}
                            {task.assignment?.title && <> · {task.assignment.title}</>}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'var(--color-text-secondary)', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                    {error && (
                        <p style={{ fontSize:12, color:'var(--color-red)', background:'var(--color-red-light)', padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>
                    )}

                    {readOnly && (
                        <span style={{ alignSelf:'flex-start', fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:statusBg(task), color:statusColor(task) }}>
                            {statusLabel(task)}
                        </span>
                    )}

                    {task.submission_text && (
                        <div>
                            <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', margin:'0 0 5px' }}>Written response</p>
                            <p style={{ fontSize:13, color:'var(--color-text)', margin:0, lineHeight:1.5, whiteSpace:'pre-wrap', background:'var(--color-surface-subtle)', padding:'10px 12px', borderRadius:9 }}>
                                {task.submission_text}
                            </p>
                        </div>
                    )}

                    {task.submission_file && (
                        <a href={task.submission_file} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12.5, fontWeight:600, color:'var(--color-primary)', textDecoration:'none' }}>
                            <Paperclip size={13}/> {task.file_name || 'View submitted file'}
                        </a>
                    )}

                    {!task.submission_text && !task.submission_file && (
                        <p style={{ fontSize:12, color:'var(--color-text-placeholder)', margin:0 }}>No submission content available.</p>
                    )}

                    {readOnly && task.teacher_feedback && (
                        <div>
                            <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', margin:'0 0 5px' }}>Your feedback</p>
                            <div style={{ display:'flex', alignItems:'flex-start', gap:6, padding:'8px 10px', background:statusBg(task), borderRadius:8 }}>
                                <MessageSquare size={12} style={{ color:statusColor(task), marginTop:1, flexShrink:0 }}/>
                                <p style={{ fontSize:11.5, color:statusColor(task), margin:0, lineHeight:1.4 }}>{task.teacher_feedback}</p>
                            </div>
                        </div>
                    )}

                    {!readOnly && (
                        <div>
                            <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>Feedback (optional)</label>
                            <textarea value={feedback} onChange={e => setFeedback(e.target.value)} rows={3}
                                placeholder="Add feedback for the student…"
                                style={{ width:'100%', border:'1.5px solid var(--color-border)', borderRadius:9, padding:'9px 12px', fontSize:13, fontFamily:'var(--font-body)', color:'var(--color-text)', background:'var(--color-surface-subtle)', resize:'vertical', boxSizing:'border-box' }}/>
                        </div>
                    )}
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 20px', borderTop:'1px solid var(--color-border)' }}>
                    {readOnly ? (
                        <button onClick={onClose} className="btn-secondary">Close</button>
                    ) : (
                        <>
                            <button onClick={() => handleReview('reject')} disabled={!!saving} className="btn-secondary" style={{ color:'var(--color-red)' }}>
                                {saving === 'reject' ? 'Rejecting…' : 'Reject'}
                            </button>
                            <button onClick={() => handleReview('approve')} disabled={!!saving} className="btn-primary" style={{ opacity: saving === 'approve' ? 0.7 : 1 }}>
                                {saving === 'approve' ? 'Approving…' : <><Check size={13}/> Approve</>}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}