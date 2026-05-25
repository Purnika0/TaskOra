    import React, { useState, useMemo, useEffect, useCallback } from 'react'
    import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, Loader } from 'lucide-react'
    import { useToday }        from '../../hooks/useHolidays.js'
    import { useToast }        from '../../context/ToastContext.jsx'
    import { useAuth }         from '../../hooks/useAuth.js'
    import { DashboardFooter } from '../../components/layout/Footer.jsx'
    import tasksService        from '../../services/tasks.service.js'
    import { apiError }        from '../../utils/helpers.js'
    import {
    BS_MONTH_NAMES, AD_MONTH_NAMES, buildMonthDays,
    daysInBSMonth, adToBS, toNepaliNum,
    } from '../../utils/bsCalendar.js'

    const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']
    const RED       = '#ef4444'
    const RED_DIM   = 'rgba(255,90,90,0.70)'
    const SUN_DIM   = 'rgba(255,130,100,0.55)'

    // ── Tooltip ───────────────────────────────────────────────────────────────────
    function Tooltip({ title }) {
    return (
        <div style={{
        position:'absolute', bottom:'calc(100% + 5px)', left:'50%',
        transform:'translateX(-50%)',
        background:'rgba(15,17,25,0.96)', color:'#fff',
        fontSize:9, fontWeight:600, padding:'4px 8px', borderRadius:5,
        whiteSpace:'nowrap', boxShadow:'0 4px 12px rgba(0,0,0,0.4)',
        zIndex:30, pointerEvents:'none',
        border:'1px solid rgba(255,255,255,0.08)',
        maxWidth:170, overflow:'hidden', textOverflow:'ellipsis',
        }}>
        {title}
        <span style={{
            position:'absolute', bottom:-4, left:'50%',
            transform:'translateX(-50%)', width:0, height:0,
            borderLeft:'4px solid transparent', borderRight:'4px solid transparent',
            borderTop:'4px solid rgba(15,17,25,0.96)',
        }}/>
        </div>
    )
    }

    // ── Day Cell ──────────────────────────────────────────────────────────────────
    function DayCell({ day, isToday, isSelected, taskCount, onClick }) {
    const [hov, setHov] = useState(false)

    const hTitle  = day.holidayTitle || (day.isSat ? 'Saturday — Holiday' : null)
    const isRed   = day.isHoliday
    const numColor = isRed ? RED_DIM : day.isSun ? SUN_DIM : 'rgba(255,255,255,0.68)'

    let bg     = 'none'
    let border = 'none'
    if (isToday)    { bg = isRed ? RED : 'rgba(255,255,255,0.12)'; border = `1.5px solid ${isRed ? RED : 'rgba(255,255,255,0.60)'}` }
    if (isSelected && !isToday) { bg = 'rgba(59,111,212,0.28)'; border = '1.5px solid rgba(59,111,212,0.65)' }

    return (
        <div
        className="cal-day-cell"
        onMouseEnter={() => setHov(true)}
        onMouseLeave={() => setHov(false)}
        style={{ position:'relative' }}
        >
        {hov && hTitle && <Tooltip title={hTitle}/>}

        <div
            className="cal-day"
            onClick={onClick}
            style={{
            background: bg, border,
            color: isToday ? '#fff' : numColor,
            fontWeight: isRed || isToday ? 700 : 400,
            cursor:'pointer', flexDirection:'column',
            gap:0, height:34, width:34, padding:0,
            }}
            aria-label={`${day.bsDay}${hTitle ? ' — ' + hTitle : ''}`}
            aria-pressed={isSelected}
        >
            <span style={{ fontSize:11, lineHeight:1 }}>{day.bsDay}</span>
            <span style={{ fontSize:8, lineHeight:1, marginTop:1,
            color: isToday ? 'rgba(255,255,255,0.60)' : 'rgba(255,255,255,0.20)' }}>
            {day.adDate.getDate()}
            </span>
        </div>

        {taskCount > 0 && (
            <span style={{
            position:'absolute', bottom:1, left:'50%',
            transform:'translateX(-50%)',
            width:4, height:4, borderRadius:'50%',
            background:'rgba(59,130,246,0.80)',
            }}/>
        )}
        </div>
    )
    }

    // ── Side Panel — role-aware ────────────────────────────────────────────────────
    // isTeacher=true  → show Add Task form + Delete button
    // isTeacher=false → read-only: show tasks list, no form/delete
    function SidePanel({ day, bsMonth, bsYear, tasks, loadingTasks, onAddTask, onDeleteTask, isTeacher }) {
    const [title,    setTitle]   = useState('')
    const [saving,   setSaving]  = useState(false)
    const [deleting, setDeleting]= useState(null)

    if (!day) {
        return (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ textAlign:'center' }}>
            <CalendarDays size={28} style={{ color:'#d4cec6', margin:'0 auto 10px' }}/>
            <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:'#1a1f35', margin:'0 0 5px' }}>
                Select a date
            </p>
            <p style={{ fontSize:11, color:'#b0a898' }}>
                {isTeacher ? 'Click any date to view or add tasks' : 'Click any date to view assignments'}
            </p>
            </div>
        </div>
        )
    }

    const dowName   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][day.dow]
    const hTitle    = day.holidayTitle || (day.isSat ? 'Saturday — Holiday' : null)

    async function handleAdd(e) {
        e.preventDefault()
        if (!title.trim()) return
        setSaving(true)
        await onAddTask({ title: title.trim(), due_date: day.adISO })
        setTitle('')
        setSaving(false)
    }

    async function handleDelete(taskId) {
        setDeleting(taskId)
        await onDeleteTask(taskId)
        setDeleting(null)
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:10 }}>
        {/* Date header */}
        <div style={{ background:'var(--color-navy)', borderRadius:10, padding:'14px 16px', color:'#fff', flexShrink:0 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
            <div>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:28,
                color:'#fff', lineHeight:1, margin:'0 0 3px', letterSpacing:'-0.03em' }}>
                {toNepaliNum(day.bsDay)}
                <span style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.40)', marginLeft:5 }}>
                    {day.bsDay}
                </span>
                </p>
                <p style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.55)', margin:0 }}>
                {bsMonth.en} {bsYear} BS
                </p>
            </div>
            <div style={{ textAlign:'right' }}>
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.30)', margin:'0 0 2px',
                textTransform:'uppercase', letterSpacing:'0.06em' }}>
                {AD_MONTH_NAMES[day.adDate.getMonth()]} {day.adDate.getFullYear()}
                </p>
                <p style={{ fontSize:14, fontWeight:600, color:'rgba(255,255,255,0.45)', margin:0 }}>
                {day.adDate.getDate()}
                </p>
            </div>
            </div>
            <p style={{ fontSize:10, color:'rgba(255,255,255,0.25)', margin:'7px 0 0' }}>
            {dowName}
            </p>
        </div>

        {/* Holiday badge */}
        {hTitle && (
            <div style={{
            padding:'9px 12px', flexShrink:0,
            background:'rgba(239,68,68,0.08)',
            border:'1px solid rgba(239,68,68,0.25)',
            borderLeft:`3px solid ${RED}`, borderRadius:8,
            }}>
            <p style={{ fontSize:11, fontWeight:700, color:RED, margin:0 }}>
                🎉 {hTitle}
            </p>
            </div>
        )}

        {/* Tasks for this day */}
        <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', gap:6 }}>
            <p style={{ fontSize:10, fontWeight:700, color:'#7a6e5e',
            textTransform:'uppercase', letterSpacing:'0.08em', margin:0, flexShrink:0 }}>
            {isTeacher ? 'Tasks' : 'Assignments'}
            </p>

            <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
            {loadingTasks ? (
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 0' }}>
                <Loader size={12} style={{ color:'#b0a898', animation:'spin 1s linear infinite' }}/>
                <span style={{ fontSize:11, color:'#b0a898' }}>Loading…</span>
                </div>
            ) : tasks.length === 0 ? (
                <p style={{ fontSize:11, color:'#c0b8ae', margin:0, padding:'6px 0' }}>
                No {isTeacher ? 'tasks' : 'assignments'} on this day
                </p>
            ) : (
                tasks.map(t => (
                <div key={t.id} style={{
                    display:'flex', alignItems:'center', justifyContent:'space-between',
                    gap:8, padding:'8px 10px', background:'#f8f6f3',
                    border:'1px solid #ece8e1', borderRadius:8,
                }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'#1a1f35', margin:0,
                    flex:1, minWidth:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
                    textDecoration: t.is_completed ? 'line-through' : 'none',
                    opacity: t.is_completed ? 0.55 : 1,
                    }}>
                    {t.title || t.display_title || 'Untitled'}
                    </p>
                    {/* Only teachers can delete tasks from calendar */}
                    {isTeacher && t.is_personal !== false && (
                    <button
                        onClick={() => handleDelete(t.id)}
                        disabled={deleting === t.id}
                        style={{ background:'none', border:'none', cursor:'pointer',
                        color:'#c0b8ae', padding:2, borderRadius:5, flexShrink:0,
                        display:'flex', alignItems:'center', transition:'color 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.color = RED}
                        onMouseLeave={e => e.currentTarget.style.color = '#c0b8ae'}
                        title="Delete task"
                        aria-label="Delete task"
                    >
                        {deleting === t.id
                        ? <Loader size={12} style={{ animation:'spin 1s linear infinite' }}/>
                        : <Trash2 size={12}/>
                        }
                    </button>
                    )}
                </div>
                ))
            )}
            </div>
        </div>

        {/* Add task form — TEACHERS ONLY */}
        {isTeacher && (
            <form onSubmit={handleAdd} style={{ flexShrink:0 }}>
            <div style={{ display:'flex', gap:6 }}>
                <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                placeholder="Add task for this day…"
                maxLength={120}
                style={{
                    flex:1, padding:'8px 10px', fontSize:12,
                    background:'#f8f6f3', border:'1px solid #ece8e1',
                    borderRadius:8, outline:'none', fontFamily:'var(--font-body)',
                    color:'#1a1f35',
                }}
                aria-label="New task title"
                />
                <button
                type="submit"
                disabled={!title.trim() || saving}
                style={{
                    display:'flex', alignItems:'center', gap:4,
                    padding:'8px 12px', fontSize:11, fontWeight:600,
                    background: title.trim() ? 'var(--color-navy)' : '#ece8e1',
                    color: title.trim() ? '#fff' : '#b0a898',
                    border:'none', borderRadius:8, cursor: title.trim() ? 'pointer' : 'default',
                    fontFamily:'var(--font-display)', transition:'all 0.12s', flexShrink:0,
                }}
                >
                {saving
                    ? <Loader size={11} style={{ animation:'spin 1s linear infinite' }}/>
                    : <Plus size={11}/>
                }
                Add
                </button>
            </div>
            </form>
        )}

        {/* Student read-only notice */}
        {!isTeacher && (
            <div style={{ padding:'8px 12px', background:'#f8f6f3', border:'1px solid #ece8e1',
            borderRadius:8, flexShrink:0 }}>
            <p style={{ fontSize:11, color:'#b0a898', margin:0, textAlign:'center' }}>
                📋 View your assigned tasks above
            </p>
            </div>
        )}
        </div>
    )
    }

    // ─────────────────────────────────────────────────────────────────────────────
    //  MAIN CALENDAR PAGE
    // ─────────────────────────────────────────────────────────────────────────────
    export default function CalendarPage() {
    const { today: todayData } = useToday()
    const toast                = useToast()
    const { user }             = useAuth()

    // RBAC: only teachers can add/delete tasks on calendar
    const isTeacher = user?.role === 'teacher'

    const todayBS = useMemo(() => {
        if (todayData?.today_bs) return todayData.today_bs
        const t = adToBS(new Date())
        return { year: t.year, month: t.month, day: t.day }
    }, [todayData])

    const [cur,      setCur]      = useState({ y: 2082, m: 9 })
    const [selected, setSelected] = useState(null)
    const [allTasks, setAllTasks] = useState([])
    const [loadingT, setLoadingT] = useState(false)

    useEffect(() => {
        if (todayBS?.year && todayBS?.month)
        setCur({ y: todayBS.year, m: todayBS.month })
    }, [todayBS?.year, todayBS?.month])

    useEffect(() => {
        setLoadingT(true)
        tasksService.getMyTasks()
        .then(data => setAllTasks(Array.isArray(data) ? data : []))
        .catch(() => {})
        .finally(() => setLoadingT(false))
    }, [])

    const prev    = () => setCur(c => c.m === 1  ? { y: c.y-1, m: 12 } : { y: c.y, m: c.m-1 })
    const next    = () => setCur(c => c.m === 12 ? { y: c.y+1, m: 1  } : { y: c.y, m: c.m+1 })
    const goToday = () => { if (todayBS) { setCur({ y: todayBS.year, m: todayBS.month }); setSelected(null) } }

    const days         = useMemo(() => buildMonthDays(cur.y, cur.m), [cur.y, cur.m])
    const firstDow     = days.length ? days[0].dow : 0
    const trailBlanks  = (7 - ((firstDow + days.length) % 7)) % 7
    const bsMonth      = BS_MONTH_NAMES[cur.m - 1]

    const adRangeStr = useMemo(() => {
        const first = days[0]
        const last  = days[days.length - 1]
        if (!first || !last) return ''
        const fmt = d => `${d.adDate.getDate()} ${AD_MONTH_NAMES[d.adDate.getMonth()]}`
        if (first.adDate.getMonth() !== last.adDate.getMonth())
        return `${fmt(first)} — ${fmt(last)} ${last.adDate.getFullYear()}`
        return `${AD_MONTH_NAMES[first.adDate.getMonth()]} ${first.adDate.getFullYear()}`
    }, [days])

    const selectedDay  = useMemo(() => selected ? days.find(d => d?.bsKey === selected) : null, [days, selected])
    const holidayCount = useMemo(() => days.filter(d => d?.isHoliday).length, [days])

    const dayTasks = useMemo(() => {
        if (!selectedDay) return []
        return allTasks.filter(t => {
        const due = t.due_date || t.due_date_bs?.ad || ''
        return due.startsWith(selectedDay.adISO)
        })
    }, [allTasks, selectedDay])

    const taskCountMap = useMemo(() => {
        const map = {}
        allTasks.forEach(t => {
        const due = t.due_date || ''
        const d   = due.split('T')[0]
        if (d) map[d] = (map[d] || 0) + 1
        })
        return map
    }, [allTasks])

    // Only teachers can add tasks from calendar
    const handleAddTask = useCallback(async ({ title, due_date }) => {
        if (!isTeacher) return
        try {
        const created = await tasksService.createPersonalTask({
            title, due_date, priority: 3, task_type: 'assignment',
            estimated_hours: 1,
        })
        setAllTasks(prev => [created, ...prev])
        toast.success('Task added')
        } catch (err) {
        toast.error(apiError(err))
        }
    }, [toast, isTeacher])

    // Only teachers can delete tasks from calendar
    const handleDeleteTask = useCallback(async (taskId) => {
        if (!isTeacher) return
        try {
        await tasksService.deletePersonalTask(taskId)
        setAllTasks(prev => prev.filter(t => t.id !== taskId))
        toast.success('Task deleted')
        } catch (err) {
        toast.error(apiError(err))
        }
    }, [toast, isTeacher])

    return (
        <div className="anim-fade-in">
        <style>{`
            @keyframes spin { to { transform:rotate(360deg) } }
            .cal-pg-grid { display:grid; grid-template-columns:1fr 280px; gap:16px; }
            @media(max-width:820px) { .cal-pg-grid { grid-template-columns:1fr !important; } }
            .cal-day-cell { position:relative; display:flex; align-items:center; justify-content:center; }
            .cal-day { display:flex; flex-direction:column; align-items:center; justify-content:center;
            border-radius:50%; cursor:pointer; position:relative;
            transition:background 0.12s; margin:0 auto; }
            .cal-day:hover { background:rgba(255,255,255,0.10) !important; }
            .cal-today-badge { display:inline-flex; align-items:center; gap:4px; font-size:10px;
            font-weight:600; background:rgba(255,255,255,0.12); color:rgba(255,255,255,0.7);
            padding:2px 8px; border-radius:99px; cursor:pointer; border:none;
            font-family:var(--font-body); transition:background 0.12s; }
            .cal-today-badge:hover { background:rgba(255,255,255,0.20); }
        `}</style>

        {/* Page header */}
        <div className="page-header">
            <div>
            <h2 className="page-title">Calendar</h2>
            <p className="page-subtitle">
                Bikram Sambat · Nepal Public Holidays
                {todayBS && (
                <span style={{ marginLeft:8, fontWeight:600, color:'#3b6fd4' }}>
                    Today: {BS_MONTH_NAMES[todayBS.month-1]?.en} {todayBS.day}, {todayBS.year} BS
                </span>
                )}
            </p>
            </div>
            {/* Role label */}
            <span style={{ fontSize:10, fontWeight:600, padding:'4px 12px', borderRadius:99,
            background: isTeacher ? 'rgba(139,92,246,0.1)' : 'rgba(59,130,246,0.1)',
            color:      isTeacher ? '#7c3aed' : '#1d4ed8',
            border:`1px solid ${isTeacher ? 'rgba(139,92,246,0.2)' : 'rgba(59,130,246,0.2)'}`,
            fontFamily:'var(--font-display)', alignSelf:'center',
            }}>
            {isTeacher ? 'Teacher · Can Add Tasks' : 'Student · View Only'}
            </span>
        </div>

        <div className="cal-pg-grid" style={{ marginBottom:24 }}>

            {/* Calendar card */}
            <div className="cal-card" style={{ display:'flex', flexDirection:'column' }}>

            {/* Header nav */}
            <div className="cal-header">
                <button className="cal-nav" onClick={prev} aria-label="Previous month">
                <ChevronLeft size={14}/>
                </button>

                <div style={{ textAlign:'center', flex:1 }}>
                <div style={{ display:'flex', justifyContent:'center', alignItems:'baseline', gap:7 }}>
                    <span className="cal-month-title" style={{ fontSize:16 }}>{bsMonth.en}</span>
                    <span className="cal-month-title" style={{ fontSize:10, opacity:0.38, fontWeight:400 }}>
                    {bsMonth.ne}
                    </span>
                    <span className="cal-month-title" style={{ fontSize:15 }}>{cur.y}</span>
                </div>
                <div style={{ fontSize:9, color:'rgba(255,255,255,0.26)', margin:'3px 0 4px' }}>
                    {adRangeStr}
                </div>
                <button className="cal-today-badge" onClick={goToday}>
                    <CalendarDays size={9}/> Today
                </button>
                </div>

                <button className="cal-nav" onClick={next} aria-label="Next month">
                <ChevronRight size={14}/>
                </button>
            </div>

            {/* DOW row */}
            <div className="cal-grid" style={{ marginTop:6 }}>
                {DOW_SHORT.map((d, i) => (
                <div key={d} className="cal-dow" style={{
                    color: i === 6 ? RED_DIM : i === 0 ? SUN_DIM : undefined,
                }}>
                    {d}
                </div>
                ))}

                {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`}/>)}

                {days.map(day => {
                const isToday    = todayBS && day.bsDay===todayBS.day && cur.m===todayBS.month && cur.y===todayBS.year
                const isSelected = day.bsKey === selected
                return (
                    <DayCell
                    key={day.bsKey}
                    day={day}
                    isToday={isToday}
                    isSelected={isSelected}
                    taskCount={taskCountMap[day.adISO] || 0}
                    onClick={() => setSelected(isSelected ? null : day.bsKey)}
                    />
                )
                })}

                {Array(trailBlanks).fill(null).map((_, i) => <div key={`e${i}`}/>)}
            </div>

            {/* Legend */}
            <div className="cal-legend" style={{ marginTop:12, paddingTop:10, flexWrap:'wrap', gap:'6px 14px' }}>
                {[
                { color: RED,    label:'Holiday' },
                { color: RED_DIM, label:'Saturday' },
                { color: SUN_DIM, label:'Sunday' },
                { color:'rgba(59,130,246,0.80)', label:'Has task' },
                { color:'rgba(255,255,255,0.60)', label:'Today', dashed:true },
                ].map(l => (
                <div key={l.label} className="cal-legend-item">
                    <span style={{
                    width:8, height:8, borderRadius:'50%', flexShrink:0,
                    background: l.dashed ? 'transparent' : l.color,
                    border: l.dashed ? `1.5px solid ${l.color}` : 'none',
                    }}/>
                    {l.label}
                </div>
                ))}
            </div>

            {/* Month summary */}
            <div style={{ marginTop:8, paddingTop:8, borderTop:'1px solid rgba(255,255,255,0.06)',
                display:'flex', gap:16, justifyContent:'center' }}>
                <span style={{ fontSize:9, color:'rgba(255,255,255,0.22)' }}>
                <span style={{ fontWeight:700, color:'rgba(255,255,255,0.48)', fontSize:11 }}>
                    {daysInBSMonth(cur.y, cur.m)}
                </span> days
                </span>
                <span style={{ fontSize:9, color:'rgba(255,255,255,0.22)' }}>
                <span style={{ fontWeight:700, color:RED, fontSize:11 }}>{holidayCount}</span> holidays
                </span>
            </div>
            </div>

            {/* Side panel — role-aware */}
            <div className="white-card" style={{ padding:16, display:'flex', flexDirection:'column', minHeight:300 }}>
            <SidePanel
                day={selectedDay}
                bsMonth={bsMonth}
                bsYear={cur.y}
                tasks={dayTasks}
                loadingTasks={loadingT && dayTasks.length === 0}
                onAddTask={handleAddTask}
                onDeleteTask={handleDeleteTask}
                isTeacher={isTeacher}
            />
            </div>
        </div>

        <DashboardFooter/>
        </div>
    )
    }
