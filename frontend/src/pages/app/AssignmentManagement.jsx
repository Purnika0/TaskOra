// src/pages/app/AssignmentManagement.jsx
// Replaces TaskManagement.jsx
// UPDATED per backend integration guide:
//   • "Task" → "Assignment" throughout
//   • Status: 4 states — pending|submitted|completed|overdue (not is_completed boolean)
//   • Personal tasks REMOVED — no Create/Edit/Delete for students
//   • Subtasks REMOVED
//   • Students: view + submit only
//   • Teachers: view all assignments across courses
//   • Filter tabs use status field

import React, { useState, useMemo } from 'react'
import { Search, LayoutGrid, List, RefreshCw, Upload } from 'lucide-react'
import { useTasks, isCompleted, isPending, isSubmitted, isOverdue, statusLabel, statusColor, statusBg } from '../../hooks/useTasks.js'
import { useAuth }         from '../../hooks/useAuth.js'
import { useToast }        from '../../context/ToastContext.jsx'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
import { getTaskTitle, getTaskDueDate, daysUntil } from '../../utils/helpers.js'

const TABS = [
    { key:'all',       label:'All'       },
    { key:'pending',   label:'Pending'   },
    { key:'submitted', label:'Submitted' },
    { key:'completed', label:'Completed' },
    { key:'overdue',   label:'Overdue'   },
]

const selStyle = {
    padding:'8px 10px', fontSize:12,
    border:'1.5px solid #e2dbd0', borderRadius:8,
    background:'#faf8f5', color:'#1a1f35',
    outline:'none', cursor:'pointer', fontFamily:'var(--font-body)',
}

