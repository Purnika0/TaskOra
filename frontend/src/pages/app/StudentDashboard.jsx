import React, { useState, useMemo, useEffect } from 'react'
import { Star, BookOpen, Clock, CheckCircle2, ListTodo, ChevronLeft, ChevronRight } from 'lucide-react'
import { useAuth }                          from '../../hooks/useAuth.js'
import { useTasks }                         from '../../hooks/useTasks.js'
import { useStudentSummary }                from '../../hooks/useAnalytics.js'
import { useUpcomingHolidays, useToday }    from '../../hooks/useHolidays.js'
import TaskItem                             from '../../components/tasks/TaskItem.jsx'
import { DashboardFooter }                  from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock }         from '../../components/shared/Loader.jsx'
import { useToast }                         from '../../context/ToastContext.jsx'
import { getTaskTitle, getTaskDueDate, daysUntil, isOverdue } from '../../utils/helpers.js'
import { BS_MONTH_NAMES, buildMonthDays, adToBS } from '../../utils/bsCalendar.js'

const DOW_LABELS = ['S','M','T','W','T','F','S']
const RED     = '#ef4444'
const RED_DIM = 'rgba(255,90,90,0.75)'
const SUN_DIM = 'rgba(255,130,100,0.60)'

// ── Stat card ──────────────────────────────────────────────────────────────────
function StatCard({ label, value, icon, accent }) {
  return (
    <div className="stat-box" style={{ borderTop: `3px solid ${accent}` }}>
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
        <span className="stat-label" style={{ marginBottom:0 }}>{label}</span>
        <div style={{ width:32, height:32, borderRadius:8, background:`${accent}14`,
          display:'flex', alignItems:'center', justifyContent:'center' }}>
          {React.cloneElement(icon, { size:15, style:{ color:accent } })}
        </div>
      </div>
      <p className="stat-value">{value ?? 0}</p>
    </div>
  )
}

