// src/pages/app/AdminDashboard.jsx
// UPDATED per spec + backend integration guide:
//  • LIGHT THEME — no more dark-only admin shell
//  • Tabs: Overview · Teachers · Students · Courses · Analytics · Activity
//  • "Add Teacher" form with full fields (name, email, username, temp password, subject)
//  • Teacher list with delete/suspend controls
//  • Student list with delete/suspend controls
//  • Course management panel
//  • "Task" → "Assignment" throughout
//  • initialTab prop support for direct navigation from sidebar

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
    Users, RefreshCw, ShieldCheck, Trash2, Search,
    GraduationCap, BookOpen, ChevronUp, ChevronDown,
    Clock, Plus, X, LayoutDashboard, Activity,
    BarChart2, UserCheck, UserX, Eye, EyeOff, Minus,
    ArrowUpRight, Circle, KeyRound, ClipboardList,
} from 'lucide-react'
import authService    from '../../services/auth.service.js'
import coursesService from '../../services/courses.service.js'
import { useToast }   from '../../context/ToastContext.jsx'
import { useConfirm } from '../../context/ConfirmContext.jsx'
import { useAuth }    from '../../hooks/useAuth.js'
import { LoadingBlock } from '../../components/shared/Loader.jsx'
import { apiError }   from '../../utils/helpers.js'

// ── Light palette for admin (matches site theme) ────────────────────────────
const A = {
    blue:    '#2563EB', blueBg:  '#DBEAFE',
    green:   '#059669', greenBg: '#D1FAE5',
    amber:   '#D97706', amberBg: '#FEF3C7',
    red:     '#DC2626', redBg:   '#FEE2E2',
    purple:  '#7C3AED', purpleBg:'#EDE9FE',
    navy:    '#1E3A5F',
}

const ROLE_STYLE = {
    admin:   { bg:'#FEE2E2', color:'#991B1B', label:'Admin'   },
    teacher: { bg:'#EDE9FE', color:'#5B21B6', label:'Teacher' },
    student: { bg:'#DBEAFE', color:'#1E40AF', label:'Student' },
}

// ── Metric card ──────────────────────────────────────────────────────────────
function Metric({ label, value, icon:Icon, color, sub, loading }) {
    return (
        <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'18px 20px', borderTop:`3px solid ${color}`, boxShadow:'0 1px 4px rgba(15,23,42,0.05)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#94A3B8' }}>{label}</span>
                <div style={{ width:30, height:30, borderRadius:8, background:`${color}18`, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <Icon size={14} style={{ color }}/>
                </div>
            </div>
            {loading
                ? <div style={{ height:34, background:'#F0F4F8', borderRadius:6 }}/>
                : <>
                    <p style={{ fontSize:30, fontWeight:800, color:'#0F172A', lineHeight:1, fontFamily:'var(--font-display)', letterSpacing:'-0.04em', margin:0 }}>{value ?? 0}</p>
                    {sub && <p style={{ fontSize:11, color:'#94A3B8', margin:'5px 0 0' }}>{sub}</p>}
                </>
            }
        </div>
    )
}

function RoleBadge({ role }) {
    const s = ROLE_STYLE[role] || ROLE_STYLE.student
    return (
        <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:s.bg, color:s.color, textTransform:'capitalize' }}>
            {s.label}
        </span>
    )
}

