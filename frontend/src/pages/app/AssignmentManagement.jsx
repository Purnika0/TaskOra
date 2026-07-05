import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    Search, LayoutGrid, List, RefreshCw, Upload, X, FileText, Send, MessageSquare,
    Paperclip, ChevronDown, Plus, Pencil, Trash2, ClipboardList, Users, Calendar,
    Clock, 
} from 'lucide-react'
import { useTasks, statusLabel, statusColor, statusBg } from '../../hooks/useTasks.js'
import { useAuth }         from '../../hooks/useAuth.js'
import { useToast }        from '../../context/ToastContext.jsx'
import tasksService        from '../../services/tasks.service.js'
import coursesService      from '../../services/courses.service.js'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
import { getTaskTitle, getTaskDueDate, daysUntil, apiError } from '../../utils/helpers.js'

// Matches Assignment.TaskType choices in models.py
const TASK_TYPES = ['assignment', 'exam', 'project', 'homework', 'quiz', 'other']

// Assignment.priority is an IntegerField (1 low – 5 high) in models.py,
// so the form must submit a number, not the label string.
const PRIORITIES = [
    { value: 1, label: 'Low' },
    { value: 2, label: 'Medium-Low' },
    { value: 3, label: 'Medium' },
    { value: 4, label: 'Medium-High' },
    { value: 5, label: 'High' },
]

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

