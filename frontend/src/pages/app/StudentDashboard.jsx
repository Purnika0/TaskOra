import React, { useState, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
    Star, BookOpen, Clock, CheckCircle2, ClipboardList, XCircle,
    ChevronLeft, ChevronRight, ChevronDown, Upload, AlertCircle, Send,
    X, FileText, MessageSquare, Paperclip, Pencil, Circle, Download, Users, Calendar,
} from 'lucide-react'
import { useAuth }                         from '../../hooks/useAuth.js'
import { useTasks, isPending, isRejected, statusLabel, statusBg, statusColor } from '../../hooks/useTasks.js'
import { useStudentSummary }               from '../../hooks/useAnalytics.js'
import { useUpcomingHolidays, useToday }   from '../../hooks/useHolidays.js'
import { DashboardFooter }                 from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock }        from '../../components/shared/Loader.jsx'
import { useToast }                        from '../../context/ToastContext.jsx'
import tasksService                        from '../../services/tasks.service.js'
import { getTaskTitle, getTaskDueDate, daysUntil, apiError, priorityColor, priorityLabel, nepalNow, nepalHour, todayNepalISO } from '../../utils/helpers.js'
import { urgencyLabel, urgencyColor } from '../../utils/urgencyLabel.js'
import { TASK_TYPES } from '../../constants/assignmentChoices.js'
import { BS_MONTH_NAMES, buildMonthDays, adToBS }            from '../../utils/bsCalendar.js'

const DOW_LABELS = ['S','M','T','W','T','F','S']

// Dashboard is a quick-glance summary, not the full assignments workspace —
// only show a handful of rows here; the rest live on the dedicated
// Assignments page (/app/assignments), linked to below the table.
const DASHBOARD_ROW_LIMIT = 5

// ── Convert a plain AD 'YYYY-MM-DD' date string to a short BS date string
// (e.g. "15 Shrawan 2083"), interpreted in Nepal local time (+05:45) —
// same convention as BSCalWidget below — so every date shown on this
// dashboard (calendar grid, holidays, upcoming assignments) reads in the
// same Nepali/BS format instead of mixing BS and raw AD strings.
function formatBSDate(iso) {
    if (!iso) return 'No date'
    const bs = adToBS(new Date(`${iso}T00:00:00+05:45`))
    const monthName = BS_MONTH_NAMES[bs.month - 1]
    return `${bs.day} ${monthName?.en || ''} ${bs.year}`
}

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

// ── BS Calendar widget — compact companion to the full Calendar page ─────────
function BSCalWidget({ tasks }) {
    const { today: todayData } = useToday()
    const todayBS = useMemo(() => {
        if (todayData?.today_bs) return todayData.today_bs
        const t = adToBS(nepalNow()); return { year:t.year, month:t.month, day:t.day }
    }, [todayData])
    const [cur, setCur] = useState(() => { const t = adToBS(nepalNow()); return { y:t.year, m:t.month } })

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

    // Assignment due dates → AD ISO date set, so the calendar can mark them
    const dueDateSet = useMemo(() => {
        const set = new Set()
        ;(tasks || []).forEach(t => {
            const due = getTaskDueDate(t)
            if (due) set.add(due)
        })
        return set
    }, [tasks])

    return (
        <div className="cal-card" style={{ display:'flex', flexDirection:'column' }}>
            <div className="cal-header">
                <button className="cal-nav" onClick={prev} aria-label="Previous month"><ChevronLeft size={12}/></button>
                <div style={{ textAlign:'center' }}>
                    <div className="cal-month-title">{bsMonthName?.en} {cur.y}</div>
                    <div style={{ fontSize:9, color:'var(--color-text-placeholder)', marginBottom:4 }}>{bsMonthName?.ne} · BS</div>
                </div>
                <button className="cal-nav" onClick={next} aria-label="Next month"><ChevronRight size={12}/></button>
            </div>
            <div className="cal-grid">
                {DOW_LABELS.map((d,i) => (
                    <div key={i} className="cal-dow">{d}</div>
                ))}
                {Array(firstDow).fill(null).map((_,i) => <div key={`b${i}`}/>)}
                {days.map(day => {
                    const isToday = todayBS && day.bsDay===todayBS.day && cur.m===todayBS.month && cur.y===todayBS.year
                    const hasAssignment = dueDateSet.has(day.adISO)

                    let cls = 'cal-day'
                    if (isToday)         cls += ' today'
                    if (day.isHoliday)   cls += ' holiday'
                    if (hasAssignment)   cls += ' has-assignment'

                    const hTitle = day.holidayTitle || (day.isSat || day.isSun ? 'Weekend' : null)
                    const label  = `${day.bsDay}${hTitle ? ' — ' + hTitle : ''}${hasAssignment ? ' — assignment due' : ''}`

                    return (
                        <div key={day.bsKey} className="cal-day-cell" title={hTitle || undefined}>
                            <div className={cls} style={{ width:30, height:30 }} aria-label={label}>
                                <span style={{ fontSize:11, lineHeight:1 }}>{day.bsDay}</span>
                                <span style={{ fontSize:7, lineHeight:1, marginTop:1, opacity: isToday?0.75:0.45 }}>{day.adDate.getDate()}</span>
                            </div>
                        </div>
                    )
                })}
            </div>
            <div className="cal-legend" style={{ marginTop:'auto' }}>
                <div className="cal-legend-item"><span className="cal-legend-dot" style={{ background:'#DC2626' }}/>Holiday/Weekend</div>
                <div className="cal-legend-item"><span className="cal-legend-dot" style={{ background:'var(--color-primary)' }}/>Today</div>
                <div className="cal-legend-item"><span className="cal-legend-dot" style={{ width:6, height:6, background:'var(--color-primary)' }}/>Assignment due</div>
            </div>
        </div>
    )
}

