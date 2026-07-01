 import React, { useState, useEffect, useMemo } from 'react'
    import { useToday } from '../../hooks/useHolidays.js'
    import {
    BS_MONTH_NAMES, buildMonthDays, daysInBSMonth, adToBS,
    } from '../../utils/bsCalendar.js'

    const DOW = ['S','M','T','W','T','F','S']
    const RED = 'rgba(255,80,80,0.80)'
    const SUN = 'rgba(255,130,100,0.60)'

    export default function BSCalMini() {
    const { today: todayData } = useToday()

    const todayBS = useMemo(() => {
        if (todayData?.today_bs) return todayData.today_bs
        const t = adToBS(new Date())
        return { year: t.year, month: t.month, day: t.day }
    }, [todayData])

    const [cur, setCur] = useState({ y: 2082, m: 9 })

    useEffect(() => {
        if (todayBS?.year && todayBS?.month)
        setCur({ y: todayBS.year, m: todayBS.month })
    }, [todayBS?.year, todayBS?.month])

    const prev = () => setCur(c => c.m === 1  ? { y: c.y - 1, m: 12 } : { y: c.y, m: c.m - 1 })
    const next = () => setCur(c => c.m === 12 ? { y: c.y + 1, m: 1  } : { y: c.y, m: c.m + 1 })

    const days     = useMemo(() => buildMonthDays(cur.y, cur.m), [cur.y, cur.m])
    const firstDow = days.length ? days[0].dow : 0
    const bsM      = BS_MONTH_NAMES[cur.m - 1]

    // Trailing blank count to complete last week
    const trailingBlanks = (7 - ((firstDow + days.length) % 7)) % 7

    return (
        <div className="cal-card" style={{ display:'flex', flexDirection:'column' }}>
        {/* Header */}
        <div className="cal-header">
            <button className="cal-nav" onClick={prev} aria-label="Previous month">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <polyline points="15 18 9 12 15 6"/>
            </svg>
            </button>

            <div style={{ textAlign:'center' }}>
            <div className="cal-month-title"
                style={{ display:'flex', alignItems:'baseline', justifyContent:'center', gap:5 }}>
                <span>{bsM.en}</span>
                <span style={{ fontSize:9, opacity:0.4, fontWeight:400 }}>{bsM.ne}</span>
                <span>{cur.y}</span>
            </div>
            <div className="cal-today-sub">
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none" aria-hidden="true">
                <rect x="1" y="2" width="10" height="9" rx="1.5"
                    stroke="rgba(255,255,255,0.4)" strokeWidth="1.2"/>
                <path d="M4 1v2M8 1v2M1 5h10"
                    stroke="rgba(255,255,255,0.4)" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Today
            </div>
            </div>

            <button className="cal-nav" onClick={next} aria-label="Next month">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                strokeLinejoin="round" aria-hidden="true">
                <polyline points="9 18 15 12 9 6"/>
            </svg>
            </button>
        </div>

        {/* Day-of-week row */}
        <div className="cal-grid">
            {DOW.map((d, i) => (
            <div key={i} className="cal-dow" style={{
                color: i === 6 ? RED : i === 0 ? SUN : undefined,
            }}>
                {d}
            </div>
            ))}

            {/* Blank prefix cells */}
            {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`}/>)}

            {/* Day cells */}
            {days.map(day => {
            const isToday =
                todayBS &&
                day.bsDay   === todayBS.day &&
                cur.m       === todayBS.month &&
                cur.y       === todayBS.year

            let cls = 'cal-day'
            if (isToday)       cls += ' today'
            if (day.isHoliday) cls += ' holiday'   // Saturday also gets holiday class

            const numColor =
                day.isHoliday ? undefined           // .holiday CSS handles red
                : day.isSun   ? SUN
                :               undefined

            return (
                <div key={day.bsKey} className="cal-day-cell">
                <div
                    className={cls}
                    title={day.holidayTitle || (day.isSat ? 'Saturday — Holiday' : undefined)}
                    style={{
                    color: isToday ? undefined : numColor,
                    flexDirection: 'column',
                    gap: 0,
                    height: 28,
                    width: 28,
                    fontSize: 11,
                    }}
                >
                    {/* BS number — primary */}
                    <span style={{ lineHeight: 1 }}>{day.bsDay}</span>
                    {/* AD number — secondary */}
                    <span style={{
                    fontSize: 7, lineHeight: 1, marginTop: 1,
                    opacity: isToday ? 0.65 : 0.22,
                    }}>
                    {day.adDay}
                    </span>
                </div>
                </div>
            )
            })}

            {/* Trailing blank cells */}
            {Array(trailingBlanks).fill(null).map((_, i) => <div key={`e${i}`}/>)}
        </div>

        {/* Legend */}
        <div className="cal-legend" style={{ marginTop:'auto', flexWrap:'wrap', gap:'4px 12px' }}>
            <div className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background:'var(--color-red)' }}/>
            Holiday
            </div>
            <div className="cal-legend-item">
            <span className="cal-legend-dot" style={{
                background:'transparent',
                border:'1.5px solid rgba(255,255,255,0.55)',
                borderRadius:'50%',
            }}/>
            Today
            </div>
            <div className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background:RED }}/>
            Sat
            </div>
        </div>
        </div>
    )
    }
