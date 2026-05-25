import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
    Plus, Users, AlertTriangle, TrendingUp, Layers,
    ChevronLeft, ChevronRight, FileText, Eye, Clock,
    CheckCircle2, X, Calendar,
} from 'lucide-react'
import { useGreeting }    from '../../hooks/useGreeting.js'
import { useCourseOverview, useStudentRanking, useStudentGroups, useOutliers } from '../../hooks/useAnalytics.js'
import { useToday }       from '../../hooks/useHolidays.js'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
import { useToast }       from '../../context/ToastContext.jsx'
import { useAuth }        from '../../hooks/useAuth.js'
import tasksService       from '../../services/tasks.service.js'
import { apiError }       from '../../utils/helpers.js'
import { BS_MONTH_NAMES, buildMonthDays, adToBS } from '../../utils/bsCalendar.js'

const GRP = {
    'High Performer': { bg:'#e0f7ee', text:'#166534' },
    'Average':        { bg:'#eff3fd', text:'#1e40af' },
    'At-Risk':        { bg:'#fde8e8', text:'#991b1b' },
}

const DOW_LABELS = ['S','M','T','W','T','F','S']
const RED     = '#ef4444'
const RED_DIM = 'rgba(255,90,90,0.75)'
const SUN_DIM = 'rgba(255,130,100,0.60)'

