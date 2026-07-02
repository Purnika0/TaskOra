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