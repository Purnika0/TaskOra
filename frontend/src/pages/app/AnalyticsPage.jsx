import React from 'react'
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Users, SearchX, ListOrdered, UsersRound } from 'lucide-react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import {
    useTaskProgress, useStudentGroups, useOutliers, useStudentRanking,
    useCourseOverview,
} from '../../hooks/useAnalytics.js'
import { useAuth }            from '../../hooks/useAuth.js'
import { DashboardFooter }    from '../../components/layout/Footer.jsx'
import { LoadingBlock }       from '../../components/shared/Loader.jsx'
import { dueDateBS }          from '../../utils/helpers.js'
import { getOutlierSeverity, splitReasons } from '../../utils/outlierSeverity.js'
import StudentAnalyticsPage from './StudentAnalyticsPage.jsx'

// ── Metric card ───────────────────────────────────────────────
function MetricCard({ icon, label, value, sub, accent }) {
    return (
        <div className="stat-box">
        <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <div style={{ width:38, height:38, borderRadius:10, background:`${accent}14`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }} aria-hidden="true">
            {React.cloneElement(icon, { size:17, style:{ color:accent } })}
            </div>
            <div>
            <p className="stat-label" style={{ marginBottom:4 }}>{label}</p>
            <p className="stat-value" style={{ fontSize:26 }}>{value}</p>
            {sub && <p style={{ fontSize:10, color:'#b0a898', marginTop:2 }}>{sub}</p>}
            </div>
        </div>
        </div>
    )
}

// ── Horizontal progress bar ───────────────────────────────────
function Bar({ label, value, max, accent = '#3b6fd4' }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0
    return (
        <div>
        <div style={{ display:'flex', justifyContent:'space-between', marginBottom:5 }}>
            <p style={{ fontSize:13, fontWeight:500, color:'#1a1f35', margin:0 }}>{label}</p>
            <span style={{ fontSize:12, fontWeight:700, color:'#1a1f35' }}>{value}</span>
        </div>
        <div className="progress-bar-track" aria-label={`${pct}%`} aria-hidden="true">
            <div className="progress-bar-fill" style={{ width:`${pct}%`, background:accent }}/>
        </div>
        </div>
    )
}

// ── Empty-state card ──────────────────────────────────────────
// Feature-specific empty state shown when a backend validation
// threshold isn't met (e.g. not enough students with task data yet)
// instead of a generic "No data available" message.
function EmptyState({ icon, message }) {
    return (
        <div style={{
            display:'flex', flexDirection:'column', alignItems:'center',
            justifyContent:'center', textAlign:'center', gap:12,
            padding:'36px 20px', minHeight:180, height:'100%',
        }}>
        <div style={{
            width:44, height:44, borderRadius:12, background:'#f5f1e9',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
        }} aria-hidden="true">
            {React.cloneElement(icon, { size:20, style:{ color:'#b0a898' } })}
        </div>
        <p style={{ fontSize:13, color:'#8a7e6e', lineHeight:1.55, maxWidth:280, margin:0 }}>
            {message}
        </p>
        </div>
    )
}

// ── Section wrapper ───────────────────────────────────────────
// `filters` renders a control bar under the header (used for the
// per-component filtering in the 2x2 analytics grid). Content area
// scrolls internally so all 4 grid cards stay the same height.
function Section({ title, icon, children, loading, badge, filters }) {
    return (
        <div className="white-card" style={{ overflow:'hidden', display:'flex', flexDirection:'column', height:'100%' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'13px 20px', borderBottom:'1px solid #f0ece4', flexShrink:0 }}>
            {icon && React.cloneElement(icon, { size:14, style:{ color:'#3b6fd4' } })}
            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#1a1f35', margin:0, flex:1 }}>
            {title}
            </h3>
            {badge && (
            <span style={{ fontSize:10, fontWeight:600, padding:'2px 8px', borderRadius:99, background:'#f0ece5', color:'#6a5e4e' }}>
                {badge}
            </span>
            )}
        </div>
        {filters && (
            <div style={{ display:'flex', alignItems:'center', flexWrap:'wrap', gap:8, padding:'10px 20px', borderBottom:'1px solid #f0ece4', background:'#faf8f5', flexShrink:0 }}>
            {filters}
            </div>
        )}
        <div style={{ padding:'18px 20px', overflowY:'auto', flex:1, minHeight:0 }}>
            {loading ? <LoadingBlock/> : children}
        </div>
        </div>
    )
    }