// ── Create / Edit Assignment modal (teacher-only) ───────────────────────────
function AssignmentFormModal({ assignment, courses, onClose, onSaved }) {
    const isEdit = Boolean(assignment)
    const toast  = useToast()
    
    // Allowed file configurations matching the dashboard settings
    const ALLOWED_TYPES = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const ALLOWED_EXT   = '.pdf,.doc,.docx'

    const [form, setForm] = useState({
        title:           assignment?.title || '',
        description:     assignment?.description || '',
        course:          assignment?.course ?? (courses[0]?.id ?? ''),
        due_date:        assignment?.due_date || '',
        submission_time: assignment?.submission_time || '23:59',
        task_type:       assignment?.task_type || TASK_TYPES[0],
        priority:        assignment?.priority ?? 3,
        estimated_hours: assignment?.estimated_hours ?? 1,
    })
    
    const [file, setFile] = useState(null)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})

    function update(field, value) { 
        setForm(p => ({ ...p, [field]: value }))
        setErrors(e => ({ ...e, [field]: null }))
    }

    function handleFile(e) {
        const f = e.target.files?.[0]
        if (!f) return
        if (!ALLOWED_TYPES.includes(f.type)) { setErrors(er => ({...er, file:'Only PDF, DOC, DOCX allowed'})); return }
        if (f.size > 20 * 1024 * 1024)       { setErrors(er => ({...er, file:'File must be under 20 MB'})); return }
        setFile(f); setErrors(er => ({...er, file:null}))
    }

    async function handleSubmit() {
        const errs = {}
        if (!form.title.trim())  errs.title  = 'Title is required'
        if (!form.course)        errs.course = 'Please select a course'
        if (!form.due_date)      errs.due_date = 'Due date is required'
        if (Object.keys(errs).length) { setErrors(errs); return }
        
        setSaving(true)
        try {
            // Use FormData payload strategy matching the dashboard
            const fd = new FormData()
            fd.append('title', form.title.trim())
            fd.append('description', form.description.trim())
            fd.append('course', Number(form.course))
            fd.append('due_date', form.due_date)
            fd.append('submission_time', form.submission_time)
            fd.append('task_type', form.task_type)
            fd.append('priority', Number(form.priority))
            if (form.estimated_hours !== '') {
                fd.append('estimated_hours', Number(form.estimated_hours))
            }
            if (file) fd.append('file', file)

            const saved = isEdit
                ? await tasksService.updateAssignment(assignment.id, fd)
                : await tasksService.createAssignment(fd)
                
            toast.success(isEdit ? 'Assignment updated' : 'Assignment created')
            onSaved(saved)
        } catch (err) {
            setErrors({ _ : apiError(err) })
        } finally { setSaving(false) }
    }

    const inp = { border:'1.5px solid #e2dbd0', borderRadius:8, padding:'9px 12px', fontSize:13, fontFamily:'var(--font-body)', color:'#1a1f35', background:'#faf8f5', outline:'none', width:'100%', boxSizing:'border-box' }
    const lbl = { fontSize:11, fontWeight:600, color:'#5a5060', display:'block', marginBottom:5 }

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:16 }}
            className="anim-fade-in" onClick={onClose}>
            <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:520, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}
                className="anim-scale-in" onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #ece7df' }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#1a1f35', margin:0 }}>
                            {isEdit ? 'Edit Assignment' : 'New Assignment'}
                        </h3>
                        <p style={{ fontSize:11, color:'#a09080', margin:'2px 0 0' }}>
                            {isEdit ? 'Modify your assignment details' : 'Create an assignment for your students'}
                        </p>
                    </div>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, borderRadius:8, color:'#8a7e6e', display:'flex' }}><X size={16}/></button>
                </div>

                {/* Body */}
                <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:14 }}>
                    {errors._ && (
                        <p style={{ fontSize:12, color:'#e05252', background:'#fde8e8', padding:'8px 12px', borderRadius:8, margin:0 }}>{errors._}</p>
                    )}

                    <div>
                        <label style={lbl}>Assignment Title *</label>
                        <input style={inp} value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Database Normalization Assignment"/>
                        {errors.title && <p style={{ fontSize:11, color:'#e05252', margin:'4px 0 0' }}>{errors.title}</p>}
                    </div>

                    <div>
                        <label style={lbl}>Course *</label>
                        <select style={inp} value={form.course} onChange={e => update('course', e.target.value)}>
                            <option value="">Select a course…</option>
                            {courses.map(c => <option key={c.id} value={c.id}>{c.title || c.name}</option>)}
                        </select>
                        {errors.course && <p style={{ fontSize:11, color:'#e05252', margin:'4px 0 0' }}>{errors.course}</p>}
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                        <div>
                            <label style={lbl}><Calendar size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>Due Date *</label>
                            <input type="date" style={inp} value={form.due_date} onChange={e => update('due_date', e.target.value)}/>
                            {errors.due_date && <p style={{ fontSize:11, color:'#e05252', margin:'4px 0 0' }}>{errors.due_date}</p>}
                        </div>
                        <div>
                            <label style={lbl}><Clock size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>Submission Time</label>
                            <input type="time" style={inp} value={form.submission_time} onChange={e => update('submission_time', e.target.value)}/>
                        </div>
                    </div>

                    <div>
                        <label style={lbl}>Description (optional)</label>
                        <textarea style={{ ...inp, resize:'vertical', minHeight:70 }} rows={3} value={form.description} onChange={e => update('description', e.target.value)} placeholder="Assignment instructions, requirements…"/>
                    </div>

                    {/* Metadata Settings Grid */}
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>
                        <div>
                            <label style={lbl}>Type</label>
                            <select style={inp} value={form.task_type} onChange={e => update('task_type', e.target.value)}>
                                {TASK_TYPES.map(t => <option key={t} value={t}>{t[0].toUpperCase()+t.slice(1)}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Priority</label>
                            <select style={inp} value={form.priority} onChange={e => update('priority', Number(e.target.value))}>
                                {PRIORITIES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={lbl}>Est. hours</label>
                            <input type="number" min="0" step="0.5" style={inp} value={form.estimated_hours} onChange={e => update('estimated_hours', e.target.value)}/>
                        </div>
                    </div>

                    {/* File Dropzone Input Field */}
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

                {/* Footer Controls */}
                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid #ece7df' }}>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={handleSubmit} disabled={saving} className="btn-primary" style={{ opacity:saving?0.7:1 }}>
                        {saving ? (isEdit ? 'Saving…' : 'Creating…') : (isEdit ? 'Save Changes' : 'Create Assignment')}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Delete Assignment confirm modal (teacher-only) ──────────────────────────
function DeleteAssignmentModal({ assignment, deleting, onCancel, onConfirm }) {
    return (
        <div onClick={deleting ? undefined : onCancel}
            style={{ position:'fixed', inset:0, zIndex:9999, background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}
            className="anim-fade-in">
            <div onClick={e => e.stopPropagation()} className="anim-scale-in"
                style={{ background:'var(--color-surface)', borderRadius:16, width:'100%', maxWidth:400, padding:'24px 24px 20px', boxShadow:'0 16px 48px rgba(0,0,0,0.22)' }}>
                <div style={{ width:44, height:44, borderRadius:'50%', background:'var(--color-red-light)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }} aria-hidden="true">
                    <Trash2 size={19} style={{ color:'var(--color-red)' }}/>
                </div>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--color-text)', margin:'0 0 8px' }}>
                    Delete assignment?
                </h3>
                <p style={{ fontSize:13, color:'var(--color-text-secondary)', lineHeight:1.55, margin:'0 0 22px' }}>
                    This will permanently delete <strong style={{ color:'var(--color-text)' }}>"{assignment.title}"</strong> and every student's submission for it. This action cannot be undone.
                </p>
                <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                    <button onClick={onCancel} disabled={deleting} className="btn-secondary">Cancel</button>
                    <button onClick={onConfirm} disabled={deleting} className="btn-primary"
                        style={{ background:'var(--color-red)', opacity:deleting?0.75:1 }}>
                        {deleting ? 'Deleting…' : 'Delete Assignment'}
                    </button>
                </div>
            </div>
        </div>
    )
}

function StudentAssignments() {
    const { tasks, loading, error, stats, refetch, submitAssignment, setTasks } = useTasks()
    const isStudent = true // this component only ever renders for students; kept so existing JSX below is untouched

    const [searchParams] = useSearchParams()
    const courseFilter = searchParams.get('course')

    const [activeTab, setActiveTab]   = useState('all')
    const [search,    setSearch]      = useState('')
    const [sortBy,    setSortBy]      = useState('due')
    const [viewMode,  setViewMode]    = useState('table')
    const [submitTask, setSubmitTask] = useState(null)
    const [expandedId, setExpandedId] = useState(null)

    const filtered = useMemo(() => {
        let list = [...tasks]
        if (activeTab !== 'all') list = list.filter(t => t.status === activeTab)

        if (courseFilter) list = list.filter(t => String(t.assignment?.course) === String(courseFilter))

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
    }, [tasks, activeTab, search, sortBy, courseFilter])

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

// ── Teacher: assignments list, filters, CRUD ────────────────────────────────
function TeacherAssignments() {
    const toast    = useToast()
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const [assignments,   setAssignments]   = useState([])
    const [courses,       setCourses]       = useState([])
    const [studentCounts, setStudentCounts] = useState({}) // courseId -> enrolled count
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState(null)

    const [search,       setSearch]       = useState('')
    const [courseFilter, setCourseFilter] = useState(searchParams.get('course') || 'all')
    const [dueFilter,    setDueFilter]    = useState('all') // all | overdue | today | week | upcoming
    const [sortBy,       setSortBy]       = useState('due')

    const [showForm,           setShowForm]           = useState(false)
    const [editingAssignment,  setEditingAssignment]  = useState(null)
    const [deleteTarget,       setDeleteTarget]       = useState(null)
    const [deletingId,         setDeletingId]         = useState(null)

    const load = useCallback(async () => {
        setLoading(true); setError(null)
        try {
            const [a, c] = await Promise.all([
                tasksService.getAssignments(),
                coursesService.list(),
            ])
            setAssignments(Array.isArray(a) ? a : [])
            setCourses(Array.isArray(c) ? c : [])
        } catch (err) {
            setError(apiError(err))
        } finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    // Fetch enrolled-student counts per course once courses are loaded (one call per course, not per assignment)
    useEffect(() => {
        if (courses.length === 0) return
        let cancelled = false
        Promise.all(courses.map(c =>
            coursesService.getStudents(c.id)
                .then(list => [c.id, Array.isArray(list) ? list.length : null])
                .catch(() => [c.id, null])
        )).then(pairs => { if (!cancelled) setStudentCounts(Object.fromEntries(pairs)) })
        return () => { cancelled = true }
    }, [courses])

    // Keep the course filter in sync if the URL's ?course= changes (e.g. navigated here again from CoursesPage)
    useEffect(() => {
        const fromUrl = searchParams.get('course')
        if (fromUrl && fromUrl !== courseFilter) setCourseFilter(fromUrl)
    }, [searchParams]) // eslint-disable-line react-hooks/exhaustive-deps

    function handleCourseFilterChange(value) {
        setCourseFilter(value)
        const next = new URLSearchParams(searchParams)
        if (value === 'all') next.delete('course'); else next.set('course', value)
        setSearchParams(next, { replace:true })
    }

    const filtered = useMemo(() => {
        let list = [...assignments]
        if (courseFilter !== 'all') list = list.filter(a => String(a.course) === String(courseFilter))
        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(a => (a.title||'').toLowerCase().includes(q))
        }
        if (dueFilter !== 'all') {
            list = list.filter(a => {
                const d = daysUntil(a.due_date)
                if (d === null) return false
                if (dueFilter === 'overdue')  return d < 0
                if (dueFilter === 'today')    return d === 0
                if (dueFilter === 'week')     return d >= 0 && d <= 7
                if (dueFilter === 'upcoming') return d > 7
                return true
            })
        }
        if (sortBy === 'due')    list.sort((a,b) => (a.due_date||'9').localeCompare(b.due_date||'9'))
        if (sortBy === 'title')  list.sort((a,b) => (a.title||'').localeCompare(b.title||''))
        if (sortBy === 'course') list.sort((a,b) => (a.course_name||'').localeCompare(b.course_name||''))
        return list
    }, [assignments, courseFilter, search, dueFilter, sortBy])

    function openCreate() { setEditingAssignment(null); setShowForm(true) }
    function openEdit(a)  { setEditingAssignment(a); setShowForm(true) }
    function closeForm()  { setShowForm(false); setEditingAssignment(null) }

    function handleSaved(saved) {
        setAssignments(prev => {
            const exists = prev.some(a => a.id === saved.id)
            return exists ? prev.map(a => a.id === saved.id ? saved : a) : [saved, ...prev]
        })
        closeForm()
    }

    async function confirmDelete() {
        if (!deleteTarget) return
        setDeletingId(deleteTarget.id)
        try {
            await tasksService.deleteAssignment(deleteTarget.id)
            setAssignments(prev => prev.filter(a => a.id !== deleteTarget.id))
            toast.success('Assignment deleted')
            setDeleteTarget(null)
        } catch (err) {
            toast.error(apiError(err))
        } finally { setDeletingId(null) }
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="anim-fade-in">
            <style>{`
                .am-filter { background:var(--color-surface); border:1px solid var(--color-border); border-radius:12px; padding:12px 14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap; }
            `}</style>

            {/* Header */}
            <div className="page-header">
                <div>
                    <h2 className="page-title">Assignments</h2>
                    <p className="page-subtitle">
                        {assignments.length} assignment{assignments.length!==1?'s':''} across {courses.length} course{courses.length!==1?'s':''}
                    </p>
                </div>
                <button onClick={openCreate} className="btn-primary">
                    <Plus size={14} aria-hidden="true"/> New Assignment
                </button>
            </div>

            {/* Filter bar */}
            <div className="am-filter">
                <div style={{ position:'relative', flex:1, minWidth:180 }}>
                    <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-placeholder)', pointerEvents:'none' }}/>
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search by title…"
                        style={{ ...selStyle, paddingLeft:28, width:'100%', boxSizing:'border-box' }}/>
                </div>
                <select value={courseFilter} onChange={e => handleCourseFilterChange(e.target.value)} style={selStyle}>
                    <option value="all">All Courses</option>
                    {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                </select>
                <select value={dueFilter} onChange={e => setDueFilter(e.target.value)} style={selStyle}>
                    <option value="all">Any Due Date</option>
                    <option value="overdue">Overdue</option>
                    <option value="today">Due Today</option>
                    <option value="week">Due This Week</option>
                    <option value="upcoming">Upcoming</option>
                </select>
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle}>
                    <option value="due">Sort by Due Date</option>
                    <option value="title">Sort by Title</option>
                    <option value="course">Sort by Course</option>
                </select>
            </div>

            {loading && <div className="white-card" style={{ padding:28 }}><LoadingBlock/></div>}
            {error   && <ErrorBlock message={error} onRetry={load}/>}

            {!loading && !error && filtered.length === 0 && (
                <div className="white-card" style={{ padding:'44px 24px', textAlign:'center' }}>
                    <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--color-text)', margin:'0 0 5px' }}>
                        No assignments found
                    </p>
                    <p style={{ fontSize:12, color:'var(--color-text-placeholder)' }}>
                        {assignments.length === 0 ? 'Create your first assignment above.' : 'Try adjusting your filters.'}
                    </p>
                </div>
            )}

            {!loading && !error && filtered.length > 0 && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:12 }}>
                    {filtered.map(a => {
                        const d = daysUntil(a.due_date)
                        const urgent = d !== null && d < 0
                        const enrolledCount = studentCounts[a.course]

                        return (
                            <div key={a.id} className="white-card" style={{ padding:'18px 20px' }}>
                                <p style={{ fontSize:14, fontWeight:700, color:'var(--color-text)', margin:'0 0 4px', lineHeight:1.3 }}>
                                    {a.title}
                                </p>
                                <p style={{ fontSize:12, color:'var(--color-text-secondary)', margin:'0 0 8px' }}>
                                    {a.course_name}
                                </p>

                                <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:10 }}>
                                    <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                        <Calendar size={11} style={{ color:'var(--color-text-placeholder)' }} aria-hidden="true"/>
                                        <span style={{ fontSize:11.5, color: urgent ? 'var(--color-red)' : 'var(--color-text-secondary)', fontWeight: urgent?600:400 }}>
                                            Due {a.due_date || '—'} {urgent && `(${Math.abs(d)}d late)`}
                                        </span>
                                    </div>
                                    {enrolledCount != null && (
                                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                                            <Users size={11} style={{ color:'var(--color-text-placeholder)' }} aria-hidden="true"/>
                                            <span style={{ fontSize:11.5, color:'var(--color-text-secondary)' }}>
                                                {enrolledCount} student{enrolledCount!==1?'s':''} enrolled
                                            </span>
                                        </div>
                                    )}
                                </div>

                                <div style={{ display:'flex', gap:6, flexWrap:'wrap', marginBottom:14 }}>
                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:'var(--color-primary-light)', color:'var(--color-primary)' }}>
                                        {a.pending_review_count ?? 0} to review
                                    </span>
                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:'#e0f7ee', color:'#3cb87a' }}>
                                        {a.approved_count ?? 0} approved
                                    </span>
                                    {a.rejected_count > 0 && (
                                        <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:'var(--color-red-light)', color:'var(--color-red)' }}>
                                            {a.rejected_count} rejected
                                        </span>
                                    )}
                                </div>

                                <div style={{ display:'flex', gap:8, paddingTop:12, borderTop:'1px solid var(--color-border)' }}>
                                    <button onClick={() => navigate(`/app/assignments/${a.id}/submissions`)}
                                        style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:11.5, fontWeight:600, color:'var(--color-primary)', background:'var(--color-primary-light)', border:'none', borderRadius:7, padding:'7px 8px', cursor:'pointer' }}>
                                        <ClipboardList size={12} aria-hidden="true"/> Submissions
                                    </button>
                                    <button onClick={() => openEdit(a)} aria-label={`Edit ${a.title}`}
                                        style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-text-secondary)', background:'var(--color-surface-subtle)', border:'none', borderRadius:7, padding:'7px 10px', cursor:'pointer' }}>
                                        <Pencil size={12} aria-hidden="true"/>
                                    </button>
                                    <button onClick={() => setDeleteTarget(a)} aria-label={`Delete ${a.title}`}
                                        style={{ display:'flex', alignItems:'center', justifyContent:'center', color:'var(--color-red)', background:'var(--color-red-light)', border:'none', borderRadius:7, padding:'7px 10px', cursor:'pointer' }}>
                                        <Trash2 size={12} aria-hidden="true"/>
                                    </button>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            <DashboardFooter/>

            {showForm && (
                <AssignmentFormModal
                    assignment={editingAssignment}
                    courses={courses}
                    onClose={closeForm}
                    onSaved={handleSaved}
                />
            )}

            {deleteTarget && (
                <DeleteAssignmentModal
                    assignment={deleteTarget}
                    deleting={deletingId === deleteTarget.id}
                    onCancel={() => !deletingId && setDeleteTarget(null)}
                    onConfirm={confirmDelete}
                />
            )}
        </div>
    )
}

export default function AssignmentManagement() {
    const { user } = useAuth()
    const isTeacher = user?.role === 'teacher'
    return isTeacher ? <TeacherAssignments/> : <StudentAssignments/>
}