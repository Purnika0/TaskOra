// src/pages/app/AnalyticsPage.jsx
//
// Student view  → Task summary cards + weekly bar chart + course workload
// Teacher view  → Assignment completion + K-Means student groups + Isolation Forest outliers
//
// ML Integration (teacher):
//   K-Means Clustering       → GET /api/ml/analytics/teacher/student-groups/
//     Response: { summary: { "High Performer": N, "Average": N, "At-Risk": N }, students: [...] }
//     UI: Human-readable performance groups — NO cluster IDs exposed
//
//   Isolation Forest          → GET /api/ml/analytics/teacher/outliers/
//     Response: { outliers: [{ student_name, completion_rate, z_score, flagged_by, reason }], total_flagged }
//     UI: Student name + completion rate + reason — z_score / flagged_by NEVER shown

import React from 'react'
import { BarChart3, TrendingUp, AlertTriangle, CheckCircle2, Clock, Users, AlertCircle } from 'lucide-react'
import {
    useStudentSummary, useWeeklyProgress, useCourseWorkload,
    useTaskProgress, useStudentGroups, useOutliers,
} from '../../hooks/useAnalytics.js'
import { useAuth }            from '../../hooks/useAuth.js'
import { DashboardFooter }    from '../../components/layout/Footer.jsx'
import { LoadingBlock }       from '../../components/shared/Loader.jsx'
import { useTasks }           from '../../hooks/useTasks.js'
import { isOverdue }          from '../../utils/helpers.js'

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