// ── Small filter controls ─────────────────────────────────────
function FilterSelect({ value, onChange, options }) {
    return (
        <select
        value={value}
        onChange={e => onChange(e.target.value)}
        style={{
            fontSize:12, fontWeight:600, color:'#1a1f35', background:'#fff',
            border:'1px solid #ece5dc', borderRadius:8, padding:'6px 10px',
            cursor:'pointer', outline:'none',
        }}
        >
        {options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
        ))}
        </select>
    )
    }

function FilterPill({ active, onClick, children, accent = '#3b6fd4' }) {
    return (
        <button
        type="button"
        onClick={onClick}
        style={{
            fontSize:11, fontWeight:600, padding:'5px 11px', borderRadius:99,
            border: active ? `1px solid ${accent}` : '1px solid #ece5dc',
            background: active ? `${accent}14` : '#fff',
            color: active ? accent : '#6a5e4e',
            cursor:'pointer', transition:'all 0.15s ease',
        }}
        >
        {children}
        </button>
    )
    }

    // ═══════════════════════════════════════════════════════════════
    // STUDENT RANKING — full leaderboard (Teacher view)
    // The Teacher Dashboard only shows the top 5; the complete
    // ranking lives here.
    // ═══════════════════════════════════════════════════════════════
    const RANKING_FILTERS = [
    { value:'all',    label:'All'        },
    { value:'top10',  label:'Top 10'     },
    { value:'bottom10', label:'Bottom 10' },
    ]

    function StudentRankingSection() {
    const { data:ranking, loading, error } = useStudentRanking()
    const [rankFilter, setRankFilter] = React.useState('all')

    if (error) return (
        <Section title="Student Ranking" icon={<TrendingUp/>} loading={false}>
        <p style={{ fontSize:12, color:'#e05252' }}>Could not load student ranking.</p>
        </Section>
    )

    // `ranking` is assumed to already be ordered best → worst (as the
    // original #1, #2... display implies). We keep that order and just
    // slice, so displayed rank numbers stay true to the full list.
    const full = ranking || []
    let view = full
    let startIndex = 0
    if (rankFilter === 'top10') {
        view = full.slice(0, 10)
    } else if (rankFilter === 'bottom10') {
        view = full.slice(-10)
        startIndex = Math.max(full.length - 10, 0)
    }

    return (
        <Section
        title="Student Ranking"
        icon={<TrendingUp/>}
        loading={loading}
        badge={full.length ? `${full.length} students` : undefined}
        filters={
            !loading && full.length > 0 && (
            <FilterSelect value={rankFilter} onChange={setRankFilter} options={RANKING_FILTERS}/>
            )
        }
        >
        {!loading && !full.length ? (
            <EmptyState icon={<ListOrdered/>} message="No student data available to generate rankings." />
        ) : !loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {view.map((r, i) => (
                <div key={startIndex + i} style={{ padding:'10px 12px', border:'1px solid #ece5dc', borderRadius:10, background:'#fff' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                    <strong style={{ fontSize:12.5, color:'#1a1f35' }}>#{startIndex + i + 1} {r.student}</strong>
                    <span style={{
                        fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99,
                        background: r.completion_rate >= 80 ? '#e0f7ee' : r.completion_rate >= 50 ? '#fffbeb' : '#fde8e8',
                        color:      r.completion_rate >= 80 ? '#166534' : r.completion_rate >= 50 ? '#92400e' : '#991b1b',
                    }}>
                    {r.completion_rate}%
                    </span>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:4, fontSize:11, color:'#6a5e4e' }}>
                    <span>Completed: {r.completed}</span>
                    <span>Submitted: {r.submitted}</span>
                    <span>Pending: {r.pending}</span>
                    <span>Overdue: {r.overdue}</span>
                    <span>Rejected: {r.rejected}</span>
                    <span>Total: {r.total}</span>
                </div>
                </div>
            ))}
            </div>
        )}
        </Section>
    )
    }

    // ═══════════════════════════════════════════════════════════════
    // K-MEANS CLUSTERING — Student Performance Groups (Teacher view)
    // Maps raw cluster output to human-friendly performance labels.
    // NEVER exposes cluster IDs or raw centroid data.
    // ═══════════════════════════════════════════════════════════════
    const GROUP_CONFIG = {
    'High Performer': { color:'#059669', bg:'#ecfdf5', bar:'#059669', label:'High Performer', pluralLabel:'High Performers' },
    'Average':        { color:'#0891b2', bg:'#ecfeff', bar:'#0891b2', label:'Average',        pluralLabel:'Average'         },
    'At-Risk':        { color:'#dc2626', bg:'#fef2f2', bar:'#ef4444', label:'Needs Support',  pluralLabel:'Needs Support'   },
    }

    const GROUP_FILTERS = [
    { value:'all',            label:'All'             },
    { value:'High Performer', label:'High Performers' },
    { value:'Average',        label:'Average'         },
    { value:'At-Risk',        label:'Needs Support'   },
    ]

    function StudentGroupsSection() {
    const { data, loading, error } = useStudentGroups()
    const [groupFilter, setGroupFilter] = React.useState('all')

    const summary  = data?.summary  || {}
    const students = data?.students || []
    const total    = Object.values(summary).reduce((s, n) => s + Number(n), 0)

    const filteredStudents = groupFilter === 'all'
        ? students
        : students.filter(s => (s.group || s.cluster_label || 'Average') === groupFilter)

    if (error) return (
        <Section title="Student Performance Groups" icon={<Users/>} loading={false}>
        <p style={{ fontSize:12, color:'#e05252' }}>Could not load student group data.</p>
        </Section>
    )

    return (
        <Section title="Student Performance Groups" icon={<Users/>} loading={loading}
        badge={total > 0 ? `${total} students` : undefined}
        filters={
            !loading && total > 0 && (
            <>
                {GROUP_FILTERS.map(f => (
                <FilterPill
                    key={f.value}
                    active={groupFilter === f.value}
                    onClick={() => setGroupFilter(f.value)}
                    accent={f.value === 'all' ? '#3b6fd4' : (GROUP_CONFIG[f.value]?.color || '#3b6fd4')}
                >
                    {f.label}
                </FilterPill>
                ))}
            </>
            )
        }
        >

        {!loading && total === 0 ? (
            data?.error ? (
            <EmptyState
                icon={<UsersRound/>}
                message="Not enough student data to generate performance groups. At least 3 students with task data are required."
            />
            ) : (
            <EmptyState icon={<Users/>} message="No student data yet." />
            )
        ) : !loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Group bars */}
            {Object.entries(summary).map(([group, count]) => {
                const cfg = GROUP_CONFIG[group] || GROUP_CONFIG['Average']
                const pct = total > 0 ? Math.round(Number(count) / total * 100) : 0
                return (
                <div key={group}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:6 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:cfg.color, flexShrink:0 }}/>
                        <span style={{ fontSize:13, fontWeight:600, color:'#1a1f35' }}>{cfg.pluralLabel}</span>
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <span style={{ fontSize:12, fontWeight:700, color:'#1a1f35' }}>{count}</span>
                        <span style={{ fontSize:10, color:'#b0a898', minWidth:28 }}>{pct}%</span>
                    </div>
                    </div>
                    <div style={{ height:8, background:'#f0ece4', borderRadius:99, overflow:'hidden' }}>
                    <div style={{ height:'100%', background:cfg.bar, borderRadius:99, width:`${pct}%`, transition:'width 0.6s ease' }}/>
                    </div>
                </div>
                )
            })}

            {/* Student list (names only — no scores) */}
            {students.length > 0 && (
                <div style={{ marginTop:4 }}>
                <p style={{ fontSize:11, color:'#b0a898', marginBottom:10, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>
                    Individual Students {groupFilter !== 'all' && `— ${filteredStudents.length} shown`}
                </p>
                {filteredStudents.length === 0 ? (
                    <p style={{ fontSize:12, color:'#b0a898' }}>No students in this group.</p>
                ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {filteredStudents.map((s, i) => {
                    const grp = s.group || s.cluster_label || 'Average'
                    const cfg = GROUP_CONFIG[grp] || GROUP_CONFIG['Average']
                    return (
                        <div key={s.student_id || i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 12px', background:'#faf8f5', borderRadius:8 }}>
                        <span style={{ fontSize:13, color:'#1a1f35', fontWeight:500 }}>
                            {s.student_name || `Student ${i + 1}`}
                        </span>
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 9px', borderRadius:99, background:cfg.bg, color:cfg.color }}>
                            {cfg.label}
                        </span>
                        </div>
                    )
                    })}
                </div>
                )}
                </div>
            )}
            </div>
        )}
        </Section>
    )
    }

    // ═══════════════════════════════════════════════════════════════
    // ISOLATION FOREST — Students Needing Attention (Teacher view)
    // Maps flagged outlier data to human-friendly insight cards.
    // NEVER exposes: z_score, flagged_by, anomaly_score, or raw values.
    // ═══════════════════════════════════════════════════════════════
    function OutliersSection() {
    const { data, loading, error } = useOutliers()
    const [courseFilter, setCourseFilter] = React.useState('all')

    const outliers = data?.outliers || []
    const total    = data?.total_flagged ?? outliers.length

    // NOTE: filtering by course here assumes each outlier object has a
    // `course` field. If useOutliers() doesn't currently return one,
    // this select will just render with only the "All Courses" option —
    // add `course` to the Isolation Forest API response to enable it.
    const courses = [...new Set(outliers.map(o => o.course).filter(Boolean))]
    const filteredOutliers = courseFilter === 'all'
        ? outliers
        : outliers.filter(o => o.course === courseFilter)

    if (error) return (
        <Section title="Student Outliers" icon={<AlertTriangle/>} loading={false}>
        <p style={{ fontSize:12, color:'#e05252' }}>Could not load student attention data.</p>
        </Section>
    )

    return (
        <Section title="Student Outliers" icon={<AlertTriangle/>} loading={loading}
        badge={total > 0 ? `${total} flagged` : undefined}
        filters={
            !loading && courses.length > 0 && (
            <FilterSelect
                value={courseFilter}
                onChange={setCourseFilter}
                options={[{ value:'all', label:'All Courses' }, ...courses.map(c => ({ value:c, label:c }))]}
            />
            )
        }
        >

        {!loading && data?.error ? (
            <EmptyState
            icon={<SearchX/>}
            message="Not enough student data to detect outliers. At least 4 students with task data are required."
            />
        ) : !loading && outliers.length === 0 ? (
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <CheckCircle2 size={16} style={{ color:'#059669', flexShrink:0 }}/>
            <p style={{ fontSize:13, color:'#1a1f35', margin:0 }}>
                All students are performing within expected patterns.
            </p>
            </div>
        ) : !loading && (
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            <p style={{ fontSize:12, color:'#6a5e4e', marginBottom:4, lineHeight:1.6 }}>
                The following students have unusual task completion patterns compared to peers.
                Consider reaching out to offer support.
            </p>

            {filteredOutliers.length === 0 ? (
                <p style={{ fontSize:12, color:'#b0a898' }}>No flagged students for this course.</p>
            ) : filteredOutliers.map((o, i) => {
                // Map completion_rate to a visual indicator — never show z_score/flagged_by
                const rate = typeof o.completion_rate === 'number'
                ? o.completion_rate
                : parseFloat(o.completion_rate) || 0
                const severity = getOutlierSeverity(rate)
                const reasons  = splitReasons(o.reason)

                return (
                <div key={o.student_id || o.student_name || i}
                    style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', background:severity.bg, borderRadius:10, border:`1px solid ${severity.border}` }}>
                    {/* Avatar initial */}
                    <div style={{ width:34, height:34, borderRadius:'50%', background:severity.avatarBg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:700, color:severity.avatarText, fontFamily:'var(--font-display)' }}>
                    {(o.student_name || 'S').charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#1a1f35', margin:0 }}>
                        {o.student_name || `Student ${i + 1}`}
                        </p>
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background:severity.badgeBg, color:severity.badgeText, flexShrink:0 }}>
                        {severity.label}
                        </span>
                    </div>

                    {/* Completion bar + rate */}
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:5 }}>
                        <div style={{ flex:1, height:4, background:'#f0ece4', borderRadius:99, overflow:'hidden' }}>
                        <div style={{ height:'100%', background:severity.barColor, borderRadius:99, width:`${Math.min(rate, 100)}%`, transition:'width 0.5s ease' }}/>
                        </div>
                        <span style={{ fontSize:10, fontWeight:600, color:'#6a5e4e', flexShrink:0 }}>{Math.round(rate)}%</span>
                    </div>

                    {/* Reasons — human-readable, one per line (backend joins with " | ") */}
                    {reasons.length > 0 && (
                        <ul style={{ margin:0, padding:'0 0 0 14px', listStyle:'disc' }}>
                        {reasons.map((r, ri) => (
                            <li key={ri} style={{ fontSize:11, color:'#6a5e4e', lineHeight:1.55 }}>{r}</li>
                        ))}
                        </ul>
                    )}
                    </div>
                </div>
                )
            })}
            </div>
        )}
        </Section>
    )
}

