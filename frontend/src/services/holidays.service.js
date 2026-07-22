// Public holiday-calendar lookups (AD/BS), plus admin CRUD for managing
// holiday entries.

import api from './api.js'

const holidaysService = {
    async getAll({ type, month, year } = {}) {
        const params = {}
        if (type)  params.type  = type
        if (month) params.month = month
        if (year)  params.year  = year
        const { data } = await api.get('/api/holidays/', { params })
        return data
    },

    async getToday() {
        const { data } = await api.get('/api/holidays/today/')
        return data   // { today_ad, today_bs: { year, month, day, str } }
    },

    async getCalendar(year, month) {
        const { data } = await api.get('/api/holidays/calendar/', {
        params: { year, month },
        })
        return data   // { year_bs, month_bs, days: [...] }
    },

    // ── Admin CRUD ──────────────────────────────────────────────────────────
    // Confirmed against holidays/views.py + urls.py:
    // POST /api/holidays/ (HolidayListCreateView, IsAdmin-only for POST)
    // PATCH/DELETE /api/holidays/:id/ (HolidayDetailView, IsAdmin-only)
    // Payload shape (HolidaySerializer): { title, date, holiday_type, description }
    // date = AD 'YYYY-MM-DD'. holiday_type ∈ public|festival|regional|restricted.
    async create(payload) {
        const { data } = await api.post('/api/holidays/', payload)
        return data
    },

    async update(id, payload) {
        const { data } = await api.patch(`/api/holidays/${id}/`, payload)
        return data
    },

    async remove(id) {
        await api.delete(`/api/holidays/${id}/`)
    },
}

export default holidaysService