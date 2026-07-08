// src/pages/app/EnrolledStudentsPage.jsx
// Teacher-only: view students enrolled in one of their courses, and
// un-enroll a student from here. Reached from CoursesPage.jsx's
// "Enrolled Students" button → /app/courses/:id/students
//
// Note: once a student is un-enrolled, the teacher can no longer see any
// of that student's tasks/submissions for this course (enforced on the
// backend) — this page only ever lists currently-enrolled students.

import React, { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, Users, UserMinus, Calendar } from 'lucide-react'
import coursesService from '../../services/courses.service.js'
import { useToast } from '../../context/ToastContext.jsx'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
import { apiError } from '../../utils/helpers.js'

export default function EnrolledStudentsPage() {
    const { id }   = useParams()
    const navigate = useNavigate()
    const toast    = useToast()

    const [course,       setCourse]       = useState(null)
    const [enrollments,  setEnrollments]  = useState([])
    const [loading,      setLoading]      = useState(true)
    const [error,        setError]        = useState(null)
    const [removingId,   setRemovingId]   = useState(null)
    const [removeTarget, setRemoveTarget] = useState(null) // enrollment pending un-enroll confirmation

    const load = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [c, students] = await Promise.all([
                coursesService.get(id),
                coursesService.getStudents(id),
            ])
            setCourse(c)
            setEnrollments(Array.isArray(students) ? students : [])
        } catch (err) {
            setError(apiError(err))
        } finally { setLoading(false) }
    }, [id])

    useEffect(() => { load() }, [load])

    function handleUnenrollClick(enrollment) {
        setRemoveTarget(enrollment)
    }

    function cancelUnenroll() {
        if (removingId) return // don't allow closing mid-request
        setRemoveTarget(null)
    }

    async function confirmUnenroll() {
        if (!removeTarget) return
        setRemovingId(removeTarget.student.id)
        try {
            await coursesService.unenrollStudent(id, removeTarget.student.id)
            toast.success('Student un-enrolled')
            setEnrollments(prev => prev.filter(e => e.id !== removeTarget.id))
            setRemoveTarget(null)
        } catch (err) {
            toast.error(apiError(err))
        } finally { setRemovingId(null) }
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }} className="anim-fade-in">
            <button onClick={() => navigate('/app/courses')}
                style={{ display:'inline-flex', alignItems:'center', gap:6, alignSelf:'flex-start', background:'none', border:'none', cursor:'pointer', color:'var(--color-text-secondary)', fontSize:12.5, fontWeight:600, padding:0 }}>
                <ArrowLeft size={14}/> Back to Courses
            </button>

            <div className="page-header">
                <div>
                    <h2 className="page-title">{course ? course.title : 'Enrolled Students'}</h2>
                    <p className="page-subtitle">
                        {enrollments.length} student{enrollments.length !== 1 ? 's' : ''} enrolled
                    </p>
                </div>
            </div>

            {loading && <div className="white-card" style={{ padding:28 }}><LoadingBlock/></div>}
            {error   && <ErrorBlock message={error} onRetry={load}/>}

            {!loading && !error && (
                enrollments.length === 0 ? (
                    <div className="white-card" style={{ padding:'56px 24px', textAlign:'center' }}>
                        <div style={{ width:56, height:56, borderRadius:'50%', background:'#f0ece5', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px' }} aria-hidden="true">
                            <Users size={24} style={{ color:'#b0a898' }}/>
                        </div>
                        <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:'0 0 6px' }}>
                            No students enrolled yet
                        </p>
                        <p style={{ fontSize:13, color:'#b0a898' }}>
                            Share this course's join code so students can enroll.
                        </p>
                    </div>
                ) : (
                    <div className="white-card overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="task-table">
                                <thead>
                                    <tr>
                                        <th style={{ paddingLeft:18 }}>Student</th>
                                        <th className="hide-sm">Enrolled Since</th>
                                        <th style={{ width:130 }}>Action</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {enrollments.map(e => (
                                        <tr key={e.id}>
                                            <td style={{ paddingLeft:18 }}>
                                                <p style={{ fontSize:13, fontWeight:600, color:'var(--color-text)', margin:0 }}>
                                                    {e.student.full_name || e.student.username}
                                                </p>
                                            </td>
                                            <td className="hide-sm" style={{ fontSize:12, color:'var(--color-text-secondary)' }}>
                                                <span style={{ display:'inline-flex', alignItems:'center', gap:5 }}>
                                                    <Calendar size={11} style={{ color:'var(--color-text-placeholder)' }}/>
                                                    {e.enrolled_at ? new Date(e.enrolled_at).toLocaleDateString() : '—'}
                                                </span>
                                            </td>
                                            <td>
                                                <button onClick={() => handleUnenrollClick(e)}
                                                    style={{ display:'flex', alignItems:'center', gap:5, padding:'6px 12px', fontSize:11, fontWeight:600, whiteSpace:'nowrap',
                                                        background:'#fbeceb', color:'#c0392b',
                                                        border:'1px solid #c0392b', borderRadius:7, cursor:'pointer' }}>
                                                    <UserMinus size={12}/>
                                                    Un-enroll
                                                </button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            )}

            <DashboardFooter/>

            {/* Un-enroll confirmation modal */}
            {removeTarget && (
                <div
                    onClick={cancelUnenroll}
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
                            <UserMinus size={19} style={{ color:'#c0392b' }}/>
                        </div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#1a1f35', margin:'0 0 8px' }}>
                            Un-enroll Student
                        </h3>
                        <p style={{ fontSize:13, color:'#7a7060', lineHeight:1.55, margin:'0 0 22px' }}>
                            Are you sure you want to un-enroll {removeTarget.student.full_name || removeTarget.student.username} from "{course?.title}"? Their progress will be restored if they re-enroll later.
                        </p>
                        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                            <button
                                onClick={cancelUnenroll}
                                disabled={!!removingId}
                                className="btn-primary"
                                style={{ background:'#f0ece5', color:'#7a7060', cursor: removingId ? 'default' : 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmUnenroll}
                                disabled={!!removingId}
                                className="btn-primary"
                                style={{ background:'#c0392b', color:'#fff', cursor: removingId ? 'default' : 'pointer', opacity: removingId ? 0.75 : 1 }}
                            >
                                {removingId ? 'Removing…' : 'Un-enroll'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}