// ═══════════════════════════════════════════════════════════════
// ASSIGNMENT COMPLETION (Teacher view) — course filter
// ═══════════════════════════════════════════════════════════════
function AssignmentCompletionSection() {
    const { data:progress, loading:pl } = useTaskProgress()
    const [courseFilter, setCourseFilter] = React.useState('all')

    const all = progress || []
    const courses = [...new Set(all.map(p => p.course).filter(Boolean))]
    const filtered = courseFilter === 'all' ? all : all.filter(p => p.course === courseFilter)

    return (
        <Section title="Assignment Completion" icon={<BarChart3/>} loading={pl}
        badge={all.length ? `${all.length} assignments` : undefined}
        filters={
            !pl && courses.length > 0 && (
            <FilterSelect
                value={courseFilter}
                onChange={setCourseFilter}
                options={[{ value:'all', label:'All Courses' }, ...courses.map(c => ({ value:c, label:c }))]}
            />
            )
        }
        >
        {all.length === 0 && !pl ? (
            <p style={{ fontSize:13, color:'#b0a898' }}>No assignment data yet.</p>
        ) : filtered.length === 0 ? (
            <p style={{ fontSize:13, color:'#b0a898' }}>No assignments for this course.</p>
        ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            {filtered.map((p, i) => (
                <div key={i} style={{ padding:'12px 14px', background:'#faf8f5', borderRadius:10, border:'1px solid #f0ece4' }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, gap:8 }}>
                    <p style={{ fontSize:13, fontWeight:600, color:'#1a1f35', margin:0 }}>{p.assignment}</p>
                    <span style={{ fontSize:11, color:'#8a7e6e', flexShrink:0 }}>{p.course}</span>
                </div>
                <div className="progress-bar-track" style={{ marginBottom:6 }} aria-label={`${p.completion_rate}% complete`}>
                    <div className="progress-bar-fill" style={{ width:`${p.completion_rate}%`, background:'#1a1f35' }}/>
                </div>
                <p style={{ fontSize:10, color:'#b0a898', margin:0 }}>
                    Due: {dueDateBS(p)} · {p.completed}/{p.total_students} students · {p.completion_rate}%
                </p>
                </div>
            ))}
            </div>
        )}
        </Section>
    )
}

