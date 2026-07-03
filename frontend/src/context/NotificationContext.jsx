// src/context/NotificationContext.jsx
//
// Polling-based notification store (Django Channels isn't installed on the
// backend, so this is the efficient alternative — a lightweight interval
// that only asks the server for what's changed).
//
//   • unread-count is polled every 30s — a tiny, cheap request that drives
//     the bell badge.
//   • the full recent-notifications list is only (re)fetched when: the
//     provider mounts, the unread count goes up, or the caller explicitly
//     calls refresh() (e.g. when the bell dropdown is opened).
//   • polling pauses while the browser tab is hidden and resumes — with an
//     immediate refresh — when it becomes visible again, so a laptop left
//     open overnight doesn't spam the API.
//   • polling only runs at all while a user is logged in.

import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '../hooks/useAuth.js'
import notificationsService from '../services/notifications.service.js'

const NotificationContext = createContext(null)

const POLL_INTERVAL_MS = 30000 // 30s — frequent enough to feel "live", cheap enough to not hammer the API

export function NotificationProvider({ children }) {
    const { user } = useAuth()

    const [notifications, setNotifications] = useState([])
    const [unreadCount,   setUnreadCount]   = useState(0)
    const [loading,       setLoading]       = useState(false)

    const lastUnreadRef = useRef(0)
    const pollRef        = useRef(null)

    const fetchList = useCallback(async () => {
        if (!user) return
        setLoading(true)
        try {
            const data = await notificationsService.list({ limit: 30 })
            setNotifications(Array.isArray(data) ? data : [])
        } catch {
            // Silent — the bell just won't update this cycle; next poll retries.
        } finally {
            setLoading(false)
        }
    }, [user])

    const fetchUnreadCount = useCallback(async () => {
        if (!user) return
        try {
            const count = await notificationsService.unreadCount()
            setUnreadCount(count)
            // New notifications arrived since the last check — refresh the list too.
            if (count > lastUnreadRef.current) {
                fetchList()
            }
            lastUnreadRef.current = count
        } catch {
            // Silent — same reasoning as above.
        }
    }, [user, fetchList])

    // ── Initial load + polling loop ──────────────────────────────────────
    useEffect(() => {
        if (!user) {
            setNotifications([])
            setUnreadCount(0)
            lastUnreadRef.current = 0
            return
        }

        fetchUnreadCount()
        fetchList()

        function startPolling() {
            if (pollRef.current) return
            pollRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS)
        }
        function stopPolling() {
            clearInterval(pollRef.current)
            pollRef.current = null
        }
        function handleVisibility() {
            if (document.hidden) {
                stopPolling()
            } else {
                fetchUnreadCount()
                startPolling()
            }
        }

        startPolling()
        document.addEventListener('visibilitychange', handleVisibility)
        window.addEventListener('focus', fetchUnreadCount)

        return () => {
            stopPolling()
            document.removeEventListener('visibilitychange', handleVisibility)
            window.removeEventListener('focus', fetchUnreadCount)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [user?.id])

    // ── Actions ─────────────────────────────────────────────────────────
    const markAsRead = useCallback(async (id) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n))
        setUnreadCount(c => Math.max(0, c - 1))
        try {
            await notificationsService.markRead(id)
        } catch {
            fetchUnreadCount() // resync on failure
        }
    }, [fetchUnreadCount])

    const markAllAsRead = useCallback(async () => {
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })))
        setUnreadCount(0)
        try {
            await notificationsService.markAllRead()
        } catch {
            fetchUnreadCount()
        }
    }, [fetchUnreadCount])

    const removeNotification = useCallback(async (id) => {
        const wasUnread = notifications.find(n => n.id === id && !n.is_read)
        setNotifications(prev => prev.filter(n => n.id !== id))
        if (wasUnread) setUnreadCount(c => Math.max(0, c - 1))
        try {
            await notificationsService.remove(id)
        } catch {
            fetchList()
            fetchUnreadCount()
        }
    }, [notifications, fetchList, fetchUnreadCount])

    const refresh = useCallback(() => {
        fetchUnreadCount()
        fetchList()
    }, [fetchUnreadCount, fetchList])

    const value = {
        notifications,
        unreadCount,
        loading,
        markAsRead,
        markAllAsRead,
        removeNotification,
        refresh,
    }

    return (
        <NotificationContext.Provider value={value}>
            {children}
        </NotificationContext.Provider>
    )
}

export function useNotifications() {
    const ctx = useContext(NotificationContext)
    if (!ctx) throw new Error('useNotifications must be inside <NotificationProvider>')
    return ctx
}