// ── Add Teacher modal ────────────────────────────────────────────────────────
function AddTeacherModal({ onClose, onCreated }) {
    const [form, setForm] = useState({ full_name:'', username:'', email:'', password:'', subject:'' })
    const [show, setShow] = useState(false)
    const [saving, setSaving] = useState(false)
    const [errors, setErrors] = useState({})
    const toast = useToast()

    function set(k,v) { setForm(f=>({...f,[k]:v})); setErrors(e=>({...e,[k]:null})) }

    async function submit() {
        const e = {}
        if (!form.full_name.trim()) e.full_name = 'Required'
        if (!form.username.trim())  e.username  = 'Required'
        if (!form.email.trim())     e.email     = 'Required'
        if (!form.password)         e.password  = 'Required (min 8 chars)'
        else if (form.password.length < 8) e.password = 'Min 8 characters'
        if (Object.keys(e).length) { setErrors(e); return }
        setSaving(true)
        try {
            const created = await authService.createTeacher({
                ...form,
                role: 'teacher',
            })
            toast.success(`Teacher account created for ${form.full_name}`)
            onCreated(created)
            onClose()
        } catch(err) {
            toast.error(apiError(err))
        } finally { setSaving(false) }
    }

    const inp = (k, placeholder, type='text') => (
        <div>
            <input
                type={type}
                value={form[k]}
                onChange={e => set(k, e.target.value)}
                placeholder={placeholder}
                style={{ width:'100%', boxSizing:'border-box', padding:'9px 12px', fontSize:13, border:`1.5px solid ${errors[k]?'#DC2626':'#E2E8F0'}`, borderRadius:8, background:'#F8FAFC', color:'#0F172A', outline:'none', fontFamily:'var(--font-body)' }}
            />
            {errors[k] && <p style={{ fontSize:11, color:'#DC2626', margin:'3px 0 0' }}>{errors[k]}</p>}
        </div>
    )

    return (
        <div style={{ position:'fixed', inset:0, zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(15,23,42,0.4)', backdropFilter:'blur(3px)', padding:16 }}>
            <div style={{ background:'#fff', borderRadius:16, width:'100%', maxWidth:480, boxShadow:'0 20px 60px rgba(15,23,42,0.22)', overflow:'hidden' }}>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'18px 22px', borderBottom:'1px solid #E2E8F0', background:'linear-gradient(135deg,#1E3A5F,#2563EB)' }}>
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#fff', margin:0 }}>Create Teacher Account</h3>
                        <p style={{ fontSize:11, color:'rgba(255,255,255,0.65)', margin:'2px 0 0' }}>Credentials will be shared with the teacher directly</p>
                    </div>
                    <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', cursor:'pointer', padding:7, borderRadius:8, color:'#fff', display:'flex' }}><X size={16}/></button>
                </div>

                <div style={{ padding:'20px 22px', display:'flex', flexDirection:'column', gap:12 }}>
                    {inp('full_name', 'Full Name *')}
                    {inp('username',  'Username *')}
                    {inp('email',     'Email Address *', 'email')}
                    <div style={{ position:'relative' }}>
                        <input
                            type={show ? 'text' : 'password'}
                            value={form.password}
                            onChange={e => set('password', e.target.value)}
                            placeholder="Temporary Password * (min 8 chars)"
                            style={{ width:'100%', boxSizing:'border-box', padding:'9px 36px 9px 12px', fontSize:13, border:`1.5px solid ${errors.password?'#DC2626':'#E2E8F0'}`, borderRadius:8, background:'#F8FAFC', color:'#0F172A', outline:'none', fontFamily:'var(--font-body)' }}
                        />
                        <button type="button" onClick={() => setShow(s=>!s)}
                            style={{ position:'absolute', right:10, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', color:'#94A3B8', display:'flex' }}>
                            {show ? <EyeOff size={14}/> : <Eye size={14}/>}
                        </button>
                        {errors.password && <p style={{ fontSize:11, color:'#DC2626', margin:'3px 0 0' }}>{errors.password}</p>}
                    </div>
                    {inp('subject', 'Subject / Department (optional)')}

                    <div style={{ background:'#FEF3C7', border:'1px solid #FDE68A', borderRadius:8, padding:'9px 12px' }}>
                        <p style={{ fontSize:11, color:'#92400E', margin:0 }}>
                            <strong>Note:</strong> Share these credentials with the teacher privately. They should change their password on first login.
                        </p>
                    </div>
                </div>

                <div style={{ display:'flex', justifyContent:'flex-end', gap:10, padding:'14px 22px', borderTop:'1px solid #E2E8F0' }}>
                    <button onClick={onClose} className="btn-secondary">Cancel</button>
                    <button onClick={submit} disabled={saving} className="btn-primary" style={{ opacity:saving?0.7:1 }}>
                        {saving ? 'Creating…' : <><GraduationCap size={13}/> Create Teacher</>}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── User list table (reused for teachers and students) ───────────────────────
function UserTable({ users, loading, currentUser, onDelete, onSuspend, emptyMsg }) {
    const [search, setSearch] = useState('')

    const filtered = useMemo(() => {
        if (!search.trim()) return users
        const q = search.toLowerCase()
        return users.filter(u => [u.username, u.full_name||'', u.email||''].some(v => v.toLowerCase().includes(q)))
    }, [users, search])

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ position:'relative' }}>
                <Search size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#94A3B8', pointerEvents:'none' }}/>
                <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Search…"
                    style={{ width:'100%', boxSizing:'border-box', paddingLeft:32, padding:'9px 12px 9px 32px', fontSize:13, border:'1.5px solid #E2E8F0', borderRadius:8, background:'#F8FAFC', color:'#0F172A', outline:'none', fontFamily:'var(--font-body)' }}/>
            </div>

            <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(15,23,42,0.05)' }}>
                {loading ? (
                    <div style={{ padding:24 }}><LoadingBlock/></div>
                ) : filtered.length === 0 ? (
                    <div style={{ padding:'40px 16px', textAlign:'center' }}>
                        <Users size={24} style={{ color:'#CBD5E1', margin:'0 auto 10px', display:'block' }}/>
                        <p style={{ fontSize:13, color:'#94A3B8' }}>{emptyMsg || 'No users found'}</p>
                    </div>
                ) : (
                    <div style={{ overflowX:'auto' }}>
                        <table style={{ width:'100%', borderCollapse:'collapse', minWidth:520 }}>
                            <thead>
                                <tr>
                                    {['Name','Username','Email','Status','Actions'].map(h => (
                                        <th key={h} style={{ padding:'10px 14px', fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.07em', color:'#94A3B8', background:'#F8FAFC', textAlign:'left', borderBottom:'1px solid #E2E8F0', whiteSpace:'nowrap' }}>
                                            {h}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((u, i) => {
                                    const isMe = currentUser?.id === u.id
                                    const isSuspended = u.is_active === false
                                    const init = (u.full_name||u.username||'?').charAt(0).toUpperCase()
                                    return (
                                        <tr key={u.id} style={{ borderBottom: i < filtered.length-1 ? '1px solid #F1F5F9' : 'none' }}>
                                            <td style={{ padding:'11px 14px' }}>
                                                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                                                    <div style={{ width:32, height:32, borderRadius:'50%', background:A.blueBg, color:A.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                                                        {init}
                                                    </div>
                                                    <div>
                                                        <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', margin:0 }}>{u.full_name || u.username}</p>
                                                        <RoleBadge role={u.role}/>
                                                    </div>
                                                </div>
                                            </td>
                                            <td style={{ padding:'11px 14px', fontSize:12, color:'#475569' }}>@{u.username}</td>
                                            <td style={{ padding:'11px 14px', fontSize:12, color:'#475569' }}>{u.email || '—'}</td>
                                            <td style={{ padding:'11px 14px' }}>
                                                {isSuspended ? (
                                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:A.amberBg, color:A.amber }}>Suspended</span>
                                                ) : (
                                                    <span style={{ fontSize:10, fontWeight:700, padding:'3px 8px', borderRadius:99, background:A.greenBg, color:A.green }}>Active</span>
                                                )}
                                            </td>
                                            <td style={{ padding:'11px 14px' }}>
                                                {!isMe && (
                                                    <div style={{ display:'flex', gap:6 }}>
                                                        <button onClick={() => onSuspend(u)}
                                                            style={{ width:28, height:28, borderRadius:7, border:'none', background:isSuspended?A.greenBg:A.amberBg, cursor:'pointer', color:isSuspended?A.green:A.amber, display:'flex', alignItems:'center', justifyContent:'center' }}
                                                            title={isSuspended ? 'Unsuspend' : 'Suspend'}>
                                                            {isSuspended ? <UserCheck size={13}/> : <UserX size={13}/>}
                                                        </button>
                                                        <button onClick={() => onDelete(u)}
                                                            style={{ width:28, height:28, borderRadius:7, border:'none', background:A.redBg, cursor:'pointer', color:A.red, display:'flex', alignItems:'center', justifyContent:'center' }}
                                                            title="Delete">
                                                            <Trash2 size={13}/>
                                                        </button>
                                                    </div>
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
            <p style={{ fontSize:11, color:'#94A3B8', margin:0 }}>{filtered.length} {filtered.length===1?'user':'users'}</p>
        </div>
    )
}

// ── Overview tab ─────────────────────────────────────────────────────────────
function OverviewTab({ users, loading }) {
    const counts = {
        total:     users.length,
        students:  users.filter(u => u.role==='student').length,
        teachers:  users.filter(u => u.role==='teacher').length,
        active:    users.filter(u => u.is_active!==false).length,
        suspended: users.filter(u => u.is_active===false).length,
    }
    const recent = [...users].sort((a,b)=>(b.date_joined||'').localeCompare(a.date_joined||'')).slice(0,8)

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:14 }}>
                <Metric label="Total Users"    value={counts.total}    icon={Users}         color={A.blue}   sub="All registered" loading={loading}/>
                <Metric label="Students"       value={counts.students} icon={BookOpen}      color={A.blue}   sub="Enrolled"       loading={loading}/>
                <Metric label="Teachers"       value={counts.teachers} icon={GraduationCap} color={A.purple} sub="Faculty"        loading={loading}/>
                <Metric label="Active"         value={counts.active}   icon={UserCheck}     color={A.green}  sub="Can access"     loading={loading}/>
                <Metric label="Suspended"      value={counts.suspended}icon={UserX}         color={A.amber}  sub="Restricted"     loading={loading}/>
            </div>

            {/* Recent registrations */}
            <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden', boxShadow:'0 1px 4px rgba(15,23,42,0.05)' }}>
                <div style={{ padding:'14px 18px', borderBottom:'1px solid #E2E8F0', display:'flex', alignItems:'center', gap:8 }}>
                    <Clock size={13} style={{ color:'#94A3B8' }}/>
                    <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', margin:0, fontFamily:'var(--font-display)' }}>Recent Registrations</p>
                </div>
                {loading ? <div style={{ padding:24 }}><LoadingBlock/></div> : recent.length === 0 ? (
                    <div style={{ padding:'32px 16px', textAlign:'center' }}>
                        <p style={{ fontSize:13, color:'#94A3B8' }}>No users yet.</p>
                    </div>
                ) : recent.map((u,i) => (
                    <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom: i<recent.length-1?'1px solid #F1F5F9':'none' }}>
                        <div style={{ width:32, height:32, borderRadius:'50%', background:A.blueBg, color:A.blue, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, flexShrink:0 }}>
                            {(u.full_name||u.username||'?').charAt(0).toUpperCase()}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', margin:0 }}>{u.full_name||u.username}</p>
                            <p style={{ fontSize:10, color:'#94A3B8', margin:0 }}>@{u.username}</p>
                        </div>
                        <RoleBadge role={u.role}/>
                        <span style={{ fontSize:10, color:'#94A3B8' }}>
                            {u.date_joined ? new Date(u.date_joined).toLocaleDateString('en-US',{month:'short',day:'numeric'}) : '—'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    )
}

// ── Courses tab ──────────────────────────────────────────────────────────────
function CoursesTab() {
    const [courses, setCourses] = useState([])
    const [loading, setLoading] = useState(true)
    const toast = useToast()
    const confirm = useConfirm()

    useEffect(() => {
        coursesService.list()
            .then(d => setCourses(Array.isArray(d)?d:[]))
            .catch(()=>{})
            .finally(()=>setLoading(false))
    }, [])

    async function handleDelete(c) {
        const ok = await confirm({ title:`Delete "${c.title||c.name}"?`, message:'All enrollments will be removed.', danger:true, confirmLabel:'Delete' })
        if (!ok) return
        try {
            await coursesService.remove(c.id)
            setCourses(prev => prev.filter(x=>x.id!==c.id))
            toast.success('Course deleted')
        } catch(err) { toast.error(apiError(err)) }
    }

    if (loading) return <LoadingBlock/>

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <p style={{ fontSize:14, fontWeight:700, color:'#0F172A', margin:0, fontFamily:'var(--font-display)' }}>
                    All Courses <span style={{ fontSize:12, color:'#94A3B8', fontWeight:400 }}>({courses.length})</span>
                </p>
            </div>

            {courses.length === 0 ? (
                <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:'44px 20px', textAlign:'center' }}>
                    <BookOpen size={24} style={{ color:'#CBD5E1', margin:'0 auto 10px', display:'block' }}/>
                    <p style={{ fontSize:13, color:'#94A3B8' }}>No courses created yet.</p>
                </div>
            ) : (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(260px,1fr))', gap:12 }}>
                    {courses.map(c => (
                        <div key={c.id} style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, padding:16, boxShadow:'0 1px 4px rgba(15,23,42,0.05)' }}>
                            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8, marginBottom:10 }}>
                                <div style={{ width:36, height:36, borderRadius:10, background:A.blueBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                                    <BookOpen size={16} style={{ color:A.blue }}/>
                                </div>
                                <button onClick={() => handleDelete(c)}
                                    style={{ width:26, height:26, borderRadius:6, border:'none', background:A.redBg, cursor:'pointer', color:A.red, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                    <Trash2 size={11}/>
                                </button>
                            </div>
                            <p style={{ fontSize:13, fontWeight:700, color:'#0F172A', margin:'0 0 4px', fontFamily:'var(--font-display)' }}>{c.title||c.name}</p>
                            {c.teacher_name && <p style={{ fontSize:11, color:'#64748B', margin:'0 0 8px' }}>Teacher: {c.teacher_name}</p>}
                            {c.enrollment_code && (
                                <div style={{ display:'flex', alignItems:'center', gap:6, background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:7, padding:'5px 9px' }}>
                                    <KeyRound size={11} style={{ color:'#94A3B8' }}/>
                                    <span style={{ fontSize:11, fontFamily:'monospace', fontWeight:600, color:'#475569' }}>{c.enrollment_code}</span>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
const TABS = [
    { key:'overview',  label:'Overview',     icon:LayoutDashboard },
    { key:'teachers',  label:'Teachers',     icon:GraduationCap   },
    { key:'students',  label:'Students',     icon:BookOpen        },
    { key:'courses',   label:'Courses',      icon:ClipboardList   },
    { key:'analytics', label:'Analytics',    icon:BarChart2       },
    { key:'activity',  label:'Activity',     icon:Activity        },
]

export default function AdminDashboard({ initialTab }) {
    const { user }   = useAuth()
    const toast      = useToast()
    const confirm    = useConfirm()
    const [users,    setUsers]    = useState([])
    const [loading,  setLoading]  = useState(true)
    const [tab,      setTab]      = useState(initialTab || 'overview')
    const [showAdd,  setShowAdd]  = useState(false)

    const load = useCallback(async () => {
        setLoading(true)
        try { setUsers(await authService.listUsers()) }
        catch { toast.error('Failed to load users') }
        finally { setLoading(false) }
    }, [])

    useEffect(() => { load() }, [load])

    const teachers = users.filter(u => u.role === 'teacher')
    const students = users.filter(u => u.role === 'student')

    async function handleDelete(u) {
        const ok = await confirm({ title:`Delete "${u.full_name||u.username}"?`, message:'Permanently removes the user and all their data.', danger:true, confirmLabel:'Delete' })
        if (!ok) return
        try { await authService.deleteUser(u.id); toast.success('User deleted'); load() }
        catch(err) { toast.error(apiError(err)) }
    }

    async function handleSuspend(u) {
        const next   = u.is_active === false
        const action = next ? 'Unsuspend' : 'Suspend'
        const ok = await confirm({ title:`${action} "${u.full_name||u.username}"?`, message: next?'User will regain access.':'User will lose access until unsuspended.', danger:!next, confirmLabel:action })
        if (!ok) return
        try {
            await authService.updateUser(u.id, { is_active: next })
            toast.success(`${u.username} ${next?'unsuspended':'suspended'}`)
            load()
        } catch { toast.error('Suspend requires backend is_active support.') }
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }} className="anim-fade-in">

            {/* Header banner */}
            <div style={{ background:'linear-gradient(135deg,#1E3A5F 0%,#2563EB 100%)', borderRadius:14, padding:'22px 26px', marginBottom:20, position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160, background:'rgba(255,255,255,0.05)', borderRadius:'50%' }}/>
                <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                        <div style={{ width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.15)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                            <ShieldCheck size={20} color="#fff"/>
                        </div>
                        <div>
                            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'#fff', margin:0, letterSpacing:'-0.02em' }}>
                                Administration
                            </h1>
                            <p style={{ fontSize:11, color:'rgba(255,255,255,0.60)', margin:'3px 0 0' }}>
                                TaskOra Platform Control · {user?.full_name||user?.username}
                            </p>
                        </div>
                    </div>
                    <div style={{ display:'flex', gap:10, alignItems:'center' }}>
                        <span style={{ fontSize:10, fontWeight:700, padding:'4px 10px', borderRadius:99, background:'rgba(255,255,255,0.15)', color:'#fff', textTransform:'uppercase', letterSpacing:'0.08em' }}>
                            System Admin
                        </span>
                        <button onClick={() => setShowAdd(true)}
                            style={{ display:'flex', alignItems:'center', gap:6, background:'#fff', color:'#1E3A5F', border:'none', borderRadius:9, padding:'9px 16px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                            <Plus size={13}/> Add Teacher
                        </button>
                        <button onClick={load}
                            style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,0.12)', color:'#fff', border:'1px solid rgba(255,255,255,0.20)', borderRadius:9, padding:'8px 14px', fontSize:12, fontWeight:600, cursor:'pointer' }}>
                            <RefreshCw size={12}/> Refresh
                        </button>
                    </div>
                </div>
            </div>

            {/* Tab bar — light theme */}
            <div style={{ display:'flex', background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, marginBottom:20, overflow:'hidden' }}>
                {TABS.map(t => {
                    const Icon   = t.icon
                    const active = tab === t.key
                    return (
                        <button key={t.key} onClick={() => setTab(t.key)}
                            style={{
                                flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6,
                                padding:'11px 8px', fontSize:12, fontWeight: active?700:500,
                                border:'none', background: active?A.blue:'transparent',
                                color: active?'#fff':'#64748B',
                                cursor:'pointer', fontFamily:'var(--font-body)',
                                whiteSpace:'nowrap', transition:'all 0.13s',
                                borderRight: '1px solid #E2E8F0',
                            }}>
                            <Icon size={13}/> <span className="hide-sm">{t.label}</span>
                        </button>
                    )
                })}
            </div>

            {/* Tab content */}
            <div key={tab} className="anim-fade-in">
                {tab === 'overview'  && <OverviewTab users={users} loading={loading}/>}
                {tab === 'teachers'  && (
                    <div>
                        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
                            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#0F172A', margin:0 }}>
                                Teachers <span style={{ fontSize:13, color:'#94A3B8', fontWeight:400 }}>({teachers.length})</span>
                            </h3>
                            <button onClick={() => setShowAdd(true)} className="btn-primary">
                                <Plus size={13}/> Add Teacher
                            </button>
                        </div>
                        <UserTable users={teachers} loading={loading} currentUser={user} onDelete={handleDelete} onSuspend={handleSuspend} emptyMsg="No teacher accounts yet. Click 'Add Teacher' to create one."/>
                    </div>
                )}
                {tab === 'students'  && (
                    <div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#0F172A', margin:'0 0 14px' }}>
                            Students <span style={{ fontSize:13, color:'#94A3B8', fontWeight:400 }}>({students.length})</span>
                        </h3>
                        <UserTable users={students} loading={loading} currentUser={user} onDelete={handleDelete} onSuspend={handleSuspend} emptyMsg="No student accounts yet."/>
                    </div>
                )}
                {tab === 'courses'   && <CoursesTab/>}
                {tab === 'analytics' && (
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(200px,1fr))', gap:14 }}>
                        <Metric label="Total Users"  value={users.length}                                    icon={Users}         color={A.blue}   loading={loading}/>
                        <Metric label="Teachers"     value={teachers.length}                                 icon={GraduationCap} color={A.purple} loading={loading}/>
                        <Metric label="Students"     value={students.length}                                 icon={BookOpen}      color={A.blue}   loading={loading}/>
                        <Metric label="Active"       value={users.filter(u=>u.is_active!==false).length}    icon={UserCheck}     color={A.green}  loading={loading}/>
                        <Metric label="Suspended"    value={users.filter(u=>u.is_active===false).length}    icon={UserX}         color={A.amber}  loading={loading}/>
                    </div>
                )}
                {tab === 'activity'  && (
                    <div style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:12, overflow:'hidden' }}>
                        <div style={{ padding:'14px 18px', borderBottom:'1px solid #E2E8F0' }}>
                            <p style={{ fontSize:13, fontWeight:700, color:'#0F172A', margin:0, fontFamily:'var(--font-display)' }}>Recent Activity</p>
                        </div>
                        {[...users].sort((a,b)=>(b.date_joined||'').localeCompare(a.date_joined||'')).slice(0,15).map((u,i,arr) => (
                            <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 18px', borderBottom: i<arr.length-1?'1px solid #F1F5F9':'none' }}>
                                <div style={{ width:7, height:7, borderRadius:'50%', background: u.role==='teacher'?A.purple:A.blue, flexShrink:0 }}/>
                                <p style={{ fontSize:13, color:'#0F172A', margin:0, flex:1 }}>
                                    <strong>{u.full_name||u.username}</strong> joined as {u.role}
                                </p>
                                <span style={{ fontSize:10, color:'#94A3B8', whiteSpace:'nowrap' }}>
                                    {u.date_joined ? new Date(u.date_joined).toLocaleDateString() : '—'}
                                </span>
                            </div>
                        ))}
                    </div>
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
        </div>
    )
}
