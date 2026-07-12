// Student-facing analytics dashboard: summary cards, per-course progress,
// weekly completion chart, and recent activity. All data comes from the
// student's own task list (useTasks) plus the student analytics endpoints
// (weekly-progress, course-workload).
//
// Styling is self-contained: every class below is prefixed `sap-` (Student
// Analytics Page) and scoped under `.sap-page`, so it can't leak into or
// clash with any other page's styles. Colors are pulled from the app's
// design tokens (tokens.css) for page chrome, and from the same
// statusBadge()/deadlinePill() palette used everywhere else tasks are shown
// for status-specific colors, so a status means the same color here as it
// does anywhere else in TaskOra.

import React from 'react'
import {
    TrendingUp, CheckCircle2, Clock, AlertTriangle, XCircle, Send,
    History, Sparkles, GraduationCap, ListChecks,
} from 'lucide-react'
import { useWeeklyProgress, useCourseWorkload } from '../../hooks/useAnalytics.js'
import { useTasks } from '../../hooks/useTasks.js'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock } from '../../components/shared/Loader.jsx'
import { getTaskTitle, fmtDateTime } from '../../utils/helpers.js'

// Mirrors statusBadge()/deadlinePill() in utils/helpers.js so every status
// chip in the app uses the same color.
const STATUS_META = {
    completed: { label: 'Completed', color: '#166534', bg: '#e0f7ee', accent: '#3cb87a', icon: <CheckCircle2 /> },
    submitted: { label: 'Submitted', color: '#1e40af', bg: '#eff3fd', accent: '#3b6fd4', icon: <Send /> },
    pending:   { label: 'Pending',   color: '#92400e', bg: '#fff8e6', accent: '#d4a93c', icon: <Clock /> },
    rejected:  { label: 'Rejected',  color: '#991b1b', bg: '#fde8e8', accent: '#e05252', icon: <XCircle /> },
    overdue:   { label: 'Overdue',   color: '#991b1b', bg: '#fde8e8', accent: '#e05252', icon: <AlertTriangle /> },
}

// Derives a course's overall status from its task breakdown, prioritizing
// overdue and rejected tasks over raw completion rate.
function deriveCourseStatus({ total, completed, overdue, rejected }) {
    if (total === 0) return { label: 'No Tasks Yet', color: '#64748B', bg: '#F1F5F9' }
    const rate = completed / total
    if (overdue > 0) return { label: 'Needs Attention', color: '#991b1b', bg: '#fde8e8' }
    if (rejected > 0) return { label: 'Needs Revision', color: '#92400e', bg: '#fff8e6' }
    if (rate >= 0.85) return { label: 'Excellent', color: '#166534', bg: '#e0f7ee' }
    if (rate >= 0.55) return { label: 'Good', color: '#1e40af', bg: '#eff3fd' }
    return { label: 'Getting Started', color: '#92400e', bg: '#fff8e6' }
}

function MetricCard({ icon, label, value, sub, accent }) {
    return (
        <div className="sap-metric-card">
            <div className="sap-metric-icon" style={{ background: `${accent}17`, color: accent }} aria-hidden="true">
                {React.cloneElement(icon, { size: 17 })}
            </div>
            <div className="sap-metric-body">
                <p className="sap-metric-label">{label}</p>
                <p className="sap-metric-value">{value}</p>
                {sub && <p className="sap-metric-sub">{sub}</p>}
            </div>
        </div>
    )
}

function Section({ title, icon, badge, children, loading, full }) {
    return (
        <div className={`sap-card${full ? ' sap-card-full' : ''}`}>
            <div className="sap-card-head">
                {React.cloneElement(icon, { size: 15 })}
                <h3>{title}</h3>
                {badge && <span className="sap-badge">{badge}</span>}
            </div>
            <div className="sap-card-body">
                {loading ? <LoadingBlock rows={3} /> : children}
            </div>
        </div>
    )
}

function EmptyRow({ message, icon }) {
    return (
        <div className="sap-empty-row">
            {icon && React.cloneElement(icon, { size: 18 })}
            <p>{message}</p>
        </div>
    )
}

