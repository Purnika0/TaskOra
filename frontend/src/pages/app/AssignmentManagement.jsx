import React, { useState, useMemo } from 'react'
import { Search, LayoutGrid, List, RefreshCw, Upload, X, FileText, Send, MessageSquare, Paperclip, ChevronDown } from 'lucide-react'
import { useTasks, statusLabel, statusColor, statusBg } from '../../hooks/useTasks.js'
import { useAuth }         from '../../hooks/useAuth.js'
import { useToast }        from '../../context/ToastContext.jsx'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
import { getTaskTitle, getTaskDueDate, daysUntil, apiError } from '../../utils/helpers.js'

const TABS = [
    { key:'all',       label:'All'       },
    { key:'pending',   label:'Pending'   },
    { key:'submitted', label:'Submitted' },
    { key:'completed', label:'Completed' },
    { key:'overdue',   label:'Overdue'   },
    { key:'rejected',  label:'Rejected'  },
]

const selStyle = {
    padding:'8px 10px', fontSize:12,
    border:'1.5px solid var(--color-border)', borderRadius:8,
    background:'var(--color-surface-subtle)', color:'var(--color-text)',
    cursor:'pointer', fontFamily:'var(--font-body)',
}

function getCourseName(t) {
    return t.assignment?.course_name || t.course_name || 'Uncategorized'
}