export default function AssignmentManagement() {
    const { tasks, loading, error, stats, refetch } = useTasks()
    const { user } = useAuth()
    const isStudent = user?.role === 'student'

    const [activeTab, setActiveTab] = useState('all')
    const [search,    setSearch]    = useState('')
    const [sortBy,    setSortBy]    = useState('due')
    const [viewMode,  setViewMode]  = useState('table')

    const filtered = useMemo(() => {
        let list = [...tasks]
        if (activeTab !== 'all') list = list.filter(t => t.status === activeTab)

        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(t =>
                getTaskTitle(t).toLowerCase().includes(q) ||
                (t.assignment?.course_name||'').toLowerCase().includes(q)
            )
        }

        if (sortBy === 'due')    list.sort((a,b) => (getTaskDueDate(a)||'9').localeCompare(getTaskDueDate(b)||'9'))
        if (sortBy === 'title')  list.sort((a,b) => getTaskTitle(a).localeCompare(getTaskTitle(b)))
        if (sortBy === 'status') list.sort((a,b) => (a.status||'').localeCompare(b.status||''))
        return list
    }, [tasks, activeTab, search, sortBy])

    function count(key) {
        if (key === 'all') return tasks.length
        return tasks.filter(t => t.status === key).length
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="anim-fade-in">
            <style>{`
                .am-filter { background:#fff; border:1px solid #e2dbd0; border-radius:12px; padding:12px 14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
                .am-tabs   { display:flex; gap:4px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
                .am-tabs::-webkit-scrollbar { display:none; }
            `}</style>

            {/* Header */}
            <div className="page-header">
                <div>
                    <h2 className="page-title">Assignments</h2>
                    <p className="page-subtitle">
                        {stats.total} total · {stats.completed} completed · {stats.pending} pending · {stats.overdue} overdue
                    </p>
                </div>
            </div>

            {/* Stats strip */}
            <div className="stat-grid">
                {[
                    { label:'Completed', value:stats.completed, color:'#3cb87a' },
                    { label:'Submitted', value:stats.submitted, color:'#3b6fd4' },
                    { label:'Pending',   value:stats.pending,   color:'#d4a93c' },
                    { label:'Overdue',   value:stats.overdue,   color:'#e05252' },
                ].map(s => (
                    <div key={s.label} className="stat-box" style={{ borderTop:`3px solid ${s.color}`, padding:'13px 16px' }}>
                        <p className="stat-label">{s.label}</p>
                        <p className="stat-value" style={{ fontSize:26, color:s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className="am-filter">
                <div style={{ position:'relative', flex:1, minWidth:180 }}>
                    <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'#b0a898', pointerEvents:'none' }}/>
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search assignments…"
                        style={{ ...selStyle, paddingLeft:28, width:'100%', boxSizing:'border-box' }}/>
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
                    <option value="due">Sort by Due Date</option>
                    <option value="title">Sort by Title</option>
                    <option value="status">Sort by Status</option>
                </select>
                <div style={{ display:'flex', gap:3, padding:3, background:'#f0ece5', borderRadius:8 }}>
                    {[
                        { mode:'table', icon:<List size={13}/> },
                        { mode:'card',  icon:<LayoutGrid size={13}/> },
                    ].map(({ mode, icon }) => (
                        <button key={mode} onClick={() => setViewMode(mode)}
                            style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, border:'none', cursor:'pointer',
                                background: viewMode===mode?'#fff':'transparent',
                                color:      viewMode===mode?'#1a1f35':'#b0a898',
                                boxShadow:  viewMode===mode?'0 1px 3px rgba(0,0,0,0.08)':'none',
                            }}>
                            {icon}
                        </button>
                    ))}
                </div>
                <button onClick={refetch} className="btn-secondary" style={{ padding:'7px 10px' }}>
                    <RefreshCw size={12}/>
                </button>
            </div>

            {/* Tabs */}
            <div className="am-tabs">
                {TABS.map(t => {
                    const active = activeTab === t.key
                    return (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            style={{ padding:'7px 13px', borderRadius:8, border:'1.5px solid',
                                borderColor: active?'#1a1f35':'#e2dbd0',
                                background:  active?'#1a1f35':'#fff',
                                color:       active?'#fff':'#6a6052',
                                fontSize:12, fontWeight: active?600:400,
                                cursor:'pointer', whiteSpace:'nowrap', transition:'all 0.13s',
                                display:'flex', alignItems:'center', gap:5,
                            }}>
                            {t.label}
                            <span style={{ fontSize:10, fontWeight:600, padding:'1px 5px', borderRadius:99,
                                background: active?'rgba(255,255,255,0.18)':'#f0ece5',
                                color: active?'#fff':'#8a7e6e' }}>
                                {count(t.key)}
                            </span>
                        </button>
                    )
                })}
            </div>

            {loading && <div className="white-card" style={{ padding:28 }}><LoadingBlock/></div>}
            {error   && <ErrorBlock message={error} onRetry={refetch}/>}

            {!loading && !error && filtered.length === 0 && (
                <div className="white-card" style={{ padding:'44px 24px', textAlign:'center' }}>
                    <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#1a1f35', margin:'0 0 5px' }}>
                        No assignments found
                    </p>
                    <p style={{ fontSize:12, color:'#b0a898' }}>
                        {search ? `No results for "${search}"` : 'No assignments in this category.'}
                    </p>
                </div>
            )}

            {!loading && !error && filtered.length > 0 && viewMode === 'table' && (
                <div className="white-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="task-table">
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft:18, width:32 }}>#</th>
                                    <th>Assignment</th>
                                    <th className="hide-sm">Course</th>
                                    <th className="hide-sm">Due Date</th>
                                    <th>Status</th>
                                    {isStudent && <th style={{ width:90 }}>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t, i) => {
                                    const due   = getTaskDueDate(t)
                                    const d     = daysUntil(due)
                                    const sb    = { label: statusLabel(t), color: statusColor(t), bg: statusBg(t) }
                                    const canSub = isStudent && (t.status === 'pending' || t.status === 'overdue')
                                    return (
                                        <tr key={t.id}>
                                            <td style={{ paddingLeft:18, color:'#b0a898', fontSize:12 }}>{i+1}</td>
                                            <td>
                                                <p style={{ fontSize:13, fontWeight:600, color:'#1a1f35', margin:0 }}>
                                                    {getTaskTitle(t)}
                                                </p>
                                                {t.teacher_feedback && (
                                                    <p style={{ fontSize:11, color:'#3b6fd4', margin:'2px 0 0', fontStyle:'italic' }}>
                                                        {t.teacher_feedback}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="hide-sm" style={{ fontSize:12, color:'#6a6052' }}>
                                                {t.assignment?.course_name || t.course_name || '—'}
                                            </td>
                                            <td className="hide-sm" style={{ fontSize:12, color: d!==null&&d<0?'#c0392b':'#6a6052' }}>
                                                {due||'—'}
                                            </td>
                                            <td>
                                                <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:sb.bg, color:sb.color, whiteSpace:'nowrap' }}>
                                                    {sb.label}
                                                </span>
                                            </td>
                                            {isStudent && (
                                                <td>
                                                    {canSub ? (
                                                        <button
                                                            style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', fontSize:11, fontWeight:600, background:'#eff3fd', color:'#1e40af', border:'1px solid #bfdbfe', borderRadius:7, cursor:'pointer' }}
                                                            onClick={() => {/* handled in StudentDashboard */}}>
                                                            <Upload size={11}/> Submit
                                                        </button>
                                                    ) : null}
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ padding:'7px 18px', borderTop:'1px solid #f0ece4', background:'#faf8f5' }}>
                        <p style={{ fontSize:11, color:'#b0a898', margin:0 }}>
                            {filtered.length} of {tasks.length} assignments
                        </p>
                    </div>
                </div>
            )}

            {!loading && !error && filtered.length > 0 && viewMode === 'card' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                    {filtered.map(t => {
                        const due = getTaskDueDate(t)
                        const d   = daysUntil(due)
                        const sb  = { label: statusLabel(t), color: statusColor(t), bg: statusBg(t) }
                        return (
                            <div key={t.id} style={{ background:'#fff', border:'1px solid #ece8e1', borderRadius:12, padding:16 }}>
                                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                                    <p style={{ fontSize:13, fontWeight:700, color:'#1a1f35', margin:0, flex:1, lineHeight:1.35 }}>
                                        {getTaskTitle(t)}
                                    </p>
                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:sb.bg, color:sb.color, whiteSpace:'nowrap', flexShrink:0 }}>
                                        {sb.label}
                                    </span>
                                </div>
                                <p style={{ fontSize:12, color:'#8a7e6e', margin:'0 0 6px' }}>
                                    {t.assignment?.course_name || t.course_name || 'No course'}
                                </p>
                                {due && (
                                    <p style={{ fontSize:11, color: d!==null&&d<0?'#c0392b':'#8a7e6e', margin:0 }}>
                                        Due: {due} {d!==null&&d<0&&`(${Math.abs(d)}d late)`}
                                    </p>
                                )}
                                {t.teacher_feedback && (
                                    <p style={{ fontSize:11, color:'#3b6fd4', margin:'6px 0 0', fontStyle:'italic', borderTop:'1px solid #f0ece4', paddingTop:6 }}>
                                        Feedback: {t.teacher_feedback}
                                    </p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <DashboardFooter/>
        </div>
    )
}