// ── Holidays widget ───────────────────────────────────────────────────────────
function HolidaysWidget() {
    const { holidays, loading } = useUpcomingHolidays()

    // Only holidays falling within the next 30 days, soonest first
    const upcoming = useMemo(() => {
        return (holidays || [])
            .filter(h => { const d = daysUntil(h.date); return d !== null && d >= 0 && d <= 30 })
            .sort((a,b) => (a.date||'').localeCompare(b.date||''))
            .slice(0, 5)
    }, [holidays])

    return (
        <div className="white-card" style={{ padding:18, display:'flex', flexDirection:'column', height:'100%' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
                <Star size={14} style={{ color:'var(--color-amber)', flexShrink:0 }}/>
                <div>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--color-text)', margin:0 }}>Holidays</h3>
                    <p style={{ fontSize:10, color:'var(--color-text-placeholder)', margin:0, marginTop:2 }}>Next 30 days</p>
                </div>
            </div>
            {loading ? <LoadingBlock rows={2}/> : upcoming.length === 0
                ? <p style={{ fontSize:12, color:'var(--color-text-placeholder)' }}>No holidays.</p>
                : <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {upcoming.map(h => {
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
    const today = todayNepalISO() // 'YYYY-MM-DD', Nepal local

    const upcoming = tasks
        .filter(t => isPending(t) && getTaskDueDate(t) && getTaskDueDate(t) >= today)
        .sort((a,b) => getTaskDueDate(a).localeCompare(getTaskDueDate(b)))
        .slice(0, 5)

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
                        const color = statusColor(t)
                        const bg    = statusBg(t)
                        return (
                            <div key={t.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontSize:12, fontWeight:600, color:'var(--color-text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                        {getTaskTitle(t)}
                                    </p>
                                    <p style={{ fontSize:10, color:'var(--color-text-placeholder)', margin:'1px 0 0' }}>{formatBSDate(due)}</p>
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

// ── Submit / Edit Assignment modal ────────────────────────────────────────────
function SubmitModal({ task, onClose, onSubmitted }) {
    const isEdit = task.status === 'submitted'
    const isResubmit = task.status === 'rejected'
    const [file,    setFile]    = useState(null)
    const [text,    setText]    = useState(isEdit ? (task.submission_text || '') : '')
    const [saving,  setSaving]  = useState(false)
    const [error,   setError]   = useState('')
    const toast = useToast()

    const title = getTaskTitle(task)
    const modalTitle  = isEdit ? 'Edit Submission' : isResubmit ? 'Resubmit Assignment' : 'Submit Assignment'
    const actionLabel = isEdit ? 'Save Changes' : isResubmit ? 'Resubmit' : 'Submit'

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
            toast.success(isEdit ? 'Submission updated successfully' : 'Assignment submitted successfully')
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
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--color-text)', margin:0 }}>{modalTitle}</h3>
                        <p style={{ fontSize:11, color:'var(--color-text-secondary)', margin:'2px 0 0' }}>{title}</p>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'var(--color-text-secondary)', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:14 }}>
                    {error && (
                        <p style={{ fontSize:12, color:'var(--color-red)', background:'#fde8e8', padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>
                    )}

                    {task.assignment?.file && (
                        <a href={task.assignment.file} target="_blank" rel="noreferrer" download
                            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'var(--color-primary)', background:'var(--color-primary-light)', padding:'8px 10px', borderRadius:8, textDecoration:'none' }}>
                            <Paperclip size={12}/> Download assignment document: {task.assignment.file_name || 'file'}
                        </a>
                    )}

                    {isEdit && task.submission_file && !file && (
                        <a href={task.submission_file} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'var(--color-primary)', textDecoration:'none' }}>
                            <Paperclip size={12}/> Current file: {task.file_name || 'view attachment'}
                        </a>
                    )}

                    {/* File upload */}
                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>
                            {isEdit ? 'Replace File (optional)' : 'Upload Solution (PDF, DOCX, DOC, Images)'}
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
                        {saving ? 'Saving…' : <><Send size={13}/> {actionLabel}</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Assignment table — flat list, one row per assignment, no course boxes ─────
// CHANGED:
//   • Assignments are now shown as a single flat list (one line per assignment)
//   • Course/subject shown as an inline badge on each row instead of grouping into columns
//   • Submit button shown for pending/overdue/rejected; edit while submitted
//   • Teacher-uploaded documents show as a downloadable badge on the row
//   • NO create/delete — students view-only over their own tasks
//   • Status badge: Pending=Amber, Submitted=Blue, Completed=Green, Rejected/Overdue=Red
const TABS = [
    { key:'all',       label:'All'       },
    { key:'pending',   label:'Pending'   },
    { key:'submitted', label:'Submitted' },
    { key:'completed', label:'Completed' },
    { key:'rejected',  label:'Rejected'  },
    { key:'overdue',   label:'Overdue'   },
]

const courseSelStyle = {
    padding:'6px 10px', fontSize:11.5, fontWeight:600,
    border:'1px solid var(--color-border)', borderRadius:8,
    background:'var(--color-surface)', color:'var(--color-text-secondary)',
    cursor:'pointer', fontFamily:'var(--font-body)',
}

function getCourseName(t) {
    return t.assignment?.course_name || t.course_name || 'Uncategorized'
}
function getCourseId(t) {
    return t.assignment?.course ?? t.course ?? null
}

// Same title/subtitle as the empty state on the student-facing Assignments
// page (StudentAssignments in AssignmentManagement.jsx), so "no data" reads
// identically in both places.
const EMPTY_STATE_TITLE = 'No assignments found'
const EMPTY_STATE_SUBTITLE = 'No assignments in this category.'

function AssignmentTable({ tasks, onSubmit }) {
    const [tab, setTab]                   = useState('all')
    const [courseFocus, setCourseFocus]   = useState('all')
    const [sortBy, setSortBy]             = useState('due')
    const [expandedId, setExpanded]       = useState(null)

    const courses = useMemo(() => {
        const map = new Map()
        tasks.forEach(t => {
            const id = getCourseId(t)
            if (id != null && !map.has(id)) map.set(id, getCourseName(t))
        })
        return Array.from(map, ([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name))
    }, [tasks])

    const filtered = useMemo(() => {
        let base = tab === 'all' ? tasks : tasks.filter(t => t.status === tab)
        if (courseFocus !== 'all') base = base.filter(t => String(getCourseId(t)) === String(courseFocus))

        base = [...base]
        if (sortBy === 'due') {
            base.sort((a, b) => (getTaskDueDate(a) || '9999-99-99').localeCompare(getTaskDueDate(b) || '9999-99-99'))
        } else if (sortBy === 'due-desc') {
            base.sort((a, b) => (getTaskDueDate(b) || '0000-00-00').localeCompare(getTaskDueDate(a) || '0000-00-00'))
        } else if (sortBy === 'title') {
            base.sort((a, b) => getTaskTitle(a).localeCompare(getTaskTitle(b)))
        } else if (sortBy === 'importance') {
            // Highest importance first (assignment.priority, 1-5, teacher-set)
            base.sort((a, b) => (b.assignment?.priority ?? 0) - (a.assignment?.priority ?? 0))
        } else if (sortBy === 'urgency') {
            // Highest urgency first (priority_score, 0-1, system-computed).
            // Completed tasks sink to the bottom — urgency no longer applies to them.
            base.sort((a, b) => {
                const ua = a.status === 'completed' ? -1 : (a.priority_score ?? 0)
                const ub = b.status === 'completed' ? -1 : (b.priority_score ?? 0)
                return ub - ua
            })
        }

        // On the "All" tab, still-actionable assignments (pending/submitted/
        // rejected/overdue) should surface before completed ones — completed
        // work is done and shouldn't crowd out what still needs attention,
        // especially with the dashboard's 5-row cap. Array.sort is stable,
        // so the sortBy ordering chosen above is preserved within each group.
        if (tab === 'all') {
            base.sort((a, b) => (a.status === 'completed' ? 1 : 0) - (b.status === 'completed' ? 1 : 0))
        }
        return base
    }, [tasks, tab, courseFocus, sortBy])

    function count(key) {
        if (key === 'all') return tasks.length
        return tasks.filter(t => t.status === key).length
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <style>{`
                .at-row-grid {
                    display:grid;
                    grid-template-columns:minmax(170px,1fr) minmax(120px,0.5fr) 100px 100px 120px 100px 120px;
                    align-items:center; column-gap:14px; row-gap:8px;
                }
                .at-row-head span { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:var(--color-text-placeholder); }
                @media (max-width:900px) { .at-row-grid { grid-template-columns:minmax(0,1fr); gap:6px; } .at-row-head { display:none; } }
                .at-view-all { transition:background-color 0.15s ease, gap 0.15s ease; }
                .at-view-all:hover { background:color-mix(in srgb, var(--color-primary) 10%, white) !important; gap:11px; }
                .at-view-all:hover .at-view-all-arrow { background:var(--color-primary); color:#fff; }
                .at-view-all-arrow { transition:background-color 0.15s ease, color 0.15s ease; }
            `}</style>
            <div className="tab-bar" style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:8, borderRadius:14 }}>
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
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={courseSelStyle} aria-label="Sort assignments">
                        <option value="due">Due Date: Earliest First</option>
                        <option value="due-desc">Due Date: Latest First</option>
                        <option value="title">Title (A–Z)</option>
                        <option value="importance">Importance: Highest First</option>
                        <option value="urgency">Urgency: Highest First</option>
                    </select>
                    {courses.length > 0 && (
                        <select value={courseFocus} onChange={e => setCourseFocus(e.target.value)} style={courseSelStyle}>
                            <option value="all">All Subjects</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                    )}
                </div>
            </div>

            <div style={{ background:'var(--color-surface)', borderRadius:14, border:'1px solid var(--color-cream-border)', overflow:'hidden' }}>
                {filtered.length === 0 ? (
                    <div style={{ padding:'36px 20px', textAlign:'center' }}>
                        <div style={{
                            width:44, height:44, borderRadius:'50%', margin:'0 auto 12px',
                            display:'flex', alignItems:'center', justifyContent:'center',
                            background:'color-mix(in srgb, var(--color-text-placeholder) 14%, white)',
                        }}>
                            <ClipboardList size={20} style={{ color:'var(--color-text-placeholder)' }}/>
                        </div>
                        <p style={{ fontSize:13, fontWeight:700, color:'var(--color-text)', margin:'0 0 4px' }}>{EMPTY_STATE_TITLE}</p>
                        <p style={{ fontSize:12, color:'var(--color-text-placeholder)', margin:0 }}>{EMPTY_STATE_SUBTITLE}</p>
                    </div>
                ) : (
                    <div style={{ display:'flex', flexDirection:'column' }}>
                        <div className="at-row-grid at-row-head" style={{ padding:'12px 20px', background:'var(--color-surface-subtle)', borderBottom:'1px solid var(--color-cream-border)' }}>
                            <span>Assignment</span>
                            <span>Course</span>
                            <span>Importance</span>
                            <span>Urgency</span>
                            <span>Due Date</span>
                            <span>Status</span>
                            <span style={{ textAlign:'right' }}>Action</span>
                        </div>
                        {filtered.slice(0, DASHBOARD_ROW_LIMIT).map((t, idx) => {
                            const sb        = { label: statusLabel(t), color: statusColor(t), bg: statusBg(t) }
                            const due       = getTaskDueDate(t)
                            const d         = daysUntil(due)
                            const canSub    = t.status === 'pending' || t.status === 'overdue' || t.status === 'rejected'
                            const canEdit   = t.status === 'submitted'
                            const urgent    = t.status === 'overdue' || t.status === 'rejected'
                            const isOpen    = expandedId === t.id
                            const desc      = t.assignment?.description?.trim()
                            const docFile   = t.assignment?.file
                            const docName   = t.assignment?.file_name || 'Document'
                            // Every assignment always has course/teacher/type/due-date info to
                            // show, so the row is always expandable — matches Assignment Management.
                            const hasDetails = true
                            const courseName = getCourseName(t)
                            const teacherName = t.assignment?.teacher_name || 'Unknown Teacher'
                            const taskTypeLabel = TASK_TYPES.find(tt => tt.value === t.assignment?.task_type)?.label || 'Assignment'
                            const importanceVal = t.assignment?.priority
                            const iColor = priorityColor(importanceVal)
                            const iLabel = priorityLabel(importanceVal)
                            const isDone = t.status === 'completed'
                            const StatusIcon = t.status === 'completed' ? CheckCircle2
                                : t.status === 'rejected' ? XCircle
                                : t.status === 'submitted' ? Clock
                                : t.status === 'overdue'  ? AlertCircle
                                : Circle
                            const uScore = t.priority_score
                            const uColor = isDone ? 'var(--color-text-placeholder)' : urgencyColor(uScore)
                            const uLabel = isDone ? '—' : urgencyLabel(uScore)

                            return (
                                <div key={t.id} style={{ padding:'14px 20px 14px 17px', background: idx % 2 ? 'var(--color-surface-subtle)' : 'var(--color-surface)', borderBottom:'1px solid var(--color-cream-border)', borderLeft: urgent ? `3px solid ${sb.color}` : '3px solid transparent' }}>
                                    <div className="at-row-grid">
                                        <div
                                            onClick={() => hasDetails && setExpanded(isOpen ? null : t.id)}
                                            style={{ display:'flex', alignItems:'center', gap:6, cursor: hasDetails ? 'pointer' : 'default', minWidth:0 }}>
                                            <StatusIcon size={11} style={{ color: t.status === 'pending' ? 'var(--color-text-placeholder)' : sb.color, flexShrink:0 }} aria-label={sb.label} title={sb.label}/>
                                            <p style={{ fontSize:12.5, fontWeight:700, color:'var(--color-text)', margin:0, lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                {getTaskTitle(t)}
                                            </p>
                                            {hasDetails && (
                                                <ChevronDown size={12} style={{ color:'var(--color-text-placeholder)', flexShrink:0, transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }}/>
                                            )}
                                            {docFile && (
                                                <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:16, height:16, borderRadius:5, background:'#efe7fb', flexShrink:0 }}
                                                    aria-label="Document attached" title="Document attached">
                                                    <FileText size={10} style={{ color:'#6d4fc2' }}/>
                                                </span>
                                            )}
                                        </div>

                                        <span style={{ fontSize:11, fontWeight:600, color:'#1e40af', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                            {courseName}
                                        </span>

                                        <div style={{ display:'flex', alignItems:'center', gap:5 }} title="Importance — set by the teacher">
                                            <span style={{ width:6, height:6, borderRadius:'50%', background:iColor, flexShrink:0 }}/>
                                            <span style={{ fontSize:11, fontWeight:700, color:iColor, textTransform:'capitalize' }}>{iLabel}</span>
                                        </div>

                                        <div style={{ display:'flex', alignItems:'center', gap:5 }} title={isDone ? 'No longer relevant — task is completed' : 'Urgency — computed from due date, importance, and workload'}>
                                            {!isDone && <span style={{ width:6, height:6, borderRadius:'50%', background:uColor, flexShrink:0 }}/>}
                                            <span style={{ fontSize:11, fontWeight:700, color:uColor, textTransform:'capitalize' }}>{uLabel}</span>
                                        </div>

                                        <span style={{ fontSize:11.5, color: urgent?'var(--color-red)':'var(--color-text-secondary)', fontWeight: urgent?600:400, whiteSpace:'nowrap' }}>
                                            {formatBSDate(due)}
                                            {urgent && d !== null && d < 0 && <span style={{ display:'block', fontSize:10 }}>({Math.abs(d)}d late)</span>}
                                        </span>

                                        <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 9px', borderRadius:99, background:sb.bg, color:sb.color, whiteSpace:'nowrap', justifySelf:'start' }}>
                                            {sb.label}
                                        </span>

                                        <div style={{ display:'flex', justifyContent:'flex-end' }}>
                                            {(canSub || canEdit) && (
                                                <button onClick={() => onSubmit(t)}
                                                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'6px 12px', fontSize:11, fontWeight:600, whiteSpace:'nowrap',
                                                        background: t.status==='rejected' ? '#fde8e8' : '#eff3fd',
                                                        color:      t.status==='rejected' ? '#991b1b' : '#1e40af',
                                                        border:     t.status==='rejected' ? '1px solid #fecaca' : '1px solid #bfdbfe',
                                                        borderRadius:7, cursor:'pointer' }}>
                                                    {canEdit ? <><Pencil size={11}/> Edit</> : <><Upload size={11}/> {t.status === 'rejected' ? 'Resubmit' : 'Submit'}</>}
                                                </button>
                                            )}
                                            {t.status === 'completed' && (
                                                <span style={{ fontSize:11, fontWeight:600, color:'#166534' }}>✓ Approved</span>
                                            )}
                                        </div>
                                    </div>

                                    {isOpen && hasDetails && (
                                        <div style={{ marginTop:8, padding:'14px 16px', background:'var(--color-surface)', border:'1px solid var(--color-cream-border)', borderRadius:10 }}
                                            className="anim-fade-in">
                                            <p style={{ fontSize:13, fontWeight:700, color:'var(--color-text)', margin:'0 0 10px', lineHeight:1.4 }}>
                                                {getTaskTitle(t)}
                                            </p>

                                            {/* Key facts — course, teacher, type, due date — always shown
                                                regardless of whether a description/file is attached */}
                                            <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginBottom: (desc || docFile || t.teacher_feedback) ? 12 : 0 }}>
                                                <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'#1e40af', background:'#eff3fd', padding:'4px 10px', borderRadius:99 }}>
                                                    <ClipboardList size={11}/> {courseName}
                                                </span>
                                                <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'#4a4238', background:'var(--color-surface-subtle)', border:'1px solid var(--color-cream-border)', padding:'4px 10px', borderRadius:99 }}>
                                                    <Users size={11}/> {teacherName}
                                                </span>
                                                <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'#4a4238', background:'var(--color-surface-subtle)', border:'1px solid var(--color-cream-border)', padding:'4px 10px', borderRadius:99 }}>
                                                    <FileText size={11}/> {taskTypeLabel}
                                                </span>
                                                <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11, fontWeight:600, color:'#4a4238', background:'var(--color-surface-subtle)', border:'1px solid var(--color-cream-border)', padding:'4px 10px', borderRadius:99 }}>
                                                    <Calendar size={11}/> Due {formatBSDate(due)}
                                                </span>
                                            </div>

                                            {desc && (
                                                <div style={{ marginBottom: (docFile || t.teacher_feedback) ? 12 : 0 }}>
                                                    <p style={{ fontSize:10, fontWeight:700, color:'var(--color-text-placeholder)', margin:'0 0 3px', textTransform:'uppercase', letterSpacing:'0.03em' }}>Description</p>
                                                    <p style={{ fontSize:12, color:'#4a4238', margin:0, lineHeight:1.65, whiteSpace:'pre-wrap' }}>
                                                        {desc}
                                                    </p>
                                                </div>
                                            )}

                                            {docFile && (
                                                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:10, padding:'7px 10px', background:'var(--color-surface-subtle)', border:'1px solid var(--color-cream-border)', borderRadius:7, flexWrap:'wrap', marginBottom: t.teacher_feedback ? 12 : 0 }}>
                                                    <span style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:11.5, fontWeight:600, color:'#4a4238', minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                        <span style={{ display:'inline-flex', alignItems:'center', justifyContent:'center', width:22, height:22, borderRadius:6, background:'#efe7fb', flexShrink:0 }}>
                                                            <FileText size={12} style={{ color:'#6d4fc2' }}/>
                                                        </span>
                                                        {docName}
                                                    </span>
                                                    <a href={docFile} target="_blank" rel="noreferrer" download
                                                        style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:700, color:'#fff', background:'var(--color-primary)', padding:'6px 12px', borderRadius:7, textDecoration:'none', flexShrink:0 }}>
                                                        <Download size={12}/> Download
                                                    </a>
                                                </div>
                                            )}

                                            {/* Feedback comes last, after the attachment */}
                                            {t.teacher_feedback && (() => {
                                                const isRejectedFb = t.status === 'rejected'
                                                const isApprovedFb = t.status === 'completed'
                                                const FbIcon = isRejectedFb ? XCircle : isApprovedFb ? CheckCircle2 : MessageSquare
                                                const fbTitle = isRejectedFb ? 'Rejected' : isApprovedFb ? 'Accepted' : 'Feedback'
                                                return (
                                                    <div style={{ padding:'8px 10px', background:sb.bg, borderLeft:`3px solid ${sb.color}`, borderRadius:6 }}>
                                                        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:3 }}>
                                                            <FbIcon size={12} style={{ color:sb.color, flexShrink:0 }}/>
                                                            <span style={{ fontSize:11, fontWeight:700, color:sb.color }}>{fbTitle}</span>
                                                        </div>
                                                        <p style={{ fontSize:11.5, color:'#4a4238', margin:0, lineHeight:1.45 }}>{t.teacher_feedback}</p>
                                                    </div>
                                                )
                                            })()}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {filtered.length > DASHBOARD_ROW_LIMIT && (
                            <Link to="/app/assignments" className="at-view-all"
                                style={{
                                    display:'flex', alignItems:'center', justifyContent:'center', gap:8,
                                    padding:'13px 20px', fontSize:12.5, fontWeight:700, color:'var(--color-primary)',
                                    textDecoration:'none', borderTop:'1px solid var(--color-cream-border)',
                                    background:'color-mix(in srgb, var(--color-primary) 5%, white)',
                                }}>
                                <span>View all {filtered.length} assignments</span>
                                <span className="at-view-all-arrow" style={{
                                    display:'inline-flex', alignItems:'center', justifyContent:'center',
                                    width:20, height:20, borderRadius:'50%',
                                    background:'color-mix(in srgb, var(--color-primary) 16%, white)',
                                }}>
                                    <ChevronRight size={12}/>
                                </span>
                            </Link>
                        )}
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
        total:     stats.total,
        completed: summary?.completed ?? stats.completed,
        submitted: summary?.submitted ?? stats.submitted,
        pending:   summary?.pending   ?? stats.pending,
        overdue:   summary?.overdue   ?? stats.overdue,
        rejected:  summary?.rejected  ?? tasks.filter(isRejected).length,
    }

    const hour     = nepalHour()
    const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:18 }} className="anim-fade-in">

            {/* Banner */}
            <div style={{ background:'var(--color-navy)', borderRadius:14, padding:'22px 26px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, background:'rgba(255,255,255,0.05)', borderRadius:'50%' }}/>
                <div style={{ position:'relative' }}>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.60)', margin:'0 0 3px' }}>{greeting},</p>
                    <h2 style={{ color:'var(--color-white)', fontSize:22, fontWeight:800, fontFamily:'var(--font-display)', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
                        {user?.full_name || user?.username} 📖
                    </h2>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.45)', margin:0 }}>
                        {displayStats.pending} pending · {displayStats.submitted} under review · {displayStats.completed} completed
                        {displayStats.rejected > 0 && <> · {displayStats.rejected} rejected</>}
                    </p>
                </div>
            </div>

            {/* Assignment status stats — Total first, Rejected before Overdue */}
            <div className="stat-grid stagger">
                <StatCard label="Total Assignments" value={displayStats.total}     icon={<ClipboardList/>} accent="#6d4fc2"/>
                <StatCard label="Completed"  value={displayStats.completed} icon={<CheckCircle2/>}  accent="#3cb87a"/>
                <StatCard label="Submitted"  value={displayStats.submitted} icon={<Send/>}          accent="#3b6fd4"/>
                <StatCard label="Pending"    value={displayStats.pending}   icon={<Clock/>}         accent="#d4a93c"/>
                <StatCard label="Rejected"   value={displayStats.rejected}  icon={<XCircle/>}       accent="#e05252"/>
                <StatCard label="Overdue"    value={displayStats.overdue}   icon={<AlertCircle/>}   accent="#e05252"/>
            </div>

            {/* Widgets */}
            <div className="widget-grid">
                <BSCalWidget tasks={tasks}/>
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