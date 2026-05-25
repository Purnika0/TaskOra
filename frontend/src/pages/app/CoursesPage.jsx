// src/pages/app/CoursesPage.jsx — pure CSS, no Tailwind classes

import React, { useState, useEffect } from 'react'
import { Plus, GraduationCap, Hash, BookOpen, Calendar, User } from 'lucide-react'
import { useAuth }        from '../../hooks/useAuth.js'
import { useToast }       from '../../context/ToastContext.jsx'
import coursesService     from '../../services/courses.service.js'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock }   from '../../components/shared/Loader.jsx'
import { apiError }       from '../../utils/helpers.js'

const inpStyle = {
    width:'100%', border:'1.5px solid #e2dbd0', borderRadius:8,
    padding:'9px 12px', fontSize:13, fontFamily:'var(--font-body)',
    color:'#1a1f35', background:'#faf8f5', outline:'none', boxSizing:'border-box',
    transition:'border-color 0.18s, box-shadow 0.18s',
}

function FormInput({ placeholder, type='text', value, onChange, required, rows }) {
    const [focused, setFocused] = useState(false)
    const style = {
        ...inpStyle,
        borderColor: focused ? '#1a1f35' : '#e2dbd0',
        boxShadow:   focused ? '0 0 0 3px rgba(26,31,53,0.08)' : 'none',
        background:  focused ? '#fff' : '#faf8f5',
    }
    const common = { style, value, onChange, required, placeholder,
        onFocus:()=>setFocused(true), onBlur:()=>setFocused(false) }
    return rows
        ? <textarea {...common} rows={rows} style={{ ...style, resize:'vertical' }}/>
        : <input {...common} type={type}/>
}

