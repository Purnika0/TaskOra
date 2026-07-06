// src/components/shared/BSDatePicker.jsx
// A compact BS (Bikram Sambat) calendar date picker dropdown.
// Value in / value out is always an AD ISO date string ('YYYY-MM-DD'),
// so it's a drop-in replacement for <input type="date"> — the picker
// just displays and lets the user browse in BS instead of the native
// English/Gregorian date widget.

import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react'
import { BS_MONTH_NAMES, buildMonthDays, adToBS } from '../../utils/bsCalendar.js'

const RED = '#DC2626'

function adISOToBS(adISO) {
    const [y, m, d] = adISO.split('-').map(Number)
    return adToBS(new Date(y, m - 1, d))
}

export default function BSDatePicker({ value, onChange, placeholder = 'Select date', hasError = false }) {
    const [open, setOpen] = useState(false)
    const wrapRef = useRef(null)

    const [cur, setCur] = useState(() => {
        if (value) { const bs = adISOToBS(value); return { y: bs.year, m: bs.month } }
        const t = adToBS(new Date()); return { y: t.year, m: t.month }
    })

    useEffect(() => {
        function handleClick(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const days     = useMemo(() => buildMonthDays(cur.y, cur.m), [cur.y, cur.m])
    const firstDow = days.length ? days[0].dow : 0
    const monthName = BS_MONTH_NAMES[cur.m - 1]

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
                    width: '100%', border: `1.5px solid ${hasError ? '#e05252' : '#e2dbd0'}`, borderRadius: 8,
                    padding: '9px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
                    color: value ? '#1a1f35' : '#a09080', background: '#faf8f5', cursor: 'pointer', boxSizing: 'border-box',
                }}>
                <span>{displayLabel || placeholder}</span>
                <CalendarIcon size={14} style={{ color: '#8a7e6e', flexShrink: 0 }} />
            </button>

            {open && (
                <div style={{
                    position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 60,
                    background: '#fff', borderRadius: 12, boxShadow: '0 12px 32px rgba(26,31,53,0.20)',
                    border: '1px solid #ece7df', padding: 14, width: 264,
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                        <button type="button" onClick={prev} aria-label="Previous month"
                            style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: '#f3efe9', color: '#5a5060', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronLeft size={13} />
                        </button>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#1a1f35' }}>{monthName?.en} {cur.y}</div>
                            <div style={{ fontSize: 10, color: '#a09080' }}>{monthName?.ne} · BS</div>
                        </div>
                        <button type="button" onClick={next} aria-label="Next month"
                            style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: '#f3efe9', color: '#5a5060', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <ChevronRight size={13} />
                        </button>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4 }}>
                        {['S','M','T','W','T','F','S'].map((d, i) => (
                            <div key={i} style={{ textAlign: 'center', fontSize: 10, fontWeight: 700, color: (i === 0 || i === 6) ? RED : '#a09080' }}>{d}</div>
                        ))}
                        {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`} />)}
                        {days.map(day => {
                            const isSelected = value === day.adISO
                            const isWeekend  = day.isHoliday || day.isSun
                            return (
                                <button type="button" key={day.bsKey}
                                    onClick={() => { onChange(day.adISO); setOpen(false) }}
                                    title={day.holidayTitle || undefined}
                                    style={{
                                        width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        fontSize: 12, fontWeight: isSelected ? 700 : 500,
                                        background: isSelected ? 'var(--color-primary)' : 'transparent',
                                        color: isSelected ? '#fff' : (isWeekend ? RED : '#1a1f35'),
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