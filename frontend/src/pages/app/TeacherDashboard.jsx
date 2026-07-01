    // src/pages/app/TeacherDashboard.jsx
    // CHANGES:
    //  • "Task" → "Assignment" throughout
    //  • Assignment creation form: title, course select, due date, description, file upload (PDF/DOC/DOCX)
    //  • Assignments grouped by course
    //  • Submission approval: Accept / Reject buttons per submission
    //  • Analytics cards: Total Assignments, Total Courses, Submitted, Pending Reviews, Approved
    //  • "X Students Submitted" count inside assignment details

    import React, { useState, useMemo, useEffect, useCallback } from 'react'
    import {
    Plus, Users, AlertTriangle, TrendingUp, Layers,
    ChevronLeft, ChevronRight, FileText, Eye, Clock,
    CheckCircle2, X, Calendar, Upload, BookOpen,
    ClipboardList, BarChart3, ThumbsUp, ThumbsDown,
    Paperclip, RefreshCw,
    } from 'lucide-react'
    import { useToday }       from '../../hooks/useHolidays.js'
    import { useCourseOverview, useStudentRanking, useStudentGroups, useOutliers } from '../../hooks/useAnalytics.js'
    import { DashboardFooter } from '../../components/layout/Footer.jsx'
    import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
    import { useToast }       from '../../context/ToastContext.jsx'
    import { useAuth }        from '../../hooks/useAuth.js'
    import tasksService       from '../../services/tasks.service.js'
    import coursesService     from '../../services/courses.service.js'
    import { apiError }       from '../../utils/helpers.js'
    import { BS_MONTH_NAMES, buildMonthDays, adToBS } from '../../utils/bsCalendar.js'

    const DOW_LABELS = ['S','M','T','W','T','F','S']
    const RED     = '#ef4444'
    const RED_DIM = 'rgba(255,90,90,0.75)'
    const SUN_DIM = 'rgba(255,130,100,0.60)'

    const ALLOWED_TYPES = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const ALLOWED_EXT   = '.pdf,.doc,.docx'

    // ── BS Calendar mini ──────────────────────────────────────────────────────────
    function BSCalWidget() {
    const { today: todayData } = useToday()
    const todayBS = useMemo(() => {
        if (todayData?.today_bs) return todayData.today_bs
        const t = adToBS(new Date()); return { year:t.year, month:t.month, day:t.day }
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

    // ── Assignment creation modal ─────────────────────────────────────────────────
    function NewAssignmentModal({ courses, onClose, onSave }) {
    const [form, setForm] = useState({
        title:'', course:'', due_date:'', submission_time:'23:59', description:'',
    })
    const [file,   setFile]   = useState(null)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    function set(k, v) { setForm(f => ({...f,[k]:v})); setErrors(e => ({...e,[k]:null})) }

    function handleFile(e) {
        const f = e.target.files?.[0]
        if (!f) return
        if (!ALLOWED_TYPES.includes(f.type)) { setErrors(er => ({...er, file:'Only PDF, DOC, DOCX allowed'})); return }
        if (f.size > 20 * 1024 * 1024)       { setErrors(er => ({...er, file:'File must be under 20 MB'})); return }
        setFile(f); setErrors(er => ({...er, file:null}))
    }

    async function handleSubmit() {
        const errs = {}
        if (!form.title.trim())  errs.title   = 'Title is required'
        if (!form.course)        errs.course  = 'Please select a course'
        if (!form.due_date)      errs.due_date = 'Due date is required'
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        try {
        const fd = new FormData()
        Object.entries(form).forEach(([k,v]) => { if(v) fd.append(k, v) })
        if (file) fd.append('file', file)
        await onSave(fd)
        onClose()
        } catch(err) {
        setErrors({ _: err?.response?.data?.detail || 'Failed to create assignment' })
        } finally { setSaving(false) }
    }

    const inp = { border:'1.5px solid #e2dbd0', borderRadius:8, padding:'9px 12px', fontSize:13, fontFamily:'var(--font-body)', color:'#1a1f35', background:'#faf8f5', outline:'none', width:'100%', boxSizing:'border-box' }
    const lbl = { fontSize:11, fontWeight:600, color:'#5a5060', display:'block', marginBottom:5 }

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:'16px' }}>
        <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #ece7df' }}>
            <div>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#1a1f35', margin:0 }}>New Assignment</h3>
                <p style={{ fontSize:11, color:'#a09080', margin:'2px 0 0' }}>Create an assignment for your students</p>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:'#8a7e6e', display:'flex' }}><X size={16}/></button>
            </div>

            {/* Body */}
            <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
            {errors._ && <p style={{ fontSize:12, color:'#e05252', background:'#fde8e8', padding:'8px 12px', borderRadius:8, margin:0 }}>{errors._}</p>}

            <div>
                <label style={lbl}>Assignment Title *</label>
                <input style={inp} value={form.title} onChange={e => set('title',e.target.value)} placeholder="e.g. Database Normalization Assignment"/>
                {errors.title && <p style={{ fontSize:11, color:'#e05252', margin:'4px 0 0' }}>{errors.title}</p>}
            </div>

            <div>
                <label style={lbl}>Course *</label>
                <select style={inp} value={form.course} onChange={e => set('course',e.target.value)}>
                <option value="">Select a course…</option>
                {courses.map(c => <option key={c.id} value={c.id}>{c.title || c.name}</option>)}
                </select>
                {errors.course && <p style={{ fontSize:11, color:'#e05252', margin:'4px 0 0' }}>{errors.course}</p>}
            </div>

            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                <div>
                <label style={lbl}><Calendar size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>Due Date *</label>
                <input type="date" style={inp} value={form.due_date} onChange={e => set('due_date',e.target.value)} min={new Date().toISOString().split('T')[0]}/>
                {errors.due_date && <p style={{ fontSize:11, color:'#e05252', margin:'4px 0 0' }}>{errors.due_date}</p>}
                </div>
                <div>
                <label style={lbl}><Clock size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>Submission Time</label>
                <input type="time" style={inp} value={form.submission_time} onChange={e => set('submission_time',e.target.value)}/>
                </div>
            </div>

            <div>
                <label style={lbl}>Description (optional)</label>
                <textarea style={{ ...inp, resize:'vertical', minHeight:70 }} rows={3} value={form.description} onChange={e => set('description',e.target.value)} placeholder="Assignment instructions, requirements…"/>
            </div>

            <div>
                <label style={lbl}><Paperclip size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>Upload Assignment File (PDF / DOC / DOCX)</label>
                <div style={{ border:'2px dashed #e2dbd0', borderRadius:10, padding:'16px', textAlign:'center', background:'#faf8f5', cursor:'pointer', position:'relative' }}
                onClick={() => document.getElementById('asgn-file-input').click()}>
                <input id="asgn-file-input" type="file" accept={ALLOWED_EXT} onChange={handleFile} style={{ display:'none' }}/>
                {file ? (
                    <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                    <FileText size={16} style={{ color:'#3b6fd4' }}/>
                    <span style={{ fontSize:13, color:'#1a1f35', fontWeight:600 }}>{file.name}</span>
                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'#e05252', padding:2 }}><X size={12}/></button>
                    </div>
                ) : (
                    <>
                    <Upload size={20} style={{ color:'#c0b8ae', margin:'0 auto 6px', display:'block' }}/>
                    <p style={{ fontSize:12, color:'#8a7e6e', margin:0 }}>Click to upload or drag & drop</p>
                    <p style={{ fontSize:11, color:'#b0a898', margin:'3px 0 0' }}>PDF, DOC, DOCX · Max 20 MB</p>
                    </>
                )}
                </div>
                {errors.file && <p style={{ fontSize:11, color:'#e05252', margin:'4px 0 0' }}>{errors.file}</p>}
            </div>
            </div>

            {/* Footer */}
            <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid #ece7df' }}>
            <button onClick={onClose} className="btn-secondary">Cancel</button>
            <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ opacity:saving?0.7:1 }}>
                {saving ? 'Creating…' : 'Create Assignment'}
            </button>
            </div>
        </div>
        </div>
    )
    }

    // ── Submission tracker modal ──────────────────────────────────────────────────
    function SubmissionsModal({ assignment, onClose }) {
    const [subs,    setSubs]    = useState([])
    const [loading, setLoading] = useState(true)
    const toast = useToast()

    useEffect(() => {
        tasksService.getSubmissions(assignment.id)
        .then(d => setSubs(Array.isArray(d) ? d : []))
        .catch(() => {})
        .finally(() => setLoading(false))
    }, [assignment.id])

    async function handleAction(subId, action) {
        try {
        await tasksService.reviewSubmission(subId, action)
        setSubs(prev => prev.map(s => s.id === subId ? { ...s, status: action === 'approve' ? 'approved' : 'rejected' } : s))
        toast.success(action === 'approve' ? 'Submission approved' : 'Submission rejected')
        } catch(err) { toast.error(apiError(err)) }
    }

    const approved = subs.filter(s => s.status === 'approved').length
    const pending  = subs.filter(s => !s.status || s.status === 'pending').length

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:'16px' }}>
        <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:560, maxHeight:'82vh', display:'flex', flexDirection:'column', boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden' }}>

            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #ece7df', flexShrink:0 }}>
            <div>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:0 }}>Submissions</h3>
                <p style={{ fontSize:11, color:'#a09080', margin:'2px 0 0' }}>{assignment.title}</p>
            </div>
            <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:'#8a7e6e', display:'flex' }}><X size={16}/></button>
            </div>

            {/* Summary strip */}
            <div style={{ display:'flex', gap:12, padding:'10px 20px', background:'#faf8f5', borderBottom:'1px solid #ece7df', flexShrink:0, flexWrap:'wrap' }}>
            <span style={{ fontSize:12, color:'#1a1f35', fontWeight:600 }}>
                <span style={{ color:'#3b6fd4' }}>{subs.length}</span> Students Submitted This Assignment
            </span>
            <span style={{ fontSize:11, color:'#3cb87a', fontWeight:600 }}>{approved} Approved</span>
            <span style={{ fontSize:11, color:'#d4a93c', fontWeight:600 }}>{pending} Pending Review</span>
            </div>

            <div style={{ flex:1, overflowY:'auto', padding:'14px 20px' }}>
            {loading ? <LoadingBlock/> : subs.length === 0 ? (
                <p style={{ fontSize:13, color:'#b0a898', textAlign:'center', padding:'24px 0' }}>No submissions yet.</p>
            ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {subs.map(sub => {
                    const status  = sub.status || 'pending'
                    const isPend  = status === 'pending'
                    const isApp   = status === 'approved'
                    const isRej   = status === 'rejected'
                    return (
                    <div key={sub.id} style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', background:'#faf8f5', borderRadius:10, border:'1px solid #ece7df' }}>
                        <div style={{ flex:1, minWidth:0 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#1a1f35', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {sub.student_name || sub.student || 'Student'}
                        </p>
                        <p style={{ fontSize:11, color:'#8a7e6e', margin:'2px 0 0' }}>
                            {sub.file_name || sub.file?.split('/').pop() || 'Submitted file'}
                        </p>
                        <p style={{ fontSize:10, color:'#b0a898', margin:'1px 0 0' }}>
                            {sub.submitted_at ? new Date(sub.submitted_at).toLocaleString() : ''}
                            {sub.is_late && <span style={{ marginLeft:6, color:'#e05252', fontWeight:700 }}>LATE</span>}
                        </p>
                        </div>
                        <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:6, flexShrink:0 }}>
                        {/* Status badge */}
                        <span style={{
                            fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99,
                            background: isApp ? '#e0f7ee' : isRej ? '#fde8e8' : '#fff8e6',
                            color:      isApp ? '#166534' : isRej ? '#c0392b' : '#92400e',
                        }}>
                            {isApp ? '✓ Approved' : isRej ? '✗ Rejected' : '● Pending'}
                        </span>
                        {/* Action buttons — only for pending */}
                        {isPend && (
                            <div style={{ display:'flex', gap:6 }}>
                            <button onClick={() => handleAction(sub.id, 'approve')}
                                style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', fontSize:11, fontWeight:600, background:'#e0f7ee', color:'#166534', border:'1px solid #bbf7d0', borderRadius:7, cursor:'pointer' }}>
                                <ThumbsUp size={11}/> Approve
                            </button>
                            <button onClick={() => handleAction(sub.id, 'reject')}
                                style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 10px', fontSize:11, fontWeight:600, background:'#fde8e8', color:'#c0392b', border:'1px solid #fecaca', borderRadius:7, cursor:'pointer' }}>
                                <ThumbsDown size={11}/> Reject
                            </button>
                            </div>
                        )}
                        </div>
                    </div>
                    )
                })}
                </div>
            )}
            </div>

            <div style={{ padding:'12px 20px', borderTop:'1px solid #ece7df', flexShrink:0 }}>
            <p style={{ fontSize:12, color:'#8a7e6e', margin:0 }}>{subs.length} submission{subs.length !== 1 ? 's' : ''} received</p>
            </div>
        </div>
        </div>
    )
    }

    // ── Analytics stat card ───────────────────────────────────────────────────────
    function ACard({ label, value, icon: Icon, color }) {
    return (
        <div className="stat-box" style={{ borderTop:`3px solid ${color}` }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
            <span className="stat-label" style={{ marginBottom:0 }}>{label}</span>
            <div style={{ width:30, height:30, borderRadius:8, background:`${color}14`, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <Icon size={14} style={{ color }}/>
            </div>
        </div>
        <p className="stat-value" style={{ fontSize:26 }}>{value ?? 0}</p>
        </div>
    )
    }

    // ── Section wrapper ───────────────────────────────────────────────────────────
    function Section({ title, tag, tagColor, tagBg, icon, children, loading, error }) {
    return (
        <div className="white-card overflow-hidden">
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'13px 18px', borderBottom:'1px solid #f0ece4' }}>
            {icon && React.cloneElement(icon, { size:14, style:{ color:tagColor } })}
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

    // ─────────────────────────────────────────────────────────────────────────────
    // MAIN
    // ─────────────────────────────────────────────────────────────────────────────
    export default function TeacherDashboard() {
    const { user }  = useAuth()
    const toast     = useToast()

    const [assignments,   setAssignments]   = useState([])
    const [courses,       setCourses]       = useState([])
    const [loadingAssign, setLoadingAssign] = useState(true)
    const [showNewModal,  setShowNewModal]  = useState(false)
    const [viewSubs,      setViewSubs]      = useState(null)

    const { data:ranking, loading:rkL } = useStudentRanking()
    const { data:groups,  loading:grL, error:grErr } = useStudentGroups()
    const { data:outliers,loading:olL, error:olErr  } = useOutliers()

    const loadData = useCallback(async () => {
        setLoadingAssign(true)
        try {
        const [asgns, crs] = await Promise.all([
            tasksService.getAssignments().catch(() => []),
            coursesService.list().catch(() => []),
        ])
        setAssignments(Array.isArray(asgns) ? asgns : [])
        setCourses(Array.isArray(crs) ? crs : [])
        } finally { setLoadingAssign(false) }
    }, [])

    useEffect(() => { loadData() }, [loadData])

    async function handleCreateAssignment(formData) {
        const created = await tasksService.createAssignment(formData)
        setAssignments(prev => [created, ...prev])
        toast.success('Assignment created')
    }

    async function handleDeleteAssignment(id) {
        try {
        await tasksService.deleteAssignment(id)
        setAssignments(prev => prev.filter(a => a.id !== id))
        toast.success('Assignment deleted')
        } catch(err) { toast.error(apiError(err)) }
    }

    // Group assignments by course
    const grouped = useMemo(() => {
        const map = {}
        assignments.forEach(a => {
        const key = a.course || a.course_id || 'uncategorized'
        const course = courses.find(c => String(c.id) === String(key)) || { id:key, title: a.course_name || 'General', name: a.course_name || 'General' }
        if (!map[key]) map[key] = { course, items:[] }
        map[key].items.push(a)
        })
        return Object.values(map)
    }, [assignments, courses])

    // Analytics
    const totalSubmitted   = assignments.reduce((s,a) => s + (a.submission_count || 0), 0)
    const totalPendingRev  = assignments.reduce((s,a) => s + (a.pending_review_count || 0), 0)
    const totalApproved    = assignments.reduce((s,a) => s + (a.approved_count || 0), 0)

    const hour         = new Date().getHours()
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
    const GRP = {
        'High Performer': { bg:'#e0f7ee', text:'#166534' },
        'Average':        { bg:'#eff3fd', text:'#1e40af' },
        'At-Risk':        { bg:'#fde8e8', text:'#991b1b' },
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }} className="anim-fade-in">

        {/* Banner */}
        <div style={{ background:'var(--color-navy)', borderRadius:14, padding:'24px 28px', position:'relative', overflow:'hidden' }}>
            <div style={{ position:'absolute', top:-30, right:-30, width:150, height:150, background:'rgba(255,255,255,0.03)', borderRadius:'50%' }}/>
            <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
            <div>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', margin:'0 0 3px' }}>{timeGreeting},</p>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:22, color:'#fff', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
                {user?.full_name || user?.username} 🎓
                </h2>
                <p style={{ fontSize:11, color:'rgba(255,255,255,0.28)', margin:0 }}>
                {courses.length} course{courses.length !== 1 ? 's' : ''} · {assignments.length} assignment{assignments.length !== 1 ? 's' : ''}
                </p>
            </div>
            <button onClick={() => setShowNewModal(true)} className="btn-primary"
                style={{ background:'#fff', color:'#1a1f35', padding:'10px 18px', fontSize:13 }}>
                <Plus size={14}/> New Assignment
            </button>
            </div>
        </div>

        {/* Analytics cards */}
        <div className="stat-grid">
            <ACard label="Total Assignments" value={assignments.length}  icon={ClipboardList} color="#1a1f35"/>
            <ACard label="Total Courses"     value={courses.length}      icon={BookOpen}      color="#3b6fd4"/>
            <ACard label="Submitted"         value={totalSubmitted}      icon={Upload}        color="#6d4fc2"/>
            <ACard label="Pending Reviews"   value={totalPendingRev}     icon={Clock}         color="#d4a93c"/>
            <ACard label="Approved"          value={totalApproved}       icon={CheckCircle2}  color="#3cb87a"/>
        </div>

        {/* Assignments grouped by course + Calendar */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 260px', gap:16 }} className="teacher-main-grid">
            <style>{`@media(max-width:820px){.teacher-main-grid{grid-template-columns:1fr !important;}}`}</style>

            <div className="white-card overflow-hidden">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:'1px solid #f0ece4', gap:10, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <ClipboardList size={14} style={{ color:'#3b6fd4' }}/>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'#1a1f35', margin:0 }}>Assignments</h3>
                <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', background:'#eff3fd', color:'#1e40af', borderRadius:99 }}>{assignments.length}</span>
                </div>
                <div style={{ display:'flex', gap:8 }}>
                <button onClick={loadData} style={{ background:'none', border:'1px solid #e2dbd0', borderRadius:8, padding:'6px 10px', cursor:'pointer', color:'#6a6052', display:'flex', alignItems:'center', gap:5, fontSize:12 }}>
                    <RefreshCw size={12}/>
                </button>
                <button onClick={() => setShowNewModal(true)} className="btn-primary" style={{ padding:'7px 13px', fontSize:12 }}>
                    <Plus size={13}/> New Assignment
                </button>
                </div>
            </div>

            <div style={{ padding:'14px 18px' }}>
                {loadingAssign ? <LoadingBlock/> : assignments.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 20px' }}>
                    <ClipboardList size={24} style={{ color:'#d4cec6', margin:'0 auto 10px', display:'block' }}/>
                    <p style={{ fontSize:13, color:'#b0a898', margin:'0 0 14px' }}>No assignments yet. Create your first one!</p>
                    <button onClick={() => setShowNewModal(true)} className="btn-primary"><Plus size={13}/> New Assignment</button>
                </div>
                ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
                    {grouped.map(({ course, items }) => (
                    <div key={course.id}>
                        {/* Course header */}
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:10, paddingBottom:8, borderBottom:'2px solid #f0ece4' }}>
                        <BookOpen size={13} style={{ color:'#3b6fd4', flexShrink:0 }}/>
                        <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'#1a1f35', margin:0 }}>
                            {course.title || course.name}
                        </h4>
                        <span style={{ fontSize:10, fontWeight:600, padding:'2px 7px', background:'#eff3fd', color:'#1e40af', borderRadius:99, marginLeft:'auto' }}>
                            {items.length} assignment{items.length !== 1 ? 's' : ''}
                        </span>
                        </div>
                        {/* Assignments under this course */}
                        <div style={{ display:'flex', flexDirection:'column', gap:8, paddingLeft:8 }}>
                        {items.map(a => {
                            const due    = a.due_date
                            const dDays  = due ? Math.ceil((new Date(due)-new Date()) / 86400000) : null
                            const isLate = dDays !== null && dDays < 0
                            const subCount = a.submission_count || 0
                            return (
                            <div key={a.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', background:'#faf8f5', borderRadius:10, border:'1px solid #ece7df' }}>
                                <div style={{ flex:1, minWidth:0 }}>
                                <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3, flexWrap:'wrap' }}>
                                    <p style={{ fontSize:13, fontWeight:600, color:'#1a1f35', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                    {a.title}
                                    </p>
                                    {a.file && (
                                    <span style={{ fontSize:10, color:'#6d4fc2', background:'#f0e8ff', padding:'1px 6px', borderRadius:99, display:'flex', alignItems:'center', gap:3 }}>
                                        <Paperclip size={9}/> File attached
                                    </span>
                                    )}
                                </div>
                                <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
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
                                    {/* Submission count */}
                                    <span style={{ fontSize:10, color:'#3b6fd4', fontWeight:600, display:'flex', alignItems:'center', gap:3 }}>
                                    <Users size={9}/> {subCount} Student{subCount !== 1 ? 's' : ''} Submitted
                                    </span>
                                </div>
                                </div>
                                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                                <button onClick={() => setViewSubs(a)}
                                    style={{ display:'flex', alignItems:'center', gap:4, padding:'5px 9px', fontSize:11, fontWeight:600, background:'#eff3fd', color:'#1e40af', border:'none', borderRadius:7, cursor:'pointer' }}>
                                    <Eye size={11}/> Submissions
                                </button>
                                <button onClick={() => handleDeleteAssignment(a.id)}
                                    style={{ padding:'5px 8px', background:'#fde8e8', color:'#c0392b', border:'none', borderRadius:7, cursor:'pointer', display:'flex', alignItems:'center' }}>
                                    <X size={11}/>
                                </button>
                                </div>
                            </div>
                            )
                        })}
                        </div>
                    </div>
                    ))}
                </div>
                )}
            </div>
            </div>

            <BSCalWidget/>
        </div>

        {/* Analytics row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="grid-2">
            <Section title="Student Ranking" icon={<TrendingUp/>} tagColor="#d4a93c" loading={rkL}>
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {(ranking||[]).slice(0,6).map((r,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:10, color:'#b0a898', width:16, flexShrink:0 }}>{i+1}.</span>
                    <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'#1a1f35', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.student}</p>
                    <p style={{ fontSize:10, color:'#a09080', margin:0 }}>{r.completed}/{r.total} assignments</p>
                    </div>
                    <span style={{ fontSize:10, fontWeight:700, padding:'2px 6px', borderRadius:99,
                    background:r.completion_rate>=80?'#e0f7ee':r.completion_rate>=50?'#fffbeb':'#fde8e8',
                    color:     r.completion_rate>=80?'#166534':r.completion_rate>=50?'#92400e':'#991b1b' }}>
                    {r.completion_rate}%
                    </span>
                </div>
                ))}
                {!ranking?.length && <p style={{ fontSize:12, color:'#b0a898' }}>No student data yet.</p>}
            </div>
            </Section>

            <Section title="Student Groups" tag="K-Means" tagColor="#6d4fc2" tagBg="#f0e8ff" icon={<Layers/>} loading={grL} error={grErr}>
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
                        <span style={{ fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99, background:gStyle.bg, color:gStyle.text }}>{s.group}</span>
                        </div>
                    )
                    })}
                </div>
                </>
            )}
            </Section>
        </div>

        {/* Outliers */}
        <Section title="Outlier Students" tag="Isolation Forest" tagColor="#e05252" tagBg="#fde8e8" icon={<AlertTriangle/>} loading={olL} error={olErr}>
            {outliers?.outliers && !outliers.outliers.length && (
            <p style={{ fontSize:12, color:'#b0a898' }}>No outliers detected. Great class!</p>
            )}
            {outliers?.outliers && outliers.outliers.length > 0 && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:10 }}>
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

        <DashboardFooter/>

        {showNewModal && (
            <NewAssignmentModal courses={courses} onClose={() => setShowNewModal(false)} onSave={handleCreateAssignment}/>
        )}
        {viewSubs && (
            <SubmissionsModal assignment={viewSubs} onClose={() => setViewSubs(null)}/>
        )}
        </div>
    )
    }
