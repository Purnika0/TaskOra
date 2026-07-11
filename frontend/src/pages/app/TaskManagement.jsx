import { useState, useMemo } from 'react'
import { Search, LayoutGrid, List, RefreshCw } from 'lucide-react'
import { useTasks } from '../../hooks/useTasks.js'
import { useToast } from '../../context/ToastContext.jsx'
import TaskItem      from '../../components/tasks/TaskItem.jsx'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock, ErrorBlock } from '../../components/shared/Loader.jsx'
import { getTaskTitle, getTaskDueDate, isOverdue, priorityToLevel } from '../../utils/helpers.js'

// Tabs now match the real 5-state status model returned by the backend.
const TABS = [
    { key: 'all',       label: 'All'       },
    { key: 'pending',   label: 'Pending'   },
    { key: 'submitted', label: 'Submitted' },
    { key: 'completed', label: 'Completed' },
    { key: 'overdue',   label: 'Overdue'   },
    { key: 'rejected',  label: 'Rejected'  },
]

const selStyle = {
    padding: '8px 10px', fontSize: 12,
    border: '1.5px solid #e2dbd0', borderRadius: 8,
    background: '#faf8f5', color: '#1a1f35',
    outline: 'none', cursor: 'pointer', fontFamily: 'var(--font-body)',
}

