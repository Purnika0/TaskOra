import React, { useState, useEffect, useCallback, useMemo } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
    Users, RefreshCw, ShieldCheck, Trash2, Search,
    GraduationCap, BookOpen, Plus, X, LayoutDashboard, History,
    BarChart2, UserCheck, UserX,
    KeyRound, ClipboardList, Pencil, Copy, Wand2, Inbox,
    Building2, Clock, Sparkles, Filter, Mail, MailOpen, CheckCircle2, MessageSquareText,
    Eye, EyeOff,
} from 'lucide-react'
import {
    PieChart, Pie, Cell, BarChart, Bar, LineChart, Line,
    XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'
import authService    from '../../services/auth.service.js'
import coursesService from '../../services/courses.service.js'
import contactService from '../../services/contact.service.js'
import { useToast }   from '../../context/ToastContext.jsx'
import { useConfirm } from '../../context/ConfirmContext.jsx'
import { useAuth }    from '../../hooks/useAuth.js'
import { LoadingBlock } from '../../components/shared/Loader.jsx'
import BSDatePicker   from '../../components/shared/BSDatePicker.jsx'
import { apiError }   from '../../utils/helpers.js'

const A = {
    blue:'#2563EB', blueBg:'#DBEAFE',
    green:'#059669', greenBg:'#D1FAE5',
    amber:'#D97706', amberBg:'#FEF3C7',
    red:'#DC2626', redBg:'#FEE2E2',
    purple:'#7C3AED', purpleBg:'#EDE9FE',
}

const ROLE_STYLE = {
    admin:   { bg:A.redBg,    color:'#991B1B', label:'Admin'   },
    teacher: { bg:A.purpleBg, color:'#5B21B6', label:'Teacher' },
    student: { bg:A.blueBg,   color:'#1E40AF', label:'Student' },
}

function generatePassword() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%'
    let out = ''
    for (let i = 0; i < 12; i++) out += chars[Math.floor(Math.random() * chars.length)]
    return out
}

function RoleBadge({ role }) {
    const s = ROLE_STYLE[role] || ROLE_STYLE.student
    return <span className="pill" style={{ background:s.bg, color:s.color, textTransform:'capitalize' }}>{s.label}</span>
}

function StatusBadge({ active }) {
    return active
        ? <span className="pill" style={{ background:A.greenBg, color:'#065F46' }}><UserCheck size={11}/> Active</span>
        : <span className="pill" style={{ background:A.amberBg, color:A.amber }}><UserX size={11}/> Suspended</span>
}

function MessageStatusBadge({ status }) {
    const map = {
        NEW:      { bg:A.blueBg,  color:'#1E40AF', label:'New',      icon:Mail },
        READ:     { bg:A.amberBg, color:A.amber,   label:'Read',     icon:MailOpen },
        RESOLVED: { bg:A.greenBg, color:'#065F46', label:'Resolved', icon:CheckCircle2 },
    }
    const s = map[status] || map.NEW
    const Icon = s.icon
    return <span className="pill" style={{ background:s.bg, color:s.color }}><Icon size={11}/> {s.label}</span>
}

function Avatar({ name, size=34 }) {
    const init = (name || '?').charAt(0).toUpperCase()
    return (
        <div style={{ width:size, height:size, borderRadius:'50%', background:A.blueBg, color:A.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:Math.round(size*0.34), fontWeight:700, flexShrink:0 }} aria-hidden="true">
            {init}
        </div>
    )
}

function IconBtn({ icon:Icon, onClick, title, tone='default', disabled }) {
    const tones = {
        default: { bg:'var(--color-surface-subtle)', color:'var(--color-text-secondary)' },
        danger:  { bg:A.redBg,   color:A.red },
        warn:    { bg:A.amberBg, color:A.amber },
        good:    { bg:A.greenBg, color:A.green },
    }
    const t = tones[tone]
    return (
        <button onClick={onClick} disabled={disabled} title={title} aria-label={title}
            style={{ width:30, height:30, borderRadius:8, border:'none', background:t.bg, color:t.color, cursor:disabled?'not-allowed':'pointer', display:'flex', alignItems:'center', justifyContent:'center', opacity:disabled?0.5:1, transition:'transform 0.12s ease' }}
            onMouseEnter={e => { if (!disabled) e.currentTarget.style.transform = 'scale(1.08)' }}
            onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)' }}
        >
            <Icon size={14}/>
        </button>
    )
}

