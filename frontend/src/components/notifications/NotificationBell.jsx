// Bell icon + unread badge for the topbar, with a dropdown panel showing the
// most recent notifications. Clicking a notification marks it read and
// navigates to the relevant page.

import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, Inbox } from 'lucide-react'
import { formatDistanceToNowStrict } from 'date-fns'
import { useNotifications } from '../../context/NotificationContext.jsx'
import NotificationIcon from './NotificationIcon.jsx'

export default function NotificationBell() {
    const { notifications, unreadCount, loading, markAsRead, markAllAsRead, refresh } = useNotifications()
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)
    const navigate = useNavigate()

    useEffect(() => {
        function onClick(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
        }
        if (open) document.addEventListener('mousedown', onClick)
        return () => document.removeEventListener('mousedown', onClick)
    }, [open])

    function toggle() {
        setOpen(o => {
            const next = !o
            // Refresh on open rather than polling continuously, so the list
            // is current whenever the user actually looks at it.
            if (next) refresh()
            return next
        })
    }

    async function handleItemClick(n) {
        if (!n.is_read) await markAsRead(n.id)
        setOpen(false)
        navigate(n.link || '/app/assignments')
    }

    // Panel only shows a preview; the full list lives at /app/notifications.
    const recent = notifications.slice(0, 8)

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <button
                onClick={toggle}
                aria-label="Notifications"
                aria-expanded={open}
                style={{
                    position: 'relative', background: 'none', border: 'none', cursor: 'pointer',
                    padding: 7, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    borderRadius: 7, color: '#5a5060', transition: 'background 0.12s, color 0.12s',
                }}
                onMouseEnter={e => { e.currentTarget.style.background = 'rgba(26,31,53,0.06)' }}
                onMouseLeave={e => { e.currentTarget.style.background = 'none' }}
            >
                <Bell size={17} />
                {unreadCount > 0 && (
                    <span style={{
                        position: 'absolute', top: 3, right: 3, minWidth: 15, height: 15, padding: '0 3px',
                        borderRadius: 99, background: '#DC2626', color: '#fff', fontSize: 9, fontWeight: 700,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        border: '1.5px solid #fff', lineHeight: 1, fontFamily: 'var(--font-display)',
                    }}>
                        {unreadCount > 99 ? '99+' : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="anim-scale-in" style={{
                    position: 'absolute', top: 'calc(100% + 10px)', right: 0, width: 360, maxWidth: '90vw',
                    background: '#fff', borderRadius: 14, boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border)',
                    zIndex: 200, overflow: 'hidden', transformOrigin: 'top right',
                }}>
                    {/* Header */}
                    <div style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '12px 14px', borderBottom: '1px solid var(--color-border)',
                    }}>
                        <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)', margin: 0 }}>
                            Notifications
                        </p>
                        {unreadCount > 0 && (
                            <button
                                onClick={markAllAsRead}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none',
                                    cursor: 'pointer', color: 'var(--color-primary)', fontSize: 11, fontWeight: 600, padding: '4px 6px',
                                    borderRadius: 6,
                                }}
                            >
                                <CheckCheck size={12} /> Mark all read
                            </button>
                        )}
                    </div>

                    {/* List */}
                    <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                        {loading && recent.length === 0 && (
                            <div style={{ padding: '28px 14px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 12 }}>
                                Loading…
                            </div>
                        )}

                        {!loading && recent.length === 0 && (
                            <div style={{ padding: '32px 14px', textAlign: 'center' }}>
                                <Inbox size={26} style={{ color: 'var(--color-text-placeholder)', margin: '0 auto 8px', display: 'block' }} />
                                <p style={{ fontSize: 12, color: 'var(--color-text-muted)', margin: 0 }}>You're all caught up.</p>
                            </div>
                        )}

                        {recent.map(n => (
                            <button
                                key={n.id}
                                onClick={() => handleItemClick(n)}
                                style={{
                                    display: 'flex', gap: 10, width: '100%', textAlign: 'left', padding: '11px 14px',
                                    border: 'none', borderBottom: '1px solid #F1F5F9', cursor: 'pointer',
                                    background: n.is_read ? '#fff' : 'var(--color-primary-light)',
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = n.is_read ? '#F8FAFC' : '#E4E2FB' }}
                                onMouseLeave={e => { e.currentTarget.style.background = n.is_read ? '#fff' : 'var(--color-primary-light)' }}
                            >
                                <NotificationIcon type={n.notif_type} />
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{
                                        fontSize: 12.5, fontWeight: n.is_read ? 500 : 700, color: 'var(--color-text)',
                                        margin: '0 0 2px', lineHeight: 1.35,
                                    }}>
                                        {n.title}
                                    </p>
                                    <p style={{
                                        fontSize: 11.5, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.4,
                                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                                    }}>
                                        {n.message}
                                    </p>
                                    <p style={{ fontSize: 10, color: 'var(--color-text-placeholder)', margin: '4px 0 0' }}>
                                        {formatDistanceToNowStrict(new Date(n.created_at), { addSuffix: true })}
                                    </p>
                                </div>
                                {!n.is_read && (
                                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-primary)', flexShrink: 0, marginTop: 4 }} />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Footer */}
                    <div style={{ borderTop: '1px solid var(--color-border)', padding: '9px 14px' }}>
                        <button
                            onClick={() => { setOpen(false); navigate('/app/notifications') }}
                            style={{
                                width: '100%', background: 'none', border: 'none', cursor: 'pointer',
                                color: 'var(--color-primary)', fontSize: 12, fontWeight: 600, padding: '4px 0',
                            }}
                        >
                            View all notifications
                        </button>
                    </div>
                </div>
            )}
        </div>
    )
}