// ═══════════════════════════════════════════════════════════════
// COURSE OVERVIEW (Teacher view) — enrollment pie chart + summary
// Palette reuses the accent colors already used across this app's
// metric cards (primary, blue, green, amber, red, ...) so new slices
// stay visually consistent with the rest of TaskOra.
// ═══════════════════════════════════════════════════════════════
const COURSE_PALETTE = [
    '#5452e4', // primary
    '#3b6fd4', // blue
    '#3cb87a', // green
    '#d4a93c', // amber
    '#e05252', // red
    '#0ea5e9', // sky
    '#8b5cf6', // violet
    '#0d9488', // teal
    '#f472b6', // pink
    '#f59e0b', // orange
]

// Renders each slice's course name + student count directly on the
// chart (not just on hover), so the data is visible at a glance.
function renderPieLabel({ cx, cy, midAngle, outerRadius, name, value }) {
    const RADIAN  = Math.PI / 180
    const radius  = outerRadius + 18
    const x       = cx + radius * Math.cos(-midAngle * RADIAN)
    const y       = cy + radius * Math.sin(-midAngle * RADIAN)
    return (
        <text x={x} y={y} fill="#475569" fontSize={11} fontWeight={600} textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central">
            {`${name} (${value})`}
        </text>
    )
}

