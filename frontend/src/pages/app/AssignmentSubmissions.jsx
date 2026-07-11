// src/pages/app/AssignmentSubmissions.jsx
// Teacher-only: view every student's submission for one assignment and approve/reject it.
// Reached from AssignmentManagement.jsx's "Submissions" button → /app/assignments/:id/submissions

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import tasksService from '../../services/tasks.service.js'
import { statusLabel, statusColor, statusBg } from '../../hooks/useTasks.js'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
import { apiError, fmtDate } from '../../utils/helpers.js'
import ReviewModal from '../../components/shared/ReviewSubmissionModal.jsx'

const TABS = [
    { key:'all',       label:'All'        },
    { key:'submitted', label:'To Review'  },
    { key:'completed', label:'Approved'   },
    { key:'rejected',  label:'Rejected'   },
    { key:'pending',   label:'Pending'    },
    { key:'overdue',   label:'Overdue'    },
]

export default function AssignmentSubmissions() {
    const { id }    = useParams()
    const navigate  = useNavigate()

    const [assignment, setAssignment] = useState(null)
    const [tasks,       setTasks]     = useState([])
    const [loading,     setLoading]   = useState(true)
    const [error,       setError]     = useState(null)
    const [activeTab,   setActiveTab] = useState('all')
    const [reviewTask,  setReviewTask] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [a, subs] = await Promise.all([
                tasksService.getAssignment(id),
                tasksService.getSubmissions(id),
            ])
            setAssignment(a)
            setTasks(Array.isArray(subs) ? subs : [])
        } catch (err) {
            setError(apiError(err))
        } finally { setLoading(false) }
    }, [id])

    useEffect(() => { load() }, [load])

    function count(key) {
        if (key === 'all') return tasks.length
        return tasks.filter(t => t.status === key).length
    }

    const filtered = useMemo(() => {
        if (activeTab === 'all') return tasks
        return tasks.filter(t => t.status === activeTab)
    }, [tasks, activeTab])

    function handleReviewed(updated) {
        setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
        setReviewTask(null)
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="anim-fade-in">
            <button onClick={() => navigate('/app/assignments')}
                style={{ display:'inline-flex', alignItems:'center', gap:6, alignSelf:'flex-start', background:'none', border:'none', cursor:'pointer', color:'var(--color-text-secondary)', fontSize:12.5, fontWeight:600, padding:0 }}>
                <ArrowLeft size={14}/> Back to Assignments
            </button>

            <div className="page-header">
                <div>
                    <h2 className="page-title">{assignment ? assignment.title : 'Submissions'}</h2>
                    <p className="page-subtitle">
                        {assignment ? `${assignment.course_name} · Due ${fmtDate(assignment.due_date)}` : ''}
                    </p>
                </div>
            </div>

            {loading && <div className="white-card" style={{ padding:28 }}><LoadingBlock/></div>}
            {error   && <ErrorBlock message={error} onRetry={load}/>}

            {!loading && !error && (
                <>
                    <div style={{ display:'flex', gap:4, overflowX:'auto', paddingBottom:2 }}>
                        {TABS.map(t => {
                            const active = activeTab === t.key
                            return (
                                <button key={t.key} onClick={() => setActiveTab(t.key)}
                                    style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 12px', borderRadius:8, border:'none', cursor:'pointer', whiteSpace:'nowrap',
                                        background: active ? 'var(--color-text)' : 'var(--color-surface)',
                                        color:      active ? 'var(--color-white)' : 'var(--color-text-secondary)',
                                        fontSize:12.5, fontWeight:600 }}>
                                    {t.label}
                                    <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:99,
                                        background: active ? 'rgba(255,255,255,0.25)' : 'var(--color-surface-subtle)',
                                        color:      active ? 'var(--color-white)' : 'var(--color-text-secondary)' }}>
                                        {count(t.key)}
                                    </span>
                                </button>
                            )
                        })}
                    </div>

                    {filtered.length === 0 ? (
                        <div className="white-card" style={{ padding:'44px 24px', textAlign:'center' }}>
                            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--color-text)', margin:'0 0 5px' }}>
                                No submissions here
                            </p>
                            <p style={{ fontSize:12, color:'var(--color-text-placeholder)' }}>Nothing matches this filter yet.</p>
                        </div>
                    ) : (
                        <div className="white-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="task-table">
                                    <thead>
                                        <tr>
                                            <th style={{ paddingLeft:18 }}>Student</th>
                                            <th>Status</th>
                                            <th className="hide-sm">Submitted</th>
                                            <th style={{ width:110 }}>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {filtered.map(t => (
                                            <tr key={t.id}>
                                                <td style={{ paddingLeft:18 }}>
                                                    <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text)', margin:0 }}>
                                                        {t.student_name || t.student_username}
                                                    </p>
                                                </td>
                                                <td>
                                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:statusBg(t), color:statusColor(t), whiteSpace:'nowrap' }}>
                                                        {statusLabel(t)}
                                                    </span>
                                                </td>
                                                <td className="hide-sm" style={{ fontSize:12, color:'var(--color-text-secondary)' }}>
                                                    {t.submitted_at ? fmtDate(t.submitted_at) : '—'}
                                                </td>
                                                <td>
                                                    {t.status === 'submitted' ? (
                                                        <button onClick={() => setReviewTask(t)}
                                                            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', fontSize:11, fontWeight:600,
                                                                background:'var(--color-primary-light)', color:'var(--color-primary)',
                                                                border:'1px solid var(--color-primary)', borderRadius:7, cursor:'pointer' }}>
                                                            Review
                                                        </button>
                                                    ) : (t.submission_text || t.submission_file) ? (
                                                        <button onClick={() => setReviewTask(t)}
                                                            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', fontSize:11, fontWeight:600,
                                                                background:'none', color:'var(--color-text-secondary)',
                                                                border:'1px solid var(--color-border)', borderRadius:7, cursor:'pointer' }}>
                                                            View
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize:11, color:'var(--color-text-placeholder)', fontStyle:'italic' }}>—</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}

            <DashboardFooter/>

            {reviewTask && (
                <ReviewModal task={reviewTask} onClose={() => setReviewTask(null)} onReviewed={handleReviewed}/>
            )}
        </div>
    )
}