function EmptyState({ icon:Icon, title, message }) {
    return (
        <div style={{ padding:'52px 20px', textAlign:'center' }}>
            <div style={{ width:52, height:52, borderRadius:14, background:'var(--color-surface-subtle)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }} aria-hidden="true">
                <Icon size={22} style={{ color:'var(--color-text-placeholder)' }}/>
            </div>
            <p style={{ fontSize:14, fontWeight:700, color:'var(--color-text)', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>{title}</p>
            {message && <p style={{ fontSize:12.5, color:'var(--color-text-muted)', margin:'0 auto', maxWidth:280, lineHeight:1.6 }}>{message}</p>}
        </div>
    )
}

function StatCard({ label, value, icon:Icon, color, loading }) {
    return (
        <div className="stat-box">
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                <span className="stat-label" style={{ marginBottom:0 }}>{label}</span>
                <div style={{ width:28, height:28, borderRadius:8, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <Icon size={13} style={{ color }}/>
                </div>
            </div>
            {loading
                ? <div style={{ height:30, background:'var(--color-surface-subtle)', borderRadius:6 }}/>
                : <p className="stat-value" style={{ margin:0 }}>{value ?? 0}</p>
            }
        </div>
    )
}

function ModalField({ value, error, onChange, placeholder, type = 'text' }) {
    return (
        <div>
            <input
                type={type}
                value={value}
                onChange={e => onChange(e.target.value)}
                placeholder={placeholder}
                className={`form-input${error ? ' error' : ''}`}
            />
            {error && <p style={{ fontSize:11.5, color:'var(--color-red)', margin:'4px 0 0' }}>{error}</p>}
        </div>
    )
}

// ── Add Teacher modal ────────────────────────────────────────────────────────
function AddTeacherModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ full_name:'', username:'', email:'', password:'', confirm:'' })
    const [showPw, setShowPw] = useState(false)
    const [showConfirm, setShowConfirm] = useState(false)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})
    const toast = useToast()

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

    function handleGenerate() {
        const pw = generatePassword()
        setForm(f => ({ ...f, password: pw, confirm: pw }))
        setErrors(e => ({ ...e, password: null, confirm: null }))
        setShowPw(true); setShowConfirm(true)
    }

    async function handleCopy() {
        if (!form.password) return
        try {
            await navigator.clipboard.writeText(form.password)
            toast.success('Password copied to clipboard')
        } catch {
            toast.error('Could not copy automatically — please copy it manually')
        }
    }

    async function submit() {
        const e = {}
        if (!form.full_name.trim()) e.full_name = 'Required'
        if (!form.username.trim())  e.username  = 'Required'
        if (!form.email.trim())     e.email     = 'Required'
        if (!form.password)         e.password  = 'Required (min 8 chars)'
        else if (form.password.length < 8) e.password = 'Min 8 characters'
        if (!form.confirm)          e.confirm   = 'Please confirm the password'
        else if (form.confirm !== form.password) e.confirm = 'Passwords do not match'
        if (Object.keys(e).length) { setErrors(e); return }
        setSaving(true)
        try {
            const created = await authService.createTeacher({
                full_name: form.full_name, username: form.username,
                email: form.email, password: form.password,
            })
            toast.success(`Teacher account created for ${form.full_name}`)
            onCreated(created)
            onClose()
        } catch (err) {
            toast.error(apiError(err))
        } finally { setSaving(false) }
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth:480 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--color-border)', background:'var(--color-sidebar)' }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#fff', margin:0 }}>Create Teacher Account</h3>
                        <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.65)', margin:'3px 0 0' }}>Credentials will be shared with the teacher directly</p>
                    </div>
                    <button onClick={onClose} aria-label="Close" style={{ background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', padding:7, borderRadius:8, color:'#fff', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:22, display:'flex', flexDirection:'column', gap:14 }}>
                    <ModalField value={form.full_name} error={errors.full_name} onChange={v => set('full_name', v)} placeholder="Full Name *"/>
                    <ModalField value={form.username}  error={errors.username}  onChange={v => set('username', v)}  placeholder="Username *"/>
                    <ModalField value={form.email}      error={errors.email}      onChange={v => set('email', v)}      placeholder="Email Address *" type="email"/>

                    <div>
                        <div style={{ position:'relative' }}>
                            <input type={showPw ? 'text' : 'password'} value={form.password}
                                onChange={e => set('password', e.target.value)}
                                placeholder="Temporary Password * (min 8 chars)"
                                className={`form-input${errors.password ? ' error' : ''}`}
                                style={{ paddingRight:36 }}/>
                            <button type="button" onClick={() => setShowPw(s => !s)} aria-label={showPw ? 'Hide password' : 'Show password'}
                                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--color-text-placeholder)', display:'flex' }}>
                                {showPw ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                        </div>
                        {errors.password && <p style={{ fontSize:11.5, color:'var(--color-red)', margin:'4px 0 0' }}>{errors.password}</p>}
                    </div>

                    <div>
                        <div style={{ position:'relative' }}>
                            <input type={showConfirm ? 'text' : 'password'} value={form.confirm}
                                onChange={e => set('confirm', e.target.value)}
                                placeholder="Confirm Password *"
                                className={`form-input${errors.confirm ? ' error' : ''}`}
                                style={{ paddingRight:36 }}/>
                            <button type="button" onClick={() => setShowConfirm(s => !s)} aria-label={showConfirm ? 'Hide password' : 'Show password'}
                                style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'var(--color-text-placeholder)', display:'flex' }}>
                                {showConfirm ? <EyeOff size={14}/> : <Eye size={14}/>}
                            </button>
                        </div>
                        {errors.confirm && <p style={{ fontSize:11.5, color:'var(--color-red)', margin:'4px 0 0' }}>{errors.confirm}</p>}
                    </div>

                    <div style={{ display:'flex', gap:8 }}>
                        <button type="button" onClick={handleGenerate} className="btn-secondary" style={{ flex:1, justifyContent:'center' }}>
                            <Wand2 size={13}/> Generate Password
                        </button>
                        <button type="button" onClick={handleCopy} disabled={!form.password} className="btn-secondary" style={{ flex:1, justifyContent:'center', opacity: form.password ? 1 : 0.5 }}>
                            <Copy size={13}/> Copy Password
                        </button>
                    </div>

                    <div style={{ background:'var(--color-amber-light)', border:'1px solid #FDE68A', borderRadius:8, padding:'10px 12px' }}>
                        <p style={{ fontSize:11.5, color:'#92400E', margin:0, lineHeight:1.5 }}>
                            <strong>Note:</strong> Share these credentials with the teacher privately. They should change their password on first login.
                        </p>
                    </div>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid var(--color-border)' }}>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={submit} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
                        {saving ? 'Creating…' : <><GraduationCap size={13}/> Create Teacher</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── User list table (reused for Teachers and Students tabs) ─────────────────
// `extraColumn`, if given, is { header, render(user) } and is inserted right
// before the Status column — used by the Teachers tab to show a course count.
function UserTable({ users, loading, currentUser, onDelete, onSuspend, emptyTitle, emptyMsg, extraColumn, searchPlaceholder }) {
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        if (!search.trim()) return users
        const q = search.toLowerCase()
        return users.filter(u => [u.username, u.full_name || '', u.email || ''].some(v => v.toLowerCase().includes(q)))
    }, [users, search])

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ position:'relative', maxWidth:340 }}>
                <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-placeholder)', pointerEvents:'none' }}/>
                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder={searchPlaceholder || 'Search by name, username, or email…'}
                    aria-label="Search"
                    className="form-input" style={{ paddingLeft:32 }}/>
            </div>

            <div className="white-card" style={{ overflow:'hidden' }}>
                {loading ? (
                    <div style={{ padding:24 }}><LoadingBlock/></div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon={search ? Search : Inbox}
                        title={search ? 'No matches found' : (emptyTitle || 'No users yet')}
                        message={search ? `Nothing matches "${search}".` : emptyMsg}/>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="task-table" style={{ minWidth: extraColumn ? 660 : 560 }}>
                            <thead>
                                <tr>
                                    {['Name', 'Username', 'Email', ...(extraColumn ? [extraColumn.header] : []), 'Status', 'Actions'].map(h => (
                                        <th key={h}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(u => {
                                    const isMe = currentUser?.id === u.id
                                    const isSuspended = u.is_active === false
                                    return (
                                        <tr key={u.id}>
                                            <td>
                                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                    <Avatar name={u.full_name || u.username} size={32}/>
                                                    <div>
                                                        <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text)', margin:0 }}>{u.full_name || u.username}</p>
                                                        <RoleBadge role={u.role}/>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ color:'var(--color-text-secondary)' }}>@{u.username}</td>
                                            <td style={{ color:'var(--color-text-secondary)' }}>{u.email || '—'}</td>
                                            {extraColumn && <td>{extraColumn.render(u)}</td>}
                                            <td><StatusBadge active={!isSuspended}/></td>
                                            <td>
                                                {!isMe ? (
                                                    <div style={{ display:'flex', gap:6 }}>
                                                        <IconBtn icon={isSuspended ? UserCheck : UserX} tone={isSuspended ? 'good' : 'warn'}
                                                            onClick={() => onSuspend(u)} title={isSuspended ? 'Unsuspend user' : 'Suspend user'}/>
                                                        <IconBtn icon={Trash2} tone="danger" onClick={() => onDelete(u)} title="Delete user"/>
                                                    </div>
                                                ) : (
                                                    <span style={{ fontSize:11, color:'var(--color-text-placeholder)' }}>You</span>
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
            <p style={{ fontSize:11.5, color:'var(--color-text-muted)', margin:0 }}>{filtered.length} {filtered.length === 1 ? 'user' : 'users'}</p>
        </div>
    )
}

// ── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ users, courses, loading, coursesLoading, adminName }) {
    const counts = {
        total:     users.length,
        students:  users.filter(u => u.role === 'student').length,
        teachers:  users.filter(u => u.role === 'teacher').length,
        active:    users.filter(u => u.is_active !== false).length,
        suspended: users.filter(u => u.is_active === false).length,
    }
    const recent = [...users].sort((a, b) => (b.date_joined || '').localeCompare(a.date_joined || '')).slice(0, 8)
    const today = new Date().toLocaleDateString('en-US', { weekday:'long', year:'numeric', month:'long', day:'numeric' })

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div className="white-card" style={{ padding:'20px 22px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div>
                    <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'var(--color-text)', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
                        Welcome, {adminName || 'Administrator'}
                    </h2>
                    <p style={{ fontSize:12.5, color:'var(--color-text-muted)', margin:0 }}>{today}</p>
                </div>
                <p style={{ fontSize:13, color:'var(--color-text-secondary)', margin:0, maxWidth:340, lineHeight:1.6 }}>
                    {counts.total} registered user{counts.total !== 1 ? 's' : ''} across {counts.teachers} teacher{counts.teachers !== 1 ? 's' : ''} and {counts.students} student{counts.students !== 1 ? 's' : ''}, with {courses.length} course{courses.length !== 1 ? 's' : ''} on the platform.
                </p>
            </div>

            <div className="stat-grid" style={{ gridTemplateColumns:'repeat(3,1fr)' }}>
                <StatCard label="Total Users"   value={counts.total}    icon={Users}         color={A.blue}   loading={loading}/>
                <StatCard label="Teachers"      value={counts.teachers} icon={GraduationCap} color={A.purple} loading={loading}/>
                <StatCard label="Students"      value={counts.students} icon={BookOpen}      color={A.blue}   loading={loading}/>
                <StatCard label="Total Courses" value={courses.length}  icon={ClipboardList} color={A.blue}   loading={coursesLoading}/>
                <StatCard label="Active"        value={counts.active}   icon={UserCheck}     color={A.green}  loading={loading}/>
                <StatCard label="Suspended"     value={counts.suspended}icon={UserX}         color={A.amber}  loading={loading}/>
            </div>

            <div className="white-card" style={{ overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--color-border)', display:'flex', alignItems:'center', gap:8 }}>
                    <Clock size={14} style={{ color:'var(--color-text-muted)' }}/>
                    <p style={{ fontSize:13.5, fontWeight:700, color:'var(--color-text)', margin:0, fontFamily:'var(--font-display)' }}>Recent Registrations</p>
                </div>
                {loading ? <div style={{ padding:24 }}><LoadingBlock/></div> : recent.length === 0 ? (
                    <EmptyState icon={Inbox} title="No users yet" message="New registrations will show up here."/>
                ) : recent.map((u, i) => (
                    <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 18px', borderBottom: i < recent.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                        <Avatar name={u.full_name || u.username}/>
                        <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13.5, fontWeight:600, color:'var(--color-text)', margin:0 }} className="truncate">{u.full_name || u.username}</p>
                            <p style={{ fontSize:11, color:'var(--color-text-muted)', margin:0 }}>@{u.username}</p>
                        </div>
                        <RoleBadge role={u.role}/>
                        <span style={{ fontSize:11, color:'var(--color-text-muted)', whiteSpace:'nowrap' }}>
                            {u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-US', { month:'short', day:'numeric' }) : '—'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Teachers tab ─────────────────────────────────────────────────────────────
function TeachersTab({ teachers, courses, loading, currentUser, onDelete, onSuspend, onAddTeacher }) {
    // Real data only — computed from courses already loaded, no fabrication.
    const courseCountFor = teacherId => courses.filter(c => c.teacher?.id === teacherId)

    return (
        <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--color-text)', margin:0 }}>
                    Teachers <span style={{ fontSize:13, color:'var(--color-text-muted)', fontWeight:400 }}>({teachers.length})</span>
                </h3>
                <button onClick={onAddTeacher} className="btn-primary">
                    <Plus size={13}/> Add Teacher
                </button>
            </div>
            <UserTable
                users={teachers} loading={loading} currentUser={currentUser}
                onDelete={onDelete} onSuspend={onSuspend}
                emptyTitle="No teacher accounts yet" emptyMsg={'Click "Add Teacher" to create one.'}
                extraColumn={{
                    header: 'Courses',
                    render: u => {
                        const list = courseCountFor(u.id)
                        if (list.length === 0) return <span style={{ fontSize:11.5, color:'var(--color-text-placeholder)', fontStyle:'italic' }}>None</span>
                        return (
                            <span title={list.map(c => c.title).join(', ')}
                                style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11.5, color:A.blue, fontWeight:600 }}>
                                <BookOpen size={11}/> {list.length} course{list.length !== 1 ? 's' : ''}
                            </span>
                        )
                    },
                }}
            />
        </div>
    )
}

// ── Students tab ─────────────────────────────────────────────────────────────
function StudentsTab({ students, courses, loading, currentUser, onDelete, onSuspend }) {
    const [courseId, setCourseId] = useState('')       // '' = All Students
    const [filtered, setFiltered] = useState([])
    const [filterLoading, setFilterLoading] = useState(false)
    const toast = useToast()

    useEffect(() => {
        if (!courseId) return
        let cancelled = false
        setFilterLoading(true)
        coursesService.getStudents(courseId)
            .then(enrollments => { if (!cancelled) setFiltered(enrollments.map(e => e.student)) })
            .catch(() => { if (!cancelled) toast.error('Failed to load students for this course') })
            .finally(() => { if (!cancelled) setFilterLoading(false) })
        return () => { cancelled = true }
    }, [courseId])

    const shownUsers   = courseId ? filtered : students
    const shownLoading = courseId ? filterLoading : loading

    return (
        <div>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14, flexWrap:'wrap', gap:10 }}>
                <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--color-text)', margin:0 }}>
                    Students <span style={{ fontSize:13, color:'var(--color-text-muted)', fontWeight:400 }}>({shownUsers.length})</span>
                </h3>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <Filter size={13} style={{ color:'var(--color-text-muted)' }}/>
                    <select value={courseId} onChange={e => setCourseId(e.target.value)}
                        aria-label="Filter students by course"
                        className="form-input" style={{ width:'auto', minWidth:200, cursor:'pointer' }}>
                        <option value="">All Students</option>
                        {courses.map(c => (
                            <option key={c.id} value={c.id}>{c.title}</option>
                        ))}
                    </select>
                </div>
            </div>
            <UserTable
                users={shownUsers} loading={shownLoading} currentUser={currentUser}
                onDelete={onDelete} onSuspend={onSuspend}
                searchPlaceholder="Search by name, username, or email…"
                emptyTitle={courseId ? 'No students enrolled in this course' : 'No student accounts yet'}
                emptyMsg={courseId ? 'Students who join with this course\u2019s code will appear here.' : 'Students appear here once they register.'}
            />
        </div>
    )
}

// ── Create / Edit Course modal ───────────────────────────────────────────────
function CourseModal({ course, teachers, onClose, onSaved }) {
    const isEdit = !!course
    const [form, setForm] = useState({
        title:       course?.title || '',
        description: course?.description || '',
        start_date:  course?.start_date || '',
        end_date:    course?.end_date || '',
        teacher_id:  course?.teacher?.id ?? '',
    })
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})
    const toast = useToast()

    function set(k, v) { setForm(f => ({ ...f, [k]: v })); setErrors(e => ({ ...e, [k]: null })) }

    async function submit(e) {
        e.preventDefault()
        const errs = {}
        if (!form.title.trim()) errs.title = 'Required'
        if (Object.keys(errs).length) { setErrors(errs); return }

        const payload = {
            title:       form.title.trim(),
            description: form.description,
            start_date:  form.start_date || null,
            end_date:    form.end_date || null,
            teacher_id:  form.teacher_id === '' ? null : Number(form.teacher_id),
        }

        setSaving(true)
        try {
            if (isEdit) {
                await coursesService.update(course.id, payload)
                toast.success('Course updated')
            } else {
                await coursesService.create(payload)
                toast.success('Course created')
            }
            onSaved()
            onClose()
        } catch (err) {
            toast.error(apiError(err))
        } finally { setSaving(false) }
    }

    return (
        <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth:480 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--color-border)', background:'var(--color-sidebar)' }}>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#fff', margin:0 }}>
                        {isEdit ? 'Edit Course' : 'Create Course'}
                    </h3>
                    <button onClick={onClose} aria-label="Close" style={{ background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', padding:7, borderRadius:8, color:'#fff', display:'flex' }}><X size={16}/></button>
                </div>

                <form onSubmit={submit} style={{ padding:22, display:'flex', flexDirection:'column', gap:14 }}>
                    <div>
                        <input type="text" value={form.title} onChange={e => set('title', e.target.value)}
                            placeholder="Course title *" className={`form-input${errors.title ? ' error' : ''}`}/>
                        {errors.title && <p style={{ fontSize:11.5, color:'var(--color-red)', margin:'4px 0 0' }}>{errors.title}</p>}
                    </div>

                    <textarea value={form.description} onChange={e => set('description', e.target.value)}
                        placeholder="Description (optional)" rows={3}
                        className="form-input" style={{ resize:'vertical', fontFamily:'inherit' }}/>

                    <div style={{ display:'flex', gap:10 }}>
                        <div style={{ flex:1 }}>
                            <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', display:'block', marginBottom:5 }}>Start date</label>
                            <BSDatePicker value={form.start_date || ''} onChange={v => set('start_date', v)} placeholder="Select start date"/>
                        </div>
                        <div style={{ flex:1 }}>
                            <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', display:'block', marginBottom:5 }}>End date</label>
                            <BSDatePicker value={form.end_date || ''} onChange={v => set('end_date', v)} placeholder="Select end date"/>
                        </div>
                    </div>

                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', display:'block', marginBottom:5 }}>Assigned teacher</label>
                        <select value={form.teacher_id} onChange={e => set('teacher_id', e.target.value)}
                            className="form-input" style={{ cursor:'pointer' }}>
                            <option value="">— Unassigned —</option>
                            {teachers.map(t => (
                                <option key={t.id} value={t.id}>{t.full_name || t.username}</option>
                            ))}
                        </select>
                    </div>
                </form>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid var(--color-border)' }}>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={submit} disabled={saving} className="btn-primary" style={{ opacity: saving ? 0.7 : 1 }}>
                        {saving ? 'Saving…' : (isEdit ? 'Save Changes' : 'Create Course')}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Courses tab ──────────────────────────────────────────────────────────────
function CoursesTab({ courses, teachers, loading, reload }) {
    const [search, setSearch] = useState('')
    const [modalCourse, setModalCourse] = useState(undefined) // undefined = closed, null = create, object = edit
    const toast = useToast()
    const confirm = useConfirm()

    const filtered = useMemo(() => {
        if (!search.trim()) return courses
        const q = search.toLowerCase()
        return courses.filter(c => [c.title, c.teacher?.full_name || '', c.teacher?.username || '', c.join_code || '']
            .some(v => v.toLowerCase().includes(q)))
    }, [courses, search])

    async function handleDelete(c) {
        const ok = await confirm({ title:'Delete Course', message:'Are you sure you want to delete this course? ', danger:true, confirmLabel:'Delete' })
        if (!ok) return
        try {
            await coursesService.remove(c.id)
            toast.success('Course deleted')
            reload()
        } catch (err) { toast.error(apiError(err)) }
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                <div>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--color-text)', margin:0 }}>
                        Courses <span style={{ fontSize:13, color:'var(--color-text-muted)', fontWeight:400 }}>({courses.length})</span>
                    </h3>
                </div>
                <button onClick={() => setModalCourse(null)} className="btn-primary">
                    <Plus size={13}/> Create Course
                </button>
            </div>

            <div style={{ position:'relative', maxWidth:340 }}>
                <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-placeholder)', pointerEvents:'none' }}/>
                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by title, teacher, or join code…"
                    aria-label="Search courses"
                    className="form-input" style={{ paddingLeft:32 }}/>
            </div>

            {loading ? (
                <div className="white-card" style={{ padding:28 }}><LoadingBlock/></div>
            ) : filtered.length === 0 ? (
                <div className="white-card">
                    <EmptyState icon={search ? Search : Building2}
                        title={search ? 'No matches found' : 'No courses yet'}
                        message={search ? `Nothing matches "${search}".` : "Click \u201cCreate Course\u201d to add the first one."}/>
                </div>
            ) : (
                <div className="course-grid">
                    {filtered.map(c => (
                        <div key={c.id} className="white-card" style={{ padding:18, display:'flex', flexDirection:'column', gap:10 }}>
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                                <div style={{ width:38, height:38, borderRadius:10, background:A.blueBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <BookOpen size={17} style={{ color:A.blue }}/>
                                </div>
                                <div style={{ display:'flex', gap:6 }}>
                                    <IconBtn icon={Pencil} onClick={() => setModalCourse(c)} title="Edit course"/>
                                    <IconBtn icon={Trash2} tone="danger" onClick={() => handleDelete(c)} title="Delete course"/>
                                </div>
                            </div>

                            <div>
                                <p style={{ fontSize:14.5, fontWeight:700, color:'var(--color-text)', margin:'0 0 6px', fontFamily:'var(--font-display)', lineHeight:1.3 }}>{c.title}</p>
                                {c.description && (
                                    <p style={{ fontSize:12, color:'var(--color-text-muted)', margin:0, lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                                        {c.description}
                                    </p>
                                )}
                            </div>

                            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:12, color:'var(--color-text-secondary)' }}>
                                <GraduationCap size={12} style={{ color:'var(--color-text-placeholder)', flexShrink:0 }}/>
                                {c.teacher
                                    ? <span className="truncate">{c.teacher.full_name || c.teacher.username}</span>
                                    : <span style={{ fontStyle:'italic', color:'var(--color-text-placeholder)' }}>Unassigned</span>}
                            </div>

                            {c.join_code && (
                                <div style={{ display:'flex', alignItems:'center', gap:6, background:'var(--color-surface-subtle)', border:'1px solid var(--color-border)', borderRadius:7, padding:'6px 9px', marginTop:'auto' }}>
                                    <KeyRound size={11} style={{ color:'var(--color-text-placeholder)' }}/>
                                    <span style={{ fontSize:11.5, fontFamily:'monospace', fontWeight:700, color:'var(--color-text-secondary)', letterSpacing:'0.05em' }}>{c.join_code}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {modalCourse !== undefined && (
                <CourseModal
                    course={modalCourse}
                    teachers={teachers}
                    onClose={() => setModalCourse(undefined)}
                    onSaved={reload}
                />
            )}
        </div>
    )
}

// ── Analytics tab ────────────────────────────────────────────────────────────
// Everything here is computed from data already loaded (users + courses) —
// no fabricated numbers, no invented historical trends. The line chart uses
// each user's real date_joined to plot cumulative growth over time.
const CHART_TOOLTIP_STYLE = { fontSize:12, borderRadius:8, border:'1px solid var(--color-border)', boxShadow:'var(--shadow-md)' }

// ── View Message modal ───────────────────────────────────────────────────────
function ViewMessageModal({ message, onClose, onMarkResolved }) {
    return (
        <div className="modal-backdrop">
            <div className="modal-box" style={{ maxWidth:520 }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid var(--color-border)', background:'var(--color-sidebar)' }}>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#fff', margin:0 }}>
                        Contact Message
                    </h3>
                    <button onClick={onClose} aria-label="Close" style={{ background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', padding:7, borderRadius:8, color:'#fff', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:22, display:'flex', flexDirection:'column', gap:14, maxHeight:'60vh', overflowY:'auto' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                        <Avatar name={message.full_name} size={40}/>
                        <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:14, fontWeight:700, color:'var(--color-text)', margin:0 }}>{message.full_name}</p>
                            <p style={{ fontSize:12.5, color:'var(--color-text-secondary)', margin:'2px 0 0', wordBreak:'break-all' }}>{message.email}</p>
                        </div>
                        <MessageStatusBadge status={message.status}/>
                    </div>

                    <div>
                        <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Subject</p>
                        <p style={{ fontSize:13.5, color:'var(--color-text)', margin:0 }}>{message.subject || '(no subject)'}</p>
                    </div>

                    <div>
                        <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Message</p>
                        <p style={{ fontSize:13.5, color:'var(--color-text)', margin:0, lineHeight:1.6, whiteSpace:'pre-wrap' }}>{message.message}</p>
                    </div>

                    <div>
                        <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text-muted)', margin:'0 0 4px', textTransform:'uppercase', letterSpacing:'0.05em' }}>Submitted</p>
                        <p style={{ fontSize:12.5, color:'var(--color-text-secondary)', margin:0 }}>
                            {new Date(message.submitted_at).toLocaleString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                        </p>
                    </div>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid var(--color-border)' }}>
                    <button onClick={onClose} className="btn-secondary">Close</button>
                    {message.status !== 'RESOLVED' && (
                        <button onClick={onMarkResolved} className="btn-primary">Mark Resolved</button>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Contact Messages tab ─────────────────────────────────────────────────────
function MessagesTab({ messages, loading, onView, onMarkRead, onMarkResolved, onDelete }) {
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        if (!search.trim()) return messages
        const q = search.toLowerCase()
        return messages.filter(m => [m.full_name, m.email, m.subject || ''].some(v => v.toLowerCase().includes(q)))
    }, [messages, search])

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ position:'relative', maxWidth:340 }}>
                <Search size={14} style={{ position:'absolute', left:11, top:'50%', transform:'translateY(-50%)', color:'var(--color-text-placeholder)', pointerEvents:'none' }}/>
                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search by name, email, or subject…"
                    aria-label="Search"
                    className="form-input" style={{ paddingLeft:32 }}/>
            </div>

            <div className="white-card" style={{ overflow:'hidden' }}>
                {loading ? (
                    <div style={{ padding:24 }}><LoadingBlock/></div>
                ) : filtered.length === 0 ? (
                    <EmptyState icon={search ? Search : Inbox}
                        title={search ? 'No matches found' : 'No messages yet'}
                        message={search ? `Nothing matches "${search}".` : 'Contact form submissions will show up here.'}/>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="task-table" style={{ minWidth:680 }}>
                            <thead>
                                <tr>
                                    {['Name', 'Email', 'Subject', 'Status', 'Date', 'Actions'].map(h => (
                                        <th key={h}>{h}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(m => (
                                    <tr key={m.id}>
                                        <td>
                                            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                <Avatar name={m.full_name} size={32}/>
                                                <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text)', margin:0 }}>{m.full_name}</p>
                                            </div>
                                        </td>
                                        <td style={{ color:'var(--color-text-secondary)' }}>{m.email}</td>
                                        <td style={{ color:'var(--color-text-secondary)', maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                            {m.subject || <span style={{ color:'var(--color-text-placeholder)' }}>(no subject)</span>}
                                        </td>
                                        <td><MessageStatusBadge status={m.status}/></td>
                                        <td style={{ color:'var(--color-text-secondary)', whiteSpace:'nowrap' }}>
                                            {new Date(m.submitted_at).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
                                        </td>
                                        <td>
                                            <div style={{ display:'flex', gap:6 }}>
                                                <IconBtn icon={MessageSquareText} onClick={() => onView(m)} title="View message"/>
                                                {m.status === 'NEW' && (
                                                    <IconBtn icon={MailOpen} tone="warn" onClick={() => onMarkRead(m)} title="Mark as read"/>
                                                )}
                                                {m.status !== 'RESOLVED' && (
                                                    <IconBtn icon={CheckCircle2} tone="good" onClick={() => onMarkResolved(m)} title="Mark as resolved"/>
                                                )}
                                                <IconBtn icon={Trash2} tone="danger" onClick={() => onDelete(m)} title="Delete message"/>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
            <p style={{ fontSize:11.5, color:'var(--color-text-muted)', margin:0 }}>{filtered.length} {filtered.length === 1 ? 'message' : 'messages'}</p>
        </div>
    )
}

function ChartCard({ title, children, empty, emptyMsg, height = 220 }) {
    return (
        <div className="white-card" style={{ padding:20 }}>
            <p style={{ fontSize:13, fontWeight:700, color:'var(--color-text)', margin:'0 0 12px', fontFamily:'var(--font-display)' }}>{title}</p>
            {empty
                ? <p style={{ fontSize:12.5, color:'var(--color-text-muted)', margin:0 }}>{emptyMsg}</p>
                : <div style={{ width:'100%', height }}>{children}</div>}
        </div>
    )
}

// Renders each slice's name + count directly on the donut chart (not just on
// hover), matching the pattern used on the teacher-facing Analytics page.
function renderDonutLabel({ cx, cy, midAngle, outerRadius, name, value }) {
    const RADIAN = Math.PI / 180
    const radius = outerRadius + 18
    const x = cx + radius * Math.cos(-midAngle * RADIAN)
    const y = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
        <text x={x} y={y} fill="var(--color-text-secondary)" fontSize={11} fontWeight={600} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {`${name} (${value})`}
        </text>
    )
}

// Custom Y-axis tick for the horizontal "Courses per Teacher" bar chart —
// keeps every teacher's name on a single, cleanly right-aligned line instead
// of Recharts' default awkward two-line word-wrap for longer names.
function TeacherNameTick({ x, y, payload }) {
    const name = payload.value
    const short = name.length > 16 ? `${name.slice(0, 15)}…` : name
    return (
        <text x={x} y={y} dy={4} textAnchor="end" fontSize={11.5} fontWeight={600} fontFamily="var(--font-body)" fill="var(--color-text-secondary)">
            <title>{name}</title>
            {short}
        </text>
    )
}

function AnalyticsTab({ users, courses, loading }) {
    const teachers  = users.filter(u => u.role === 'teacher')
    const students  = users.filter(u => u.role === 'student')
    const active    = users.filter(u => u.is_active !== false).length
    const suspended = users.filter(u => u.is_active === false).length
    const assigned   = courses.filter(c => c.teacher).length
    const unassigned = courses.length - assigned

    const roleData = useMemo(() => ([
        { name:'Teachers', value:teachers.length, color:A.purple },
        { name:'Students', value:students.length, color:A.blue },
    ]), [teachers.length, students.length])

    const statusData = useMemo(() => ([
        { name:'Active',    value:active,    color:A.green },
        { name:'Suspended', value:suspended, color:A.amber },
    ]), [active, suspended])

    // Courses per teacher — real counts from already-loaded course data,
    // sorted descending so the busiest teachers lead the chart.
    const teacherCourseData = useMemo(() => {
        const byTeacher = {}
        courses.forEach(c => {
            if (!c.teacher) return
            const key = c.teacher.full_name || c.teacher.username
            byTeacher[key] = (byTeacher[key] || 0) + 1
        })
        return Object.entries(byTeacher)
            .map(([name, count]) => ({ name, count }))
            .sort((a, b) => b.count - a.count)
    }, [courses])

    // Cap what we chart to the top 10 — beyond that a bar chart just becomes
    // noise, and the "Courses by Teacher" list below already covers everyone.
    const topTeacherCourseData = teacherCourseData.slice(0, 10)

    // Teacher → course titles, for the table view (answers "who teaches what").
    const teacherCourseMap = useMemo(() => {
        return teachers.map(t => ({
            teacher: t,
            courses: courses.filter(c => c.teacher?.id === t.id),
        })).sort((a, b) => b.courses.length - a.courses.length)
    }, [teachers, courses])

    // Cumulative registrations over time, from real date_joined values.
    const growthData = useMemo(() => {
        const withDates = users.filter(u => u.date_joined)
        const byDay = {}
        withDates.forEach(u => {
            const day = u.date_joined.slice(0, 10)
            byDay[day] = (byDay[day] || 0) + 1
        })
        const days = Object.keys(byDay).sort()
        return days.map((day, i) => ({
            date: new Date(day).toLocaleDateString('en-US', { month:'short', day:'numeric' }),
            total: days.slice(0, i + 1).reduce((sum, d) => sum + byDay[d], 0),
        }))
    }, [users])

    if (loading) return <div className="white-card" style={{ padding:28 }}><LoadingBlock/></div>

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div className="stat-grid" style={{ gridTemplateColumns:'repeat(4,1fr)' }}>
                <StatCard label="Total Users"     value={users.length}   icon={Users}         color={A.blue}/>
                <StatCard label="Total Courses"   value={courses.length} icon={ClipboardList} color={A.blue}/>
                <StatCard label="Teacher:Student" value={`${teachers.length}:${students.length}`} icon={GraduationCap} color={A.purple}/>
                <StatCard label="Active:Suspended" value={`${active}:${suspended}`} icon={UserCheck} color={A.green}/>
            </div>

            <div className="grid-2">
                <ChartCard title="User Distribution" empty={users.length === 0} emptyMsg="No users yet.">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={roleData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}
                                label={renderDonutLabel} labelLine={{ stroke:'var(--color-border)' }}>
                                {roleData.map(d => <Cell key={d.name} fill={d.color}/>)}
                            </Pie>
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE}/>
                            <Legend iconType="circle" wrapperStyle={{ fontSize:12 }}/>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>

                <ChartCard title="Account Status" empty={users.length === 0} emptyMsg="No users yet.">
                    <ResponsiveContainer>
                        <PieChart>
                            <Pie data={statusData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={78} paddingAngle={3}
                                label={renderDonutLabel} labelLine={{ stroke:'var(--color-border)' }}>
                                {statusData.map(d => <Cell key={d.name} fill={d.color}/>)}
                            </Pie>
                            <Tooltip contentStyle={CHART_TOOLTIP_STYLE}/>
                            <Legend iconType="circle" wrapperStyle={{ fontSize:12 }}/>
                        </PieChart>
                    </ResponsiveContainer>
                </ChartCard>
            </div>

            {/* Horizontal layout: teacher names stay readable no matter how many
                there are, and we only chart the top 10 so it never gets cramped. */}
            <ChartCard
                title="Courses per Teacher"
                empty={teacherCourseData.length === 0}
                emptyMsg="No courses assigned to a teacher yet."
                height={Math.max(160, topTeacherCourseData.length * 30)}
            >
                <ResponsiveContainer>
                    <BarChart data={topTeacherCourseData} layout="vertical" margin={{ left:10, right:24, top:4, bottom:4 }} barCategoryGap="28%">
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" horizontal={false}/>
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize:11 }}/>
                        <YAxis type="category" dataKey="name" width={130} tick={<TeacherNameTick/>} interval={0}/>
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE}/>
                        <Bar dataKey="count" name="Courses" fill={A.blue} radius={[0, 6, 6, 0]} barSize={16}/>
                    </BarChart>
                </ResponsiveContainer>
            </ChartCard>
            {teacherCourseData.length > 10 && (
                <p style={{ fontSize:11.5, color:'var(--color-text-muted)', margin:'-8px 0 0' }}>
                    Showing top 10 of {teacherCourseData.length} teachers with assigned courses — see the full breakdown below.
                </p>
            )}
            {unassigned > 0 && (
                <p style={{ fontSize:11.5, color:'var(--color-text-muted)', margin:'-8px 0 0' }}>
                    {unassigned} course{unassigned !== 1 ? 's' : ''} currently unassigned — not shown above.
                </p>
            )}

            <ChartCard title="Registrations Over Time" empty={growthData.length < 2} emptyMsg="Not enough registration history yet to plot a trend.">
                <ResponsiveContainer>
                    <LineChart data={growthData} margin={{ left:-20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)"/>
                        <XAxis dataKey="date" tick={{ fontSize:11 }}/>
                        <YAxis allowDecimals={false} tick={{ fontSize:11 }}/>
                        <Tooltip contentStyle={CHART_TOOLTIP_STYLE}/>
                        <Line type="monotone" dataKey="total" name="Total users" stroke={A.blue} strokeWidth={2} dot={false}/>
                    </LineChart>
                </ResponsiveContainer>
            </ChartCard>

            {/* Teacher → Course breakdown (answers "which teacher has which course") */}
            <div className="white-card" style={{ overflow:'hidden' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--color-border)' }}>
                    <p style={{ fontSize:13, fontWeight:700, color:'var(--color-text)', margin:0, fontFamily:'var(--font-display)' }}>Courses by Teacher</p>
                </div>
                {teachers.length === 0 ? (
                    <EmptyState icon={GraduationCap} title="No teachers yet" message="Add a teacher to see their course assignments here."/>
                ) : (
                    <div style={{ padding:'4px 18px 14px' }}>
                        {teacherCourseMap.map(({ teacher, courses: tCourses }, i) => (
                            <div key={teacher.id} style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 0', borderBottom: i < teacherCourseMap.length - 1 ? '1px solid var(--color-border)' : 'none' }}>
                                <div style={{ width:32, height:32, borderRadius:8, background:A.purpleBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <GraduationCap size={15} style={{ color:A.purple }}/>
                                </div>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text)', margin:'0 0 4px' }}>{teacher.full_name || teacher.username}</p>
                                    {tCourses.length === 0 ? (
                                        <span style={{ fontSize:11.5, color:'var(--color-text-placeholder)', fontStyle:'italic' }}>No courses assigned</span>
                                    ) : (
                                        <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                                            {tCourses.map(c => (
                                                <span key={c.id} style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:11, background:'var(--color-surface-subtle)', border:'1px solid var(--color-border)', borderRadius:99, padding:'3px 9px', color:'var(--color-text-secondary)' }}>
                                                    <BookOpen size={10}/> {c.title}
                                                </span>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Activity tab ──────────────────────────────────────────────────────────────
// Built from the same registration data used elsewhere — no invented events.
const ACTIVITY_ICON = { teacher: GraduationCap, student: BookOpen, admin: ShieldCheck }

function ActivityTab({ users, loading }) {
    const recent = [...users].sort((a, b) => (b.date_joined || '').localeCompare(a.date_joined || '')).slice(0, 20)

    return (
        <div className="white-card" style={{ overflow:'hidden' }}>
            <div style={{ padding:'14px 18px', borderBottom:'1px solid var(--color-border)' }}>
                <p style={{ fontSize:13.5, fontWeight:700, color:'var(--color-text)', margin:0, fontFamily:'var(--font-display)' }}>Recent Activity</p>
            </div>
            {loading ? <div style={{ padding:24 }}><LoadingBlock/></div> : recent.length === 0 ? (
                <EmptyState icon={History} title="No activity yet" message="Registration activity will show up here."/>
            ) : (
                <div style={{ padding:'4px 18px 14px' }}>
                    {recent.map((u, i) => {
                        const Icon = ACTIVITY_ICON[u.role] || Sparkles
                        const s = ROLE_STYLE[u.role] || ROLE_STYLE.student
                        return (
                            <div key={u.id} style={{ display:'flex', gap:12, position:'relative' }}>
                                <div style={{ display:'flex', flexDirection:'column', alignItems:'center' }}>
                                    <div style={{ width:30, height:30, borderRadius:'50%', background:s.bg, color:s.color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, marginTop:10 }}>
                                        <Icon size={14}/>
                                    </div>
                                    {i < recent.length - 1 && <div style={{ width:2, flex:1, background:'var(--color-border)', minHeight:16 }}/>}
                                </div>
                                <div style={{ flex:1, paddingTop:10, paddingBottom:i < recent.length - 1 ? 12 : 0, minWidth:0 }}>
                                    <p style={{ fontSize:13, color:'var(--color-text)', margin:0 }}>
                                        <strong>{u.full_name || u.username}</strong> joined as {u.role}
                                    </p>
                                    <p style={{ fontSize:11, color:'var(--color-text-muted)', margin:'2px 0 0' }}>
                                        {u.date_joined
                                            ? new Date(u.date_joined).toLocaleDateString('en-US', { weekday:'short', month:'short', day:'numeric', year:'numeric' })
                                            : 'Date unknown'}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
    { key:'overview',  label:'Overview',  icon:LayoutDashboard },
    { key:'teachers',  label:'Teachers',  icon:GraduationCap   },
    { key:'students',  label:'Students',  icon:BookOpen        },
    { key:'courses',   label:'Courses',   icon:ClipboardList   },
    { key:'messages',  label:'Messages',  icon:Mail            },
    { key:'analytics', label:'Analytics', icon:BarChart2       },
    { key:'activity',  label:'Activity',  icon:History         },
]
const TAB_KEYS = TABS.map(t => t.key)

export default function AdminDashboard({ initialTab }) {
    const { user }    = useAuth()
    const toast       = useToast()
    const confirm     = useConfirm()
    const [searchParams, setSearchParams] = useSearchParams()

    const urlTab = searchParams.get('tab')
    const tab = TAB_KEYS.includes(urlTab) ? urlTab : (initialTab || 'overview')

    function setTab(key) {
        setSearchParams(prev => {
            const next = new URLSearchParams(prev)
            next.set('tab', key)
            return next
        }, { replace: true })
    }

    const [users,           setUsers]           = useState([])
    const [courses,         setCourses]         = useState([])
    const [messages,        setMessages]        = useState([])
    const [loading,         setLoading]         = useState(true)
    const [coursesLoading,  setCoursesLoading]  = useState(true)
    const [messagesLoading, setMessagesLoading] = useState(true)
    const [showAdd,         setShowAdd]         = useState(false)
    const [viewingMessage,  setViewingMessage]  = useState(null)

    const load = useCallback(async () => {
        setLoading(true)
        try { setUsers(await authService.listUsers()) }
        catch { toast.error('Failed to load users') }
        finally { setLoading(false) }
    }, [])

    const loadCourses = useCallback(async () => {
        setCoursesLoading(true)
        try { setCourses(await coursesService.list()) }
        catch { toast.error('Failed to load courses') }
        finally { setCoursesLoading(false) }
    }, [])

    const loadMessages = useCallback(async () => {
        setMessagesLoading(true)
        try { setMessages(await contactService.listMessages()) }
        catch { toast.error('Failed to load contact messages') }
        finally { setMessagesLoading(false) }
    }, [])

    useEffect(() => { load(); loadCourses(); loadMessages() }, [load, loadCourses, loadMessages])

    function refreshAll() { load(); loadCourses(); loadMessages() }

    const teachers = users.filter(u => u.role === 'teacher')
    const students = users.filter(u => u.role === 'student')

    async function handleDelete(u) {
        const entity = u.role === 'teacher' ? 'Teacher' : u.role === 'student' ? 'Student' : 'User'
        const ok = await confirm({ title:`Delete ${entity}`, message:`Are you sure you want to delete this ${entity.toLowerCase()}? This action cannot be undone.`, danger:true, confirmLabel:'Delete' })
        if (!ok) return
        try { await authService.deleteUser(u.id); toast.success('User deleted'); load() }
        catch (err) { toast.error(apiError(err)) }
    }

    async function handleSuspend(u) {
        const next   = u.is_active === false
        const action = next ? 'Unsuspend' : 'Suspend'
        const ok = await confirm({ title:`${action} "${u.full_name || u.username}"?`, message: next ? 'User will regain access.' : 'User will lose access until unsuspended.', danger: !next, confirmLabel: action })
        if (!ok) return
        try {
            await authService.updateUser(u.id, { is_active: next })
            toast.success(`${u.username} ${next ? 'unsuspended' : 'suspended'}`)
            load()
        } catch { toast.error('Suspend requires backend is_active support.') }
    }

    function handleViewMessage(m) {
        setViewingMessage(m)
        if (m.status === 'NEW') handleMarkMessageRead(m, { silent: true })
    }

    async function handleMarkMessageRead(m, { silent = false } = {}) {
        try {
            const updated = await contactService.updateStatus(m.id, 'READ')
            setMessages(prev => prev.map(x => x.id === m.id ? { ...x, ...updated } : x))
            setViewingMessage(prev => prev && prev.id === m.id ? { ...prev, ...updated } : prev)
            if (!silent) toast.success('Marked as read')
        } catch (err) { if (!silent) toast.error(apiError(err)) }
    }

    async function handleMarkMessageResolved(m) {
        try {
            const updated = await contactService.updateStatus(m.id, 'RESOLVED')
            setMessages(prev => prev.map(x => x.id === m.id ? { ...x, ...updated } : x))
            setViewingMessage(prev => prev && prev.id === m.id ? { ...prev, ...updated } : prev)
            toast.success('Marked as resolved')
        } catch (err) { toast.error(apiError(err)) }
    }

    async function handleDeleteMessage(m) {
        const ok = await confirm({ title:'Delete Message', message:'Are you sure you want to delete this message? ', danger:true, confirmLabel:'Delete' })
        if (!ok) return
        try {
            await contactService.remove(m.id)
            setMessages(prev => prev.filter(x => x.id !== m.id))
            toast.success('Message deleted')
        } catch (err) { toast.error(apiError(err)) }
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }} className="anim-fade-in">

            {/* Header banner */}
            <div className="admin-header" style={{ marginBottom:20 }}>
                <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, background:'rgba(255,255,255,0.05)', borderRadius:'50%' }}/>
                <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }} aria-hidden="true">
                            <ShieldCheck size={20} color="#fff"/>
                        </div>
                        <div>
                            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'#fff', margin:0, letterSpacing:'-0.02em' }}>
                                Administration
                            </h1>
                            <p style={{ fontSize:11.5, color:'rgba(255,255,255,0.60)', margin:'3px 0 0' }}>
                                TaskOra Platform Control · {user?.full_name || user?.username}
                            </p>
                        </div>
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'#fff', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                            System Admin
                        </span>
                        <button onClick={() => setShowAdd(true)}
                            style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', color:'var(--color-sidebar)', border:'none', borderRadius:9, padding:'9px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                            <Plus size={13}/> Add Teacher
                        </button>
                        
                        <button onClick={refreshAll} aria-label="Refresh dashboard data"
                            style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.20)', borderRadius:9, padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            <RefreshCw size={12}/> Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab bar — stretches full width, each tab gets equal space */}
            <div className="tab-bar" style={{ marginBottom:20, borderRadius:'var(--radius-lg)', borderBottom:'1px solid var(--color-border)', display:'flex', width:'100%' }} role="tablist" aria-label="Admin sections">
                {TABS.map(t => {
                    const Icon = t.icon
                    const active = tab === t.key
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            role="tab" aria-selected={active}
                            className={`tab-btn${active ? ' active' : ''}`}
                            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, flex:1 }}>
                            <Icon size={13}/> {t.label}
                        </button>
                    )
                })}
            </div>

            {/* Tab content */}
            <div key={tab} className="anim-fade-in">
                {tab === 'overview' && (
                    <OverviewTab users={users} courses={courses} loading={loading} coursesLoading={coursesLoading} adminName={user?.full_name || user?.username}/>
                )}
                {tab === 'teachers' && (
                    <TeachersTab teachers={teachers} courses={courses} loading={loading} currentUser={user}
                        onDelete={handleDelete} onSuspend={handleSuspend} onAddTeacher={() => setShowAdd(true)}/>
                )}
                {tab === 'students' && (
                    <StudentsTab students={students} courses={courses} loading={loading} currentUser={user}
                        onDelete={handleDelete} onSuspend={handleSuspend}/>
                )}
                {tab === 'courses' && (
                    <CoursesTab courses={courses} teachers={teachers} loading={coursesLoading} reload={loadCourses}/>
                )}
                {tab === 'messages' && (
                    <MessagesTab messages={messages} loading={messagesLoading}
                        onView={handleViewMessage} onMarkRead={handleMarkMessageRead}
                        onMarkResolved={handleMarkMessageResolved} onDelete={handleDeleteMessage}/>
                )}
                {tab === 'analytics' && (
                    <AnalyticsTab users={users} courses={courses} loading={loading || coursesLoading}/>
                )}
                {tab === 'activity' && (
                    <ActivityTab users={users} loading={loading}/>
                )}
            </div>

            {showAdd && (
                <AddTeacherModal
                    onClose={() => setShowAdd(false)}
                    onCreated={created => {
                        setUsers(prev => [created, ...prev])
                        setTab('teachers')
                    }}
                />
            )}

            {viewingMessage && (
                <ViewMessageModal
                    message={viewingMessage}
                    onClose={() => setViewingMessage(null)}
                    onMarkResolved={() => handleMarkMessageResolved(viewingMessage)}
                />
            )}
        </div>
    )
}