function CourseOverviewSection() {
    const { data:courses, loading } = useCourseOverview()
    const list = courses || []

    const totalStudents    = list.reduce((s, c) => s + (c.students_enrolled || 0), 0)
    const totalAssignments = list.reduce((s, c) => s + (c.total_assignments || 0), 0)
    const avgCompletion    = list.length
        ? Math.round(list.reduce((s, c) => s + (c.completion_rate || 0), 0) / list.length)
        : 0

    const pieData = list
        .filter(c => (c.students_enrolled || 0) > 0)
        .map(c => ({ name: c.course, value: c.students_enrolled }))

    return (
        <>
        <div className="stat-grid stagger">
            <MetricCard icon={<BarChart3/>}     label="Courses"           value={list.length}          sub="currently teaching"  accent="#5452e4"/>
            <MetricCard icon={<Users/>}         label="Students Enrolled" value={totalStudents}         sub="across all courses"  accent="#3b6fd4"/>
            <MetricCard icon={<CheckCircle2/>}  label="Assignments"       value={totalAssignments}      sub="created in total"    accent="#3cb87a"/>
            <MetricCard icon={<TrendingUp/>}    label="Avg. Completion"   value={`${avgCompletion}%`}   sub="across courses"      accent="#d4a93c"/>
        </div>

        <style>{`
            .course-overview-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            grid-auto-rows: 380px;
            gap: 18px;
            }
            @media (max-width: 860px) {
            .course-overview-grid {
                grid-template-columns: 1fr;
                grid-auto-rows: 340px;
            }
            }
        `}</style>

        <div className="course-overview-grid">
            {/* Enrollment distribution */}
            <Section title="Students Enrolled by Course" icon={<Users/>} loading={loading}>
            {pieData.length === 0 && !loading ? (
                <p style={{ fontSize:13, color:'#b0a898' }}>No enrollments yet.</p>
            ) : (
                <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                    <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80}
                        paddingAngle={2} label={renderPieLabel} labelLine={{ stroke:'#CBD5E1' }}>
                    {pieData.map((entry, i) => (
                        <Cell key={i} fill={COURSE_PALETTE[i % COURSE_PALETTE.length]}/>
                    ))}
                    </Pie>
                    <Tooltip formatter={(value, name) => [`${value} students`, name]}/>
                    <Legend verticalAlign="bottom" height={40} wrapperStyle={{ fontSize:11 }}/>
                </PieChart>
                </ResponsiveContainer>
            )}
            </Section>

            {/* Completion rate per course */}
            <Section title="Completion Rate by Course" icon={<BarChart3/>} loading={loading}>
            {list.length === 0 && !loading ? (
                <p style={{ fontSize:13, color:'#b0a898' }}>No course data yet.</p>
            ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                {list.map((c, i) => (
                    <Bar key={i} label={c.course} value={c.completion_rate} max={100} accent="#5452e4"/>
                ))}
                </div>
            )}
            </Section>
        </div>
        </>
    )
}

