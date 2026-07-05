// src/pages/app/SubmissionsInboxPage.jsx
// Teacher-only: a single cross-course "To Review" inbox — every submission
// from every assignment, in one place, instead of opening each assignment
// individually. Reached from the sidebar's "Submissions" link → /app/submissions
//
// Reuses the same ReviewSubmissionModal as AssignmentSubmissions.jsx so
// reviewing behaves identically whether you get here from an assignment
// card or from this inbox.

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Search, Inbox } from 'lucide-react'
import tasksService from '../../services/tasks.service.js'
import coursesService from '../../services/courses.service.js'
import { statusLabel, statusColor, statusBg } from '../../hooks/useTasks.js'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
import { apiError } from '../../utils/helpers.js'
import ReviewModal from '../../components/shared/ReviewSubmissionModal.jsx'

const TABS = [
    { key:'submitted', label:'To Review'  },
    { key:'all',       label:'All'        },
    { key:'completed', label:'Approved'   },
    { key:'rejected',  label:'Rejected'   },
    { key:'pending',   label:'Pending'    },
    { key:'overdue',   label:'Overdue'    },
]

export default function SubmissionsInboxPage() {
    const navigate = useNavigate()

    const [tasks,      setTasks]      = useState([])
    const [courses,    setCourses]    = useState([])
    const [loading,    setLoading]    = useState(true)
    const [error,      setError]      = useState(null)
    const [activeTab,  setActiveTab]  = useState('submitted') // defaults to the actual "inbox" view
    const [courseFilter, setCourseFilter] = useState('all')
    const [search,     setSearch]     = useState('')
    const [reviewTask, setReviewTask] = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [t, c] = await Promise.all([
                tasksService.getTeacherSubmissionsInbox(),
                coursesService.list(),
            ])
            setTasks(Array.isArray(t) ? t : [])
            setCourses(Array.isArray(c) ? c : [])
        } catch (err) {
            setError(apiError(err))
        } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    function count(key) {
        if (key === 'all') return tasks.length
        return tasks.filter(t => t.status === key).length
    }

    const filtered = useMemo(() => {
        let list = tasks
        if (activeTab !== 'all') list = list.filter(t => t.status === activeTab)
        if (courseFilter !== 'all') list = list.filter(t => String(t.assignment?.course) === String(courseFilter))
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(t =>
                (t.student_name || t.student_username || '').toLowerCase().includes(q) ||
                (t.assignment?.title || '').toLowerCase().includes(q)
            )
        }
        return list
    }, [tasks, activeTab, courseFilter, search])

    function handleReviewed(updated) {
        setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
        setReviewTask(null)
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="anim-fade-in">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Submissions Inbox</h2>
                    <p className="page-subtitle">
                        Every submission across all {courses.length} course{courses.length !== 1 ? 's' : ''} — review without opening each assignment individually.
                    </p>
                </div>
            </div>

            {loading && <div className="white-card" style={{ padding:28 }}><LoadingBlock/></div>}
            {error   && <ErrorBlock message={error} onRetry={load}/>}

            {!loading && !error && (
                <>
                    <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
                        <div style={{ position:'relative', flex:'1 1 220px', minWidth:200 }}>
                            <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-placeholder)' }}/>
                            <input
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                placeholder="Search by student or assignment…"
                                style={{ width:'100%', padding:'8px 12px 8px 32px', fontSize:12.5, border:'1px solid var(--color-border)', borderRadius:9, boxSizing:'border-box' }}
                            />
                        </div>
                        <select
                            value={courseFilter}
                            onChange={e => setCourseFilter(e.target.value)}
                            style={{ padding:'8px 10px', fontSize:12.5, border:'1px solid var(--color-border)', borderRadius:9, background:'#fff' }}
                        >
                            <option value="all">All Courses</option>
                            {courses.map(c => (
                                <option key={c.id} value={c.id}>{c.title || c.name}</option>
                            ))}
                        </select>
                    </div>

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
                            <Inbox size={22} style={{ color:'var(--color-text-placeholder)', margin:'0 auto 10px', display:'block' }}/>
                            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--color-text)', margin:'0 0 5px' }}>
                                {activeTab === 'submitted' ? "You're all caught up" : 'Nothing here'}
                            </p>
                            <p style={{ fontSize:12, color:'var(--color-text-placeholder)' }}>
                                {activeTab === 'submitted' ? 'No submissions waiting for review right now.' : 'Nothing matches this filter yet.'}
                            </p>
                        </div>
                    ) : (
                        <div className="white-card overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="task-table">
                                    <thead>
                                        <tr>
                                            <th style={{ paddingLeft:18 }}>Student</th>
                                            <th>Assignment</th>
                                            <th className="hide-sm">Course</th>
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
                                                    <button
                                                        onClick={() => navigate(`/app/assignments/${t.assignment?.id}/submissions`)}
                                                        style={{ fontSize:12.5, color:'var(--color-primary)', background:'none', border:'none', padding:0, cursor:'pointer', textAlign:'left', fontWeight:600 }}
                                                        title="Open this assignment's full submissions list"
                                                    >
                                                        {t.assignment?.title || '—'}
                                                    </button>
                                                </td>
                                                <td className="hide-sm" style={{ fontSize:12, color:'var(--color-text-secondary)' }}>
                                                    {t.assignment?.course_name || '—'}
                                                </td>
                                                <td>
                                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:statusBg(t), color:statusColor(t), whiteSpace:'nowrap' }}>
                                                        {statusLabel(t)}
                                                    </span>
                                                </td>
                                                <td className="hide-sm" style={{ fontSize:12, color:'var(--color-text-secondary)' }}>
                                                    {t.submitted_at ? new Date(t.submitted_at).toLocaleDateString() : '—'}
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