// ── Submit Assignment modal (student-only) ─────────────────────────────────────
function SubmitModal({ task, onClose, onSubmitted }) {
    const [file,   setFile]   = useState(null)
    const [text,   setText]   = useState('')
    const [saving, setSaving] = useState(false)
    const [error,  setError]  = useState('')
    const toast = useToast()

    async function handleSubmit() {
        if (!file && !text.trim()) {
            setError('Please upload a file or write a response.')
            return
        }
        setSaving(true)
        setError('')
        try {
            const fd = new FormData()
            if (file) fd.append('submission_file', file)
            if (text.trim()) fd.append('submission_text', text.trim())
            const updated = await onSubmitted(task.id, fd)
            toast.success('Assignment submitted successfully')
            onClose()
        } catch (err) {
            setError(apiError(err))
        } finally { setSaving(false) }
    }

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:16 }}
            className="anim-fade-in">
            <div style={{ background:'var(--color-surface)', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden' }}
                className="anim-scale-in">

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--color-border)' }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--color-text)', margin:0 }}>
                            {task.status === 'rejected' ? 'Resubmit Assignment' : 'Submit Assignment'}
                        </h3>
                        <p style={{ fontSize:11, color:'var(--color-text-secondary)', margin:'2px 0 0' }}>{getTaskTitle(task)}</p>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'var(--color-text-secondary)', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                    {task.teacher_feedback && (
                        <div style={{ display:'flex', alignItems:'flex-start', gap:6, padding:'8px 10px', background:statusBg(task), borderRadius:8 }}>
                            <MessageSquare size={12} style={{ color:statusColor(task), marginTop:1, flexShrink:0 }}/>
                            <p style={{ fontSize:11.5, color:statusColor(task), margin:0, lineHeight:1.4 }}>{task.teacher_feedback}</p>
                        </div>
                    )}

                    {error && (
                        <p style={{ fontSize:12, color:'var(--color-red)', background:'var(--color-red-light)', padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>
                    )}

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>
                            Upload Solution (PDF, DOCX, DOC, Images)
                        </label>
                        <div style={{ border:'2px dashed var(--color-border)', borderRadius:10, padding:'14px', textAlign:'center', background:'var(--color-surface-subtle)', cursor:'pointer' }}
                            onClick={() => document.getElementById('am-sub-file').click()}>
                            <input id="am-sub-file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0]||null)} style={{ display:'none' }}/>
                            {file ? (
                                <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                                    <FileText size={15} style={{ color:'var(--color-primary)' }}/>
                                    <span style={{ fontSize:13, color:'var(--color-text)', fontWeight:600 }}>{file.name}</span>
                                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-red)', padding:2 }}><X size={11}/></button>
                                </div>
                            ) : (
                                <>
                                    <Upload size={18} style={{ color:'var(--color-text-placeholder)', margin:'0 auto 5px', display:'block' }}/>
                                    <p style={{ fontSize:12, color:'var(--color-text-secondary)', margin:0 }}>Click to upload your solution</p>
                                    <p style={{ fontSize:10, color:'var(--color-text-placeholder)', margin:'2px 0 0' }}>PDF, DOCX, DOC, JPG, PNG</p>
                                </>
                            )}
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>
                            Written Response (optional)
                        </label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Add any notes or written response for your teacher…"
                            rows={4}
                            style={{ width:'100%', border:'1.5px solid var(--color-border)', borderRadius:9, padding:'9px 12px', fontSize:13, fontFamily:'var(--font-body)', color:'var(--color-text)', background:'var(--color-surface-subtle)', resize:'vertical', boxSizing:'border-box' }}
                        />
                    </div>

                    <p style={{ fontSize:11, color:'var(--color-text-placeholder)', margin:0 }}>
                        At least one of file or written response is required.
                    </p>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 20px', borderTop:'1px solid var(--color-border)' }}>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ opacity:saving?0.7:1 }}>
                        {saving ? 'Submitting…' : <><Send size={13}/> {task.status === 'rejected' ? 'Resubmit' : 'Submit'}</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function AssignmentManagement() {
    const { tasks, loading, error, stats, refetch, submitAssignment, setTasks } = useTasks()
    const { user } = useAuth()
    const isStudent = user?.role === 'student'

    const [activeTab, setActiveTab]   = useState('all')
    const [search,    setSearch]      = useState('')
    const [sortBy,    setSortBy]      = useState('due')
    const [viewMode,  setViewMode]    = useState('table')
    const [submitTask, setSubmitTask] = useState(null)
    const [expandedId, setExpandedId] = useState(null)

    const filtered = useMemo(() => {
        let list = [...tasks]
        if (activeTab !== 'all') list = list.filter(t => t.status === activeTab)

        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(t =>
                getTaskTitle(t).toLowerCase().includes(q) ||
                getCourseName(t).toLowerCase().includes(q)
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
                .am-filter { background:var(--color-surface); border:1px solid var(--color-border); border-radius:12px; padding:12px 14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
                .am-tabs   { display:flex; gap:4px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
                .am-tabs::-webkit-scrollbar { display:none; }
                .am-view-btn { transition:var(--transition-fast); }
            `}</style>

            {/* Header */}
            <div className="page-header">
                <div>
                    <h2 className="page-title">Assignments</h2>
                    <p className="page-subtitle">
                        {stats.total} total · {stats.completed} completed · {stats.pending} pending · {stats.overdue} overdue
                        {stats.rejected > 0 && <> · {stats.rejected} rejected</>}
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
                    { label:'Rejected',  value:stats.rejected,  color:'#e05252' },
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
                    <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-placeholder)', pointerEvents:'none' }}/>
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search assignments…"
                        style={{ ...selStyle, paddingLeft:28, width:'100%', boxSizing:'border-box' }}/>
                </div>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
                    <option value="due">Sort by Due Date</option>
                    <option value="title">Sort by Title</option>
                    <option value="status">Sort by Status</option>
                </select>
                <div style={{ display:'flex', gap:3, padding:3, background:'var(--color-surface-subtle)', borderRadius:8 }}>
                    {[
                        { mode:'table', icon:<List size={13}/> },
                        { mode:'card',  icon:<LayoutGrid size={13}/> },
                    ].map(({ mode, icon }) => (
                        <button key={mode} onClick={() => setViewMode(mode)} className="am-view-btn"
                            style={{ width:28, height:28, display:'flex', alignItems:'center', justifyContent:'center', borderRadius:6, border:'none', cursor:'pointer',
                                background: viewMode===mode?'var(--color-surface)':'transparent',
                                color:      viewMode===mode?'var(--color-text)':'var(--color-text-placeholder)',
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
                                borderColor: active?'var(--color-text)':'var(--color-border)',
                                background:  active?'var(--color-text)':'var(--color-surface)',
                                color:       active?'var(--color-white)':'var(--color-text-secondary)',
                                fontSize:12, fontWeight: active?600:400,
                                cursor:'pointer', whiteSpace:'nowrap', transition:'var(--transition-fast)',
                                display:'flex', alignItems:'center', gap:5,
                            }}>
                            {t.label}
                            <span style={{ fontSize:10, fontWeight:600, padding:'1px 5px', borderRadius:99,
                                background: active?'rgba(255,255,255,0.18)':'var(--color-surface-subtle)',
                                color: active?'var(--color-white)':'var(--color-text-secondary)' }}>
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
                    <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--color-text)', margin:'0 0 5px' }}>
                        No assignments found
                    </p>
                    <p style={{ fontSize:12, color:'var(--color-text-placeholder)' }}>
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
                                    {isStudent && <th style={{ width:100 }}>Action</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t, i) => {
                                    const due    = getTaskDueDate(t)
                                    const d      = daysUntil(due)
                                    const sb     = { label: statusLabel(t), color: statusColor(t), bg: statusBg(t) }
                                    const canSub = isStudent && (t.status === 'pending' || t.status === 'overdue' || t.status === 'rejected')
                                    const urgent = t.status === 'overdue' || t.status === 'rejected'
                                    const isOpen = expandedId === t.id
                                    const desc   = t.assignment?.description?.trim()
                                    // Attachment support isn't wired up on the backend yet — this renders
                                    // automatically once `assignment.attachment_url` (or similar) is added.
                                    const attachment = t.assignment?.attachment_url || t.assignment?.attachment
                                    const hasDetails = Boolean(desc) || Boolean(attachment)

                                    return (
                                        <React.Fragment key={t.id}>
                                            <tr>
                                                <td style={{ paddingLeft:18, color:'var(--color-text-placeholder)', fontSize:12 }}>{i+1}</td>
                                                <td>
                                                    <div
                                                        onClick={() => hasDetails && setExpandedId(isOpen ? null : t.id)}
                                                        style={{ display:'flex', alignItems:'flex-start', gap:6, cursor: hasDetails ? 'pointer' : 'default' }}>
                                                        <div style={{ minWidth:0 }}>
                                                            <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text)', margin:0 }}>
                                                                {getTaskTitle(t)}
                                                            </p>
                                                            {t.teacher_feedback && (
                                                                <div style={{ display:'flex', alignItems:'flex-start', gap:5, marginTop:4, padding:'5px 8px', background:statusBg(t), borderRadius:7, maxWidth:340 }}>
                                                                    <MessageSquare size={11} style={{ color:statusColor(t), marginTop:1, flexShrink:0 }}/>
                                                                    <p style={{ fontSize:11, color:statusColor(t), margin:0, lineHeight:1.35 }}>{t.teacher_feedback}</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                        {hasDetails && (
                                                            <ChevronDown size={13} style={{ color:'var(--color-text-placeholder)', marginTop:3, flexShrink:0, transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }}/>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="hide-sm" style={{ fontSize:12, color:'var(--color-text-secondary)' }}>
                                                    {getCourseName(t)}
                                                </td>
                                                <td className="hide-sm" style={{ fontSize:12, color: urgent?'var(--color-red)':'var(--color-text-secondary)', fontWeight: urgent?600:400 }}>
                                                    {due||'—'}
                                                    {d !== null && d < 0 && <span style={{ marginLeft:4, fontSize:10, color:'var(--color-red)' }}>({Math.abs(d)}d late)</span>}
                                                </td>
                                                <td>
                                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:sb.bg, color:sb.color, whiteSpace:'nowrap' }}>
                                                        {sb.label}
                                                    </span>
                                                </td>
                                                {isStudent && (
                                                    <td>
                                                        {canSub && (
                                                            <button
                                                                style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', fontSize:11, fontWeight:600,
                                                                    background: t.status==='rejected' ? 'var(--color-red-light)' : 'var(--color-primary-light)',
                                                                    color:      t.status==='rejected' ? 'var(--color-red)'       : 'var(--color-primary)',
                                                                    border: `1px solid ${t.status==='rejected' ? 'var(--color-red)' : 'var(--color-primary)'}`,
                                                                    borderRadius:7, cursor:'pointer' }}
                                                                onClick={() => setSubmitTask(t)}>
                                                                <Upload size={11}/> {t.status === 'rejected' ? 'Resubmit' : 'Submit'}
                                                            </button>
                                                        )}
                                                        {t.status === 'submitted' && (
                                                            <span style={{ fontSize:11, color:'var(--color-text-secondary)', fontStyle:'italic' }}>Awaiting review</span>
                                                        )}
                                                    </td>
                                                )}
                                            </tr>
                                            {isOpen && hasDetails && (
                                                <tr>
                                                    <td colSpan={isStudent ? 6 : 5} style={{ background:'var(--color-surface-subtle)', padding:'12px 18px 16px 48px', borderTop:'1px solid var(--color-border)' }}>
                                                        {desc && (
                                                            <div style={{ marginBottom: attachment ? 10 : 0 }}>
                                                                <p style={{ fontSize:10.5, fontWeight:700, color:'var(--color-text-placeholder)', textTransform:'uppercase', letterSpacing:'0.03em', margin:'0 0 4px' }}>
                                                                    Description
                                                                </p>
                                                                <p style={{ fontSize:12.5, color:'var(--color-text-secondary)', margin:0, lineHeight:1.5, whiteSpace:'pre-wrap' }}>
                                                                    {desc}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {attachment && (
                                                            <a href={attachment} target="_blank" rel="noreferrer"
                                                                style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'var(--color-primary)', textDecoration:'none' }}>
                                                                <Paperclip size={12}/> View attachment
                                                            </a>
                                                        )}
                                                    </td>
                                                </tr>
                                            )}
                                        </React.Fragment>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ padding:'7px 18px', borderTop:'1px solid var(--color-border)', background:'var(--color-surface-subtle)' }}>
                        <p style={{ fontSize:11, color:'var(--color-text-placeholder)', margin:0 }}>
                            {filtered.length} of {tasks.length} assignments
                        </p>
                    </div>
                </div>
            )}

            {!loading && !error && filtered.length > 0 && viewMode === 'card' && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:12 }}>
                    {filtered.map(t => {
                        const due    = getTaskDueDate(t)
                        const d      = daysUntil(due)
                        const sb     = { label: statusLabel(t), color: statusColor(t), bg: statusBg(t) }
                        const urgent = t.status === 'overdue' || t.status === 'rejected'
                        const canSub = isStudent && (t.status === 'pending' || t.status === 'overdue' || t.status === 'rejected')
                        const isOpen = expandedId === t.id
                        const desc   = t.assignment?.description?.trim()
                        const attachment = t.assignment?.attachment_url || t.assignment?.attachment
                        const hasDetails = Boolean(desc) || Boolean(attachment)

                        return (
                            <div key={t.id} style={{ background:'var(--color-surface)', border:'1px solid var(--color-border)', borderRadius:12, padding:16 }}>
                                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:8 }}>
                                    <p style={{ fontSize:13, fontWeight:700, color:'var(--color-text)', margin:0, flex:1, lineHeight:1.35 }}>
                                        {getTaskTitle(t)}
                                    </p>
                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:sb.bg, color:sb.color, whiteSpace:'nowrap', flexShrink:0 }}>
                                        {sb.label}
                                    </span>
                                </div>
                                <p style={{ fontSize:12, color:'var(--color-text-secondary)', margin:'0 0 6px' }}>
                                    {getCourseName(t)}
                                </p>
                                {due && (
                                    <p style={{ fontSize:11, color: urgent?'var(--color-red)':'var(--color-text-secondary)', fontWeight: urgent?600:400, margin:0 }}>
                                        Due: {due} {d!==null&&d<0&&`(${Math.abs(d)}d late)`}
                                    </p>
                                )}
                                {t.teacher_feedback && (
                                    <div style={{ display:'flex', alignItems:'flex-start', gap:5, marginTop:8, padding:'6px 8px', background:sb.bg, borderRadius:7 }}>
                                        <MessageSquare size={11} style={{ color:sb.color, marginTop:1, flexShrink:0 }}/>
                                        <p style={{ fontSize:11, color:sb.color, margin:0, lineHeight:1.35 }}>{t.teacher_feedback}</p>
                                    </div>
                                )}
                                {hasDetails && (
                                    <button onClick={() => setExpandedId(isOpen ? null : t.id)}
                                        style={{ display:'flex', alignItems:'center', gap:4, marginTop:8, padding:0, background:'none', border:'none', cursor:'pointer', fontSize:11.5, fontWeight:600, color:'var(--color-primary)' }}>
                                        {isOpen ? 'Hide details' : 'View details'}
                                        <ChevronDown size={12} style={{ transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }}/>
                                    </button>
                                )}
                                {isOpen && hasDetails && (
                                    <div style={{ marginTop:8, padding:'10px 12px', background:'var(--color-surface-subtle)', borderRadius:8 }}>
                                        {desc && (
                                            <p style={{ fontSize:12, color:'var(--color-text-secondary)', margin:0, lineHeight:1.5, whiteSpace:'pre-wrap' }}>
                                                {desc}
                                            </p>
                                        )}
                                        {attachment && (
                                            <a href={attachment} target="_blank" rel="noreferrer"
                                                style={{ display:'inline-flex', alignItems:'center', gap:6, marginTop: desc?8:0, fontSize:12, fontWeight:600, color:'var(--color-primary)', textDecoration:'none' }}>
                                                <Paperclip size={12}/> View attachment
                                            </a>
                                        )}
                                    </div>
                                )}
                                {canSub && (
                                    <button onClick={() => setSubmitTask(t)}
                                        style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, marginTop:10, width:'100%', padding:'7px 10px', fontSize:12, fontWeight:600,
                                            background: t.status==='rejected' ? 'var(--color-red-light)' : 'var(--color-primary-light)',
                                            color:      t.status==='rejected' ? 'var(--color-red)'       : 'var(--color-primary)',
                                            border: `1px solid ${t.status==='rejected' ? 'var(--color-red)' : 'var(--color-primary)'}`,
                                            borderRadius:8, cursor:'pointer' }}>
                                        <Upload size={12}/> {t.status === 'rejected' ? 'Resubmit' : 'Submit'}
                                    </button>
                                )}
                                {isStudent && t.status === 'submitted' && (
                                    <p style={{ fontSize:11, color:'var(--color-text-secondary)', fontStyle:'italic', margin:'10px 0 0', textAlign:'center' }}>Awaiting review</p>
                                )}
                            </div>
                        )
                    })}
                </div>
            )}

            <DashboardFooter/>

            {/* Submit modal (student-only) */}
            {submitTask && (
                <SubmitModal
                    task={submitTask}
                    onClose={() => setSubmitTask(null)}
                    onSubmitted={submitAssignment}
                />
            )}
        </div>
    )
}