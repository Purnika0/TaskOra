// src/pages/app/StudentDashboard.jsx
// UPDATED per backend integration guide:
//   • is_completed replaced by 4-state status: pending|submitted|completed|overdue
//   • Personal tasks removed (no Add/Create/Edit/Delete assignment buttons)
//   • FAB removed — students cannot create tasks
//   • Submit Assignment form shown for pending/overdue tasks
//   • 4 stat cards: Completed, Submitted, Pending, Overdue
//   • Status badges: Pending=Orange, Submitted=Blue, Completed=Green, Overdue=Red

import React, { useState, useEffect, useMemo } from 'react'
import {
    Star, BookOpen, Clock, CheckCircle2, ClipboardList,
    ChevronLeft, ChevronRight, Upload, AlertCircle, Send,
    X, FileText,
} from 'lucide-react'
import { useAuth }                         from '../../hooks/useAuth.js'
import { useTasks, isCompleted, isPending, isSubmitted, isOverdue, statusLabel, statusBg, statusColor } from '../../hooks/useTasks.js'
import { useStudentSummary }               from '../../hooks/useAnalytics.js'
import { useUpcomingHolidays, useToday }   from '../../hooks/useHolidays.js'
import { DashboardFooter }                 from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock }        from '../../components/shared/Loader.jsx'
import { useToast }                        from '../../context/ToastContext.jsx'
import tasksService                        from '../../services/tasks.service.js'
import { getTaskTitle, getTaskDueDate, daysUntil, apiError } from '../../utils/helpers.js'
import { BS_MONTH_NAMES, buildMonthDays, adToBS }            from '../../utils/bsCalendar.js'