export default function TaskManagement() {
    const { tasks, loading, error, stats, refetch, submitAssignment } = useTasks()
    const toast = useToast()

    const [activeTab, setActiveTab] = useState('all')
    const [search,    setSearch]    = useState('')
    const [priority,  setPriority]  = useState('all')
    const [sortBy,    setSortBy]    = useState('score')
    const [viewMode,  setViewMode]  = useState('table')

    const filtered = useMemo(() => {
        let list = [...tasks]

        if (activeTab !== 'all') {
            list = list.filter(t => (t.status || 'pending') === activeTab)
        }

        if (priority !== 'all') {
            list = list.filter(t => priorityToLevel(t.assignment?.priority) === priority)
        }

        if (search.trim()) {
            const q = search.toLowerCase()
            list = list.filter(t =>
                getTaskTitle(t).toLowerCase().includes(q) ||
                (t.assignment?.description || '').toLowerCase().includes(q) ||
                (t.assignment?.task_type || '').toLowerCase().includes(q)
            )
        }

        if (sortBy === 'due') {
            list.sort((a, b) => (getTaskDueDate(a) || '9').localeCompare(getTaskDueDate(b) || '9'))
        } else if (sortBy === 'title') {
            list.sort((a, b) => getTaskTitle(a).localeCompare(getTaskTitle(b)))
        } else if (sortBy === 'created') {
            list.sort((a, b) => (b.id || 0) - (a.id || 0))
        } else {
            // Smart sort: overdue first, then by priority, then rejected before pending
            list.sort((a, b) => {
                const score = t => {
                    let s = (t.assignment?.priority || 0) * 2
                    if (isOverdue(t)) s += 10
                    if (t.status === 'rejected') s += 6
                    if (t.status === 'pending') s += 3
                    return s
                }
                return score(b) - score(a)
            })
        }
        return list
    }, [tasks, activeTab, search, priority, sortBy])

    async function handleSubmit(taskId, formData) {
        try {
            await submitAssignment(taskId, formData)
            toast.success('Submitted successfully')
        } catch (err) {
            toast.error('Failed to submit — please try again')
            throw err // let the modal show its own error too
        }
    }

    function tabCount(key) {
        if (key === 'all') return stats.total
        return tasks.filter(t => (t.status || 'pending') === key).length
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="anim-fade-in">
            <style>{`
                .tm-filter-bar {
                    background:#fff; border:1px solid #e2dbd0; border-radius:12px;
                    padding:12px 14px; display:flex; align-items:center; gap:10px; flex-wrap:wrap;
                }
                @media(max-width:600px) {
                    .tm-filter-bar { gap:8px; }
                    .tm-filter-bar .tm-search { min-width:0 !important; width:100% !important; }
                    .tm-selects { display:flex; gap:6px; flex-wrap:wrap; width:100%; }
                }
                .tm-tabs { display:flex; gap:4px; overflow-x:auto; padding-bottom:2px; scrollbar-width:none; }
                .tm-tabs::-webkit-scrollbar { display:none; }
            `}</style>

            {/* Page header */}
            <div className="page-header">
                <div>
                    <h2 className="page-title">My Tasks</h2>
                    <p className="page-subtitle">
                        {stats.total} total · {stats.completed} completed · {stats.pending} pending · {stats.overdue} overdue
                    </p>
                </div>
            </div>

            {/* Stats strip */}
            <div className="stat-grid">
                {[
                    { label: 'Total',     value: stats.total,     color: '#1a1f35' },
                    { label: 'Pending',   value: stats.pending,   color: '#d4a93c' },
                    { label: 'Submitted', value: stats.submitted, color: '#3b6fd4' },
                    { label: 'Completed', value: stats.completed, color: '#3cb87a' },
                    { label: 'Overdue',   value: stats.overdue,   color: '#e05252' },
                ].map(s => (
                    <div key={s.label} className="stat-box" style={{ borderTop: `3px solid ${s.color}`, padding: '13px 16px' }}>
                        <p className="stat-label">{s.label}</p>
                        <p className="stat-value" style={{ fontSize: 26, color: s.color }}>{s.value}</p>
                    </div>
                ))}
            </div>

            {/* Filter bar */}
            <div className="tm-filter-bar">
                <div className="tm-search" style={{ position: 'relative', flex: 1, minWidth: 180 }}>
                    <Search size={12} style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#b0a898', pointerEvents: 'none' }} aria-hidden="true"/>
                    <input type="search" value={search} onChange={e => setSearch(e.target.value)}
                        placeholder="Search tasks…"
                        style={{ ...selStyle, paddingLeft: 28, width: '100%', boxSizing: 'border-box' }}
                        aria-label="Search tasks"
                    />
                </div>

                <div className="tm-selects" style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                    <select value={priority} onChange={e => setPriority(e.target.value)} style={selStyle} aria-label="Filter by priority">
                        <option value="all">All Priorities</option>
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                    </select>
                    <select value={sortBy} onChange={e => setSortBy(e.target.value)} style={selStyle} aria-label="Sort tasks">
                        <option value="score">Smart Sort</option>
                        <option value="due">Due Date</option>
                        <option value="title">Title</option>
                        <option value="created">Recent</option>
                    </select>
                </div>

                <div style={{ display: 'flex', gap: 4, marginLeft: 'auto' }}>
                    <button onClick={() => setViewMode('table')}
                        style={{ ...selStyle, padding: '8px 9px', background: viewMode === 'table' ? '#1a1f35' : '#fff', color: viewMode === 'table' ? '#fff' : '#6a6052' }}
                        title="Table view" aria-label="Table view">
                        <List size={14}/>
                    </button>
                    <button onClick={() => setViewMode('card')}
                        style={{ ...selStyle, padding: '8px 9px', background: viewMode === 'card' ? '#1a1f35' : '#fff', color: viewMode === 'card' ? '#fff' : '#6a6052' }}
                        title="Card view" aria-label="Card view">
                        <LayoutGrid size={14}/>
                    </button>
                    <button onClick={refetch}
                        style={{ ...selStyle, padding: '8px 9px', color: '#6a6052' }}
                        title="Refresh" aria-label="Refresh tasks">
                        <RefreshCw size={14}/>
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="tm-tabs" role="tablist">
                {TABS.map(t => {
                    const count = tabCount(t.key)
                    const active = activeTab === t.key
                    return (
                        <button key={t.key} onClick={() => setActiveTab(t.key)}
                            style={{
                                padding: '7px 13px', borderRadius: 8, border: '1.5px solid',
                                borderColor: active ? '#1a1f35' : '#e2dbd0',
                                background: active ? '#1a1f35' : '#fff',
                                color: active ? '#fff' : '#6a6052',
                                fontSize: 12, fontWeight: active ? 600 : 400,
                                cursor: 'pointer', fontFamily: 'var(--font-body)',
                                whiteSpace: 'nowrap', transition: 'all 0.13s',
                                display: 'flex', alignItems: 'center', gap: 5,
                            }}>
                            {t.label}
                            <span style={{
                                fontSize: 10, fontWeight: 600, padding: '1px 5px', borderRadius: 99,
                                background: active ? 'rgba(255,255,255,0.18)' : '#f0ece5',
                                color: active ? '#fff' : '#8a7e6e',
                            }}>
                                {count}
                            </span>
                        </button>
                    )
                })}
            </div>

            {/* States */}
            {loading && <div className="white-card" style={{ padding: 28 }}><LoadingBlock/></div>}
            {error   && <ErrorBlock message={error} onRetry={refetch}/>}

            {/* Empty state */}
            {!loading && !error && filtered.length === 0 && (
                <div className="white-card" style={{ padding: '44px 24px', textAlign: 'center' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#f0ece5', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }} aria-hidden="true">
                        <List size={20} style={{ color: '#c0b8ae' }}/>
                    </div>
                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: '#1a1f35', margin: '0 0 5px' }}>No tasks found</p>
                    <p style={{ fontSize: 12, color: '#b0a898' }}>
                        {search ? `No results for "${search}"` : 'No assignments have been added yet.'}
                    </p>
                </div>
            )}

            {/* Table view */}
            {!loading && !error && filtered.length > 0 && viewMode === 'table' && (
                <div className="white-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="task-table">
                            <thead>
                                <tr>
                                    <th style={{ paddingLeft: 18, width: 32 }}>#</th>
                                    <th>Task</th>
                                    <th>Priority</th>
                                    <th className="hide-sm">Due</th>
                                    <th className="hide-md">Status</th>
                                    <th style={{ width: 90 }}></th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((t, i) => (
                                    <TaskItem key={t.id} task={t} index={i} compact onSubmit={handleSubmit}/>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    <div style={{ padding: '7px 18px', borderTop: '1px solid #f0ece4', background: '#faf8f5' }}>
                        <p style={{ fontSize: 11, color: '#b0a898', margin: 0 }}>
                            {filtered.length} of {tasks.length} tasks
                        </p>
                    </div>
                </div>
            )}

            {/* Card view */}
            {!loading && !error && filtered.length > 0 && viewMode === 'card' && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(270px,1fr))', gap: 12 }}>
                    {filtered.map((t, i) => (
                        <TaskItem key={t.id} task={t} index={i} onSubmit={handleSubmit}/>
                    ))}
                </div>
            )}

            <DashboardFooter/>
        </div>
    )
}