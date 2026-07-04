import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, Loader, Info } from 'lucide-react'
import { useToday, useBSCalendar }  from '../../hooks/useHolidays.js'
import { useToast }                from '../../context/ToastContext.jsx'
import { useAuth }                 from '../../hooks/useAuth.js'
import { statusLabel, statusColor, statusBg } from '../../hooks/useTasks.js'
import tasksService                from '../../services/tasks.service.js'
import { apiError, getTaskTitle, getTaskDueDate } from '../../utils/helpers.js'
import {
    BS_MONTH_NAMES, AD_MONTH_NAMES, buildMonthDays,
    daysInBSMonth, adToBS,
} from '../../utils/bsCalendar.js'

const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const RED     = '#DC2626'
const RED_BG  = '#FEF2F2'
const BLUE    = '#5452E4'
const BLUE_BG = '#EEEEFE'

// ── Day Cell ──────────────────────────────────────────────────────────────────
function DayCell({ day, isToday, isSelected, taskCount, onClick }) {
    const [hov, setHov] = useState(false)
    const hTitle = day.holidayTitle
        || (day.isSat ? 'Saturday — Holiday' : null)
        || (day.isSun ? 'Sunday — Holiday' : null)
    const isRed  = day.isHoliday || day.isSat || day.isSun

    let bgColor  = 'transparent'
    let txtColor = '#0F172A'
    let border   = '1.5px solid transparent'
    let fontW    = 400

    if (isToday) {
        bgColor  = BLUE
        txtColor = '#fff'
        border   = `1.5px solid ${BLUE}`
        fontW    = 700
    } else if (isSelected) {
        bgColor  = BLUE_BG
        border   = `1.5px solid ${BLUE}`
        txtColor = BLUE
        fontW    = 600
    } else if (isRed) {
        txtColor = RED
        fontW    = 600
        bgColor  = hov ? RED_BG : 'transparent'
    } else if (hov) {
        bgColor  = BLUE_BG
        txtColor = BLUE
    }

    return (
        <div
            className="cal-day-cell"
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{ position:'relative', cursor:'pointer' }}
        >
            {/* Holiday tooltip */}
            {hov && hTitle && (
                <div style={{
                    position:'absolute', bottom:'calc(100% + 4px)', left:'50%',
                    transform:'translateX(-50%)',
                    background:'#0F172A', color:'#fff',
                    fontSize:10, fontWeight:600, padding:'4px 8px', borderRadius:6,
                    whiteSpace:'nowrap', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis',
                    zIndex:20, pointerEvents:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.2)',
                }}>
                    {hTitle}
                </div>
            )}

            <div
                onClick={onClick}
                style={{
                    width:34, height:34,
                    display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center',
                    borderRadius:8, border, background:bgColor, color:txtColor,
                    fontWeight:fontW, margin:'0 auto',
                    transition:'all 0.12s',
                    fontSize:12,
                    boxShadow: isToday ? '0 2px 8px rgba(84,82,228,0.30)' : 'none',
                }}
                aria-label={`${day.bsDay}${hTitle ? ' — ' + hTitle : ''}`}
            >
                {/* BS date */}
                <span style={{ lineHeight:1 }}>{day.bsDay}</span>
                {/* AD date — tiny below */}
                <span style={{ fontSize:8, lineHeight:1, marginTop:1, opacity: isToday ? 0.75 : 0.45 }}>
                    {day.adDate.getDate()}
                </span>
            </div>

            {/* Assignment dot — blue */}
            {taskCount > 0 && (
                <span style={{
                    position:'absolute', bottom:1, left:'50%',
                    transform:'translateX(-50%)',
                    width:4, height:4, borderRadius:'50%',
                    background: isToday ? 'rgba(255,255,255,0.8)' : BLUE,
                }}/>
            )}
        </div>
    )
}

