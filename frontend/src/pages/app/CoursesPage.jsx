// src/pages/app/CoursesPage.jsx — pure CSS, no Tailwind classes

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, GraduationCap, Hash, BookOpen, Calendar, User, Pencil, Trash2, ListChecks } from 'lucide-react'
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
    const navigate    = useNavigate()
    const isTeacher   = user?.role === 'teacher'

    const [courses,        setCourses]        = useState([])
    const [loading,        setLoading]        = useState(true)
    const [joinCode,       setJoinCode]       = useState('')
    const [joining,        setJoining]        = useState(false)
    const [showCreate,     setShowCreate]     = useState(false)
    const [editingCourse,  setEditingCourse]  = useState(null)   // course object being edited, or null when creating
    const [newCourse,      setNewCourse]      = useState({ title:'', description:'', start_date:'' })
    const [creating,       setCreating]       = useState(false)
    const [deletingId,     setDeletingId]     = useState(null)
    const [deleteTarget,   setDeleteTarget]   = useState(null)   // course pending delete confirmation

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

function resetForm() {
        setShowCreate(false)
        setEditingCourse(null)
        setNewCourse({ title:'', description:'', start_date:'' })
}

function handleToggleCreate() {
        if (showCreate) resetForm()
        else { setEditingCourse(null); setNewCourse({ title:'', description:'', start_date:'' }); setShowCreate(true) }
}

function handleEditClick(course) {
        setEditingCourse(course)
        setNewCourse({
        title: course.title || '',
        description: course.description || '',
        start_date: course.start_date || '',
        })
        setShowCreate(true)
}

async function handleSubmit(e) {
        e.preventDefault()
        if (!newCourse.title.trim()) return
        setCreating(true)
        try {
        if (editingCourse) {
                await coursesService.update(editingCourse.id, newCourse)
                toast.success('Course updated')
        } else {
                await coursesService.create(newCourse)
                toast.success('Course created')
        }
        resetForm(); load()
        } catch (err) { toast.error(apiError(err)) }
        finally { setCreating(false) }
}

function handleDeleteClick(course) {
        setDeleteTarget(course)
}

function cancelDelete() {
        if (deletingId) return // don't allow closing mid-request
        setDeleteTarget(null)
}

async function confirmDelete() {
        if (!deleteTarget) return
        setDeletingId(deleteTarget.id)
        try {
        await coursesService.remove(deleteTarget.id)
        toast.success('Course deleted')
        setDeleteTarget(null)
        load()
        } catch (err) { toast.error(apiError(err)) }
        finally { setDeletingId(null) }
}

function handleViewAssignments(course) {
        navigate(`/app/assignments?course=${course.id}`)
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
                onClick={handleToggleCreate}
                className="btn-primary"
            >
                <Plus size={14} aria-hidden="true"/>
                {showCreate ? 'Cancel' : 'Create Course'}
            </button>
            )}
        </div>

        {/* Teacher: create / edit form */}
        {isTeacher && showCreate && (
            <div className="white-card" style={{ padding:'20px 22px' }}>
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#1a1f35', margin:'0 0 16px' }}>
                {editingCourse ? 'Edit Course' : 'New Course'}
            </h3>
            <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:12 }}>
                <FormInput placeholder="Course title *" value={newCourse.title}
                onChange={e => setNewCourse(p=>({...p,title:e.target.value}))} required/>
                <FormInput placeholder="Description (optional)" rows={2} value={newCourse.description}
                onChange={e => setNewCourse(p=>({...p,description:e.target.value}))}/>
                <FormInput type="date" value={newCourse.start_date} placeholder="Start date"
                onChange={e => setNewCourse(p=>({...p,start_date:e.target.value}))}/>
                <div style={{ display:'flex', gap:10 }}>
                <button type="submit" disabled={creating} className="btn-primary" style={{ alignSelf:'flex-start' }}>
                    {creating ? (editingCourse ? 'Saving…' : 'Creating…') : (editingCourse ? 'Save Changes' : 'Create Course')}
                </button>
                {editingCourse && (
                    <button type="button" onClick={resetForm} className="btn-primary"
                    style={{ alignSelf:'flex-start', background:'#f0ece5', color:'#7a7060' }}>
                    Cancel
                    </button>
                )}
                </div>
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

                    <div style={{ display:'flex', gap:8, marginTop:14, paddingTop:12, borderTop:'1px solid #eee7db' }}>
                    <button
                        onClick={() => handleViewAssignments(course)}
                        style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:11.5, fontWeight:600, color:'#3b6fd4', background:'#eef2fc', border:'none', borderRadius:7, padding:'7px 8px', cursor:'pointer' }}
                    >
                        <ListChecks size={12} aria-hidden="true"/>
                        Assignments
                    </button>
                    {isTeacher && (
                        <>
                        <button
                            onClick={() => handleEditClick(course)}
                            aria-label={`Edit ${course.title}`}
                            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:11.5, fontWeight:600, color:'#7a7060', background:'#f5f0e8', border:'none', borderRadius:7, padding:'7px 10px', cursor:'pointer' }}
                        >
                            <Pencil size={12} aria-hidden="true"/>
                        </button>
                        <button
                            onClick={() => handleDeleteClick(course)}
                            aria-label={`Delete ${course.title}`}
                            style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:5, fontSize:11.5, fontWeight:600, color:'#c0392b', background:'#fbeceb', border:'none', borderRadius:7, padding:'7px 10px', cursor:'pointer' }}
                        >
                            <Trash2 size={12} aria-hidden="true"/>
                        </button>
                        </>
                    )}
                    </div>
                </div>
                )
            })}
            </div>
)}

        {/* Delete confirmation modal */}
        {deleteTarget && (
            <div
                onClick={cancelDelete}
                style={{
                    position:'fixed', inset:0, background:'rgba(26,31,53,0.45)', backdropFilter:'blur(2px)',
                    display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20,
                }}
            >
                <div
                    onClick={e => e.stopPropagation()}
                    className="white-card anim-fade-in"
                    style={{ width:'100%', maxWidth:400, padding:'26px 26px 22px', boxShadow:'0 12px 40px rgba(26,31,53,0.25)' }}
                >
                    <div style={{ width:44, height:44, borderRadius:'50%', background:'#fbeceb', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }} aria-hidden="true">
                        <Trash2 size={19} style={{ color:'#c0392b' }}/>
                    </div>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#1a1f35', margin:'0 0 8px' }}>
                        Delete course?
                    </h3>
                    <p style={{ fontSize:13, color:'#7a7060', lineHeight:1.55, margin:'0 0 22px' }}>
                        This will permanently delete <strong style={{ color:'#1a1f35' }}>"{deleteTarget.title}"</strong> and all of its assignments. This action cannot be undone.
                    </p>
                    <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                        <button
                            onClick={cancelDelete}
                            disabled={!!deletingId}
                            className="btn-primary"
                            style={{ background:'#f0ece5', color:'#7a7060', cursor: deletingId ? 'default' : 'pointer' }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={confirmDelete}
                            disabled={!!deletingId}
                            className="btn-primary"
                            style={{ background:'#c0392b', color:'#fff', cursor: deletingId ? 'default' : 'pointer', opacity: deletingId ? 0.75 : 1 }}
                        >
                            {deletingId ? 'Deleting…' : 'Delete Course'}
                        </button>
                    </div>
                </div>
            </div>
        )}

        <DashboardFooter/>
        </div>
    )
}