// ═══════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
    const { user } = useAuth()
    const isTeacher = user?.role === 'teacher'

    // Student analytics now lives in its own dedicated component/page.
    if (!isTeacher) return <StudentAnalyticsPage/>

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:18 }} className="anim-fade-in">

        <div className="page-header">
            <div>
            <h2 className="page-title">Analytics</h2>
            <p className="page-subtitle">Live data from your academic activity</p>
            </div>
        </div>

        {/* ── Teacher analytics ── */}
        {isTeacher && (
            <>
            <CourseOverviewSection/>

            <style>{`
                .analytics-2x2-grid {
                display: grid;
                grid-template-columns: repeat(2, 1fr);
                grid-auto-rows: 600px;
                gap: 18px;
                }
                @media (max-width: 860px) {
                .analytics-2x2-grid {
                    grid-template-columns: 1fr;
                    grid-auto-rows: 500px;
                }
                }
            `}</style>
            <div className="analytics-2x2-grid">
                {/* Assignment progress */}
                <AssignmentCompletionSection/>

                {/* Full student ranking (top 5 shown on the dashboard) */}
                <StudentRankingSection/>

                {/* K-Means Clustering — student performance groups */}
                <StudentGroupsSection/>

                {/* Isolation Forest — students needing attention */}
                <OutliersSection/>
            </div>
            </>
        )}

        <DashboardFooter/>
        </div>
    )
}