// ── Side panel ────────────────────────────────────────────────────────────────
function SidePanel({ day, bsMonth, bsYear, tasks, loadingTasks, onAddTask, onDeleteTask, isTeacher }) {
    const [title, setTitle]   = useState('')
    const [saving, setSaving] = useState(false)

    if (!day) return (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ textAlign:'center', padding:20 }}>
                <CalendarDays size={28} style={{ color:'#CBD5E1', margin:'0 auto 10px', display:'block' }}/>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:BLUE, margin:'0 0 5px' }}>
                    Select a date
                </p>
                <p style={{ fontSize:12, color:'#94A3B8' }}>
                    {isTeacher ? 'Click any date to view or add assignments' : 'Click any date to view assignments'}
                </p>
            </div>
        </div>
    )

    const dowName  = DOW_SHORT[day.dow]
    const hTitle   = day.holidayTitle
        || (day.isSat ? 'Saturday — Holiday' : null)
        || (day.isSun ? 'Sunday — Holiday' : null)
    const adMonth  = AD_MONTH_NAMES?.[day.adDate.getMonth()] || ''

    async function handleAdd(e) {
        e.preventDefault()
        if (!title.trim()) return
        setSaving(true)
        await onAddTask({ title: title.trim(), due_date: day.adISO })
        setTitle('')
        setSaving(false)
    }

    return (
        <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:10 }}>
            {/* Date header */}
            <div style={{
                background: BLUE,
                borderRadius:10, padding:'14px 16px', color:'#fff',
            }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                    <div>
                        <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:28, color:'#fff', lineHeight:1, margin:'0 0 2px', letterSpacing:'-0.03em' }}>
                            {day.bsDay}
                            <span style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.50)', marginLeft:6 }}>BS</span>
                        </p>
                        <p style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.65)', margin:0 }}>
                            {bsMonth?.en} {bsYear} · {dowName}
                        </p>
                    </div>
                    <div style={{ textAlign:'right' }}>
                        <p style={{ fontSize:11, color:'rgba(255,255,255,0.45)', margin:'0 0 2px' }}>
                            {adMonth} {day.adDate.getFullYear()}
                        </p>
                        <p style={{ fontSize:16, fontWeight:700, color:'rgba(255,255,255,0.55)', margin:0 }}>
                            {day.adDate.getDate()}
                        </p>
                    </div>
                </div>
            </div>

            {/* Holiday badge */}
            {hTitle && (
                <div style={{
                    padding:'8px 12px', background:RED_BG,
                    border:`1px solid #FECACA`, borderLeft:`3px solid ${RED}`,
                    borderRadius:8, flexShrink:0,
                }}>
                    <p style={{ fontSize:12, fontWeight:700, color:RED, margin:0 }}>🎉 {hTitle}</p>
                </div>
            )}

            {/* Assignment list */}
            <div style={{ flex:1, minHeight:0, display:'flex', flexDirection:'column', gap:6 }}>
                <p style={{ fontSize:10, fontWeight:700, color:'#94A3B8', textTransform:'uppercase', letterSpacing:'0.08em', margin:0, flexShrink:0 }}>
                    Assignments
                </p>
                <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:5 }}>
                    {loadingTasks ? (
                        <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 0' }}>
                            <Loader size={12} style={{ color:'#94A3B8', animation:'to-spin 1s linear infinite' }}/>
                            <span style={{ fontSize:11, color:'#94A3B8' }}>Loading…</span>
                        </div>
                    ) : tasks.length === 0 ? (
                        <p style={{ fontSize:12, color:'#CBD5E1', margin:0, padding:'6px 0' }}>
                            No assignments on this day
                        </p>
                    ) : tasks.map(t => {
                        const sb = { label: statusLabel(t), color: statusColor(t), bg: statusBg(t) }
                        const course = t.assignment?.course_name || t.course_name
                        return (
                            <div key={t.id} style={{
                                display:'flex', alignItems:'flex-start', justifyContent:'space-between',
                                gap:8, padding:'9px 10px',
                                background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8,
                            }}>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontSize:12.5, fontWeight:600, color:'#0F172A', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                        {getTaskTitle(t)}
                                    </p>
                                    <div style={{ display:'flex', alignItems:'center', gap:6, marginTop:3 }}>
                                        {course && (
                                            <span style={{ fontSize:10.5, color:'#94A3B8', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                                {course}
                                            </span>
                                        )}
                                        <span style={{ fontSize:9.5, fontWeight:700, padding:'1px 6px', borderRadius:99, background:sb.bg, color:sb.color, whiteSpace:'nowrap', flexShrink:0 }}>
                                            {sb.label}
                                        </span>
                                    </div>
                                </div>
                                {isTeacher && (
                                    <button onClick={() => onDeleteTask(t.id)}
                                        style={{ background:'none', border:'none', cursor:'pointer', color:'#CBD5E1', padding:2, borderRadius:5, display:'flex', alignItems:'center', flexShrink:0, transition:'color 0.12s' }}
                                        onMouseEnter={e => e.currentTarget.style.color = RED}
                                        onMouseLeave={e => e.currentTarget.style.color = '#CBD5E1'}
                                        title="Delete assignment">
                                        <Trash2 size={12}/>
                                    </button>
                                )}
                            </div>
                        )
                    })}
                </div>
            </div>

            {/* Add form — teachers only */}
            {isTeacher && (
                <form onSubmit={handleAdd} style={{ flexShrink:0 }}>
                    <div style={{ display:'flex', gap:6 }}>
                        <input
                            value={title} onChange={e => setTitle(e.target.value)}
                            placeholder="Add assignment for this day…"
                            maxLength={120}
                            style={{
                                flex:1, padding:'8px 10px', fontSize:12,
                                background:'#F8FAFC', border:'1.5px solid #E2E8F0',
                                borderRadius:8, outline:'none', fontFamily:'var(--font-body)', color:'#0F172A',
                                transition:'border-color 0.14s',
                            }}
                            onFocus={e => e.target.style.borderColor = BLUE}
                            onBlur={e => e.target.style.borderColor = '#E2E8F0'}
                        />
                        <button type="submit" disabled={!title.trim() || saving}
                            style={{
                                display:'flex', alignItems:'center', gap:4, padding:'8px 12px',
                                fontSize:11, fontWeight:600, border:'none', borderRadius:8,
                                background: title.trim() ? BLUE : '#E2E8F0',
                                color:   title.trim() ? '#fff' : '#94A3B8',
                                cursor:  title.trim() ? 'pointer' : 'default',
                                transition:'all 0.12s', flexShrink:0,
                            }}>
                            {saving ? <Loader size={11} style={{ animation:'to-spin 1s linear infinite' }}/> : <Plus size={11}/>}
                            Add
                        </button>
                    </div>
                </form>
            )}

            {/* Student note */}
            {!isTeacher && (
                <div style={{ padding:'8px 12px', background:'#F8FAFC', border:'1px solid #E2E8F0', borderRadius:8, flexShrink:0 }}>
                    <p style={{ fontSize:11, color:'#94A3B8', margin:0, textAlign:'center' }}>
                        <Info size={10} style={{ marginRight:4, verticalAlign:'middle' }}/>
                        View your assigned tasks above
                    </p>
                </div>
            )}
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN CALENDAR PAGE
// ─────────────────────────────────────────────────────────────────────────────
export default function CalendarPage() {
    const { today: todayData }  = useToday()
    const toast                = useToast()
    const { user }             = useAuth()
    const isTeacher            = user?.role === 'teacher'

    const todayBS = useMemo(() => {
        if (todayData?.today_bs) return todayData.today_bs
        const t = adToBS(new Date())
        return { year:t.year, month:t.month, day:t.day }
    }, [todayData])

    const [cur, setCur] = useState(() => {
        const t = adToBS(new Date())
        return { y:t.year, m:t.month }
    })

    // Render-time adjustment (React's recommended pattern) instead of a useEffect,
    // comparing primitive values so it stays correct regardless of upstream memoization.
    const todayKey = todayBS?.year && todayBS?.month ? `${todayBS.year}-${todayBS.month}` : null
    const [syncedKey, setSyncedKey] = useState(todayKey)
    if (todayKey && todayKey !== syncedKey) {
        setSyncedKey(todayKey)
        setCur({ y:todayBS.year, m:todayBS.month })
    }

    const { calendar: backendCal, loading: calLoading } = useBSCalendar(cur.y, cur.m)

    const [selected, setSelected] = useState(null)
    const [allTasks, setAllTasks] = useState([])
    const [loadingT, setLoadingT] = useState(false)

    useEffect(() => {
        setLoadingT(true)
        tasksService.getMyTasks()
            .then(d => setAllTasks(Array.isArray(d) ? d : []))
            .catch(() => {})
            .finally(() => setLoadingT(false))
    }, [])

    const prev    = () => { setSelected(null); setCur(c => c.m === 1  ? { y:c.y-1, m:12 } : { y:c.y, m:c.m-1 }) }
    const next    = () => { setSelected(null); setCur(c => c.m === 12 ? { y:c.y+1, m:1  } : { y:c.y, m:c.m+1 }) }
    const goToday = () => { if (todayBS) { setCur({ y:todayBS.year, m:todayBS.month }); setSelected(null) } }

    const rawDays = useMemo(() => buildMonthDays(cur.y, cur.m), [cur.y, cur.m])

    const days = useMemo(() => {
        if (!backendCal?.days?.length) return rawDays

        const bkMap = {}
        backendCal.days.forEach(d => { bkMap[d.day_bs] = d })

        return rawDays.map(day => {
            const bk = bkMap[day.bsDay]
            if (!bk) return day
            return {
                ...day,
                // both Saturday and Sunday count as weekend holidays
                isHoliday:    bk.is_holiday || day.isSat || day.isSun,
                holidayTitle: bk.holiday_title || day.holidayTitle || null,
            }
        })
    }, [rawDays, backendCal])

    const firstDow    = days.length ? days[0].dow : 0
    const trailBlanks = (7 - ((firstDow + days.length) % 7)) % 7
    const bsMonth     = BS_MONTH_NAMES[cur.m - 1]

    const adRangeStr = useMemo(() => {
        if (!days.length) return ''
        const first = days[0], last = days[days.length - 1]
        const ADM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const fmt = d => `${d.adDate.getDate()} ${ADM[d.adDate.getMonth()]}`
        if (first.adDate.getMonth() !== last.adDate.getMonth())
            return `${fmt(first)} – ${fmt(last)} ${last.adDate.getFullYear()}`
        return `${ADM[first.adDate.getMonth()]} ${first.adDate.getFullYear()}`
    }, [days])

    const selectedDay = useMemo(() => selected ? days.find(d => d?.bsKey === selected) : null, [days, selected])

    const taskCountMap = useMemo(() => {
        const map = {}
        allTasks.forEach(t => {
            const due = (t.due_date || t.assignment?.due_date || '').split('T')[0]
            if (due) map[due] = (map[due] || 0) + 1
        })
        return map
    }, [allTasks])

    const dayTasks = useMemo(() => {
        if (!selectedDay) return []
        return allTasks.filter(t => {
            const due = (t.due_date || t.assignment?.due_date || '').split('T')[0]
            return due === selectedDay.adISO
        })
    }, [allTasks, selectedDay])

    const handleAddTask = useCallback(async ({ title, due_date }) => {
        if (!isTeacher) return
        try {
            const created = await tasksService.createAssignment({ title, due_date })
            setAllTasks(prev => [created, ...prev])
            toast.success('Assignment added')
        } catch (err) { toast.error(apiError(err)) }
    }, [toast, isTeacher])

    const handleDeleteTask = useCallback(async (taskId) => {
        if (!isTeacher) return
        try {
            await tasksService.deleteAssignment(taskId)
            setAllTasks(prev => prev.filter(t => t.id !== taskId))
            toast.success('Assignment removed')
        } catch (err) { toast.error(apiError(err)) }
    }, [toast, isTeacher])

    const holidayCount = useMemo(
        () => days.filter(d => d?.isHoliday || d?.isSat || d?.isSun).length,
        [days]
    )

    return (
        <div className="anim-fade-in">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Calendar</h2>
                    <p className="page-subtitle">
                        Bikram Sambat · English {new Date().getFullYear()} · Nepal Public Holidays
                        {todayBS && (
                            <span style={{ marginLeft:8, fontWeight:600, color:BLUE }}>
                                Today: {BS_MONTH_NAMES[todayBS.month-1]?.en} {todayBS.day}, {todayBS.year} BS
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={goToday}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', fontSize:12, fontWeight:600, background:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                        <CalendarDays size={13}/> Today
                    </button>
                    {isTeacher && (
                        <span style={{ fontSize:10, fontWeight:600, padding:'4px 10px', borderRadius:99,
                            background: BLUE_BG, color: BLUE,
                            border: `1px solid rgba(84,82,228,0.18)`,
                            fontFamily:'var(--font-display)' }}>
                            Teacher
                        </span>
                    )}
                </div>
            </div>

            <div className="cal-pg-grid" style={{ marginBottom:24 }}>
                <div className="white-card" style={{ padding:20 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <button className="cal-nav" onClick={prev} aria-label="Previous month">
                            <ChevronLeft size={14}/>
                        </button>
                        <div style={{ textAlign:'center' }}>
                            <div style={{ display:'flex', alignItems:'baseline', gap:6, justifyContent:'center' }}>
                                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#0F172A' }}>
                                    {bsMonth?.en}
                                </span>
                                <span style={{ fontSize:10, color:'#94A3B8' }}>{bsMonth?.ne}</span>
                                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#0F172A' }}>
                                    {cur.y} BS
                                </span>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                <p style={{ fontSize:11, color:'#94A3B8', margin:'2px 0 0' }}>{adRangeStr}</p>
                                {calLoading && (
                                    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, color:'#94A3B8', margin:'2px 0 0' }}>
                                        <Loader size={9} style={{ animation:'to-spin 1s linear infinite' }}/>
                                        Syncing…
                                    </span>
                                )}
                            </div>
                        </div>
                        <button className="cal-nav" onClick={next} aria-label="Next month">
                            <ChevronRight size={14}/>
                        </button>
                    </div>

                    <div className="cal-grid" style={{ marginBottom:4 }}>
                        {DOW_SHORT.map((d, i) => (
                            <div key={d} style={{
                                textAlign:'center', fontSize:11, fontWeight:600,
                                padding:'5px 0 8px', letterSpacing:'0.03em',
                                color: (i === 0 || i === 6) ? RED : '#94A3B8',
                            }}>
                                {d}
                            </div>
                        ))}
                        {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`}/>)}
                        {days.map(day => {
                            const isToday = todayBS && day.bsDay===todayBS.day && cur.m===todayBS.month && cur.y===todayBS.year
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
                    <div style={{ display:'flex', gap:14, paddingTop:10, borderTop:'1px solid #E2E8F0', justifyContent:'center', flexWrap:'wrap', marginTop:8 }}>
                        {[
                            { label:'Today', swatch: <span style={{ width:12, height:12, borderRadius:3, background:BLUE, border:`2px solid ${BLUE}`, flexShrink:0, display:'inline-block' }}/> },
                            { label:'Holiday / Weekend', swatch: <span style={{ width:12, height:12, borderRadius:3, background:RED, border:`1px solid ${RED}`, flexShrink:0, display:'inline-block' }}/> },
                            { label:'Has Assignment', swatch: <span style={{ width:8, height:8, borderRadius:'50%', background:BLUE, flexShrink:0, display:'inline-block' }}/> },
                        ].map(l => (
                            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#64748B' }}>
                                {l.swatch}
                                {l.label}
                            </div>
                        ))}
                    </div>

                    {/* Month summary */}
                    <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:8 }}>
                        <span style={{ fontSize:10, color:'#94A3B8' }}>
                            <span style={{ fontWeight:700, color:'#475569', fontSize:12 }}>{daysInBSMonth(cur.y, cur.m)}</span> days
                        </span>
                        <span style={{ fontSize:10, color:'#94A3B8' }}>
                            <span style={{ fontWeight:700, color:RED, fontSize:12 }}>{holidayCount}</span> holidays
                        </span>
                    </div>
                </div>

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
        </div>
    )
}