// Nepali calendar/holiday hooks: today's date in BS, a given month's
// calendar grid, and the next few upcoming holidays.

import { useState, useEffect, useCallback } from 'react'
import holidaysService from '../services/holidays.service.js'
import { todayNepalISO } from '../utils/helpers.js'

export function useToday() {
    const [today,   setToday]   = useState(null)   // { today_ad, today_bs }
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        holidaysService.getToday()
            .then(setToday)
            .catch(() => setToday(null))
            .finally(() => setLoading(false))
    }, [])

    return { today, loading }
}

export function useBSCalendar(year, month) {
    const [calendar, setCalendar] = useState(null)
    const [loading,  setLoading]  = useState(true)
    const [error,    setError]    = useState(null)

    const fetch = useCallback(() => {
        if (!year || !month) return
        setLoading(true)
        holidaysService.getCalendar(year, month)
            .then(data => { setCalendar(data); setError(null) })
            .catch(err => setError(err?.response?.data?.detail || 'Failed to load calendar'))
            .finally(() => setLoading(false))
    }, [year, month])

    useEffect(() => { fetch() }, [fetch])

    return { calendar, loading, error, refetch: fetch }
}

export function useUpcomingHolidays() {
    const [holidays, setHolidays] = useState([])
    const [loading,  setLoading]  = useState(true)

    useEffect(() => {
        holidaysService.getAll()
            .then(data => {
                const today = todayNepalISO()
                // Dashboard preview only — full list lives on the calendar page.
                const upcoming = data.filter(h => h.date >= today).slice(0, 5)
                setHolidays(upcoming)
            })
            .catch(() => setHolidays([]))
            .finally(() => setLoading(false))
    }, [])

    return { holidays, loading }
}