function CourseCard({ course }) {
    const total     = course.total || 0
    const completed = course.completed || 0
    const submitted = course.submitted || 0
    const pending    = course.pending || 0
    const overdue   = course.overdue || 0
    // The course-workload endpoint returns completed/submitted/pending/overdue
    // but not rejected — total includes it though, so derive it as the
    // remainder to keep every task in the course accounted for.
    const known    = completed + submitted + pending + overdue
    const rejected = Math.max(total - known, 0)
    const rate     = total > 0 ? Math.round((completed / total) * 100) : 0
    const status   = deriveCourseStatus({ total, completed, overdue, rejected })

    const stats = [
        { key: 'completed', count: completed },
        { key: 'submitted', count: submitted },
        { key: 'pending',   count: pending },
        { key: 'rejected',  count: rejected },
        { key: 'overdue',   count: overdue },
    ]

    return (
        <div className="sap-course-card">
            <div className="sap-course-card-top">
                <div className="sap-course-card-title">
                    <span className="sap-course-icon" aria-hidden="true"><GraduationCap size={16} /></span>
                    <div className="sap-course-title-text">
                        <p className="sap-course-name" title={course.course}>{course.course}</p>
                        <p className="sap-course-count">{total} {total === 1 ? 'task' : 'tasks'} total</p>
                    </div>
                </div>
                <span className="sap-status-pill" style={{ color: status.color, background: status.bg }}>
                    {status.label}
                </span>
            </div>

            <div className="sap-course-progress">
                <div className="sap-progress-track" role="img" aria-label={`${rate}% complete`}>
                    <div className="sap-progress-fill" style={{ width: `${rate}%`, background: STATUS_META.completed.accent }} />
                </div>
                <span className="sap-progress-pct">{rate}%</span>
            </div>

            {total === 0 ? (
                <EmptyRow icon={<GraduationCap />} message="No tasks assigned yet." />
            ) : (
                <div className="sap-course-stat-grid">
                    {stats.map(s => (
                        <div key={s.key} className="sap-course-stat">
                            <span className="sap-course-stat-icon" style={{ color: STATUS_META[s.key].accent }}>
                                {React.cloneElement(STATUS_META[s.key].icon, { size: 13 })}
                            </span>
                            <span className="sap-course-stat-count">{s.count}</span>
                            <span className="sap-course-stat-label">{STATUS_META[s.key].label}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}

function ActivityRow({ event }) {
    const meta = STATUS_META[event.type]
    return (
        <div className="sap-list-row">
            <div className="sap-activity-icon" style={{ background: `${meta.accent}17`, color: meta.accent }} aria-hidden="true">
                {React.cloneElement(meta.icon, { size: 13 })}
            </div>
            <div className="sap-list-row-main">
                <p className="sap-list-row-title"><strong>{meta.label}</strong> — {event.title}</p>
                <p className="sap-list-row-sub">{fmtDateTime(event.at)}</p>
            </div>
        </div>
    )
}

// Converts a plain YYYY-MM-DD date (as returned by the weekly-progress
// endpoint) to a short weekday label, read in Nepal time — the same
// timezone convention used elsewhere in the app (see todayNepalISO() in
// utils/helpers.js), so "today" here matches "today" everywhere else.
function nepaliWeekdayLabel(dateStr) {
    if (!dateStr) return ''
    const d = new Date(`${dateStr}T00:00:00+05:45`)
    return new Intl.DateTimeFormat('en-US', { timeZone: 'Asia/Kathmandu', weekday: 'short' }).format(d)
}

// Builds an SVG path for a bar with rounded top corners only.
function topRoundedBarPath(x, y, w, h, r) {
    const radius = Math.min(r, w / 2, h)
    if (h <= 0) return ''
    if (radius <= 0) return `M${x},${y} h${w} v${h} h${-w} Z`
    return `
        M${x},${y + h}
        L${x},${y + radius}
        Q${x},${y} ${x + radius},${y}
        L${x + w - radius},${y}
        Q${x + w},${y} ${x + w},${y + radius}
        L${x + w},${y + h}
        Z
    `
}

// SVG bar chart of tasks completed per day (last 7 days). Scales to its
// container via viewBox so it stays crisp and responsive at any width.
function WeeklyBarChart({ data }) {
    const [hovered, setHovered] = React.useState(null)

    const W = 560, H = 200
    const padLeft = 46, padRight = 8, padTop = 18, padBottom = 26
    const chartW = W - padLeft - padRight
    const chartH = H - padTop - padBottom

    const max = Math.max(...data.map(d => d.value), 1)
    // Round the axis ceiling up to a "nice" number so gridline labels
    // read as whole, sensible values.
    const niceMax = Math.max(4, Math.ceil(max / 4) * 4)
    const gridValues = [niceMax, niceMax * 0.75, niceMax * 0.5, niceMax * 0.25, 0]

    const n = data.length || 1
    const slot = chartW / n
    const barW = Math.min(34, slot * 0.5)

    return (
        <div className="sap-weekly-chart-wrap">
            <svg
                className="sap-weekly-svg"
                viewBox={`0 0 ${W} ${H}`}
                role="img"
                aria-label="Tasks completed per day, last 7 days"
                onMouseLeave={() => setHovered(null)}
            >
                {/* y-axis title */}
                <text
                    x={14} y={padTop + chartH / 2}
                    className="sap-weekly-axis-title"
                    textAnchor="middle"
                    transform={`rotate(-90 14 ${padTop + chartH / 2})`}
                >
                    Tasks completed in a week
                </text>

                {/* gridlines + axis labels */}
                {gridValues.map((gv, i) => {
                    const y = padTop + chartH - (gv / niceMax) * chartH
                    const isBaseline = gv === 0
                    return (
                        <g key={i}>
                            {!isBaseline && (
                                <line x1={padLeft} y1={y} x2={W - padRight} y2={y} className="sap-weekly-grid" />
                            )}
                            <line x1={padLeft - 5} y1={y} x2={padLeft} y2={y} className="sap-weekly-tick" />
                            <text x={padLeft - 9} y={y} className="sap-weekly-axis-label" textAnchor="end" dominantBaseline="middle">
                                {Math.round(gv)}
                            </text>
                        </g>
                    )
                })}

                {/* bars */}
                {data.map((d, i) => {
                    const cx = padLeft + slot * i + slot / 2
                    const barH = d.value > 0 ? Math.max((d.value / niceMax) * chartH, 4) : 0
                    const x = cx - barW / 2
                    const y = padTop + chartH - barH
                    const isHovered = hovered === i
                    return (
                        <g
                            key={i}
                            onMouseEnter={() => setHovered(i)}
                            onClick={() => setHovered(isHovered ? null : i)}
                            className="sap-weekly-bar-group"
                        >
                            {/* invisible hit area for easier hover/tap */}
                            <rect x={cx - slot / 2} y={padTop} width={slot} height={chartH} fill="transparent" />
                            <path
                                d={topRoundedBarPath(x, y, barW, barH, 4)}
                                className={`sap-weekly-bar${isHovered ? ' is-hovered' : ''}`}
                            />
                            {isHovered && (
                                <text x={cx} y={y - 8} textAnchor="middle" className="sap-weekly-tooltip">{d.value}</text>
                            )}
                            <text x={cx} y={H - 6} textAnchor="middle" className="sap-weekly-axis-day">{d.label}</text>
                        </g>
                    )
                })}

                {/* baseline */}
                <line x1={padLeft} y1={padTop + chartH} x2={W - padRight} y2={padTop + chartH} className="sap-weekly-baseline" />
            </svg>
        </div>
    )
}

function NoDataState() {
    return (
        <div className="sap-card sap-welcome">
            <div className="sap-welcome-icon"><Sparkles size={22} /></div>
            <h3>Your analytics will appear here</h3>
            <p>
                Once you're enrolled in a course and have assignments to work on,
                this page will fill up with your completion rate, progress by
                course, and activity history.
            </p>
        </div>
    )
}

export default function StudentAnalyticsPage() {
    const { tasks, stats, loading } = useTasks()
    const { data: weekly, loading: weeklyLoading } = useWeeklyProgress()
    const { data: courseWorkload, loading: courseLoading } = useCourseWorkload()

    // Recent activity — most recent submit/complete/reject events, newest first.
    const recentActivity = React.useMemo(() => {
        const events = []
        for (const t of tasks) {
            if (t.submitted_at) events.push({ type: 'submitted', at: t.submitted_at, title: getTaskTitle(t) })
            if (t.status === 'completed' && t.completed_at) events.push({ type: 'completed', at: t.completed_at, title: getTaskTitle(t) })
            if (t.status === 'rejected' && t.completed_at) events.push({ type: 'rejected', at: t.completed_at, title: getTaskTitle(t) })
        }
        return events.sort((a, b) => new Date(b.at) - new Date(a.at)).slice(0, 6)
    }, [tasks])

    const weeklyChartData = (weekly || []).map(d => ({ value: d.completed, label: nepaliWeekdayLabel(d.date) }))
    const weeklyTotal = weeklyChartData.reduce((s, d) => s + d.value, 0)
    const hasAnyData = stats.total > 0

    return (
        <div className="sap-page anim-fade-in">
            <style>{`
                .sap-page { display:flex; flex-direction:column; gap:18px; }

                /* Metric grid (summary cards) */
                .sap-metric-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(150px, 1fr)); gap:14px; }
                .sap-metric-card { display:flex; align-items:flex-start; gap:12px; background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:16px 18px; box-shadow:var(--shadow-xs); transition:box-shadow .15s, transform .15s; }
                .sap-metric-card:hover { box-shadow:var(--shadow-md); transform:translateY(-2px); }
                .sap-metric-icon { width:38px; height:38px; border-radius:10px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }
                .sap-metric-body { min-width:0; }
                .sap-metric-label { font-size:11px; font-weight:600; color:var(--color-text-muted); text-transform:uppercase; letter-spacing:.04em; margin:0 0 4px; }
                .sap-metric-value { font-size:24px; font-weight:800; color:var(--color-text); font-family:var(--font-display); letter-spacing:-0.02em; margin:0; line-height:1.1; }
                .sap-metric-sub { font-size:10.5px; color:var(--color-text-muted); margin:3px 0 0; }

                /* Cards / sections */
                .sap-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); box-shadow:var(--shadow-sm); overflow:hidden; }
                .sap-card-full { grid-column:1 / -1; }
                .sap-card-head { display:flex; align-items:center; gap:8px; padding:14px 18px; border-bottom:1px solid var(--color-border); color:var(--color-text-muted); }
                .sap-card-head h3 { flex:1; font-size:13px; font-weight:700; color:var(--color-text); margin:0; font-family:var(--font-display); }
                .sap-badge { font-size:10.5px; font-weight:700; color:var(--color-text-muted); background:var(--color-surface-subtle); border-radius:99px; padding:2px 9px; }
                .sap-card-body { padding:18px; }

                /* Two-column layout — Weekly Progress / Recent Activity */
                .sap-2col { display:grid; grid-template-columns:1fr 1fr; gap:18px; align-items:stretch; }
                .sap-2col .sap-card { display:flex; flex-direction:column; height:100%; }
                .sap-2col .sap-card-body { flex:1; display:flex; flex-direction:column; }
                @media (max-width:860px) { .sap-2col { grid-template-columns:1fr; } .sap-2col .sap-card { height:auto; } }

                /* Empty rows */
                .sap-empty-row { display:flex; align-items:center; gap:8px; color:var(--color-text-muted); }
                .sap-empty-row p { font-size:13px; margin:0; }

                /* Course Progress — modern subject card grid */
                .sap-course-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px, 1fr)); gap:16px; }
                .sap-course-card { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:18px; display:flex; flex-direction:column; gap:14px; box-shadow:var(--shadow-xs); transition:box-shadow .18s ease, transform .18s ease, border-color .18s ease; }
                .sap-course-card:hover { box-shadow:var(--shadow-md); transform:translateY(-3px); border-color:var(--color-primary-light, var(--color-border)); }
                .sap-course-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
                .sap-course-card-title { display:flex; align-items:flex-start; gap:10px; min-width:0; }
                .sap-course-icon { width:32px; height:32px; border-radius:9px; background:var(--color-primary-light, rgba(84,82,228,0.12)); color:var(--color-primary, #5452e4); display:flex; align-items:center; justify-content:center; flex-shrink:0; }
                .sap-course-title-text { min-width:0; }
                .sap-course-name { font-size:13.5px; font-weight:700; color:var(--color-text); margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-family:var(--font-display); }
                .sap-course-count { font-size:11px; color:var(--color-text-muted); margin:3px 0 0; }
                .sap-status-pill { font-size:10.5px; font-weight:700; white-space:nowrap; padding:4px 10px; border-radius:99px; flex-shrink:0; }
                .sap-course-progress { display:flex; align-items:center; gap:10px; }
                .sap-progress-track { flex:1; height:8px; border-radius:99px; overflow:hidden; background:var(--color-border); }
                .sap-progress-fill { height:100%; border-radius:99px; transition:width .5s ease; }
                .sap-progress-pct { font-size:12.5px; font-weight:800; color:var(--color-text); width:36px; text-align:right; flex-shrink:0; }
                .sap-course-stat-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(54px, 1fr)); gap:6px; }
                .sap-course-stat { display:flex; flex-direction:column; align-items:center; gap:3px; background:var(--color-surface-subtle); border-radius:var(--radius-sm); padding:9px 4px; min-width:0; transition:background .15s ease; }
                .sap-course-card:hover .sap-course-stat { background:var(--color-surface-subtle); }
                .sap-course-stat-count { font-size:13px; font-weight:800; color:var(--color-text); font-family:var(--font-display); line-height:1; }
                .sap-course-stat-label { font-size:9px; color:var(--color-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:.02em; text-align:center; line-height:1.2; overflow-wrap:break-word; word-break:break-word; max-width:100%; }

                /* List rows (recent activity) */
                .sap-list-row { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--color-border); }
                .sap-list-row:last-child { border-bottom:none; padding-bottom:0; }
                .sap-list-row:first-child { padding-top:0; }
                .sap-list-row-main { min-width:0; flex:1; }
                .sap-list-row-title { font-size:13px; font-weight:600; color:var(--color-text); margin:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
                .sap-list-row-sub { font-size:11px; color:var(--color-text-muted); margin:2px 0 0; }
                .sap-activity-icon { width:28px; height:28px; border-radius:8px; display:flex; align-items:center; justify-content:center; flex-shrink:0; }

                /* Weekly Progress — SVG bar chart */
                .sap-weekly-chart-wrap { width:100%; flex:1; display:flex; align-items:center; }
                .sap-weekly-svg { width:100%; height:180px; display:block; overflow:visible; }
                .sap-weekly-grid { stroke:var(--color-border); stroke-width:1; shape-rendering:crispEdges; }
                .sap-weekly-baseline { stroke:var(--color-text-muted); stroke-width:1.5; shape-rendering:crispEdges; }
                .sap-weekly-tick { stroke:var(--color-text-muted); stroke-width:1; shape-rendering:crispEdges; }
                .sap-weekly-axis-label { font-size:11.5px; fill:var(--color-text-secondary, var(--color-text)); font-weight:700; }
                .sap-weekly-axis-title { font-size:9.5px; fill:var(--color-text-muted); font-weight:700; text-transform:uppercase; letter-spacing:.06em; }
                .sap-weekly-axis-day { font-size:10px; fill:var(--color-text-muted); font-weight:600; text-transform:uppercase; letter-spacing:.02em; }
                .sap-weekly-bar-group { cursor:pointer; }
                .sap-weekly-bar { fill:var(--color-primary, #5452e4); transition:fill .15s ease, opacity .15s ease; }
                .sap-weekly-bar.is-hovered { fill:var(--color-primary-dark, #4340c2); }
                .sap-weekly-bar-group:hover .sap-weekly-bar:not(.is-hovered) { opacity:.85; }
                .sap-weekly-tooltip { font-size:11px; font-weight:800; fill:var(--color-text); font-family:var(--font-display); }

                /* Welcome / empty state */
                .sap-welcome { display:flex; flex-direction:column; align-items:center; text-align:center; gap:10px; padding:56px 24px; }
                .sap-welcome-icon { width:52px; height:52px; border-radius:14px; background:var(--color-primary-light); color:var(--color-primary); display:flex; align-items:center; justify-content:center; }
                .sap-welcome h3 { font-family:var(--font-display); font-size:16px; font-weight:700; color:var(--color-text); margin:6px 0 0; }
                .sap-welcome p { font-size:13px; color:var(--color-text-muted); max-width:380px; line-height:1.6; margin:0; }
            `}</style>

            <div className="page-header">
                <div>
                    <h2 className="page-title">My Analytics</h2>
                    <p className="page-subtitle">Live data from your academic activity</p>
                </div>
            </div>

            {loading ? (
                <LoadingBlock rows={4} />
            ) : !hasAnyData ? (
                <NoDataState />
            ) : (
                <>
                    {/* Summary cards */}
                    <div className="sap-metric-grid stagger">
                        <MetricCard icon={<TrendingUp />} label="Completion Rate" value={`${stats.progress}%`} sub={`${stats.completed} of ${stats.total} tasks`} accent="#5452e4" />
                        <MetricCard icon={STATUS_META.completed.icon} label="Completed" value={stats.completed} sub="reviewed & approved" accent={STATUS_META.completed.accent} />
                        <MetricCard icon={STATUS_META.submitted.icon} label="Submitted" value={stats.submitted} sub="awaiting review" accent={STATUS_META.submitted.accent} />
                        <MetricCard icon={STATUS_META.pending.icon} label="Pending" value={stats.pending} accent={STATUS_META.pending.accent}
                            sub={stats.pending === 0 ? 'nothing pending' : 'in your task list'} />
                        <MetricCard icon={STATUS_META.rejected.icon} label="Rejected" value={stats.rejected} sub="needs revision" accent={STATUS_META.rejected.accent} />
                        <MetricCard icon={STATUS_META.overdue.icon} label="Overdue" value={stats.overdue} sub={stats.overdue > 0 ? 'needs attention' : 'all on track'} accent={STATUS_META.overdue.accent} />
                    </div>

                    {/* Course Progress */}
                    <Section title="Course Progress" icon={<GraduationCap />} loading={courseLoading}
                        badge={courseWorkload?.length ? `${courseWorkload.length} course${courseWorkload.length > 1 ? 's' : ''}` : undefined}>
                        {!courseLoading && (!courseWorkload || courseWorkload.length === 0) ? (
                            <EmptyRow icon={<GraduationCap />} message="Join a course to see your progress breakdown." />
                        ) : (
                            <div className="sap-course-grid">
                                {(courseWorkload || []).map((c, i) => <CourseCard key={i} course={c} />)}
                            </div>
                        )}
                    </Section>

                    {/* Weekly Progress + Recent Activity */}
                    <div className="sap-2col">
                        <Section title="Weekly Progress" icon={<TrendingUp />} loading={weeklyLoading}
                            badge={weeklyLoading ? undefined : `${weeklyTotal} this week`}>
                            {weeklyChartData.every(d => d.value === 0) && !weeklyLoading ? (
                                <EmptyRow icon={<TrendingUp />} message="No completions yet this week." />
                            ) : (
                                <WeeklyBarChart data={weeklyChartData} />
                            )}
                        </Section>

                        <Section title="Recent Activity" icon={<History />}
                            badge={recentActivity.length ? `${recentActivity.length} recent` : undefined}>
                            {recentActivity.length === 0 ? (
                                <EmptyRow icon={<ListChecks />} message="No recent activity yet." />
                            ) : (
                                <div>
                                    {recentActivity.map((e, i) => <ActivityRow key={i} event={e} />)}
                                </div>
                            )}
                        </Section>
                    </div>
                </>
            )}

            <DashboardFooter />
        </div>
    )
}