// ── BS Calendar mini widget ────────────────────────────────────────────────────
function BSCalWidget() {
  const { today: todayData } = useToday()

  const todayBS = useMemo(() => {
    if (todayData?.today_bs) return todayData.today_bs
    const t = adToBS(new Date())
    return { year: t.year, month: t.month, day: t.day }
  }, [todayData])

  const [cur, setCur] = useState(() => {
    const t = adToBS(new Date())
    return { y: t.year, m: t.month }
  })

  useEffect(() => {
    if (todayBS?.year && todayBS?.month)
      setCur({ y: todayBS.year, m: todayBS.month })
  }, [todayBS?.year, todayBS?.month])

  const prev = () => setCur(c => c.m === 1  ? { y: c.y - 1, m: 12 } : { y: c.y, m: c.m - 1 })
  const next = () => setCur(c => c.m === 12 ? { y: c.y + 1, m: 1  } : { y: c.y, m: c.m + 1 })

  const days        = useMemo(() => buildMonthDays(cur.y, cur.m), [cur.y, cur.m])
  const firstDow    = days.length ? days[0].dow : 0
  const bsMonthName = BS_MONTH_NAMES[cur.m - 1]

  return (
    <div className="cal-card" style={{ display:'flex', flexDirection:'column' }}>
      <div className="cal-header">
        <button className="cal-nav" onClick={prev} aria-label="Previous month">
          <ChevronLeft size={12}/>
        </button>
        <div style={{ textAlign:'center' }}>
          <div className="cal-month-title">{bsMonthName?.en} {cur.y}</div>
          <div style={{ fontSize:9, color:'rgba(255,255,255,0.30)', marginBottom:6 }}>
            {bsMonthName?.ne} · BS
          </div>
        </div>
        <button className="cal-nav" onClick={next} aria-label="Next month">
          <ChevronRight size={12}/>
        </button>
      </div>

      <div className="cal-grid">
        {DOW_LABELS.map((d, i) => (
          <div key={i} className="cal-dow" style={{
            color: i === 6 ? RED_DIM : i === 0 ? SUN_DIM : undefined,
          }}>
            {d}
          </div>
        ))}

        {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`}/>)}

        {days.map(day => {
          const isToday = todayBS &&
            day.bsDay   === todayBS.day   &&
            cur.m       === todayBS.month &&
            cur.y       === todayBS.year

          let cls = 'cal-day'
          if (isToday)       cls += ' today'
          if (day.isHoliday) cls += ' holiday'
          if (day.isSat && !day.isHoliday) cls += ' saturday'

          const hTitle   = day.holidayTitle || (day.isSat ? 'Saturday — Holiday' : null)
          const numColor = day.isHoliday ? RED_DIM : day.isSun ? SUN_DIM : undefined

          return (
            <div key={day.bsKey} className="cal-day-cell" title={hTitle || undefined}>
              <div className={cls} style={{
                flexDirection:'column', gap:0, height:30, width:30,
                color: isToday ? undefined : numColor,
              }}>
                <span style={{ fontSize:11, lineHeight:1,
                  fontWeight: day.isHoliday || day.isSat ? 700 : 400 }}>
                  {day.bsDay}
                </span>
                <span style={{ fontSize:7, lineHeight:1, marginTop:1,
                  opacity: isToday ? 0.6 : 0.30 }}>
                  {day.adDate.getDate()}
                </span>
              </div>
            </div>
          )
        })}
      </div>

      <div className="cal-legend" style={{ marginTop:'auto', flexWrap:'wrap', gap:'5px 12px' }}>
        <div className="cal-legend-item">
          <span className="cal-legend-dot" style={{ background: RED }}/>
          Holiday/Sat
        </div>
        <div className="cal-legend-item">
          <span className="cal-legend-dot" style={{ background:'transparent',
            border:'1.5px solid rgba(255,255,255,0.55)', borderRadius:'50%' }}/>
          Today
        </div>
        <div className="cal-legend-item">
          <span className="cal-legend-dot" style={{ background: SUN_DIM }}/>
          Sunday
        </div>
      </div>
    </div>
  )
}

// ── Upcoming Holidays ──────────────────────────────────────────────────────────
function HolidaysWidget() {
  const { holidays, loading } = useUpcomingHolidays()
  return (
    <div className="white-card" style={{ padding:18, display:'flex', flexDirection:'column', height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <Star size={14} style={{ color:'#d4a93c', flexShrink:0 }}/>
        <div>
          <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14,
            color:'#1a1f35', margin:0, lineHeight:1.2 }}>
            Holidays
          </h3>
          <p style={{ fontSize:10, color:'#b0a898', margin:0, marginTop:2 }}>आगामी बिदाहरु</p>
        </div>
      </div>
      {loading
        ? <LoadingBlock rows={2}/>
        : holidays.length === 0
          ? <p style={{ fontSize:12, color:'#b0a898' }}>No upcoming holidays.</p>
          : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {holidays.slice(0, 5).map(h => {
                const d = daysUntil(h.date)
                return (
                  <div key={h.id || h.date}
                    style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                    <div style={{ minWidth:0, flex:1 }}>
                      <p style={{ fontSize:12, fontWeight:600, color:'#1a1f35', margin:0, lineHeight:1.3 }}>
                        {h.title || h.name}
                      </p>
                      <p style={{ fontSize:10, color:'#b0a898', margin:'2px 0 0' }}>
                        {h.date_bs?.str || h.date}
                      </p>
                    </div>
                    <span style={{ fontSize:10, fontWeight:600, padding:'3px 8px',
                      background:'#f0ece5', color:'#7a6e5e', borderRadius:99,
                      whiteSpace:'nowrap', flexShrink:0 }}>
                      {d === null ? '—' : d < 0 ? 'Past' : `${d}d`}
                    </span>
                  </div>
                )
              })}
            </div>
          )
      }
    </div>
  )
}

// ── Upcoming Assignments (teacher-assigned, read-only) ────────────────────────
function UpcomingAssignmentsWidget({ tasks }) {
  const upcoming = tasks
    .filter(t => !t.is_completed && !t.is_personal)
    .sort((a, b) => (a.due_date || '9').localeCompare(b.due_date || '9'))
    .slice(0, 5)

  return (
    <div className="white-card" style={{ padding:18, height:'100%' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
        <BookOpen size={14} style={{ color:'#3b6fd4', flexShrink:0 }}/>
        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14,
          color:'#1a1f35', margin:0 }}>
          Upcoming Assignments
        </h3>
      </div>
      {upcoming.length === 0
        ? <p style={{ fontSize:12, color:'#b0a898' }}>No pending assignments.</p>
        : (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {upcoming.map(t => {
              const due     = getTaskDueDate(t)
              const d       = daysUntil(due)
              const overdue = d !== null && d < 0
              return (
                <div key={t.id}
                  style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap:8 }}>
                  <div style={{ flex:1, minWidth:0 }}>
                    <p style={{ fontSize:12, fontWeight:600, color:'#1a1f35', margin:0,
                      lineHeight:1.35, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                      {getTaskTitle(t)}
                    </p>
                    <p style={{ fontSize:10, color:'#b0a898', margin:'1px 0 0' }}>{due || 'No date'}</p>
                  </div>
                  <span style={{ fontSize:10, fontWeight:600, padding:'3px 8px',
                    background: overdue ? '#fde8e8' : '#f0ece5',
                    color:       overdue ? '#c0392b' : '#7a6e5e',
                    borderRadius:99, whiteSpace:'nowrap', flexShrink:0 }}>
                    {d === null ? '—' : d < 0 ? `${Math.abs(d)}d late` : d === 0 ? 'Today' : `${d}d`}
                  </span>
                </div>
              )
            })}
          </div>
        )
      }
    </div>
  )
}

// ── Assignment tab table ───────────────────────────────────────────────────────
const TABS = [
  { key:'assigned',  label:'Assigned'  },
  { key:'pending',   label:'Pending'   },
  { key:'completed', label:'Completed' },
]

function AssignmentTabTable({ tasks, onToggle }) {
  const [tab, setTab] = useState('assigned')

  const filtered = tasks.filter(t =>
    tab === 'completed' ?  t.is_completed :
    tab === 'pending'   ? !t.is_completed && !t.is_personal :
                          !t.is_personal
  )

  function tabCount(key) {
    if (key === 'completed') return tasks.filter(t =>  t.is_completed).length
    if (key === 'pending')   return tasks.filter(t => !t.is_completed && !t.is_personal).length
    return tasks.filter(t => !t.is_personal).length
  }

  return (
    <div style={{ borderRadius:14, overflow:'hidden' }}>
      <div className="tab-bar">
        {TABS.map(t => (
          <button key={t.key}
            className={`tab-btn${tab === t.key ? ' active' : ''}`}
            onClick={() => setTab(t.key)}>
            {t.label}
            <span style={{ marginLeft:5, fontSize:11, fontWeight:600, padding:'1px 6px',
              borderRadius:99,
              background: tab === t.key ? 'rgba(26,31,53,0.1)' : 'rgba(255,255,255,0.15)',
              color:'inherit' }}>
              {tabCount(t.key)}
            </span>
          </button>
        ))}
      </div>
      <div style={{ background:'#fff', borderRadius:'0 0 14px 14px',
        border:'1px solid var(--color-cream-border)', borderTop:'none' }}>
        {filtered.length === 0 ? (
          <div style={{ padding:'36px 20px', textAlign:'center' }}>
            <p style={{ fontSize:13, color:'#b0a898' }}>No assignments in this category.</p>
          </div>
        ) : (
          <div style={{ overflowX:'auto' }}>
            <table className="task-table">
              <thead>
                <tr>
                  <th style={{ paddingLeft:20, width:36 }}>#</th>
                  <th>Assignment</th>
                  <th>Priority</th>
                  <th className="hide-sm">Due Date</th>
                  <th style={{ width:60 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((t, i) => (
                  <TaskItem
                    key={t.id}
                    task={t}
                    index={i}
                    compact
                    onToggle={onToggle}
                    onDelete={null}
                    onEdit={null}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Main export ────────────────────────────────────────────────────────────────
export default function StudentDashboard({ user: propUser }) {
  const { user: ctxUser }  = useAuth()
  const user               = propUser || ctxUser
  const { tasks, loading, error, stats, toggleComplete, refetch } = useTasks()
  const { data: summary }  = useStudentSummary()
  const toast              = useToast()

  async function handleToggle(id, current) {
    try   { await toggleComplete(id, current) }
    catch { toast.error('Failed to update') }
  }

  const displayStats = {
    total:     summary?.total     ?? stats.total,
    active:    tasks.filter(t => !t.is_completed && !isOverdue(t)).length,
    pending:   summary?.pending   ?? stats.pending,
    completed: summary?.completed ?? stats.completed,
  }

  const hour     = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:18 }} className="anim-fade-in">

      {/* Banner */}
      <div style={{ background:'var(--color-navy)', borderRadius:14,
        padding:'22px 26px', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:160, height:160,
          background:'rgba(255,255,255,0.03)', borderRadius:'50%' }}/>
        <div style={{ position:'absolute', bottom:-30, left:40, width:100, height:100,
          background:'rgba(255,255,255,0.02)', borderRadius:'50%' }}/>
        <div style={{ position:'relative', display:'flex', alignItems:'flex-start',
          justifyContent:'space-between', flexWrap:'wrap', gap:14 }}>
          <div>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', margin:'0 0 3px' }}>
              {greeting},
            </p>
            <h2 style={{ color:'#fff', fontSize:24, fontWeight:700,
              fontFamily:'var(--font-display)', margin:'0 0 4px', letterSpacing:'-0.02em' }}>
              {user?.full_name || user?.username} 👋
            </h2>
            <p style={{ fontSize:12, color:'rgba(255,255,255,0.35)', margin:0 }}>
              {displayStats.pending} assignments pending · {displayStats.completed} completed
            </p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="stat-grid stagger">
        <StatCard label="Total Assignments" value={displayStats.total}      icon={<ListTodo/>}      accent="#1a1f35"/>
        <StatCard label="In Progress"        value={displayStats.active}    icon={<Clock/>}         accent="#3b6fd4"/>
        <StatCard label="Pending"            value={displayStats.pending}   icon={<BookOpen/>}      accent="#d4a93c"/>
        <StatCard label="Completed"          value={displayStats.completed} icon={<CheckCircle2/>}  accent="#3cb87a"/>
      </div>

      {/* 3 widgets */}
      <div className="widget-grid">
        <BSCalWidget/>
        <HolidaysWidget/>
        <UpcomingAssignmentsWidget tasks={tasks}/>
      </div>

      {/* Assignment table — student view, no create/edit/delete */}
      {loading ? (
        <div className="white-card" style={{ padding:24 }}><LoadingBlock/></div>
      ) : error ? (
        <ErrorBlock message={error} onRetry={refetch}/>
      ) : (
        <AssignmentTabTable tasks={tasks} onToggle={handleToggle}/>
      )}

      <DashboardFooter/>
    </div>
  )
}