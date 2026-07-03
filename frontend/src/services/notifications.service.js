// src/services/notifications.service.js
// Thin wrapper around the notifications API. Mirrors the shape of the other
// *.service.js files (tasks.service.js, courses.service.js) in this project.
//
//   GET    /api/notifications/                → list (optionally ?unread=true)
//   GET    /api/notifications/unread-count/   → { unread_count }
//   PATCH  /api/notifications/<id>/read/      → mark one as read
//   POST   /api/notifications/mark-all-read/  → mark every unread as read
//   DELETE /api/notifications/<id>/           → remove one notification
//   DELETE /api/notifications/clear-read/     → bulk-remove already-read ones

import api from './api.js'

const notificationsService = {
    async list({ unread = false, limit } = {}) {
        const params = {}
        if (unread) params.unread = 'true'
        if (limit)  params.limit = limit
        const { data } = await api.get('/api/notifications/', { params })
        return data
    },

    async unreadCount() {
        const { data } = await api.get('/api/notifications/unread-count/')
        return data.unread_count
    },

    async markRead(id) {
        const { data } = await api.patch(`/api/notifications/${id}/read/`)
        return data
    },

    async markAllRead() {
        const { data } = await api.post('/api/notifications/mark-all-read/')
        return data
    },

    async remove(id) {
        await api.delete(`/api/notifications/${id}/`)
    },

    async clearRead() {
        const { data } = await api.delete('/api/notifications/clear-read/')
        return data
    },
}

export default notificationsService
