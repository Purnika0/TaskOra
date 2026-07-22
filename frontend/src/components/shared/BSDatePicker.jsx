// A compact BS (Bikram Sambat) calendar date picker dropdown.
// Value in / value out is always an AD ISO date string ('YYYY-MM-DD'),
// so it's a drop-in replacement for <input type="date"> — the picker
// just displays and lets the user browse in BS instead of the native
// English/Gregorian date widget.

import { useState, useRef, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { BS_MONTH_NAMES, buildMonthDays, adToBS } from '../../utils/bsCalendar.js'
import { nepalNow, todayNepalISO } from '../../utils/helpers.js'
import { useBSCalendar } from '../../hooks/useHolidays.js'

const RED = '#DC2626'

function adISOToBS(adISO) {
    const [y, m, d] = adISO.split('-').map(Number)
    return adToBS(new Date(y, m - 1, d))
}

function todayISO() {
    return todayNepalISO()
}

// value/onChange: AD ISO date string ('YYYY-MM-DD')
// minDate: AD ISO date string — days before this are disabled (greyed out, not clickable)
// disablePast: convenience shorthand for minDate = today (use for due-date fields, where only upcoming dates make sense)
export default function BSDatePicker({ value, onChange, placeholder = 'Select date', hasError = false, minDate = null, disablePast = false, background = '#FFFFFF' }) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)
    const effectiveMin = disablePast ? todayISO() : minDate

    const [cur, setCur] = useState(() => {
        if (value) { const bs = adISOToBS(value); return { y: bs.year, m: bs.month } }
        const t = adToBS(nepalNow()); return { y: t.year, m: t.month }
    })

    useEffect(() => {
        function handleClick(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const rawDays  = useMemo(() => buildMonthDays(cur.y, cur.m), [cur.y, cur.m])
    const { calendar: backendCal } = useBSCalendar(cur.y, cur.m)
    // Backend holiday data (DB-editable) overrides the hardcoded fallback list
    // when available, so the red weekend/holiday coloring and hover title
    // stay accurate. Same merge logic as CalendarPage.jsx and the dashboard
    // mini calendars — keep them in sync if this changes.
    const days = useMemo(() => {
        if (!backendCal?.days?.length) return rawDays
        const bkMap = {}
        backendCal.days.forEach(d => { bkMap[d.day_bs] = d })
        return rawDays.map(day => {
            const bk = bkMap[day.bsDay]
            if (!bk) return day
            return {
                ...day,
                isHoliday:    bk.is_holiday || day.isSat || day.isSun,
                holidayTitle: bk.holiday_title || day.holidayTitle || null,
            }
        })
    }, [rawDays, backendCal])
    const firstDow = days.length ? days[0].dow : 0
    const monthName = BS_MONTH_NAMES[cur.m - 1]
    const today = todayISO()

    const prev = () => setCur(c => c.m === 1  ? { y: c.y - 1, m: 12 } : { y: c.y, m: c.m - 1 })
    const next = () => setCur(c => c.m === 12 ? { y: c.y + 1, m: 1  } : { y: c.y, m: c.m + 1 })

    const displayLabel = useMemo(() => {
        if (!value) return null
        const bs = adISOToBS(value)
        const mn = BS_MONTH_NAMES[bs.month - 1]
        return `${bs.day} ${mn?.en} ${bs.year} BS`
    }, [value])

    function openPicker() {
        if (value) { const bs = adISOToBS(value); setCur({ y: bs.year, m: bs.month }) }
        setOpen(o => !o)
    }

    return (
        <div ref={wrapRef} style={{ position: 'relative' }}>
            <button type="button" onClick={openPicker}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    width: '100%', border: `1.5px solid ${hasError ? 'var(--color-red)' : 'var(--color-border)'}`, borderRadius: 9,
                    padding: '9px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
                    color: value ? 'var(--color-text)' : 'var(--color-text-placeholder)', background, cursor: 'pointer', boxSizing: 'border-box',
                }}>
                <span>{displayLabel || placeholder}</span>
                <CalendarIcon size={14} style={{ color: 'var(--color-text-muted)', flexShrink: 0 }} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60,
                    background: '#fff', borderRadius: 12, boxShadow: '0 12px 32px rgba(15,23,42,0.18)',
                    border: '1px solid var(--color-border)', padding: 14, width: 264,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <button type="button" onClick={prev} aria-label="Previous month"
                            style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronLeft size={13} />
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--color-text)' }}>{monthName?.en} {cur.y}</div>
                            <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>{monthName?.ne} · BS</div>
                        </div>
                        <button type="button" onClick={next} aria-label="Next month"
                            style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: 'var(--color-surface-subtle)', color: 'var(--color-text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronRight size={13} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                        {['S','M','T','W','T','F','S'].map((d, i) => (
                            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: (i === 0 || i === 6) ? RED : 'var(--color-text-muted)' }}>{d}</div>
                        ))}
                        {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`} />)}
                        {days.map(day => {
                            const isSelected = value === day.adISO
                            const isToday    = day.adISO === today
                            const isWeekend  = day.isHoliday || day.isSun
                            const isDisabled = effectiveMin ? day.adISO < effectiveMin : false
                            return (
                                <button type="button" key={day.bsKey}
                                    onClick={() => { if (isDisabled) return; onChange(day.adISO); setOpen(false) }}
                                    disabled={isDisabled}
                                    title={day.holidayTitle || undefined}
                                    style={{
                                        width: 30, height: 30, borderRadius: 8,
                                        border: isToday && !isSelected ? '1.5px solid var(--color-primary)' : 'none',
                                        cursor: isDisabled ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12, fontWeight: isSelected || isToday ? 700 : 500,
                                        background: isSelected ? 'var(--color-primary)' : 'transparent',
                                        color: isDisabled
                                            ? 'var(--color-text-placeholder)'
                                            : isSelected ? '#fff'
                                            : isToday ? 'var(--color-primary)'
                                            : (isWeekend ? RED : 'var(--color-text)'),
                                        opacity: isDisabled ? 0.45 : 1,
                                    }}>
                                    {day.bsDay}
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}