// ── Section wrapper ───────────────────────────────────────────
function Section({ title, icon, children, loading, badge }) {
    return (
        <div className="white-card" style={{ overflow:'hidden' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, padding:'13px 20px', borderBottom:'1px solid #f0ece4' }}>
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
        <div style={{ padding:'18px 20px' }}>
            {loading ? <LoadingBlock/> : children}
        </div>
        </div>
    )
    }

    // ═══════════════════════════════════════════════════════════════
    // K-MEANS CLUSTERING — Student Performance Groups (Teacher view)
    // Maps raw cluster output to human-friendly performance labels.
    // NEVER exposes cluster IDs or raw centroid data.
    // ═══════════════════════════════════════════════════════════════
    const GROUP_CONFIG = {
    'High Performer': { color:'#059669', bg:'#ecfdf5', bar:'#059669', label:'High Performers' },
    'Average':        { color:'#0891b2', bg:'#ecfeff', bar:'#0891b2', label:'Average'         },
    'At-Risk':        { color:'#dc2626', bg:'#fef2f2', bar:'#ef4444', label:'Needs Support'   },
    }

    function StudentGroupsSection() {
    const { data, loading, error } = useStudentGroups()

    const summary  = data?.summary  || {}
    const students = data?.students || []
    const total    = Object.values(summary).reduce((s, n) => s + Number(n), 0)

    if (error) return (
        <Section title="Student Performance Groups" icon={<Users/>} loading={false}>
        <p style={{ fontSize:12, color:'#e05252' }}>Could not load student group data.</p>
        </Section>
    )

    return (
        <Section title="Student Performance Groups" icon={<Users/>} loading={loading}
        badge={total > 0 ? `${total} students` : undefined}>

        {!loading && total === 0 ? (
            <p style={{ fontSize:13, color:'#b0a898' }}>
            Student groups will appear once enough task data is available.
            </p>
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
                        <span style={{ fontSize:13, fontWeight:600, color:'#1a1f35' }}>{cfg.label}</span>
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
                    Individual Students
                </p>
                <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                    {students.map((s, i) => {
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

    const outliers = data?.outliers || []
    const total    = data?.total_flagged ?? outliers.length

    if (error) return (
        <Section title="Students Needing Attention" icon={<AlertCircle/>} loading={false}>
        <p style={{ fontSize:12, color:'#e05252' }}>Could not load student attention data.</p>
        </Section>
    )

    return (
        <Section title="Students Needing Attention" icon={<AlertCircle/>} loading={loading}
        badge={total > 0 ? `${total} flagged` : undefined}>

        {!loading && outliers.length === 0 ? (
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

            {outliers.map((o, i) => {
                // Map completion_rate to a visual indicator — never show z_score/flagged_by
                const rate = typeof o.completion_rate === 'number'
                ? o.completion_rate
                : parseFloat(o.completion_rate) || 0
                const rateLabel = `${Math.round(rate)}% completion`
                const lowRate = rate < 30

                return (
                <div key={o.student_id || o.student_name || i}
                    style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'12px 14px', background: lowRate ? '#fff7f7' : '#fffbeb', borderRadius:10, border:`1px solid ${lowRate ? '#fecaca' : '#fde68a'}` }}>
                    {/* Avatar initial */}
                    <div style={{ width:34, height:34, borderRadius:'50%', background: lowRate ? '#fee2e2' : '#fef3c7', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:12, fontWeight:700, color: lowRate ? '#dc2626' : '#d97706', fontFamily:'var(--font-display)' }}>
                    {(o.student_name || 'S').charAt(0).toUpperCase()}
                    </div>

                    <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:8, marginBottom:4 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#1a1f35', margin:0 }}>
                        {o.student_name || `Student ${i + 1}`}
                        </p>
                        <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:99, background: lowRate ? '#fee2e2' : '#fef3c7', color: lowRate ? '#dc2626' : '#d97706', flexShrink:0 }}>
                        {rateLabel}
                        </span>
                    </div>

                    {/* Completion bar */}
                    <div style={{ height:4, background:'#f0ece4', borderRadius:99, overflow:'hidden', marginBottom:5 }}>
                        <div style={{ height:'100%', background: lowRate ? '#ef4444' : '#f59e0b', borderRadius:99, width:`${Math.min(rate, 100)}%`, transition:'width 0.5s ease' }}/>
                    </div>

                    {/* Reason — human-readable only */}
                    {o.reason && (
                        <p style={{ fontSize:11, color:'#6a5e4e', margin:0, lineHeight:1.55 }}>
                        {o.reason}
                        </p>
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
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════
export default function AnalyticsPage() {
    const { user } = useAuth()
    const isTeacher = user?.role === 'teacher'

    const { data:summary,  loading:sl }  = useStudentSummary()
    const { data:weekly,   loading:wl }  = useWeeklyProgress()
    const { data:workload, loading:cl }  = useCourseWorkload()
    const { data:progress, loading:pl }  = useTaskProgress()
    const { tasks }                       = useTasks()
    const overdueCount = tasks.filter(isOverdue).length

    return (
        <div style={{ display:'flex', flexDirection:'column', gap:18 }} className="anim-fade-in">

        <div className="page-header">
            <div>
            <h2 className="page-title">{isTeacher ? 'Analytics' : 'My Analytics'}</h2>
            <p className="page-subtitle">Live data from your academic activity</p>
            </div>
        </div>

        {/* ── Student analytics ── */}
        {!isTeacher && (
            <>
            <div className="stat-grid stagger">
                <MetricCard icon={<TrendingUp/>}    label="Completion Rate" value={`${summary?.completion_rate ?? 0}%`} sub={`${summary?.completed ?? 0} tasks done`}            accent="#3cb87a"/>
                <MetricCard icon={<CheckCircle2/>}  label="Completed"       value={summary?.completed ?? 0}             sub={`of ${summary?.total ?? 0} total`}                    accent="#3b6fd4"/>
                <MetricCard icon={<Clock/>}         label="Pending"         value={summary?.pending ?? 0}               sub="to complete"                                           accent="#d4a93c"/>
                <MetricCard icon={<AlertTriangle/>} label="Overdue"         value={overdueCount}                         sub={overdueCount > 0 ? 'needs attention' : 'all on track'} accent="#e05252"/>
            </div>

            {/* Weekly bar chart */}
            <Section title="Tasks Completed — Last 7 Days" icon={<BarChart3/>} loading={wl}>
                {(weekly || []).length === 0 && !wl ? (
                <p style={{ fontSize:13, color:'#b0a898' }}>No data yet. Complete some tasks to see your progress.</p>
                ) : (
                <div style={{ display:'flex', alignItems:'flex-end', gap:6, height:96 }}>
                    {(() => {
                    const max = Math.max(...(weekly || []).map(x => x.completed), 1)
                    return (weekly || []).map((d, i) => (
                        <div key={i} style={{ flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:4 }}>
                        <span style={{ fontSize:10, fontWeight:700, color:'#1a1f35' }}>{d.completed}</span>
                        <div style={{ width:'100%', background:'#f0ece4', borderRadius:'4px 4px 0 0', position:'relative', height:64 }}>
                            <div style={{ position:'absolute', bottom:0, left:0, right:0, borderRadius:'4px 4px 0 0', background:'#1a1f35', transition:'height 0.6s ease', height:`${(d.completed / max) * 64}px` }}/>
                        </div>
                        <span style={{ fontSize:9, color:'#b0a898', whiteSpace:'nowrap' }}>{d.date?.slice(5)}</span>
                        </div>
                    ))
                    })()}
                </div>
                )}
            </Section>

            {/* Course workload */}
            <Section title="Course Workload" icon={<BarChart3/>} loading={cl}>
                {(workload || []).length === 0 && !cl ? (
                <p style={{ fontSize:13, color:'#b0a898' }}>Join a course to see your workload breakdown.</p>
                ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                    {(workload || []).map((c, i) => (
                    <Bar key={i} label={c.course} value={c.pending} max={Math.max(c.total, 1)}/>
                    ))}
                </div>
                )}
            </Section>
            </>
        )}

        {/* ── Teacher analytics ── */}
        {isTeacher && (
            <>
            {/* Assignment progress */}
            <Section title="Assignment Completion" icon={<BarChart3/>} loading={pl}>
                {(progress || []).length === 0 && !pl ? (
                <p style={{ fontSize:13, color:'#b0a898' }}>No assignment data yet.</p>
                ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    {(progress || []).map((p, i) => (
                    <div key={i} style={{ padding:'12px 14px', background:'#faf8f5', borderRadius:10, border:'1px solid #f0ece4' }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:8, gap:8 }}>
                        <p style={{ fontSize:13, fontWeight:600, color:'#1a1f35', margin:0 }}>{p.assignment}</p>
                        <span style={{ fontSize:11, color:'#8a7e6e', flexShrink:0 }}>{p.course}</span>
                        </div>
                        <div className="progress-bar-track" style={{ marginBottom:6 }} aria-label={`${p.completion_rate}% complete`}>
                        <div className="progress-bar-fill" style={{ width:`${p.completion_rate}%`, background:'#1a1f35' }}/>
                        </div>
                        <p style={{ fontSize:10, color:'#b0a898', margin:0 }}>
                        Due: {p.due_date} · {p.completed}/{p.total_students} students · {p.completion_rate}%
                        </p>
                    </div>
                    ))}
                </div>
                )}
            </Section>

            {/* K-Means Clustering — student performance groups */}
            <StudentGroupsSection/>

            {/* Isolation Forest — students needing attention */}
            <OutliersSection/>
            </>
        )}

        <DashboardFooter/>
        </div>
    )
}