// ─────────────────────────────────────────────────────────────
// BS Calendar mini widget
// ─────────────────────────────────────────────────────────────
function BSCalWidget() {
    const { today: todayData } = useToday()
    const todayBS = useMemo(() => {
        if (todayData?.today_bs) return todayData.today_bs
        const t = adToBS(new Date())
        return { year:t.year, month:t.month, day:t.day }
    }, [todayData])
    const [cur, setCur] = useState(() => { const t=adToBS(new Date()); return {y:t.year,m:t.month} })
    useEffect(() => { if(todayBS?.year&&todayBS?.month) setCur({y:todayBS.year,m:todayBS.month}) }, [todayBS?.year,todayBS?.month])
    const prev = () => setCur(c => c.m===1  ? {y:c.y-1,m:12} : {y:c.y,m:c.m-1})
    const next = () => setCur(c => c.m===12 ? {y:c.y+1,m:1 } : {y:c.y,m:c.m+1})
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
                {DOW_LABELS.map((d,i) => <div key={i} className="cal-dow" style={{ color: i===6?RED_DIM:i===0?SUN_DIM:undefined }}>{d}</div>)}
                {Array(firstDow).fill(null).map((_,i)=><div key={`b${i}`}/>)}
                {days.map(day => {
                    const isToday = todayBS && day.bsDay===todayBS.day && cur.m===todayBS.month && cur.y===todayBS.year
                    let cls = 'cal-day'
                    if (isToday) cls += ' today'
                    if (day.isHoliday) cls += ' holiday'
                    if (day.isSat && !day.isHoliday) cls += ' saturday'
                    const hTitle   = day.holidayTitle || (day.isSat ? 'Saturday — Holiday' : null)
                    const numColor = day.isHoliday ? RED_DIM : day.isSun ? SUN_DIM : undefined
                    return (
                        <div key={day.bsKey} className="cal-day-cell" title={hTitle||undefined}>
                            <div className={cls} style={{ flexDirection:'column', gap:0, height:30, width:30, color: isToday?undefined:numColor }}>
                                <span style={{ fontSize:11, lineHeight:1, fontWeight: day.isHoliday||day.isSat?700:400 }}>{day.bsDay}</span>
                                <span style={{ fontSize:7,  lineHeight:1, marginTop:1, opacity: isToday?0.6:0.30 }}>{day.adDate.getDate()}</span>
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

// ─────────────────────────────────────────────────────────────
// Section card
// ─────────────────────────────────────────────────────────────
function Section({ title, tag, tagColor, tagBg, icon, children, loading, error }) {
    return (
        <div className="white-card overflow-hidden">
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'13px 18px', borderBottom:'1px solid #f0ece4' }}>
                {icon && React.cloneElement(icon, { size:14, style:{color:tagColor} })}
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'#1a1f35', margin:0, flex:1 }}>{title}</h3>
                {tag && <span style={{ fontSize:9, fontWeight:700, padding:'2px 7px', background:tagBg, color:tagColor, borderRadius:99 }}>{tag}</span>}
            </div>
            <div style={{ padding:'16px 18px' }}>
                {loading && <LoadingBlock/>}
                {error   && <ErrorBlock message={error}/>}
                {!loading && !error && children}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Assignment creation modal
// ─────────────────────────────────────────────────────────────
function AssignmentModal({ onClose, onSave }) {
    const [form, setForm] = useState({
        title:           '',
        description:     '',
        course:          '',
        due_date:        '',
        submission_time: '23:59',
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    function set(k, v) { setForm(f => ({...f, [k]:v})); setErrors(e => ({...e, [k]:null})) }

    async function handleSubmit() {
        const errs = {}
        if (!form.title.trim())   errs.title    = 'Title is required'
        if (!form.due_date)       errs.due_date  = 'Due date is required'
        if (Object.keys(errs).length) { setErrors(errs); return }

        setSaving(true)
        try {
            await onSave(form)
            onClose()
        } catch(err) {
            setErrors({ _: err?.response?.data?.detail || 'Failed to create assignment' })
        } finally {
            setSaving(false)
        }
    }

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:'16px' }}>
            <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden' }}>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #ece7df' }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#1a1f35', margin:0 }}>New Assignment</h3>
                        <p style={{ fontSize:11, color:'#a09080', margin:'2px 0 0' }}>Create a new assignment for your students</p>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:'#8a7e6e', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
                    {errors._ && (
                        <p style={{ fontSize:12, color:'#e05252', background:'#fde8e8', padding:'8px 12px', borderRadius:8, margin:0 }}>{errors._}</p>
                    )}

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'#5a5060', display:'block', marginBottom:5 }}>Title *</label>
                        <input
                            className={`form-input${errors.title ? ' error' : ''}`}
                            value={form.title}
                            onChange={e => set('title', e.target.value)}
                            placeholder="Assignment title"
                        />
                        {errors.title && <p style={{ fontSize:11, color:'#e05252', margin:'4px 0 0' }}>{errors.title}</p>}
                    </div>

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'#5a5060', display:'block', marginBottom:5 }}>Description</label>
                        <textarea
                            className="form-input"
                            value={form.description}
                            onChange={e => set('description', e.target.value)}
                            placeholder="Assignment instructions…"
                            rows={3}
                            style={{ resize:'vertical', minHeight:70 }}
                        />
                    </div>

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'#5a5060', display:'block', marginBottom:5 }}>Course / Subject</label>
                        <input
                            className="form-input"
                            value={form.course}
                            onChange={e => set('course', e.target.value)}
                            placeholder="e.g. Mathematics, Science"
                        />
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div>
                            <label style={{ fontSize:11, fontWeight:600, color:'#5a5060', display:'block', marginBottom:5 }}>
                                <Calendar size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>
                                Due Date *
                            </label>
                            <input
                                type="date"
                                className={`form-input${errors.due_date ? ' error' : ''}`}
                                value={form.due_date}
                                onChange={e => set('due_date', e.target.value)}
                                min={new Date().toISOString().split('T')[0]}
                            />
                            {errors.due_date && <p style={{ fontSize:11, color:'#e05252', margin:'4px 0 0' }}>{errors.due_date}</p>}
                        </div>

                        <div>
                            <label style={{ fontSize:11, fontWeight:600, color:'#5a5060', display:'block', marginBottom:5 }}>
                                <Clock size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>
                                Submission Time
                            </label>
                            <input
                                type="time"
                                className="form-input"
                                value={form.submission_time}
                                onChange={e => set('submission_time', e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid #ece7df' }}>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ opacity: saving?0.7:1 }}>
                        {saving ? 'Creating…' : 'Create Assignment'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Submission tracker for one assignment
// ─────────────────────────────────────────────────────────────
function SubmissionTracker({ assignment, onClose }) {
    const [subs,    setSubs]    = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        tasksService.getSubmissions(assignment.id)
            .then(d => setSubs(Array.isArray(d) ? d : []))
            .catch(() => {})
            .finally(() => setLoading(false))
    }, [assignment.id])

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:'16px' }}>
            <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'80vh', display:'flex', flexDirection:'column', boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden' }}>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #ece7df', flexShrink:0 }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:0 }}>Submissions</h3>
                        <p style={{ fontSize:11, color:'#a09080', margin:'2px 0 0' }}>{assignment.title}</p>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:'#8a7e6e', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ flex:1, overflowY:'auto', padding:'16px 20px' }}>
                    {loading ? <LoadingBlock/> : subs.length===0 ? (
                        <p style={{ fontSize:13, color:'#b0a898', textAlign:'center', padding:'20px 0' }}>No submissions yet.</p>
                    ) : (
                        <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                            {subs.map(sub => (
                                <div key={sub.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', background:'#faf8f5', borderRadius:10, border:'1px solid #ece7df' }}>
                                    <div style={{ flex:1, minWidth:0 }}>
                                        <p style={{ fontSize:12, fontWeight:600, color:'#1a1f35', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                            {sub.student_name || sub.student || 'Student'}
                                        </p>
                                        <p style={{ fontSize:11, color:'#8a7e6e', margin:'1px 0 0' }}>
                                            {sub.file_name || sub.file?.split('/').pop() || 'file'}
                                        </p>
                                    </div>
                                    <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:2, flexShrink:0 }}>
                                        <span style={{ fontSize:10, color:'#b0a898' }}>{sub.submitted_at ? new Date(sub.submitted_at).toLocaleDateString() : ''}</span>
                                        {sub.is_late ? (
                                            <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', background:'#fde8e8', color:'#c0392b', borderRadius:99 }}>LATE</span>
                                        ) : (
                                            <span style={{ fontSize:9, fontWeight:700, padding:'2px 6px', background:'#e0f7ee', color:'#166534', borderRadius:99 }}>ON TIME</span>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div style={{ padding:'12px 20px', borderTop:'1px solid #ece7df', flexShrink:0 }}>
                    <p style={{ fontSize:12, color:'#8a7e6e', margin:0 }}>{subs.length} submission{subs.length!==1?'s':''} received</p>
                </div>
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────
export default function TeacherDashboard() {
    const { user }  = useAuth()
    const toast     = useToast()

    const [assignments,    setAssignments]    = useState([])
    const [loadingAssign,  setLoadingAssign]  = useState(true)
    const [showNewModal,   setShowNewModal]   = useState(false)
    const [viewSubs,       setViewSubs]       = useState(null)

    const { data:overview, loading:ovL } = useCourseOverview()
    const { data:ranking,  loading:rkL } = useStudentRanking()
    const { data:groups,   loading:grL, error:grErr } = useStudentGroups()
    const { data:outliers, loading:olL, error:olErr } = useOutliers()

    const loadAssignments = useCallback(() => {
        setLoadingAssign(true)
        tasksService.getAssignments()
            .then(d => setAssignments(Array.isArray(d) ? d : []))
            .catch(() => {})
            .finally(() => setLoadingAssign(false))
    }, [])

    useEffect(() => { loadAssignments() }, [loadAssignments])

    async function handleCreateAssignment(formData) {
        const created = await tasksService.createAssignment(formData)
        setAssignments(prev => [created, ...prev])
        toast.success('Assignment created')
    }

    async function handleDeleteAssignment(id) {
        try {
            await tasksService.deleteAssignment(id)
            setAssignments(prev => prev.filter(a => a.id!==id))
            toast.success('Assignment deleted')
        } catch(err) { toast.error(apiError(err)) }
    }

    const totalStudents = ranking?.length ?? 0
    const atRisk        = groups?.students?.filter(s => s.group==='At-Risk').length ?? 0
    const avgRate       = ranking?.length
        ? Math.round(ranking.reduce((s,r) => s+r.completion_rate, 0) / ranking.length) : 0

    const hour         = new Date().getHours()
    const timeGreeting = hour<12 ? 'Good morning' : hour<17 ? 'Good afternoon' : 'Good evening'

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }} className="anim-fade-in">

            <div style={{ background:'var(--color-navy)', borderRadius:14, padding:'24px 28px', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-30, right:-30, width:150, height:150, background:'rgba(255,255,255,0.03)', borderRadius:'50%' }} aria-hidden="true"/>
                <div style={{ position:'absolute', bottom:-20, left:60, width:80, height:80, background:'rgba(255,255,255,0.02)', borderRadius:'50%' }} aria-hidden="true"/>
                <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
                    <div>
                        <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', margin:'0 0 3px', fontFamily:'var(--font-body)' }}>
                            {timeGreeting},
                        </p>
                        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'#fff', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
                            {user?.full_name || user?.username} 🎓
                        </h2>
                        <p style={{ fontSize:11, color:'rgba(255,255,255,0.28)', margin:0 }}>
                            Class average completion: {avgRate}%
                        </p>
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <div style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 18px', textAlign:'center' }}>
                            <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'#fff', margin:0, lineHeight:1 }}>{avgRate}%</p>
                            <p style={{ fontSize:10, color:'rgba(255,255,255,0.30)', margin:'2px 0 0' }}>Class Avg</p>
                        </div>
                        <div style={{ background:'rgba(255,255,255,0.08)', border:'1px solid rgba(255,255,255,0.08)', borderRadius:10, padding:'10px 18px', textAlign:'center' }}>
                            <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'#fff', margin:0, lineHeight:1 }}>{totalStudents}</p>
                            <p style={{ fontSize:10, color:'rgba(255,255,255,0.30)', margin:'2px 0 0' }}>Students</p>
                        </div>
                        {atRisk > 0 && (
                            <div style={{ background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.25)', borderRadius:10, padding:'10px 18px', textAlign:'center' }}>
                                <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'#ef4444', margin:0, lineHeight:1 }}>{atRisk}</p>
                                <p style={{ fontSize:10, color:'rgba(239,68,68,0.60)', margin:'2px 0 0' }}>At-Risk</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            <div className="stat-grid">
                {[
                    { label:'Assignments', value:assignments.length, accent:'#1a1f35' },
                    { label:'Students',    value:totalStudents,      accent:'#3b6fd4' },
                    { label:'Class Avg',   value:`${avgRate}%`,      accent:'#3cb87a' },
                    { label:'At-Risk',     value:atRisk,             accent:'#e05252' },
                ].map(s => (
                    <div key={s.label} className="stat-box" style={{ borderTop:`3px solid ${s.accent}` }}>
                        <span className="stat-label">{s.label}</span>
                        <p className="stat-value">{s.value}</p>
                    </div>
                ))}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }} className="teacher-main-grid">
                <style>{`@media(max-width:820px){.teacher-main-grid{grid-template-columns:1fr !important;}}`}</style>

                <div className="white-card overflow-hidden">
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:'1px solid #f0ece4', gap:10, flexWrap:'wrap' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                            <FileText size={14} style={{ color:'#3b6fd4' }}/>
                            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'#1a1f35', margin:0 }}>Assignments</h3>
                            <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', background:'#eff3fd', color:'#1e40af', borderRadius:99 }}>{assignments.length}</span>
                        </div>
                        <button onClick={() => setShowNewModal(true)} className="btn-primary" style={{ padding:'7px 13px', fontSize:12 }}>
                            <Plus size={13}/> New Assignment
                        </button>
                    </div>

                    <div style={{ padding:'14px 18px' }}>
                        {loadingAssign ? <LoadingBlock/> : assignments.length===0 ? (
                            <div style={{ textAlign:'center', padding:'32px 20px' }}>
                                <FileText size={24} style={{ color:'#d4cec6', margin:'0 auto 10px' }}/>
                                <p style={{ fontSize:13, color:'#b0a898', margin:0 }}>No assignments yet. Create your first one!</p>
                            </div>
                        ) : (
                            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                                {assignments.map(a => {
                                    const due    = a.due_date
                                    const dDays  = due ? Math.ceil((new Date(due)-new Date()) / 86400000) : null
                                    const isLate = dDays !== null && dDays < 0
                                    return (
                                        <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', background:'#faf8f5', borderRadius:10, border:'1px solid #ece7df' }}>
                                            <div style={{ flex:1, minWidth:0 }}>
                                                <p style={{ fontSize:13, fontWeight:600, color:'#1a1f35', margin:'0 0 2px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                    {a.title}
                                                </p>
                                                {a.course && <p style={{ fontSize:11, color:'#8a7e6e', margin:0 }}>{a.course}</p>}
                                                <div style={{ display:'flex', alignItems:'center', gap:10, marginTop:6, flexWrap:'wrap' }}>
                                                    {due && (
                                                        <span style={{ fontSize:10, color: isLate?'#c0392b':'#8a7e6e', display:'flex', alignItems:'center', gap:3 }}>
                                                            <Calendar size={9}/> {due}{isLate && ' (past)'}
                                                        </span>
                                                    )}
                                                    {a.submission_time && (
                                                        <span style={{ fontSize:10, color:'#8a7e6e', display:'flex', alignItems:'center', gap:3 }}>
                                                            <Clock size={9}/> by {a.submission_time}
                                                        </span>
                                                    )}
                                                </div>
                                            </div>
                                            <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                                                <button
                                                    onClick={() => setViewSubs(a)}
                                                    style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', fontSize:11, fontWeight:600, background:'#eff3fd', color:'#1e40af', border:'none', borderRadius:7, cursor:'pointer' }}
                                                >
                                                    <Eye size={11}/> Submissions
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteAssignment(a.id)}
                                                    style={{ padding:'5px 8px', background:'#fde8e8', color:'#c0392b', border:'none', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center' }}
                                                >
                                                    <X size={11}/>
                                                </button>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        )}
                    </div>
                </div>

                <BSCalWidget/>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="grid-2">
                <Section title="Course Overview" icon={<TrendingUp/>} tagColor="#3b6fd4" loading={ovL}>
                    {overview?.length ? (
                        <div style={{ overflowX:'auto' }}>
                            <table className="task-table">
                                <thead><tr><th>Course</th><th>Students</th><th>Completion</th></tr></thead>
                                <tbody>
                                    {overview.map((c,i) => (
                                        <tr key={i}>
                                            <td style={{ fontWeight:600, fontSize:12 }}>{c.course}</td>
                                            <td style={{ fontSize:12 }}>{c.student_count}</td>
                                            <td>
                                                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                                                    <div className="progress-bar-track" style={{ width:60 }}>
                                                        <div className="progress-bar-fill" style={{ width:`${c.completion_rate}%`, background:'#1a1f35' }}/>
                                                    </div>
                                                    <span style={{ fontSize:11, fontWeight:700, color:'#1a1f35' }}>{c.completion_rate}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : <p style={{ fontSize:12, color:'#b0a898' }}>No course data yet.</p>}
                </Section>

                <Section title="Student Ranking" icon={<TrendingUp/>} tagColor="#d4a93c" loading={rkL}>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        {(ranking||[]).slice(0,6).map((r,i) => (
                            <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                                <span style={{ fontSize:10, color:'#b0a898', width:16, flexShrink:0 }}>{i+1}.</span>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontSize:12, fontWeight:600, color:'#1a1f35', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.student}</p>
                                    <p style={{ fontSize:10, color:'#a09080', margin:0 }}>{r.completed}/{r.total} tasks</p>
                                </div>
                                <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:99, background:r.completion_rate>=80?'#e0f7ee':r.completion_rate>=50?'#fffbeb':'#fde8e8', color:r.completion_rate>=80?'#166534':r.completion_rate>=50?'#92400e':'#991b1b' }}>
                                    {r.completion_rate}%
                                </span>
                            </div>
                        ))}
                        {!ranking?.length && <p style={{ fontSize:12, color:'#b0a898' }}>No student data yet.</p>}
                    </div>
                </Section>
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="grid-2">
                <Section title="Student Groups" tag="K-Means" tagColor="#6d4fc2" tagBg="#f0e8ff" icon={<Layers/>} loading={grL} error={grErr}>
                    {groups?.error && <p style={{ fontSize:12, color:'#b0a898' }}>{groups.error}</p>}
                    {groups?.students && (
                        <>
                            <div style={{ display:'flex', gap:6, marginBottom:12, flexWrap:'wrap' }}>
                                {Object.entries(groups.summary||{}).map(([label,count]) => {
                                    const s = GRP[label]||{bg:'#f3f4f6',text:'#374151'}
                                    return <span key={label} style={{ fontSize:11, fontWeight:600, padding:'3px 9px', borderRadius:99, background:s.bg, color:s.text }}>{label}: {count}</span>
                                })}
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:8, maxHeight:200, overflowY:'auto' }}>
                                {groups.students.map((s,i) => {
                                    const gStyle = GRP[s.group]||{bg:'#f3f4f6',text:'#374151'}
                                    return (
                                        <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8 }}>
                                            <p style={{ fontSize:12, color:'#1a1f35', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', flex:1 }}>{s.student_name}</p>
                                            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                                                <span style={{ fontSize:10, color:'#8a7e6e' }}>{Math.round(s.completion_rate*100)}%</span>
                                                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:gStyle.bg, color:gStyle.text }}>{s.group}</span>
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        </>
                    )}
                </Section>

                <Section title="Outlier Students" tag="Isolation Forest" tagColor="#e05252" tagBg="#fde8e8" icon={<AlertTriangle/>} loading={olL} error={olErr}>
                    {outliers?.error && <p style={{ fontSize:12, color:'#b0a898' }}>{outliers.error}</p>}
                    {outliers?.outliers && !outliers.outliers.length && (
                        <p style={{ fontSize:12, color:'#b0a898' }}>No outliers detected. Great class!</p>
                    )}
                    {outliers?.outliers && outliers.outliers.length > 0 && (
                        <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                            {outliers.outliers.map((o,i) => (
                                <div key={i} style={{ padding:'12px 14px', background:'#fde8e8', borderRadius:10, border:'1px solid #fecaca' }}>
                                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4, gap:8 }}>
                                        <p style={{ fontSize:12, fontWeight:700, color:'#1a1f35', margin:0 }}>{o.student_name}</p>
                                        <span style={{ fontSize:9, fontWeight:700, background:'#fca5a5', color:'#7f1d1d', padding:'2px 6px', borderRadius:99 }}>{o.flagged_by}</span>
                                    </div>
                                    <p style={{ fontSize:11, color:'#8a7e6e', margin:'0 0 4px' }}>{o.reason}</p>
                                    <div style={{ display:'flex', gap:12 }}>
                                        <span style={{ fontSize:10, color:'#b0a898' }}>Rate: {o.completion_rate}%</span>
                                        <span style={{ fontSize:10, color:'#b0a898' }}>Overdue: {o.overdue_count}</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </Section>
            </div>

            <DashboardFooter/>

            {showNewModal && (
                <AssignmentModal
                    onClose={() => setShowNewModal(false)}
                    onSave={handleCreateAssignment}
                />
            )}

            {viewSubs && (
                <SubmissionTracker
                    assignment={viewSubs}
                    onClose={() => setViewSubs(null)}
                />
            )}
        </div>
    )
}