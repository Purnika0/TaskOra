// Full notification history — reachable from the bell dropdown's "View all"
// link, and directly via /app/notifications. Available to every role.

import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCheck, Trash2, Inbox, Eraser } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { useNotifications } from '../../context/NotificationContext.jsx'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { LoadingBlock } from '../../components/shared/Loader.jsx'
import NotificationIcon from '../../components/notifications/NotificationIcon.jsx'

const TABS = [
    { key: 'all',    label: 'All'    },
    { key: 'unread', label: 'Unread' },
]

export default function NotificationsPage() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, removeNotification, clearReadNotifications } = useNotifications()
    const [activeTab, setActiveTab] = useState('all')
    const [hoveredId, setHoveredId] = useState(null)
    const navigate = useNavigate()

    const readCount = notifications.length - unreadCount

    const filtered = useMemo(() => {
        if (activeTab === 'unread') return notifications.filter(n => !n.is_read)
        return notifications
    }, [notifications, activeTab])

    async function handleClick(n) {
        if (!n.is_read) await markAsRead(n.id)
        // Assignments is the sensible default landing page when a notification
        // has no explicit link to follow.
        navigate(n.link || '/app/assignments')
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }} className="anim-fade-in">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Notifications</h2>
                    <p className="page-subtitle">
                        {notifications.length} total · {unreadCount} unread
                    </p>
                </div>
                {(unreadCount > 0 || readCount > 0) && (
                    <div style={{ display: 'flex', gap: 8 }}>
                        {unreadCount > 0 && (
                            <button onClick={markAllAsRead} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <CheckCheck size={14} /> Mark all as read
                            </button>
                        )}
                        {readCount > 0 && (
                            <button onClick={clearReadNotifications} className="btn-secondary" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <Eraser size={14} /> Clear read
                            </button>
                        )}
                    </div>
                )}
            </div>

            <div className="am-tabs" style={{ display: 'flex', gap: 4 }}>
                {TABS.map(t => (
                    <button
                        key={t.key}
                        onClick={() => setActiveTab(t.key)}
                        style={{
                            padding: '7px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
                            border: '1.5px solid ' + (activeTab === t.key ? 'var(--color-primary)' : 'var(--color-border)'),
                            background: activeTab === t.key ? 'var(--color-primary)' : 'var(--color-surface)',
                            color: activeTab === t.key ? 'var(--color-white)' : 'var(--color-text-secondary)',
                            cursor: 'pointer', whiteSpace: 'nowrap',
                        }}
                    >
                        {t.label}{t.key === 'unread' && unreadCount > 0 ? ` (${unreadCount})` : ''}
                    </button>
                ))}
            </div>

            <div style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 14, overflow: 'hidden' }}>
                {loading && notifications.length === 0 && (
                    <div style={{ padding: 20 }}><LoadingBlock rows={4} /></div>
                )}

                {!loading && filtered.length === 0 && (
                    <div style={{ padding: '48px 20px', textAlign: 'center' }}>
                        <Inbox size={32} style={{ color: 'var(--color-text-placeholder)', margin: '0 auto 10px', display: 'block' }} />
                        <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                            {activeTab === 'unread' ? "You're all caught up — no unread notifications." : 'No notifications yet.'}
                        </p>
                    </div>
                )}

                {filtered.map(n => (
                    <div
                        key={n.id}
                        onMouseEnter={() => setHoveredId(n.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        style={{
                            display: 'flex', gap: 12, padding: '14px 16px', borderBottom: '1px solid var(--color-border)',
                            // Unread rows stay highlighted regardless of hover, so they're
                            // easy to spot at a glance; read rows only highlight on hover,
                            // like a normal list item.
                            background: n.is_read
                                ? (hoveredId === n.id ? 'var(--color-surface-subtle)' : 'var(--color-surface)')
                                : 'var(--color-primary-light)',
                            transition: 'background 0.12s',
                        }}
                    >
                        <button
                            onClick={() => handleClick(n)}
                            style={{ display: 'flex', gap: 12, flex: 1, minWidth: 0, textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                        >
                            <NotificationIcon type={n.notif_type} size={34} />
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                    <p style={{ fontSize: 13.5, fontWeight: n.is_read ? 600 : 700, color: 'var(--color-text)', margin: 0 }}>
                                        {n.title}
                                    </p>
                                    {!n.is_read && (
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0 }} />
                                    )}
                                </div>
                                <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', margin: '3px 0 0', lineHeight: 1.5 }}>
                                    {n.message}
                                </p>
                                <p style={{ fontSize: 11, color: 'var(--color-text-placeholder)', margin: '6px 0 0' }}>
                                    {formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: true })}
                                    {n.course_name ? ` · ${n.course_name}` : ''}
                                </p>
                            </div>
                        </button>

                        <button
                            onClick={() => removeNotification(n.id)}
                            aria-label="Delete notification"
                            title="Delete notification"
                            style={{
                                background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-placeholder)',
                                padding: 6, borderRadius: 8, alignSelf: 'flex-start', flexShrink: 0,
                            }}
                            onMouseEnter={e => { e.currentTarget.style.color = 'var(--color-red)' }}
                            onMouseLeave={e => { e.currentTarget.style.color = 'var(--color-text-placeholder)' }}
                        >
                            <Trash2 size={14} />
                        </button>
                    </div>
                ))}
            </div>

            <DashboardFooter />
        </div>
    )
}