import React, { useState, useMemo } from 'react'
import {
    Star, BookOpen, Clock, CheckCircle2, ClipboardList,
    ChevronLeft, ChevronRight, ChevronDown, Upload, AlertCircle, Send,
    X, FileText, MessageSquare, Paperclip, ArrowUpDown,
} from 'lucide-react'
import { useAuth }                         from '../../hooks/useAuth.js'
import { useTasks, isPending, isOverdue, isRejected, statusLabel, statusBg, statusColor } from '../../hooks/useTasks.js'
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
                <div style={{ width:32, height:32, borderRadius:8, background:`color-mix(in srgb, ${accent} 14%, white)`, display:'flex', alignItems:'center', justifyContent:'center' }}>
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

    // Render-time adjustment (React's recommended pattern) instead of a useEffect,
    // comparing primitive values so it stays correct regardless of upstream memoization.
    const todayKey = todayBS?.year && todayBS?.month ? `${todayBS.year}-${todayBS.month}` : null
    const [syncedKey, setSyncedKey] = useState(todayKey)
    if (todayKey && todayKey !== syncedKey) {
        setSyncedKey(todayKey)
        setCur({ y:todayBS.year, m:todayBS.month })
    }

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
                    if (isToday)                    cls += ' today'
                    if (day.isHoliday || day.isSun) cls += ' holiday'
                    if (day.isSat && !day.isHoliday) cls += ' saturday'
                    
                    // Unified tooltip matching 'Weekend' terminology
                    const hTitle   = day.holidayTitle || (day.isSat || day.isSun ? 'Weekend' : null)
                    
                    // Color overrides: Sunday now groups with holidays/Saturdays
                    const numColor = (day.isHoliday || day.isSun) ? RED_DIM : undefined
                    
                    return (
                        <div key={day.bsKey} className="cal-day-cell" title={hTitle||undefined}>
                            <div className={cls} style={{ flexDirection:'column', gap:0, height:30, width:30, color: isToday?undefined:numColor }}>
                                <span style={{ fontSize:11, lineHeight:1, fontWeight: day.isHoliday||day.isSat||day.isSun?700:400 }}>{day.bsDay}</span>
                                <span style={{ fontSize:7, lineHeight:1, marginTop:1, opacity: isToday?0.6:0.30 }}>{day.adDate.getDate()}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
            {/* Updated Legend with fixed 'Today' blue dot & terminology */}
            <div className="cal-legend" style={{ marginTop:'auto', flexWrap:'wrap', gap:'5px 12px' }}>
                <div className="cal-legend-item"><span className="cal-legend-dot" style={{ background:RED }}/>Holiday/Weekend</div>
                <div className="cal-legend-item"><span className="cal-legend-dot" style={{ background: 'BLUE' }}/>Today</div>
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
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--color-text)', margin:0 }}>Holidays</h3>
                    <p style={{ fontSize:10, color:'var(--color-text-placeholder)', margin:0, marginTop:2 }}>आगामी बिदाहरु</p>
                </div>
            </div>
            {loading ? <LoadingBlock rows={2}/> : holidays.length === 0
                ? <p style={{ fontSize:12, color:'var(--color-text-placeholder)' }}>No upcoming holidays.</p>
                : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {holidays.slice(0,5).map(h => {
                        const d = daysUntil(h.date)
                        return (
                            <div key={h.id||h.date} style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                                <div style={{ minWidth:0, flex:1 }}>
                                    <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text)', margin:0 }}>{h.title||h.name}</p>
                                    <p style={{ fontSize:10, color:'var(--color-text-placeholder)', margin:'2px 0 0' }}>{h.date_bs?.str||h.date}</p>
                                </div>
                                <span style={{ fontSize:10, fontWeight:600, padding:'3px 8px', background:'var(--color-surface-subtle)', color:'var(--color-text-secondary)', borderRadius:99, whiteSpace:'nowrap' }}>
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
    const today = new Date().toISOString().slice(0, 10) // 'YYYY-MM-DD'

    const upcomingOnly = tasks
        .filter(t => isPending(t) && getTaskDueDate(t) && getTaskDueDate(t) >= today)
        .sort((a,b) => getTaskDueDate(a).localeCompare(getTaskDueDate(b)))

    let upcoming = upcomingOnly.slice(0, 5)

    if (upcoming.length < 5) {
        const overdueOnly = tasks
            .filter(isOverdue)
            .sort((a,b) => (getTaskDueDate(a)||'').localeCompare(getTaskDueDate(b)||'')) // oldest due date first = most overdue

        const needed = 5 - upcoming.length
        upcoming = [...upcoming, ...overdueOnly.slice(0, needed)]
    }

    return (
        <div className="white-card" style={{ padding:18, height:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <BookOpen size={14} style={{ color:'#3b6fd4', flexShrink:0 }}/>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--color-text)', margin:0 }}>Upcoming</h3>
            </div>
            {upcoming.length === 0
                ? <p style={{ fontSize:12, color:'var(--color-text-placeholder)' }}>No pending assignments.</p>
                : <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    {upcoming.map(t => {
                        const due = getTaskDueDate(t)
                        const d   = daysUntil(due)
                        const color = statusColor(t)
                        const bg    = statusBg(t)
                        return (
                            <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                        {getTaskTitle(t)}
                                    </p>
                                    <p style={{ fontSize:10, color:'var(--color-text-placeholder)', margin:'1px 0 0' }}>{due||'No date'}</p>
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
            <div style={{ background:'var(--color-surface)', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden' }}>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--color-border)' }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--color-text)', margin:0 }}>Submit Assignment</h3>
                        <p style={{ fontSize:11, color:'var(--color-text-secondary)', margin:'2px 0 0' }}>{title}</p>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'var(--color-text-secondary)', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                    {error && (
                        <p style={{ fontSize:12, color:'var(--color-red)', background:'#fde8e8', padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>
                    )}

                    {/* File upload */}
                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>
                            Upload Solution (PDF, DOCX, DOC, Images)
                        </label>
                        <div style={{ border:'2px dashed var(--color-border)', borderRadius:10, padding:'14px', textAlign:'center', background:'var(--color-surface-subtle)', cursor:'pointer' }}
                            onClick={() => document.getElementById('sub-file').click()}>
                            <input id="sub-file" type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" onChange={e => setFile(e.target.files?.[0]||null)} style={{ display:'none' }}/>
                            {file ? (
                                <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                                    <FileText size={15} style={{ color:'#3b6fd4' }}/>
                                    <span style={{ fontSize:13, color:'var(--color-text)', fontWeight:600 }}>{file.name}</span>
                                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'#e05252', padding:2 }}><X size={11}/></button>
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

                    {/* Text response */}
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
    { key:'rejected',  label:'Rejected'  },
]

function getCourseName(t) {
    return t.assignment?.course_name || t.course_name || 'Uncategorized'
}

function AssignmentTable({ tasks, onSubmit }) {
    const [tab, setTab]           = useState('all')
    const [sortByCourse, setSort] = useState(false)
    const [expandedId, setExpanded] = useState(null)

    const filtered = useMemo(() => {
        const base = tab === 'all' ? tasks : tasks.filter(t => t.status === tab)
        if (!sortByCourse) return base
        return [...base].sort((a, b) => getCourseName(a).localeCompare(getCourseName(b)))
    }, [tasks, tab, sortByCourse])

    function count(key) {
        if (key === 'all') return tasks.length
        return tasks.filter(t => t.status === key).length
    }

    return (
        <div style={{ borderRadius:14, overflow:'hidden' }}>
            <div className="tab-bar" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8 }}>
                <div style={{ display:'flex', flexWrap:'wrap' }}>
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
                <button onClick={() => setSort(s => !s)}
                    style={{
                        display:'flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:600,
                        padding:'6px 12px', borderRadius:8, cursor:'pointer', whiteSpace:'nowrap',
                        background: sortByCourse ? 'rgba(59,111,212,0.12)' : 'transparent',
                        color: sortByCourse ? '#3b6fd4' : 'inherit',
                        border: sortByCourse ? '1px solid rgba(59,111,212,0.3)' : '1px solid rgba(255,255,255,0.15)',
                    }}>
                    <ArrowUpDown size={12}/> Sort by Course
                </button>
            </div>

            <div style={{ background:'var(--color-surface)', borderRadius:'0 0 14px 14px', border:'1px solid var(--color-cream-border)', borderTop:'none' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding:'36px 20px', textAlign:'center' }}>
                        <ClipboardList size={22} style={{ color:'var(--color-text-placeholder)', marginBottom:8 }}/>
                        <p style={{ fontSize:13, color:'var(--color-text-placeholder)', margin:0 }}>No assignments in this category.</p>
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
                                    const sb        = { label: statusLabel(t), color: statusColor(t), bg: statusBg(t) }
                                    const due       = getTaskDueDate(t)
                                    const d         = daysUntil(due)
                                    const canSub    = t.status === 'pending' || t.status === 'overdue' || t.status === 'rejected'
                                    const urgent    = t.status === 'overdue' || t.status === 'rejected'
                                    const isOpen    = expandedId === t.id
                                    const desc      = t.assignment?.description?.trim()
                                    // Attachment support isn't wired up on the backend yet — this renders
                                    // automatically once `assignment.attachment_url` (or similar) is added.
                                    const attachment = t.assignment?.attachment_url || t.assignment?.attachment
                                    const hasDetails = Boolean(desc) || Boolean(attachment)

                                    return (
                                        <React.Fragment key={t.id}>
                                            <tr>
                                                <td style={{ paddingLeft:20, color:'var(--color-text-placeholder)', fontSize:12 }}>{i+1}</td>
                                                <td>
                                                    <div
                                                        onClick={() => hasDetails && setExpanded(isOpen ? null : t.id)}
                                                        style={{ display:'flex', alignItems:'flex-start', gap:6, cursor: hasDetails ? 'pointer' : 'default' }}>
                                                        <div style={{ minWidth:0 }}>
                                                            <p style={{ fontSize:13.5, fontWeight:700, color:'var(--color-text)', margin:0, lineHeight:1.3 }}>
                                                                {getTaskTitle(t)}
                                                            </p>
                                                            {t.teacher_feedback && (
                                                                <div style={{ display:'flex', alignItems:'flex-start', gap:5, marginTop:4, padding:'5px 8px', background:'#eff3fd', borderRadius:7, maxWidth:340 }}>
                                                                    <MessageSquare size={11} style={{ color:'#3b6fd4', marginTop:1, flexShrink:0 }}/>
                                                                    <p style={{ fontSize:11, color:'#2c4d8f', margin:0, lineHeight:1.35 }}>{t.teacher_feedback}</p>
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
                                                <td className="hide-sm" style={{ fontSize:12, color: urgent ? 'var(--color-red)' : 'var(--color-text-secondary)', fontWeight: urgent ? 600 : 400 }}>
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
                                                    {/* Submit / Resubmit button — pending, overdue, or rejected */}
                                                    {canSub && (
                                                        <button onClick={() => onSubmit(t)}
                                                            style={{ display:'flex', alignItems:'center', gap:5, padding:'5px 10px', fontSize:11, fontWeight:600, background: t.status==='rejected' ? '#fde8e8' : '#eff3fd', color: t.status==='rejected' ? '#991b1b' : '#1e40af', border: t.status==='rejected' ? '1px solid #fecaca' : '1px solid #bfdbfe', borderRadius:7, cursor:'pointer', whiteSpace:'nowrap' }}>
                                                            <Upload size={11}/> {t.status === 'rejected' ? 'Resubmit' : 'Submit'}
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
                                            {isOpen && hasDetails && (
                                                <tr>
                                                    <td colSpan={6} style={{ background:'var(--color-surface-subtle)', padding:'12px 20px 16px 52px', borderTop:'1px solid var(--color-border)' }}>
                                                        {desc && (
                                                            <div style={{ marginBottom: attachment ? 10 : 0 }}>
                                                                <p style={{ fontSize:10.5, fontWeight:700, color:'var(--color-text-secondary)', textTransform:'uppercase', letterSpacing:'0.03em', margin:'0 0 4px' }}>
                                                                    Description
                                                                </p>
                                                                <p style={{ fontSize:12.5, color:'#4a4238', margin:0, lineHeight:1.5, whiteSpace:'pre-wrap' }}>
                                                                    {desc}
                                                                </p>
                                                            </div>
                                                        )}
                                                        {attachment && (
                                                            <a href={attachment} target="_blank" rel="noreferrer"
                                                                style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'#3b6fd4', textDecoration:'none' }}>
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
        rejected:  summary?.rejected  ?? tasks.filter(isRejected).length,
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
                    <h2 style={{ color:'var(--color-white)', fontSize:22, fontWeight:800, fontFamily:'var(--font-display)', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
                        {user?.full_name || user?.username} 👋
                    </h2>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', margin:0 }}>
                        {displayStats.pending} pending · {displayStats.submitted} awaiting review · {displayStats.completed} completed
                        {displayStats.rejected > 0 && <> · {displayStats.rejected} rejected</>}
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