export default function CoursesPage() {
    const { user }    = useAuth()
    const toast       = useToast()
    const isTeacher   = user?.role === 'teacher'

    const [courses,     setCourses]     = useState([])
    const [loading,     setLoading]     = useState(true)
    const [joinCode,    setJoinCode]    = useState('')
    const [joining,     setJoining]     = useState(false)
    const [showCreate,  setShowCreate]  = useState(false)
    const [newCourse,   setNewCourse]   = useState({ title:'', description:'', start_date:'' })
    const [creating,    setCreating]    = useState(false)

async function load() {
        setLoading(true)
        try { setCourses(await (isTeacher ? coursesService.list() : coursesService.getMyCourses())) }
        catch { toast.error('Failed to load courses') }
        finally { setLoading(false) }
}
useEffect(() => { load() }, [])

async function handleJoin(e) {
        e.preventDefault()
        if (!joinCode.trim()) return
        setJoining(true)
        try {
        await coursesService.join(joinCode.trim().toUpperCase())
        toast.success('Joined course!')
        setJoinCode(''); load()
        } catch (err) { toast.error(apiError(err)) }
        finally { setJoining(false) }
}

async function handleCreate(e) {
        e.preventDefault()
        if (!newCourse.title.trim()) return
        setCreating(true)
        try {
        await coursesService.create(newCourse)
        toast.success('Course created')
        setShowCreate(false); setNewCourse({ title:'', description:'', start_date:'' }); load()
        } catch (err) { toast.error(apiError(err)) }
        finally { setCreating(false) }
}

return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }} className="anim-fade-in">

        {/* Page header */}
        <div className="page-header">
            <div>
            <h2 className="page-title">{isTeacher ? 'My Courses' : 'Enrolled Courses'}</h2>
            <p className="page-subtitle">{courses.length} {isTeacher ? 'course' : 'enrollment'}{courses.length!==1?'s':''}</p>
            </div>
            {isTeacher && (
            <button
                onClick={() => setShowCreate(v => !v)}
                className="btn-primary"
            >
                <Plus size={14} aria-hidden="true"/>
                {showCreate ? 'Cancel' : 'Create Course'}
            </button>
            )}
        </div>

        {/* Teacher: create form */}
        {isTeacher && showCreate && (
            <div className="white-card" style={{ padding:'20px 22px' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#1a1f35', margin:'0 0 16px' }}>
                New Course
            </h3>
            <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <FormInput placeholder="Course title *" value={newCourse.title}
                onChange={e => setNewCourse(p=>({...p,title:e.target.value}))} required/>
                <FormInput placeholder="Description (optional)" rows={2} value={newCourse.description}
                onChange={e => setNewCourse(p=>({...p,description:e.target.value}))}/>
                <FormInput type="date" value={newCourse.start_date} placeholder="Start date"
                onChange={e => setNewCourse(p=>({...p,start_date:e.target.value}))}/>
                <button type="submit" disabled={creating} className="btn-primary" style={{ alignSelf:'flex-start' }}>
                {creating ? 'Creating…' : 'Create Course'}
                </button>
            </form>
            </div>
)}

        {/* Student: join form */}
        {!isTeacher && (
            <div className="white-card" style={{ padding:'18px 22px' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#1a1f35', margin:'0 0 12px' }}>
                Join a Course
            </h3>
            <form onSubmit={handleJoin} style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
                <div style={{ position:'relative', flex:1, minWidth:180 }}>
                <Hash size={13} style={{ position:'absolute', left:10, top:'50%', transform:'translateY(-50%)', color:'#b0a898' }}/>
                <input type="text" value={joinCode}
                    onChange={e => setJoinCode(e.target.value)}
                    placeholder="Enter 8-character join code"
                    maxLength={8}
                    style={{ ...inpStyle, paddingLeft:30, textTransform:'uppercase', letterSpacing:'0.1em' }}
                />
                </div>
                <button type="submit" disabled={joining || !joinCode.trim()} className="btn-primary">
                {joining ? 'Joining…' : 'Join'}
                </button>
            </form>
            </div>
        )}

        {/* Course list */}
        {loading ? (
            <div className="white-card" style={{ padding:28 }}><LoadingBlock/></div>
        ) : courses.length === 0 ? (
            <div className="white-card" style={{ padding:'56px 24px', textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#f0ece5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }} aria-hidden="true">
                <GraduationCap size={24} style={{ color:'#b0a898' }}/>
            </div>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:'0 0 6px' }}>
                No courses yet
            </p>
            <p style={{ fontSize:13, color:'#b0a898' }}>
                {isTeacher ? 'Create your first course above.' : 'Use a join code to enroll in a course.'}
            </p>
            </div>
        ) : (
            <div className="course-grid">
            {courses.map(c => {
                const course = c.course || c
                return (
                <div key={course.id} className="white-card" style={{ padding:'18px 20px', transition:'box-shadow 0.15s, transform 0.15s' }}
                    onMouseEnter={e=>{e.currentTarget.style.boxShadow='0 4px 18px rgba(26,31,53,0.10)'; e.currentTarget.style.transform='translateY(-1px)'}}
                    onMouseLeave={e=>{e.currentTarget.style.boxShadow=''; e.currentTarget.style.transform=''}}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:12 }}>
                    <div style={{ width:38, height:38, borderRadius:10, background:'#e8eeff', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} aria-hidden="true">
                        <GraduationCap size={17} style={{ color:'#3b6fd4' }}/>
                    </div>
                    {isTeacher && course.join_code && (
                        <span style={{ fontSize:10, fontWeight:700, fontFamily:'var(--font-mono)', background:'#f5f0e8', color:'#7a6e5e', padding:'3px 8px', borderRadius:6, border:'1px solid #e8e3db', letterSpacing:'0.08em' }}>
                        {course.join_code}
                        </span>
                    )}
                    </div>
                    <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#1a1f35', margin:'0 0 6px', lineHeight:1.3 }}>
                    {course.title}
                    </h4>
                    {course.description && (
                    <p style={{ fontSize:12, color:'#7a7060', margin:'0 0 10px', lineHeight:1.5, display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical', overflow:'hidden' }}>
                        {course.description}
                    </p>
                    )}
                    <div style={{ display:'flex', flexDirection:'column', gap:4, marginTop:'auto' }}>
                    {!isTeacher && course.teacher && (
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <User size={10} style={{ color:'#b0a898' }} aria-hidden="true"/>
                        <span style={{ fontSize:11, color:'#a09080' }}>{course.teacher.full_name||course.teacher.username}</span>
                        </div>
                    )}
                    {course.start_date && (
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                        <Calendar size={10} style={{ color:'#b0a898' }} aria-hidden="true"/>
                        <span style={{ fontSize:11, color:'#a09080' }}>{course.start_date}</span>
                        </div>
                    )}
                    </div>
                </div>
                )
            })}
            </div>
)}

        <DashboardFooter/>
        </div>
    )
}
