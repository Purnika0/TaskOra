// src/services/holidays.service.js
// Wraps /api/holidays/ endpoints.
//
// BS calendar response shape from backend:
// GET /api/holidays/calendar/?year=2083&month=1
// {
//   year_bs: 2083,
//   month_bs: 1,
//   days: [
//     { day_bs: 1, date_ad: "2026-04-14", is_holiday: true,
//       holiday_title: "Naya Barsha", holiday_type: "public" },
//     ...
//   ]
// }
//
// Today BS: GET /api/holidays/today/
// { today_ad: "2026-04-14", today_bs: { year: 2083, month: 1, day: 1, str: "2083-01-01" } }

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
}

export default holidaysService
