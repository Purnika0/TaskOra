// src/pages/app/TeacherDashboard.jsx
    // CHANGES:
    //  • "Task" → "Assignment" throughout
    //  • Assignment creation form: title, course select, due date, description, file upload (PDF/DOC/DOCX)
    //  • Assignments grouped by course
    //  • Submission approval: Accept / Reject buttons per submission
    //  • Analytics cards: Total Assignments, Total Courses, Submitted, Pending Reviews, Approved
    //  • "X Students Submitted" count inside assignment details

    import React, { useState, useMemo, useEffect, useCallback } from 'react'
    import { useNavigate } from 'react-router-dom'
    import {
    Plus, Users, AlertTriangle, TrendingUp, Layers,
    ChevronLeft, ChevronRight, FileText, Eye, Clock,
    CheckCircle2, X, Calendar, Upload, BookOpen,
    ClipboardList, BarChart3, ThumbsUp, ThumbsDown,
    Paperclip, RefreshCw, XCircle, ArrowRight, Trash2
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
    import StudentSubmissionWorkspace from "../../components/teacher/StudentSubmissionWorkspace"

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


// ============================================================================
// Submission Preview Modal
// Place ABOVE SubmissionsModal()
// ============================================================================

function SubmissionPreviewModal({
    submission,
    feedback,
    setFeedback,
    onApprove,
    onReject,
    onClose,
    processing,
}) {
    if (!submission) return null

    const file = submission.submission_file || ""

    const extension = file
        ? file.split(".").pop().toLowerCase()
        : ""

    const isPDF = extension === "pdf"

    const isImage = [
        "png",
        "jpg",
        "jpeg",
        "gif",
        "webp",
        "bmp",
        "svg"
    ].includes(extension)

    const isWord = [
        "doc",
        "docx"
    ].includes(extension)

    return (
        <div
            style={{
                position: "fixed",
                inset: 0,
                zIndex: 10000,
                background: "rgba(0,0,0,.65)",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                padding: 24,
            }}
        >
            <div
                style={{
                    width: "95%",
                    maxWidth: 1400,
                    height: "92vh",
                    background: "#fff",
                    borderRadius: 16,
                    overflow: "hidden",
                    display: "flex",
                    boxShadow: "0 25px 80px rgba(0,0,0,.35)",
                }}
            >

                {/* ================================================= */}
                {/* LEFT SIDE : FILE PREVIEW */}
                {/* ================================================= */}

                <div
                    style={{
                        flex: 2,
                        background: "#f5f5f5",
                        display: "flex",
                        justifyContent: "center",
                        alignItems: "center",
                        overflow: "hidden",
                    }}
                >

                    {/* PDF */}

                    {isPDF && (
                        <iframe
                            src={file}
                            title="Submission"
                            width="100%"
                            height="100%"
                            style={{
                                border: "none",
                                background: "#fff",
                            }}
                        />
                    )}

                    {/* IMAGE */}

                    {isImage && (
                        <img
                            src={file}
                            alt="submission"
                            style={{
                                maxWidth: "100%",
                                maxHeight: "100%",
                                objectFit: "contain",
                            }}
                        />
                    )}

                    {/* WORD */}

                    {isWord && (
                        <div
                            style={{
                                textAlign: "center",
                                padding: 40,
                            }}
                        >
                            <h2
                                style={{
                                    marginBottom: 16,
                                    color: "#1a1f35",
                                }}
                            >
                                Microsoft Word Document
                            </h2>

                            <p
                                style={{
                                    color: "#777",
                                    marginBottom: 25,
                                }}
                            >
                                Word files can't be previewed directly by
                                the browser.
                            </p>

                            <a
                                href={file}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="btn-primary"
                            >
                                Open Document
                            </a>
                        </div>
                    )}

                    {/* NO FILE */}

                    {!file && (
                        <div
                            style={{
                                color: "#888",
                                textAlign: "center",
                            }}
                        >
                            <h2>No file uploaded</h2>

                            <p>
                                This submission contains only text.
                            </p>
                        </div>
                    )}

                    {/* UNKNOWN */}

                    {file &&
                        !isPDF &&
                        !isImage &&
                        !isWord && (
                            <div
                                style={{
                                    textAlign: "center",
                                }}
                            >
                                <h2>
                                    Preview unavailable
                                </h2>

                                <p
                                    style={{
                                        color: "#777",
                                        marginBottom: 20,
                                    }}
                                >
                                    This file type cannot be previewed.
                                </p>

                                <a
                                    href={file}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="btn-primary"
                                >
                                    Download File
                                </a>
                            </div>
                        )}

                </div>

                {/* ================================================= */}
                {/* RIGHT SIDE */}
                {/* ================================================= */}

                <div
                    style={{
                        width: 420,
                        borderLeft: "1px solid #ece7df",
                        display: "flex",
                        flexDirection: "column",
                    }}
                >

                    {/* Header */}

                    <div
                        style={{
                            padding: 20,
                            borderBottom: "1px solid #ece7df",
                        }}
                    >

                        <div
                            style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                            }}
                        >

                            <div>

                                <h2
                                    style={{
                                        margin: 0,
                                        color: "#1a1f35",
                                        fontSize: 18,
                                    }}
                                >
                                    {submission.student_name}
                                </h2>

                                <p
                                    style={{
                                        margin: "6px 0 0",
                                        fontSize: 12,
                                        color: "#777",
                                    }}
                                >
                                    Submitted{" "}
                                    {submission.submitted_at
                                        ? new Date(
                                              submission.submitted_at
                                          ).toLocaleString()
                                        : ""}
                                </p>

                            </div>

                            <button
                                onClick={onClose}
                                style={{
                                    border: "none",
                                    background: "none",
                                    fontSize: 26,
                                    cursor: "pointer",
                                }}
                            >
                                ×
                            </button>

                        </div>

                    </div>

                    {/* Submission Text */}

                    <div
                        style={{
                            padding: 20,
                            overflowY: "auto",
                            flex: 1,
                        }}
                    >

                        {submission.submission_text && (
                            <>
                                <h4
                                    style={{
                                        marginTop: 0,
                                        color: "#1a1f35",
                                    }}
                                >
                                    Student Response
                                </h4>

                                <div
                                    style={{
                                        padding: 14,
                                        borderRadius: 10,
                                        background: "#faf8f5",
                                        border:
                                            "1px solid #ece7df",
                                        whiteSpace: "pre-wrap",
                                        fontSize: 13,
                                        lineHeight: 1.6,
                                    }}
                                >
                                    {submission.submission_text}
                                </div>
                            </>
                        )}

                        <div
                            style={{
                                marginTop: 24,
                            }}
                        >

                            <h4
                                style={{
                                    marginBottom: 10,
                                    color: "#1a1f35",
                                }}
                            >
                                Teacher Feedback
                            </h4>

                            <textarea
                                rows={7}
                                value={feedback}
                                onChange={(e) =>
                                    setFeedback(e.target.value)
                                }
                                placeholder="Write feedback..."
                                style={{
                                    width: "100%",
                                    resize: "vertical",
                                    padding: 12,
                                    borderRadius: 10,
                                    border:
                                        "1px solid #ddd",
                                    fontSize: 13,
                                    boxSizing: "border-box",
                                }}
                            />

                        </div>

                    </div>

                    {/* Footer */}

                    <div
                        style={{
                            padding: 20,
                            borderTop: "1px solid #ece7df",
                            display: "flex",
                            gap: 10,
                        }}
                    >

                        <button
                            onClick={onReject}
                            disabled={processing}
                            style={{
                                flex: 1,
                                padding: "11px",
                                borderRadius: 10,
                                border: "none",
                                background: "#fde8e8",
                                color: "#c0392b",
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            Reject
                        </button>

                        <button
                            onClick={onApprove}
                            disabled={processing}
                            style={{
                                flex: 1,
                                padding: "11px",
                                borderRadius: 10,
                                border: "none",
                                background: "#3cb87a",
                                color: "#fff",
                                fontWeight: 700,
                                cursor: "pointer",
                            }}
                        >
                            {processing
                                ? "Saving..."
                                : "Approve"}
                        </button>

                    </div>

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
    const navigate  = useNavigate()
    const [groupFilter, setGroupFilter] = useState(null) // null = show all

    const [assignments,   setAssignments]   = useState([])
    const [courses,       setCourses]       = useState([])
    const [loadingAssign, setLoadingAssign] = useState(true)
    const [showNewModal,  setShowNewModal]  = useState(false)

    const [selectedAssignment, setSelectedAssignment] = useState(null)

    const { data:ranking, loading:rkL } = useStudentRanking()
    const { data:groups,  loading:grL, error:grErr } = useStudentGroups()
    const { data:outliers,loading:olL, error:olErr  } = useOutliers()

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deletingId, setDeletingId] = useState(null); // tracking loading indicators

    const cancelDelete = () => setDeleteTarget(null);
    const confirmDelete = async () => {
        if (!deleteTarget) return;
        setDeletingId(deleteTarget.id);
        await handleDeleteAssignment(deleteTarget.id);
        setDeletingId(null);
        setDeleteTarget(null);
    };

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
    const totalRejected    = assignments.reduce((s,a) => s + (a.rejected_count || 0), 0)

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
            <ACard label="Rejected"          value={totalRejected}       icon={XCircle}       color="#e05252"/>
        </div>

        {/* Main Layout Container: Responsive wrapper layout */}
        <div style={{ display: 'flex', gap: 16, alignItems: 'flex-start' }} className="courses-calendar-row">
            <style>{`
            /* Custom Scrollbars */
            .assignment-columns-scroll { scrollbar-width: thin; scrollbar-color: #d8d0c4 transparent; }
            .assignment-columns-scroll::-webkit-scrollbar { height: 8px; width: 8px; }
            .assignment-columns-scroll::-webkit-scrollbar-thumb { background: #d8d0c4; border-radius: 99px; }
            .assignment-columns-scroll::-webkit-scrollbar-track { background: transparent; }

            /* Responsive Layout Engine */
            .courses-calendar-row {
                flex-direction: row;
            }
            .courses-grid-container {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
                width: 100%;
            }
            .calendar-wrapper {
                flex: 0 0 260px;
                width: 260px;
            }

            /* Mobile & Tablet Breaks */
            @media (max-width: 900px) {
                .courses-calendar-row {
                    flex-direction: column; /* Fixed: Keeps Courses first, Calendar second */
                    align-items: stretch !important;
                }
                .calendar-wrapper {
                    width: 100% !important;
                    flex: none !important;
                }
                .courses-grid-container {
                    grid-template-columns: 1fr; /* Stacks column cards comfortably on small screens */
                }
            }
        `}</style>

            {/* Courses Main Board Card (Spans across all remaining whitespace) */}
            <div className="white-card overflow-hidden" style={{ flex: '1 1 auto', minWidth: 0, width: '100%' }}>
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '13px 18px', borderBottom: '1px solid #f0ece4', gap: 10, flexWrap: 'wrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <BookOpen size={14} style={{ color: '#3b6fd4' }} />
                        <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, color: '#1a1f35', margin: 0 }}>Courses</h3>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', background: '#eff3fd', color: '#1e40af', borderRadius: 99 }}>
                            {courses.length}
                        </span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={loadData} style={{ background: 'none', border: '1px solid #e2dbd0', borderRadius: 8, padding: '6px 10px', cursor: 'pointer', color: '#6a6052', display: 'flex', alignItems: 'center', gap: 5, fontSize: 12 }}>
                            <RefreshCw size={12} />
                        </button>
                    </div>
                </div>

                {/* Dynamic Content Body */}
                {loadingAssign ? (
                    <div style={{ padding: '14px 18px' }}><LoadingBlock /></div>
                ) : assignments.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '32px 20px' }}>
                        <ClipboardList size={24} style={{ color: '#d4cec6', margin: '0 auto 10px', display: 'block' }} />
                        <p style={{ fontSize: 13, color: '#b0a898', margin: 0 }}>No assignments yet.</p>
                    </div>
                ) : (
                    /* Auto-fit container layout: Stretches edge-to-edge eliminating dead right-side space */
                    <div className="courses-grid-container assignment-columns-scroll" style={{ gap: 14, padding: '14px 18px', alignItems: 'stretch' }}>
                        {grouped.map(({ course, items }) => (
                            <div key={course.id} style={{ background: '#faf8f5', border: '1px solid #ece7df', borderRadius: 12, overflow: 'hidden', display: 'flex', flexDirection: 'column', width: '100%', minWidth: 0 }}>
                                
                                {/* Course Column Header */}
                                <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 12px', borderBottom: '2px solid #f0ece4', background: '#fff' }}>
                                    <BookOpen size={13} style={{ color: '#3b6fd4', flexShrink: 0 }} />
                                    <h4 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 12.5, color: '#1a1f35', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                        {course.title || course.name}
                                    </h4>
                                    <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', background: '#eff3fd', color: '#1e40af', borderRadius: 99, marginLeft: 'auto', flexShrink: 0 }}>
                                        {items.length}
                                    </span>
                                </div>

                                {/* Assignments List Container */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: 10, maxHeight: 440, overflowY: 'auto' }}>
                                    {items.map(a => {
                                        const due = a.due_date;
                                        const dDays = due ? Math.ceil((new Date(due) - new Date()) / 86400000) : null;
                                        const isLate = dDays !== null && dDays < 0;
                                        const subCount = a.submission_count || 0;

                                        return (
                                            <div key={a.id} style={{ padding: '11px 12px', background: '#fff', borderRadius: 10, border: '1px solid #ece7df' }}>
                                                {/* Title */}
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 5, flexWrap: 'wrap' }}>
                                                    <p style={{ fontSize: 12.5, fontWeight: 600, color: '#1a1f35', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '100%' }}>
                                                        {a.title}
                                                    </p>
                                                </div>

                                                {/* File Badge */}
                                                {a.file && (
                                                    <span style={{ fontSize: 10, color: '#6d4fc2', background: '#f0e8ff', padding: '1px 6px', borderRadius: 99, display: 'inline-flex', alignItems: 'center', gap: 3, marginBottom: 6 }}>
                                                        <Paperclip size={9} /> File attached
                                                    </span>
                                                )}

                                                {/* Combined Metadata */}
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, marginBottom: 8 }}>
                                                    {due && (
                                                        <span style={{ fontSize: 10, color: isLate ? '#c0392b' : '#8a7e6e', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            <Calendar size={9} /> {due}{isLate && ' (past)'}
                                                        </span>
                                                    )}
                                                    {a.submission_time && (
                                                        <span style={{ fontSize: 10, color: '#8a7e6e', display: 'flex', alignItems: 'center', gap: 3 }}>
                                                            <Clock size={9} /> by {a.submission_time}
                                                        </span>
                                                    )}
                                                    <span style={{ fontSize: 10, color: '#3b6fd4', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 3 }}>
                                                        <Users size={9} /> {subCount} Student{subCount !== 1 ? 's' : ''} Submitted
                                                    </span>
                                                </div>

                                                {/* Review Status Pills */}
                                                <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap', marginBottom: 10 }}>
                                                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#eff3fd', color: '#1e40af' }}>
                                                        {a.pending_review_count ?? 0} to review
                                                    </span>
                                                    <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#e0f7ee', color: '#3cb87a' }}>
                                                        {a.approved_count ?? 0} approved
                                                    </span>
                                                    {a.rejected_count > 0 && (
                                                        <span style={{ fontSize: 9.5, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: '#fde8e8', color: '#c0392b' }}>
                                                            {a.rejected_count} rejected
                                                        </span>
                                                    )}
                                                </div>

                                                {/* Card Action Buttons */}
                                                <div style={{ display: 'flex', gap: 6 }}>
                                                    <button
                                                        onClick={() => {
                                                            // Direct Router Navigation instead of setting a modal state pop-up
                                                            navigate(`/app/assignments/${a.id}/submissions`);
                                                        }}
                                                        style={{
                                                            flex: 1,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justify: 'center',
                                                            gap: 4,
                                                            padding: '5px 9px',
                                                            fontSize: 11,
                                                            fontWeight: 600,
                                                            background: '#eff3fd',
                                                            color: '#1e40af',
                                                            border: 'none',
                                                            borderRadius: 7,
                                                            cursor: 'pointer'
                                                        }}
                                                    >
                                                        <ClipboardList size={11} /> Submissions
                                                    </button>
                                                    {/* Delete Icon Trigger */}
                                                    <button onClick={() => setDeleteTarget(a)}
                                                        style={{ padding: '5px 8px', background: '#fde8e8', color: '#c0392b', border: 'none', borderRadius: 7, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
                                                        <X size={11} />
                                                    </button>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Calendar Column Card */}
            <div className="calendar-wrapper">
                <BSCalWidget />
            </div>
        </div>
        {/* Custom Delete Confirmation Modal Overlay */}
        {deleteTarget && (
            <div
                onClick={cancelDelete}
                style={{
                    position: 'fixed', inset: 0, background: 'rgba(26,31,53,0.45)', backdropFilter: 'blur(2px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
                }}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    className="white-card anim-fade-in"
                    style={{ width: '100%', maxWidth: 400, padding: '26px 26px 22px', boxShadow: '0 12px 40px rgba(26,31,53,0.25)' }}
                >
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#fbeceb', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }} aria-hidden="true">
                        <Trash2 size={19} style={{ color: '#c0392b' }} />
                    </div>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 16, color: '#1a1f35', margin: '0 0 8px' }}>
                        Delete assignment?
                    </h3>
                    <p style={{ fontSize: 13, color: '#7a7060', lineHeight: 1.55, margin: '0 0 22px' }}>
                        This will permanently delete <strong style={{ color: '#1a1f35' }}>"{deleteTarget.title}"</strong>. This action cannot be undone.
                    </p>
                    <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                        <button
                            onClick={cancelDelete}
                            disabled={!!deletingId}
                            className="btn-primary"
                            style={{ background: '#f0ece5', color: '#7a7060', cursor: deletingId ? 'default' : 'pointer', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600 }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={!!deletingId}
                            className="btn-primary"
                            style={{ background: '#c0392b', color: '#fff', cursor: deletingId ? 'default' : 'pointer', opacity: deletingId ? 0.75 : 1, border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 12, fontWeight: 600 }}
                        >
                            {deletingId ? 'Deleting…' : 'Delete Assignment'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        {/* Analytics row */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }} className="grid-2">

        {/* Student Ranking */}
        <Section
            title="Student Ranking"
            tag="Top 5"
            tagColor="#d4a93c"
            tagBg="#fffbeb"
            icon={<TrendingUp/>}
            loading={rkL}
        >
            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {(ranking || []).slice(0,5).map((r,i) => (
                    <div
                        key={i}
                        style={{
                            padding:10,
                            border:'1px solid #ece5dc',
                            borderRadius:10,
                            background:'#fff',
                        }}
                    >
                        <div
                            style={{
                                display:'flex',
                                justifyContent:'space-between',
                                alignItems:'center',
                                marginBottom:8,
                            }}
                        >
                            <strong style={{ fontSize:12 }}>
                                #{i + 1} {r.student}
                            </strong>

                            <span
                                style={{
                                    fontSize:10,
                                    fontWeight:700,
                                    padding:'2px 7px',
                                    borderRadius:99,
                                    background:
                                        r.completion_rate >= 80
                                            ? '#e0f7ee'
                                            : r.completion_rate >= 50
                                            ? '#fffbeb'
                                            : '#fde8e8',
                                    color:
                                        r.completion_rate >= 80
                                            ? '#166534'
                                            : r.completion_rate >= 50
                                            ? '#92400e'
                                            : '#991b1b',
                                }}
                            >
                                {r.completion_rate}%
                            </span>
                        </div>

                        <div
                            style={{
                                display:'grid',
                                gridTemplateColumns:'1fr 1fr',
                                gap:4,
                                fontSize:10,
                                color:'#666',
                            }}
                        >
                            <span>Completed: {r.completed}</span>
                            <span>Submitted: {r.submitted}</span>
                            <span>Pending: {r.pending}</span>
                            <span>Overdue: {r.overdue}</span>
                            <span>Rejected: {r.rejected}</span>
                            <span>Total: {r.total}</span>
                        </div>
                    </div>
                ))}

                {!ranking?.length && (
                    <p style={{ fontSize:12, color:'#b0a898' }}>
                        No student data yet.
                    </p>
                )}

                {(ranking || []).length > 5 && (
                    <button
                        onClick={() => navigate('/app/analytics')}
                        style={{
                            display:'flex',
                            alignItems:'center',
                            justifyContent:'center',
                            gap:6,
                            marginTop:2,
                            padding:'8px 10px',
                            fontSize:11.5,
                            fontWeight:600,
                            background:'#faf8f5',
                            color:'#3b6fd4',
                            border:'1px solid #ece7df',
                            borderRadius:9,
                            cursor:'pointer',
                        }}
                    >
                        View full ranking ({ranking.length} students) <ArrowRight size={12}/>
                    </button>
                )}
            </div>
        </Section>

        {/* Student Groups */}
        <Section
            title="Student Groups"
            tag="K-Means"
            tagColor="#6d4fc2"
            tagBg="#f0e8ff"
            icon={<Layers/>}
            loading={grL}
            error={grErr}
        >
            {groups?.students && (
                <>
                    <div
                        style={{
                            display:'flex',
                            gap:6,
                            marginBottom:12,
                            flexWrap:'wrap',
                        }}
                    >
                        <button
                            onClick={() => setGroupFilter(null)}
                            style={{
                                fontSize:11,
                                fontWeight:600,
                                padding:'3px 9px',
                                borderRadius:99,
                                background: groupFilter === null ? '#1a1f35' : '#f3f4f6',
                                color: groupFilter === null ? '#fff' : '#374151',
                                border:'none',
                                cursor:'pointer',
                            }}
                        >
                            All: {groups.students.length}
                        </button>

                        {Object.entries(groups.summary || {}).map(([label,count]) => {
                            const style = GRP[label] || {
                                bg:'#f3f4f6',
                                text:'#374151',
                            }
                            const active = groupFilter === label

                            return (
                                <button
                                    key={label}
                                    onClick={() => setGroupFilter(active ? null : label)}
                                    style={{
                                        fontSize:11,
                                        fontWeight:600,
                                        padding:'3px 9px',
                                        borderRadius:99,
                                        background:style.bg,
                                        color:style.text,
                                        border: active ? `1.5px solid ${style.text}` : '1.5px solid transparent',
                                        cursor:'pointer',
                                        opacity: groupFilter && !active ? 0.55 : 1,
                                    }}
                                >
                                    {label}: {count}
                                </button>
                            )
                        })}
                    </div>

                    <div
                        style={{
                            display:'flex',
                            flexDirection:'column',
                            gap:10,
                            height:460,
                            overflowY:'auto',
                        }}
                        className="assignment-columns-scroll"
                    >
                        {groupFilter && !groups.students.some(s => s.group === groupFilter) && (
                            <p style={{ fontSize:12, color:'#b0a898' }}>
                                No students in this group.
                            </p>
                        )}
                        {groups.students
                            .filter(s => !groupFilter || s.group === groupFilter)
                            .map((s,i) => {
                            const gStyle = GRP[s.group] || {
                                bg:'#f3f4f6',
                                text:'#374151',
                            }

                            return (
                                <div
                                    key={i}
                                    style={{
                                        padding:10,
                                        border:'1px solid #ece5dc',
                                        borderRadius:10,
                                        background:'#fff',
                                    }}
                                >
                                    <div
                                        style={{
                                            display:'flex',
                                            justifyContent:'space-between',
                                            marginBottom:8,
                                        }}
                                    >
                                        <strong style={{ fontSize:12 }}>
                                            {s.student_name}
                                        </strong>

                                        <span
                                            style={{
                                                fontSize:10,
                                                fontWeight:700,
                                                padding:'2px 7px',
                                                borderRadius:99,
                                                background:gStyle.bg,
                                                color:gStyle.text,
                                            }}
                                        >
                                            {s.group}
                                        </span>
                                    </div>

                                    <div
                                        style={{
                                            display:'grid',
                                            gridTemplateColumns:'1fr 1fr',
                                            gap:4,
                                            fontSize:10,
                                            color:'#666',
                                        }}
                                    >
                                        <span>Completion: {s.completion_rate}%</span>
                                        <span>Submission: {s.submission_rate}%</span>
                                        <span>Pending: {s.pending_count}</span>
                                        <span>Overdue: {s.overdue_count}</span>
                                        <span>Rejected: {s.rejected_count}</span>
                                        <span>
                                            {s.avg_days_early >= 0
                                                ? `${s.avg_days_early} days early`
                                                : `${Math.abs(s.avg_days_early)} days late`}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </>
            )}
        </Section>
        </div>

        {/* Outliers */}
        <Section
        title="Outlier Students"
        tag="Isolation Forest"
        tagColor="#e05252"
        tagBg="#fde8e8"
        icon={<AlertTriangle/>}
        loading={olL}
        error={olErr}
        >
        {outliers?.outliers && !outliers.outliers.length && (
            <p style={{ fontSize:12, color:'#b0a898' }}>
                No outliers detected. Great class!
            </p>
        )}

        {outliers?.outliers?.length > 0 && (
            <div
                style={{
                    display:'grid',
                    gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))',
                    gap:10,
                }}
            >
                {outliers.outliers.map((o,i) => (
                    <div
                        key={i}
                        style={{
                            padding:'12px 14px',
                            background:'#fde8e8',
                            borderRadius:10,
                            border:'1px solid #fecaca',
                        }}
                    >
                        <div
                            style={{
                                display:'flex',
                                justifyContent:'space-between',
                                alignItems:'center',
                                marginBottom:6,
                            }}
                        >
                            <strong style={{ fontSize:12 }}>
                                {o.student_name}
                            </strong>

                            <span
                                style={{
                                    fontSize:9,
                                    fontWeight:700,
                                    background:'#fca5a5',
                                    color:'#7f1d1d',
                                    padding:'2px 6px',
                                    borderRadius:99,
                                }}
                            >
                                {o.flagged_by}
                            </span>
                        </div>

                        <div style={{ margin:'8px 0' }}>
                            {o.reason.split('|').map((reason, idx) => (
                                <div
                                    key={idx}
                                    style={{
                                        fontSize:11,
                                        color:'#8a7e6e',
                                        marginBottom:3,
                                    }}
                                >
                                    • {reason.trim()}
                                </div>
                            ))}
                        </div>

                        <div
                            style={{
                                display:'grid',
                                gridTemplateColumns:'1fr 1fr',
                                gap:4,
                                fontSize:10,
                                color:'#666',
                            }}
                        >
                            <span>Completion: {o.completion_rate}%</span>
                            <span>Submission: {o.submission_rate}%</span>
                            <span>Pending: {o.pending_count}</span>
                            <span>Overdue: {o.overdue_count}</span>
                            <span>Rejected: {o.rejected_count}</span>
                            <span>
                                {o.avg_days_early >= 0
                                    ? `${o.avg_days_early} days early`
                                    : `${Math.abs(o.avg_days_early)} days late`}
                            </span>
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
        {selectedAssignment && (
            <StudentSubmissionWorkspace
                assignment={selectedAssignment}
                onClose={() => setSelectedAssignment(null)}
            />
        )}
        </div>
    )
    }