const DOW_LABELS = ['S','M','T','W','T','F','S']
const RED     = '#ef4444'
const RED_DIM = 'rgba(255,90,90,0.75)'
const SUN_DIM = 'rgba(255,130,100,0.60)'

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }) {
    return (
        <div className="stat-box" style={{ borderTop:`3px solid ${accent}` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span className="stat-label" style={{ marginBottom:0 }}>{label}</span>
                <div style={{ width:32, height:32, borderRadius:8, background:`${accent}14`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {React.cloneElement(icon, { size:15, style:{ color:accent } })}
                </div>
            </div>
            <p className="stat-value">{value ?? 0}</p>
        </div>
    )
}

// ── BS Calendar widget ────────────────────────────────────────────────────────
function BSCalWidget() {
    const { today: todayData } = useToday()
    const todayBS = useMemo(() => {
        if (todayData?.today_bs) return todayData.today_bs
        const t = adToBS(new Date()); return { year:t.year, month:t.month, day:t.day }
    }, [todayData])
    const [cur, setCur] = useState(() => { const t = adToBS(new Date()); return { y:t.year, m:t.month } })
    useEffect(() => { if (todayBS?.year && todayBS?.month) setCur({ y:todayBS.year, m:todayBS.month }) }, [todayBS?.year, todayBS?.month])
    const prev = () => setCur(c => c.m === 1  ? { y:c.y-1, m:12 } : { y:c.y, m:c.m-1 })
    const next = () => setCur(c => c.m === 12 ? { y:c.y+1, m:1  } : { y:c.y, m:c.m+1 })
    const days        = useMemo(() => buildMonthDays(cur.y, cur.m), [cur.y, cur.m])
    const firstDow    = days.length ? days[0].dow : 0
    const bsMonthName = BS_MONTH_NAMES[cur.m - 1]

    return (
        <div className="cal-card" style={{ display:'flex', flexDirection:'column' }}>
            <div className="cal-header">
                <button className="cal-nav" onClick={prev} aria-label="Previous month"><ChevronLeft size={12}/></button>
                <div style={{ textAlign:'center' }}>
                    <div className="cal-month-title">{bsMonthName?.en} {cur.y}</div>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,0.30)', marginBottom:6 }}>{bsMonthName?.ne} · BS</div>
                </div>
                <button className="cal-nav" onClick={next} aria-label="Next month"><ChevronRight size={12}/></button>
            </div>
            <div className="cal-grid">
                {DOW_LABELS.map((d,i) => (
                    <div key={i} className="cal-dow" style={{ color: i===6?RED_DIM:i===0?SUN_DIM:undefined }}>{d}</div>
                ))}
                {Array(firstDow).fill(null).map((_,i) => <div key={`b${i}`}/>)}
                {days.map(day => {
                    const isToday = todayBS && day.bsDay===todayBS.day && cur.m===todayBS.month && cur.y===todayBS.year
                    let cls = 'cal-day'
                    if (isToday)       cls += ' today'
                    if (day.isHoliday) cls += ' holiday'
                    if (day.isSat && !day.isHoliday) cls += ' saturday'
                    const hTitle   = day.holidayTitle || (day.isSat ? 'Saturday — Holiday' : null)
                    const numColor = day.isHoliday ? RED_DIM : day.isSun ? SUN_DIM : undefined
                    return (
                        <div key={day.bsKey} className="cal-day-cell" title={hTitle||undefined}>
                            <div className={cls} style={{ flexDirection:'column', gap:0, height:30, width:30, color: isToday?undefined:numColor }}>
                                <span style={{ fontSize:11, lineHeight:1, fontWeight: day.isHoliday||day.isSat?700:400 }}>{day.bsDay}</span>
                                <span style={{ fontSize:7, lineHeight:1, marginTop:1, opacity: isToday?0.6:0.30 }}>{day.adDate.getDate()}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="cal-legend" style={{ marginTop:'auto', flexWrap:'wrap', gap:'5px 12px' }}>
                <div className="cal-legend-item"><span className="cal-legend-dot" style={{ background:RED }}/>Holiday/Sat</div>
                <div className="cal-legend-item"><span className="cal-legend-dot" style={{ background:'transparent', border:'1.5px solid rgba(255,255,255,0.55)', borderRadius:'50%' }}/>Today</div>
            </div>
        </div>
    )
}

// ── Holidays widget ───────────────────────────────────────────────────────────
function HolidaysWidget() {
    const { holidays, loading } = useUpcomingHolidays()
    return (
        <div className="white-card" style={{ padding:18, display:'flex', flexDirection:'column', height:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <Star size={14} style={{ color:'#d4a93c', flexShrink:0 }}/>
                <div>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#1a1f35', margin:0 }}>Holidays</h3>
                    <p style={{ fontSize:10, color:'#b0a898', margin:0, marginTop:2 }}>आगामी बिदाहरु</p>
                </div>
            </div>
            {loading ? <LoadingBlock rows={2}/> : holidays.length === 0
                ? <p style={{ fontSize:12, color:'#b0a898' }}>No upcoming holidays.</p>
                : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {holidays.slice(0,5).map(h => {
                        const d = daysUntil(h.date)
                        return (
                            <div key={h.id||h.date} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                                <div style={{ minWidth:0, flex:1 }}>
                                    <p style={{ fontSize:12, fontWeight:600, color:'#1a1f35', margin:0 }}>{h.title||h.name}</p>
                                    <p style={{ fontSize:10, color:'#b0a898', margin:'2px 0 0' }}>{h.date_bs?.str||h.date}</p>
                                </div>
                                <span style={{ fontSize:10, fontWeight:600, padding:'3px 8px', background:'#f0ece5', color:'#7a6e5e', borderRadius:99, whiteSpace:'nowrap' }}>
                                    {d===null?'—':d<0?'Past':`${d}d`}
                                </span>
                            </div>
                        )
                    })}
                </div>
            }
        </div>
    )
}

// ── Upcoming Assignments widget ───────────────────────────────────────────────
function UpcomingWidget({ tasks }) {
    const upcoming = tasks
        .filter(t => !isCompleted(t))
        .sort((a,b) => (getTaskDueDate(a)||'9').localeCompare(getTaskDueDate(b)||'9'))
        .slice(0,5)
    return (
        <div className="white-card" style={{ padding:18, height:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <BookOpen size={14} style={{ color:'#3b6fd4', flexShrink:0 }}/>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#1a1f35', margin:0 }}>Upcoming</h3>
            </div>
            {upcoming.length === 0
                ? <p style={{ fontSize:12, color:'#b0a898' }}>No pending assignments.</p>
                : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {upcoming.map(t => {
                        const due = getTaskDueDate(t)
                        const d   = daysUntil(due)
                        const color = statusColor(t)
                        const bg    = statusBg(t)
                        return (
                            <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontSize:12, fontWeight:600, color:'#1a1f35', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                        {getTaskTitle(t)}
                                    </p>
                                    <p style={{ fontSize:10, color:'#b0a898', margin:'1px 0 0' }}>{due||'No date'}</p>
                                </div>
                                <span style={{ fontSize:10, fontWeight:600, padding:'3px 8px', background:bg, color, borderRadius:99, whiteSpace:'nowrap' }}>
                                    {statusLabel(t)}
                                </span>
                            </div>
                        )
                    })}
                </div>
            }
        </div>
    )
}

// ── Submit Assignment modal ───────────────────────────────────────────────────
function SubmitModal({ task, onClose, onSubmitted }) {
    const [file,    setFile]    = useState(null)
    const [text,    setText]    = useState('')
    const [saving,  setSaving]  = useState(false)
    const [error,   setError]   = useState('')
    const toast = useToast()

    const title = getTaskTitle(task)

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
            const updated = await tasksService.submitAssignment(task.id, fd)
            toast.success('Assignment submitted successfully')
            onSubmitted(updated)
            onClose()
        } catch (err) {
            setError(apiError(err))
        } finally { setSaving(false) }
    }

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:16 }}>
            <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden' }}>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #ece7df' }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:0 }}>Submit Assignment</h3>
                        <p style={{ fontSize:11, color:'#a09080', margin:'2px 0 0' }}>{title}</p>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'#8a7e6e', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                    {error && (
                        <p style={{ fontSize:12, color:'#c0392b', background:'#fde8e8', padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>
                    )}

                    {/* File upload */}
                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'#5a5060', display:'block', marginBottom:5 }}>
                            Upload Solution (PDF, DOCX, DOC, Images)
                        </label>
                        <div style={{ border:'2px dashed #e2dbd0', borderRadius:10, padding:'14px', textAlign:'center', background:'#faf8f5', cursor:'pointer' }}
                            onClick={() => document.getElementById('sub-file').click()}>
                            <input id="sub-file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0]||null)} style={{ display:'none' }}/>
                            {file ? (
                                <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                                    <FileText size={15} style={{ color:'#3b6fd4' }}/>
                                    <span style={{ fontSize:13, color:'#1a1f35', fontWeight:600 }}>{file.name}</span>
                                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'#e05252', padding:2 }}><X size={11}/></button>
                                </div>
                            ) : (
                                <>
                                    <Upload size={18} style={{ color:'#c0b8ae', margin:'0 auto 5px', display:'block' }}/>
                                    <p style={{ fontSize:12, color:'#8a7e6e', margin:0 }}>Click to upload your solution</p>
                                    <p style={{ fontSize:10, color:'#b0a898', margin:'2px 0 0' }}>PDF, DOCX, DOC, JPG, PNG</p>
                                </>
                            )}
                        </div>
                    </div>

                    {/* Text response */}
                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'#5a5060', display:'block', marginBottom:5 }}>
                            Written Response (optional)
                        </label>
                        <textarea
                            value={text}
                            onChange={e => setText(e.target.value)}
                            placeholder="Add any notes or written response for your teacher…"
                            rows={4}
                            style={{ width:'100%', border:'1.5px solid #e2dbd0', borderRadius:9, padding:'9px 12px', fontSize:13, fontFamily:'var(--font-body)', color:'#1a1f35', background:'#faf8f5', outline:'none', resize:'vertical', boxSizing:'border-box' }}
                        />
                    </div>

                    <p style={{ fontSize:11, color:'#b0a898', margin:0 }}>
                        At least one of file or written response is required.
                    </p>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 20px', borderTop:'1px solid #ece7df' }}>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ opacity:saving?0.7:1 }}>
                        {saving ? 'Submitting…' : <><Send size={13}/> Submit</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Assignment tab table ──────────────────────────────────────────────────────
// CHANGED:
//   • Tabs now use status field (not is_completed)
//   • Submit button shown for pending/overdue
//   • NO edit/delete/create — students view-only
//   • Status badge: Pending=Orange, Submitted=Blue, Completed=Green, Overdue=Red
const TABS = [
    { key:'all',       label:'All'       },
    { key:'pending',   label:'Pending'   },
    { key:'submitted', label:'Submitted' },
    { key:'completed', label:'Completed' },
    { key:'overdue',   label:'Overdue'   },
]

function AssignmentTable({ tasks, onSubmit }) {
    const [tab, setTab] = useState('all')

    const filtered = useMemo(() => {
        if (tab === 'all') return tasks
        return tasks.filter(t => t.status === tab)
    }, [tasks, tab])

    function count(key) {
        if (key === 'all') return tasks.length
        return tasks.filter(t => t.status === key).length
    }

    return (
        <div style={{ borderRadius:14, overflow:'hidden' }}>
            <div className="tab-bar">
                {TABS.map(t => (
                    <button key={t.key} className={`tab-btn${tab===t.key?' active':''}`}
                        onClick={() => setTab(t.key)}>
                        {t.label}
                        <span style={{ marginLeft:5, fontSize:11, fontWeight:600, padding:'1px 6px', borderRadius:99,
                            background:tab===t.key?'rgba(26,31,53,0.1)':'rgba(255,255,255,0.15)', color:'inherit' }}>
                            {count(t.key)}
                        </span>
                    </button>
                ))}
            </div>

            <div style={{ background:'#fff', borderRadius:'0 0 14px 14px', border:'1px solid var(--color-cream-border)', borderTop:'none' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding:'36px 20px', textAlign:'center' }}>
                        <p style={{ fontSize:13, color:'#b0a898' }}>No assignments in this category.</p>
                    </div>
                ) : (
                    <div style={{ overflowX:'auto' }}>
                        <table className="task-table">
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft:20, width:32 }}>#</th>
                                    <th>Assignment</th>
                                    <th className="hide-sm">Course</th>
                                    <th className="hide-sm">Due Date</th>
                                    <th>Status</th>
                                    <th style={{ width:100 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t, i) => {
                                    const sb     = { label: t.status ? t.status.charAt(0).toUpperCase()+t.status.slice(1) : 'Pending', color: statusColor(t), bg: statusBg(t) }
                                    const due    = getTaskDueDate(t)
                                    const d      = daysUntil(due)
                                    const canSub = t.status === 'pending' || t.status === 'overdue'
                                    return (
                                        <tr key={t.id}>
                                            <td style={{ paddingLeft:20, color:'#b0a898', fontSize:12 }}>{i+1}</td>
                                            <td>
                                                <p style={{ fontSize:13, fontWeight:600, color:'#1a1f35', margin:0, lineHeight:1.3 }}>
                                                    {getTaskTitle(t)}
                                                </p>
                                                {t.teacher_feedback && (
                                                    <p style={{ fontSize:11, color:'#3b6fd4', margin:'2px 0 0', fontStyle:'italic' }}>
                                                        Feedback: {t.teacher_feedback}
                                                    </p>
                                                )}
                                            </td>
                                            <td className="hide-sm" style={{ fontSize:12, color:'#6a6052' }}>
                                                {t.assignment?.course_name || t.course_name || '—'}
                                            </td>
                                            <td className="hide-sm" style={{ fontSize:12, color: d!==null&&d<0?'#c0392b':'#6a6052' }}>
                                                {due || '—'}
                                                {d !== null && d < 0 && <span style={{ marginLeft:4, fontSize:10, color:'#e05252' }}>({Math.abs(d)}d late)</span>}
                                            </td>
                                            <td>
                                                <span style={{
                                                    fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99,
                                                    background:sb.bg, color:sb.color, whiteSpace:'nowrap',
                                                }}>
                                                    {sb.label}
                                                </span>
                                            </td>
                                            <td>
                                                {/* Submit button — only for pending/overdue */}
                                                {canSub && (
                                                    <button onClick={() => onSubmit(t)}
                                                        style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', fontSize:11, fontWeight:600, background:'#eff3fd', color:'#1e40af', border:'1px solid #bfdbfe', borderRadius:7, cursor:'pointer', whiteSpace:'nowrap' }}>
                                                        <Upload size={11}/> Submit
                                                    </button>
                                                )}
                                                {t.status === 'submitted' && (
                                                    <span style={{ fontSize:11, color:'#1e40af', fontStyle:'italic' }}>Awaiting review</span>
                                                )}
                                                {t.status === 'completed' && (
                                                    <span style={{ fontSize:11, color:'#166534' }}>✓ Approved</span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Main ──────────────────────────────────────────────────────────────────────
export default function StudentDashboard({ user: propUser }) {
    const { user: ctxUser } = useAuth()
    const user = propUser || ctxUser
    const { tasks, loading, error, stats, refetch, setTasks } = useTasks()
    const { data: summary } = useStudentSummary()
    const [submitTask, setSubmitTask] = useState(null)

    function handleSubmitted(updated) {
        setTasks(prev => prev.map(t => t.id === updated.id ? { ...t, ...updated } : t))
    }

    // Use summary from API if available, else fall back to computed stats
    const displayStats = {
        completed: summary?.completed ?? stats.completed,
        submitted: summary?.submitted ?? stats.submitted,
        pending:   summary?.pending   ?? stats.pending,
        overdue:   summary?.overdue   ?? stats.overdue,
    }

    const hour     = new Date().getHours()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:18 }} className="anim-fade-in">

            {/* Banner */}
            <div style={{ background:'var(--color-navy)', borderRadius:14, padding:'22px 26px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, background:'rgba(255,255,255,0.03)', borderRadius:'50%' }}/>
                <div style={{ position:'relative' }}>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', margin:'0 0 3px' }}>{greeting},</p>
                    <h2 style={{ color:'#fff', fontSize:22, fontWeight:800, fontFamily:'var(--font-display)', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
                        {user?.full_name || user?.username} 👋
                    </h2>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', margin:0 }}>
                        {displayStats.pending} pending · {displayStats.submitted} awaiting review · {displayStats.completed} completed
                    </p>
                </div>
            </div>

            {/* 4-state stats */}
            <div className="stat-grid stagger">
                <StatCard label="Completed"       value={displayStats.completed} icon={<CheckCircle2/>}  accent="#3cb87a"/>
                <StatCard label="Submitted"        value={displayStats.submitted} icon={<Send/>}          accent="#3b6fd4"/>
                <StatCard label="Pending"          value={displayStats.pending}   icon={<Clock/>}         accent="#d4a93c"/>
                <StatCard label="Overdue"          value={displayStats.overdue}   icon={<AlertCircle/>}   accent="#e05252"/>
            </div>

            {/* Widgets */}
            <div className="widget-grid">
                <BSCalWidget/>
                <HolidaysWidget/>
                <UpcomingWidget tasks={tasks}/>
            </div>

            {/* Assignment table */}
            {loading ? (
                <div className="white-card" style={{ padding:24 }}><LoadingBlock/></div>
            ) : error ? (
                <ErrorBlock message={error} onRetry={refetch}/>
            ) : (
                <AssignmentTable tasks={tasks} onSubmit={setSubmitTask}/>
            )}

            <DashboardFooter/>

            {/* Submit modal */}
            {submitTask && (
                <SubmitModal
                    task={submitTask}
                    onClose={() => setSubmitTask(null)}
                    onSubmitted={handleSubmitted}
                />
            )}

            {/* NO FAB — students cannot create assignments */}
        </div>
    )
}
