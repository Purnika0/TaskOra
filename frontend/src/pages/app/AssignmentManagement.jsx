import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
    Search, RefreshCw, Upload, X, FileText, Send, MessageSquare,
    Paperclip, ChevronDown, Plus, Pencil, Trash2, ClipboardList, Users, Calendar,
    CheckCircle2, Clock, XCircle, AlertCircle,
} from 'lucide-react'
import { useTasks, statusLabel, statusColor, statusBg } from '../../hooks/useTasks.js'
import { useAuth }         from '../../hooks/useAuth.js'
import { useToast }        from '../../context/ToastContext.jsx'
import tasksService        from '../../services/tasks.service.js'
import coursesService      from '../../services/courses.service.js'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
import BSDatePicker         from '../../components/shared/BSDatePicker.jsx'
import { getTaskTitle, getTaskDueDate, daysUntil, apiError, priorityColor, priorityLabel, fmtDate } from '../../utils/helpers.js'
import { urgencyLabel, urgencyColor } from '../../utils/urgencyLabel.js'
import { TASK_TYPES, PRIORITY_CHOICES } from '../../constants/assignmentChoices.js'

// Rejected is listed before Overdue everywhere in the UI (tabs, stat cards)
// so the ordering matches the Student Dashboard.
const TABS = [
    { key:'all',       label:'All'       },
    { key:'pending',   label:'Pending'   },
    { key:'submitted', label:'Submitted' },
    { key:'completed', label:'Completed' },
    { key:'rejected',  label:'Rejected'  },
    { key:'overdue',   label:'Overdue'   },
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

// ── Stat card — same icon-badge style used on the Student Dashboard ────────
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

// ── Submit / Edit Assignment modal (student-only) ──────────────────────────────
function SubmitModal({ task, onClose, onSubmitted }) {
    const isEdit = task.status === 'submitted'
    const [file,   setFile]   = useState(null)
    const [text,   setText]   = useState(isEdit ? (task.submission_text || '') : '')
    const [saving, setSaving] = useState(false)
    const [error,  setError]  = useState('')
    const toast = useToast()

    const modalTitle  = isEdit ? 'Edit Submission' : task.status === 'rejected' ? 'Resubmit Assignment' : 'Submit Assignment'
    const actionLabel = isEdit ? 'Save Changes' : task.status === 'rejected' ? 'Resubmit' : 'Submit'

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
            await onSubmitted(task.id, fd)
            toast.success(isEdit ? 'Submission updated successfully' : 'Assignment submitted successfully')
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
                            {modalTitle}
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

                    {task.assignment?.file && (
                        <a href={task.assignment.file} target="_blank" rel="noreferrer" download
                            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'#6d4fc2', background:'#f0e8ff', padding:'8px 10px', borderRadius:8, textDecoration:'none' }}>
                            <Paperclip size={12}/> Download assignment document: {task.assignment.file_name || 'file'}
                        </a>
                    )}

                    {isEdit && task.submission_file && !file && (
                        <a href={task.submission_file} target="_blank" rel="noreferrer"
                            style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, fontWeight:600, color:'var(--color-primary)', textDecoration:'none' }}>
                            <Paperclip size={12}/> Current file: {task.file_name || 'view attachment'}
                        </a>
                    )}

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>
                            {isEdit ? 'Replace File (optional)' : 'Upload Solution (PDF, DOCX, DOC, Images)'}
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
                        {saving ? 'Saving…' : <><Send size={13}/> {actionLabel}</>}
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
    const ALLOWED_TYPES = ['application/pdf','application/msword','application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    const ALLOWED_EXT   = '.pdf,.doc,.docx'
    const [form, setForm] = useState({
        title:           assignment?.title || '',
        description:     assignment?.description || '',
        course:          assignment?.course ?? (courses[0]?.id ?? ''),
        due_date:        assignment?.due_date || '',
        task_type:       assignment?.task_type || TASK_TYPES[0].value,
        priority:        assignment?.priority ?? 3,
        estimated_hours: assignment?.estimated_hours ?? 1,
    })
    const [file, setFile]     = useState(null)
    const [saving, setSaving] = useState(false)
    const [error,  setError]  = useState('')

    function update(field, value) { setForm(p => ({ ...p, [field]: value })) }

    function handleFile(e) {
        const f = e.target.files?.[0]
        if (!f) return
        if (!ALLOWED_TYPES.includes(f.type)) { setError('Only PDF, DOC, DOCX allowed'); return }
        if (f.size > 20 * 1024 * 1024)       { setError('File must be under 20 MB'); return }
        setFile(f); setError('')
    }

    async function handleSubmit() {
        if (!form.title.trim())  { setError('Title is required.');  return }
        if (!form.course)        { setError('Please select a course.'); return }
        if (!form.due_date)      { setError('Due date is required.'); return }
        setSaving(true)
        setError('')
        try {
            const fd = new FormData()
            fd.append('title', form.title.trim())
            fd.append('description', form.description.trim())
            fd.append('course', Number(form.course))
            fd.append('due_date', form.due_date)
            fd.append('task_type', form.task_type)
            fd.append('priority', Number(form.priority))
            if (form.estimated_hours !== '') fd.append('estimated_hours', Number(form.estimated_hours))
            if (file) fd.append('file', file)

            const saved = isEdit
                ? await tasksService.updateAssignment(assignment.id, fd)
                : await tasksService.createAssignment(fd)
            toast.success(isEdit ? 'Assignment updated' : 'Assignment created')
            onSaved(saved)
        } catch (err) {
            setError(apiError(err))
        } finally { setSaving(false) }
    }

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.45)', backdropFilter:'blur(2px)', padding:16 }}
            className="anim-fade-in" onClick={onClose}>
            <div style={{ background:'var(--color-surface)', borderRadius:16, width:'100%', maxWidth:560, boxShadow:'0 16px 48px rgba(0,0,0,0.22)', overflow:'hidden' }}
                className="anim-scale-in" onClick={e => e.stopPropagation()}>

                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid var(--color-border)' }}>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'var(--color-text)', margin:0 }}>
                        {isEdit ? 'Edit Assignment' : 'New Assignment'}
                    </h3>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', padding:6, color:'var(--color-text-secondary)', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:'18px 20px', display:'flex', flexDirection:'column', gap:12, maxHeight:'72vh', overflowY:'auto' }}>
                    {error && (
                        <p style={{ fontSize:12, color:'var(--color-red)', background:'var(--color-red-light)', padding:'8px 12px', borderRadius:8, margin:0 }}>{error}</p>
                    )}

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>Title *</label>
                        <input value={form.title} onChange={e => update('title', e.target.value)} placeholder="Assignment title"
                            style={{ width:'100%', border:'1.5px solid var(--color-border)', borderRadius:9, padding:'9px 12px', fontSize:13, fontFamily:'var(--font-body)', color:'var(--color-text)', background:'var(--color-surface-subtle)', boxSizing:'border-box' }}/>
                    </div>

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>Description</label>
                        <textarea value={form.description} onChange={e => update('description', e.target.value)} rows={3} placeholder="What should students do?"
                            style={{ width:'100%', border:'1.5px solid var(--color-border)', borderRadius:9, padding:'9px 12px', fontSize:13, fontFamily:'var(--font-body)', color:'var(--color-text)', background:'var(--color-surface-subtle)', resize:'vertical', boxSizing:'border-box' }}/>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
                        <div>
                            <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>Course *</label>
                            <select value={form.course} onChange={e => update('course', e.target.value)} style={{ ...selStyle, width:'100%', boxSizing:'border-box' }}>
                                {courses.length === 0 && <option value="">No courses yet</option>}
                                {courses.map(c => <option key={c.id} value={c.id}>{c.title}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>Due date *</label>
                            <BSDatePicker value={form.due_date} onChange={v => update('due_date', v)} placeholder="Select due date" background="var(--color-surface-subtle)" disablePast/>
                        </div>
                    </div>

                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10 }}>
                        <div>
                            <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>Type</label>
                            <select value={form.task_type} onChange={e => update('task_type', e.target.value)} style={{ ...selStyle, width:'100%', boxSizing:'border-box' }}>
                                {TASK_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>Importance</label>
                            <select value={form.priority} onChange={e => update('priority', Number(e.target.value))} style={{ ...selStyle, width:'100%', boxSizing:'border-box' }}>
                                {PRIORITY_CHOICES.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
                            </select>
                        </div>
                        <div>
                            <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>Est. hours</label>
                            <input type="number" min="0" step="0.5" value={form.estimated_hours} onChange={e => update('estimated_hours', e.target.value)}
                                style={{ width:'100%', border:'1.5px solid var(--color-border)', borderRadius:9, padding:'8px 10px', fontSize:13, fontFamily:'var(--font-body)', color:'var(--color-text)', background:'var(--color-surface-subtle)', boxSizing:'border-box' }}/>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-secondary)', display:'block', marginBottom:5 }}>
                            <Paperclip size={11} style={{ marginRight:4, verticalAlign:'middle' }}/>Assignment File (PDF / DOC / DOCX)
                        </label>
                        <div style={{ border:'2px dashed var(--color-border)', borderRadius:10, padding:'16px', textAlign:'center', background:'var(--color-surface-subtle)', cursor:'pointer' }}
                                onClick={() => document.getElementById('mgmt-asgn-file-input').click()}>
                            <input id="mgmt-asgn-file-input" type="file" accept={ALLOWED_EXT} onChange={handleFile} style={{ display:'none' }}/>
                            {file ? (
                                <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center' }}>
                                    <FileText size={16} style={{ color:'var(--color-primary)' }}/>
                                    <span style={{ fontSize:13, color:'var(--color-text)', fontWeight:600 }}>{file.name}</span>
                                    <button type="button" onClick={e => { e.stopPropagation(); setFile(null) }} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--color-red)', padding:2 }}><X size={12}/></button>
                                </div>
                            ) : isEdit && assignment?.file ? (
                                <div style={{ display:'flex', alignItems:'center', gap:8, justifyContent:'center', flexWrap:'wrap' }}>
                                    <FileText size={16} style={{ color:'var(--color-primary)' }}/>
                                    <a href={assignment.file} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}
                                        style={{ fontSize:13, color:'var(--color-primary)', fontWeight:600, textDecoration:'underline' }}>
                                        {assignment.file_name || 'View current file'}
                                    </a>
                                    <span style={{ fontSize:11, color:'var(--color-text-secondary)' }}>· click to replace</span>
                                </div>
                            ) : (
                                <>
                                    <Upload size={20} style={{ color:'var(--color-text-secondary)', margin:'0 auto 6px', display:'block' }}/>
                                    <p style={{ fontSize:12, color:'var(--color-text-secondary)', margin:0 }}>Click to upload or drag & drop</p>
                                    <p style={{ fontSize:11, color:'var(--color-text-secondary)', margin:'3px 0 0' }}>PDF, DOC, DOCX · Max 20 MB</p>
                                </>
                            )}
                        </div>
                        {isEdit && assignment?.file && !file && (
                            <p style={{ fontSize:11, color:'var(--color-text-secondary)', margin:'4px 0 0' }}>The current file stays attached unless you upload a new one.</p>
                        )}
                    </div>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 20px', borderTop:'1px solid var(--color-border)' }}>
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
                    Delete Assignment
                </h3>
                <p style={{ fontSize:13, color:'var(--color-text-secondary)', lineHeight:1.55, margin:'0 0 22px' }}>
                    Are you sure you want to delete <strong>{getTaskTitle(assignment)}</strong>? This action cannot be undone.
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
    const { tasks, loading, error, stats, refetch, submitAssignment } = useTasks()
    const isStudent = true // this component only ever renders for students; kept so existing JSX below is untouched

    const [searchParams, setSearchParams] = useSearchParams()
    const courseFilter = searchParams.get('course') || 'all'

    const [activeTab, setActiveTab]   = useState('all')
    const [search,    setSearch]      = useState('')
    const [sortBy,    setSortBy]      = useState('due')
    const [submitTask, setSubmitTask] = useState(null)
    const [expandedId, setExpandedId] = useState(null)

    // Courses derived from the student's own assignments (no extra API call needed)
    const courses = useMemo(() => {
        const map = new Map()
        tasks.forEach(t => {
            const id = t.assignment?.course
            if (id != null && !map.has(id)) map.set(id, getCourseName(t))
        })
        return Array.from(map, ([id, name]) => ({ id, name })).sort((a,b) => a.name.localeCompare(b.name))
    }, [tasks])

    function handleCourseFilterChange(value) {
        const next = new URLSearchParams(searchParams)
        if (value === 'all') next.delete('course'); else next.set('course', value)
        setSearchParams(next, { replace:true })
    }

    const filtered = useMemo(() => {
        let list = [...tasks]
        if (activeTab !== 'all') list = list.filter(t => t.status === activeTab)

        if (courseFilter !== 'all') list = list.filter(t => String(t.assignment?.course) === String(courseFilter))

        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(t =>
                getTaskTitle(t).toLowerCase().includes(q) ||
                getCourseName(t).toLowerCase().includes(q)
            )
        }

        if (sortBy === 'due') {
            // Soonest due date first; tasks with no due date sink to the bottom.
            list.sort((a, b) => (getTaskDueDate(a) || '9999-99-99').localeCompare(getTaskDueDate(b) || '9999-99-99'))
        } else if (sortBy === 'due-desc') {
            list.sort((a, b) => (getTaskDueDate(b) || '0000-00-00').localeCompare(getTaskDueDate(a) || '0000-00-00'))
        } else if (sortBy === 'title') {
            list.sort((a, b) => getTaskTitle(a).localeCompare(getTaskTitle(b)))
        } else if (sortBy === 'importance') {
            // Highest importance first (assignment.priority, 1-5, teacher-set)
            list.sort((a, b) => (b.assignment?.priority ?? 0) - (a.assignment?.priority ?? 0))
        } else if (sortBy === 'urgency') {
            // Highest urgency first (priority_score, 0-1, system-computed).
            // Completed tasks sink to the bottom — urgency no longer applies to them.
            list.sort((a, b) => {
                const ua = a.status === 'completed' ? -1 : (a.priority_score ?? 0)
                const ub = b.status === 'completed' ? -1 : (b.priority_score ?? 0)
                return ub - ua
            })
        }

        return list
    }, [tasks, activeTab, search, courseFilter, sortBy])

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
                .am-row-grid {
                    display:grid;
                    grid-template-columns:minmax(170px,1fr) minmax(120px,0.5fr) 100px 100px 120px 100px 120px;
                    align-items:center; column-gap:14px; row-gap:8px;
                }
                .am-row-head span { font-size:10.5px; font-weight:700; text-transform:uppercase; letter-spacing:0.03em; color:var(--color-text-placeholder); }
                @media (max-width:900px) { .am-row-grid { grid-template-columns:minmax(0,1fr); gap:6px; } .am-row-head { display:none; } }
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

            {/* Stats strip — Total first, Rejected before Overdue, matching the Dashboard */}
            <div className="stat-grid stagger">
                <StatCard label="Total Assignments" value={stats.total}     icon={<ClipboardList/>}       accent="#6d4fc2"/>
                <StatCard label="Completed" value={stats.completed} icon={<CheckCircle2/>} accent="#3cb87a"/>
                <StatCard label="Submitted" value={stats.submitted} icon={<Send/>}         accent="#3b6fd4"/>
                <StatCard label="Pending"   value={stats.pending}   icon={<Clock/>}        accent="#d4a93c"/>
                <StatCard label="Rejected"  value={stats.rejected}  icon={<XCircle/>}      accent="#e05252"/>
                <StatCard label="Overdue"   value={stats.overdue}   icon={<AlertCircle/>}  accent="#e05252"/>
            </div>

            {/* Filter bar */}
            <div className="am-filter">
                <div style={{ position:'relative', flex:1, minWidth:180 }}>
                    <Search size={12} style={{ position:'absolute', left:9, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-placeholder)', pointerEvents:'none' }}/>
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search assignments…"
                        style={{ ...selStyle, paddingLeft:28, width:'100%', boxSizing:'border-box' }}/>
                </div>
                {courses.length > 0 && (
                    <select value={courseFilter} onChange={e => handleCourseFilterChange(e.target.value)} style={selStyle}>
                        <option value="all">All Subjects</option>
                        {courses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                )}
                <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle} aria-label="Sort assignments">
                    <option value="due">Due Date: Earliest First</option>
                    <option value="due-desc">Due Date: Latest First</option>
                    <option value="title">Title (A–Z)</option>
                    <option value="importance">Importance: Highest First</option>
                    <option value="urgency">Urgency: Highest First</option>
                </select>
                <button onClick={refetch} className="btn-secondary" style={{ padding:'7px 10px' }}>
                    <RefreshCw size={12}/>
                </button>
            </div>

            {/* Tabs */}
            <div className="am-tabs">
                {TABS.map(t => {
                    const active = activeTab === t.key
                    return (
                        <button key={t.key} className={`tab-btn${active ? ' active' : ''}`}
                            onClick={() => setActiveTab(t.key)}>
                            {t.label}
                            <span style={{ marginLeft:5, fontSize:11, fontWeight:600, padding:'1px 6px', borderRadius:99,
                                background: active?'rgba(26,31,53,0.1)':'rgba(255,255,255,0.15)', color:'inherit' }}>
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

            {/* Flat assignment list — aligned table columns, one row per assignment */}
            {!loading && !error && filtered.length > 0 && (
                <div className="white-card overflow-hidden">
                    <div className="am-row-grid am-row-head" style={{ padding:'12px 20px', background:'var(--color-surface-subtle)', borderBottom:'1px solid var(--color-border)' }}>
                        <span>Assignment</span>
                        <span>Course</span>
                        <span>Importance</span>
                        <span>Urgency</span>
                        <span>Due Date</span>
                        <span>Status</span>
                        <span style={{ textAlign:'right' }}>Action</span>
                    </div>
                    <div style={{ display:'flex', flexDirection:'column' }}>
                        {filtered.map((t, idx) => {
                            const due    = getTaskDueDate(t)
                            const d      = daysUntil(due)
                            const sb     = { label: statusLabel(t), color: statusColor(t), bg: statusBg(t) }
                            const urgent = t.status === 'overdue' || t.status === 'rejected'
                            const canSub = t.status === 'pending' || t.status === 'overdue' || t.status === 'rejected'
                            const canEdit = t.status === 'submitted'
                            const isOpen = expandedId === t.id
                            const desc   = t.assignment?.description?.trim()
                            const docFile = t.assignment?.file
                            const docName = t.assignment?.file_name || 'Document'
                            const hasDetails = Boolean(desc) || Boolean(docFile)
                            const courseName = getCourseName(t)
                            const importanceVal = t.assignment?.priority
                            const iColor = priorityColor(importanceVal)
                            const iLabel = priorityLabel(importanceVal)
                            const isDone = t.status === 'completed'
                            const uScore = t.priority_score
                            const uColor = isDone ? 'var(--color-text-placeholder)' : urgencyColor(uScore)
                            const uLabel = isDone ? '—' : urgencyLabel(uScore)

                            return (
                                <div key={t.id} style={{ padding:'14px 20px', background: idx % 2 ? 'var(--color-surface-subtle)' : 'var(--color-surface)', borderBottom:'1px solid var(--color-border)' }}>
                                    <div className="am-row-grid">
                                        <div
                                            onClick={() => hasDetails && setExpandedId(isOpen ? null : t.id)}
                                            style={{ display:'flex', alignItems:'center', gap:6, cursor: hasDetails ? 'pointer' : 'default', minWidth:0 }}>
                                            <p title={getTaskTitle(t)} style={{ fontSize:12.5, fontWeight:700, color:'var(--color-text)', margin:0, lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                {getTaskTitle(t)}
                                            </p>
                                            {hasDetails && (
                                                <ChevronDown size={12} style={{ color:'var(--color-text-placeholder)', flexShrink:0, transform: isOpen ? 'rotate(180deg)' : 'none', transition:'transform 0.15s' }}/>
                                            )}
                                            {docFile && (
                                                <Paperclip size={11} style={{ color:'#6d4fc2', flexShrink:0 }} aria-label="Document attached"/>
                                            )}
                                        </div>

                                        <span style={{ fontSize:11, fontWeight:600, color:'var(--color-primary)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
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
                                            {fmtDate(due)}
                                            {urgent && d !== null && d < 0 && <span style={{ display:'block', fontSize:10 }}>({Math.abs(d)}d late)</span>}
                                        </span>

                                        <span style={{ fontSize:10.5, fontWeight:700, padding:'3px 9px', borderRadius:99, background:sb.bg, color:sb.color, whiteSpace:'nowrap', justifySelf:'start' }}>
                                            {sb.label}
                                        </span>

                                        <div style={{ display:'flex', justifyContent:'flex-end' }}>
                                            {isStudent && (canSub || canEdit) && (
                                                <button onClick={() => setSubmitTask(t)}
                                                    style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, padding:'6px 12px', fontSize:11, fontWeight:600, whiteSpace:'nowrap',
                                                        background: t.status==='rejected' ? 'var(--color-red-light)' : 'var(--color-primary-light)',
                                                        color:      t.status==='rejected' ? 'var(--color-red)'       : 'var(--color-primary)',
                                                        border: `1px solid ${t.status==='rejected' ? 'var(--color-red)' : 'var(--color-primary)'}`,
                                                        borderRadius:7, cursor:'pointer' }}>
                                                    {canEdit ? <><Pencil size={11}/> Edit</> : <><Upload size={11}/> {t.status === 'rejected' ? 'Resubmit' : 'Submit'}</>}
                                                </button>
                                            )}
                                            {t.status === 'completed' && (
                                                <span style={{ fontSize:11, fontWeight:600, color:'var(--color-green)' }}>✓ Approved</span>
                                            )}
                                        </div>
                                    </div>

                                    {t.teacher_feedback && (
                                        <div style={{ display:'flex', alignItems:'flex-start', gap:5, marginTop:8, padding:'5px 8px', background:sb.bg, borderRadius:7 }}>
                                            <MessageSquare size={11} style={{ color:sb.color, marginTop:1, flexShrink:0 }}/>
                                            <p style={{ fontSize:11, color:sb.color, margin:0, lineHeight:1.35 }}>{t.teacher_feedback}</p>
                                        </div>
                                    )}

                                    {isOpen && hasDetails && (
                                        <div style={{ marginTop:8, padding:'10px 12px', background:'var(--color-surface)', borderRadius:8 }}>
                                            <p style={{ fontSize:12.5, fontWeight:700, color:'var(--color-text)', margin:'0 0 6px', lineHeight:1.4 }}>
                                                {getTaskTitle(t)}
                                            </p>
                                            {desc && (
                                                <p style={{ fontSize:11.5, color:'var(--color-text-secondary)', margin:0, lineHeight:1.5, whiteSpace:'pre-wrap' }}>
                                                    {desc}
                                                </p>
                                            )}
                                            {docFile && (
                                                <div style={{ display:'flex', alignItems:'center', gap:14, marginTop: desc?10:0, flexWrap:'wrap' }}>
                                                    <span style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:11.5, fontWeight:600, color:'var(--color-text-secondary)' }}>
                                                        <FileText size={12}/> {docName}
                                                    </span>
                                                    <a href={docFile} target="_blank" rel="noreferrer"
                                                        style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600, color:'var(--color-primary)', textDecoration:'none' }}>
                                                        <FileText size={12}/> View
                                                    </a>
                                                    <a href={docFile} target="_blank" rel="noreferrer" download={docName}
                                                        style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:11.5, fontWeight:600, color:'var(--color-primary)', textDecoration:'none' }}>
                                                        <Paperclip size={12}/> Download
                                                    </a>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                    </div>
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
                    <Plus size={14} aria-hidden="true"/> Create Assignment
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
                                            Due {fmtDate(a.due_date)} {urgent && `(${Math.abs(d)}d late)`}
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
                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:'var(--color-surface-subtle)', color:priorityColor(a.priority) }}>
                                        Importance: {a.priority_label || '—'}
                                    </span>
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