import React, { useState, useMemo, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, CalendarDays, Plus, Trash2, Pencil, Loader, X } from 'lucide-react'
import { useToday } from '../../hooks/useHolidays.js'
import { useToast } from '../../context/ToastContext.jsx'
import holidaysService from '../../services/holidays.service.js'
import { apiError, fmtDate, nepalNow, todayNepalISO } from '../../utils/helpers.js'
import BSDatePicker from '../../components/shared/BSDatePicker.jsx'
import {
    BS_MONTH_NAMES, buildMonthDays, daysInBSMonth, adToBS,
} from '../../utils/bsCalendar.js'

const DOW_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat']

const RED     = '#DC2626'
const RED_BG  = '#FEF2F2'
const BLUE    = '#5452E4'
const BLUE_BG = '#EEEEFE'

// Real choices from Holiday.HOLIDAY_TYPES (backend/holidays/models.py)
const HOLIDAY_TYPES = [
    { value:'public',     label:'Public Holiday'                    },
    { value:'festival',   label:'Festival'                          },
    { value:'regional',   label:'Regional (Valley / Pradesh / District)' },
    { value:'restricted', label:'Private'                  },
]

// ── Day Cell ──────────────────────────────────────────────────────────────────
function DayCell({ day, isToday, isSelected, onClick }) {
    const [hov, setHov] = useState(false)
    const hTitle = day.holidayTitle
        || (day.isSat ? 'Saturday — Holiday' : null)
        || (day.isSun ? 'Sunday — Holiday' : null)
    const isRed = day.isHoliday || day.isSat || day.isSun

    let bgColor  = 'transparent'
    let txtColor = '#0F172A'
    let border   = '1.5px solid transparent'
    let fontW    = 400

    if (isToday) {
        bgColor  = BLUE
        txtColor = '#fff'
        border   = `1.5px solid ${BLUE}`
        fontW    = 700
    } else if (isSelected) {
        bgColor  = BLUE_BG
        border   = `1.5px solid ${BLUE}`
        txtColor = BLUE
        fontW    = 600
    } else if (isRed) {
        txtColor = RED
        fontW    = 600
        bgColor  = hov ? RED_BG : 'transparent'
    } else if (hov) {
        bgColor  = BLUE_BG
        txtColor = BLUE
    }

    return (
        <div
            className="cal-day-cell"
            onMouseEnter={() => setHov(true)}
            onMouseLeave={() => setHov(false)}
            style={{ position:'relative', cursor:'pointer' }}
        >
            {hov && hTitle && (
                <div style={{
                    position:'absolute', bottom:'calc(100% + 4px)', left:'50%',
                    transform:'translateX(-50%)',
                    background:'#0F172A', color:'#fff',
                    fontSize:10, fontWeight:600, padding:'4px 8px', borderRadius:6,
                    whiteSpace:'nowrap', maxWidth:200, overflow:'hidden', textOverflow:'ellipsis',
                    zIndex:20, pointerEvents:'none', boxShadow:'0 4px 12px rgba(0,0,0,0.2)',
                }}>
                    {hTitle}
                </div>
            )}

            <div
                onClick={onClick}
                style={{
                    width:34, height:34,
                    display:'flex', flexDirection:'column',
                    alignItems:'center', justifyContent:'center',
                    borderRadius:8, border, background:bgColor, color:txtColor,
                    fontWeight:fontW, margin:'0 auto',
                    transition:'all 0.12s',
                    fontSize:12,
                    boxShadow: isToday ? '0 2px 8px rgba(84,82,228,0.30)' : 'none',
                }}
                aria-label={`${day.bsDay}${hTitle ? ' — ' + hTitle : ''}`}
            >
                <span style={{ lineHeight:1 }}>{day.bsDay}</span>
                <span style={{ fontSize:8, lineHeight:1, marginTop:1, opacity: isToday ? 0.75 : 0.45 }}>
                    {day.adDate.getDate()}
                </span>
            </div>
        </div>
    )
}

// ── Holiday form modal (add / edit) ───────────────────────────────────────────
function HolidayModal({ initial, onClose, onSaved }) {
    const [title, setTitle] = useState(initial?.title || '')
    const [date,  setDate]  = useState(initial?.date  || '')
    const [holidayType, setHolidayType] = useState(initial?.holiday_type || 'public')
    const [description, setDescription] = useState(initial?.description || '')
    const [saving, setSaving] = useState(false)
    const [error, setError]   = useState('')
    const toast = useToast()
    const isEdit = !!initial?.id

    async function handleSave() {
        if (!title.trim()) { setError('Title is required'); return }
        if (!date)          { setError('Date is required');  return }
        setSaving(true)
        try {
            const payload = { title: title.trim(), date, holiday_type: holidayType, description: description.trim() }
            const saved = isEdit
                ? await holidaysService.update(initial.id, payload)
                : await holidaysService.create(payload)
            toast.success(isEdit ? 'Holiday updated' : 'Holiday added')
            onSaved(saved)
        } catch (err) {
            toast.error(apiError(err))
        } finally {
            setSaving(false)
        }
    }

    return (
        <div
            onClick={onClose}
            style={{
                position:'fixed', inset:0, background:'rgba(26,31,53,0.45)', backdropFilter:'blur(2px)',
                display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20,
            }}
        >
            <div
                onClick={e => e.stopPropagation()}
                className="white-card anim-fade-in"
                style={{ width:'100%', maxWidth:380, padding:'22px 22px 20px' }}
            >
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:0 }}>
                        {isEdit ? 'Edit Holiday' : 'Add Holiday'}
                    </h3>
                    <button onClick={onClose} style={{ background:'none', border:'none', cursor:'pointer', color:'#94A3B8' }}>
                        <X size={16}/>
                    </button>
                </div>

                <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Title</label>
                        <input
                            type="text" value={title}
                            onChange={e => { setTitle(e.target.value); setError('') }}
                            placeholder="e.g. Dashain"
                            className="form-input"
                        />
                    </div>
                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Date</label>
                        <BSDatePicker
                            value={date}
                            onChange={d => { setDate(d); setError('') }}
                            placeholder="Select a date"
                            hasError={!!error && !date}
                        />
                    </div>
                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Type</label>
                        <select value={holidayType} onChange={e => setHolidayType(e.target.value)} className="form-input">
                            {HOLIDAY_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                        </select>
                    </div>
                    <div>
                        <label style={{ fontSize:11, fontWeight:600, color:'#64748B', display:'block', marginBottom:5 }}>Description (optional)</label>
                        <textarea
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Any additional notes"
                            rows={2}
                            className="form-input"
                            style={{ resize:'vertical', fontFamily:'inherit' }}
                        />
                    </div>
                    {error && <p style={{ fontSize:11.5, color:RED, margin:0 }}>{error}</p>}
                </div>

                <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
                    <button onClick={onClose} disabled={saving} className="btn-primary"
                        style={{ background:'#f0ece5', color:'#7a7060', cursor: saving ? 'default' : 'pointer' }}>
                        Cancel
                    </button>
                    <button onClick={handleSave} disabled={saving} className="btn-primary"
                        style={{ background:BLUE, color:'#fff', cursor: saving ? 'default' : 'pointer', opacity: saving ? 0.75 : 1 }}>
                        {saving ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Holiday'}
                    </button>
                </div>
            </div>
        </div>
    )
}

// ── Side panel ────────────────────────────────────────────────────────────────
function AdminSidePanel({ day, bsMonth, bsYear, onAdd, onEdit, onDelete }) {
    if (!day) return (
        <div style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center' }}>
            <div style={{ textAlign:'center', padding:20 }}>
                <CalendarDays size={28} style={{ color:'#CBD5E1', margin:'0 auto 10px', display:'block' }}/>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:13, color:BLUE, margin:'0 0 5px' }}>
                    Select a date
                </p>
                
            </div>
        </div>
    )

    const dowName = DOW_SHORT[day.dow]
    const hTitle   = day.holidayTitle
        || (day.isSat ? 'Saturday — Holiday' : null)
        || (day.isSun ? 'Sunday — Holiday' : null)
    const isWeekend = day.isSat || day.isSun
    const hasCustomHoliday = day.isHoliday && day.holidayId

    return (
        <div style={{ display:'flex', flexDirection:'column', height:'100%', gap:10 }}>
            <div style={{ background: BLUE, borderRadius:10, padding:'14px 16px', color:'#fff' }}>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:28, color:'#fff', lineHeight:1, margin:'0 0 2px', letterSpacing:'-0.03em' }}>
                    {day.bsDay}
                    <span style={{ fontSize:13, fontWeight:500, color:'rgba(255,255,255,0.50)', marginLeft:6 }}>BS</span>
                </p>
                <p style={{ fontSize:12, fontWeight:600, color:'rgba(255,255,255,0.65)', margin:0 }}>
                    {bsMonth?.en} {bsYear} · {dowName}
                </p>
            </div>

            {hTitle && (
                <div style={{ padding:'8px 12px', background:RED_BG, border:'1px solid #FECACA', borderLeft:`3px solid ${RED}`, borderRadius:8 }}>
                    <p style={{ fontSize:12, fontWeight:700, color:RED, margin:0 }}>🎉 {hTitle}</p>
                </div>
            )}

            <div style={{ flex:1 }}>
                {hasCustomHoliday ? (
                    <div style={{ display:'flex', gap:8, marginTop:4 }}>
                        <button onClick={() => onEdit(day)}
                            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 10px', fontSize:12, fontWeight:600, background:BLUE_BG, color:BLUE, border:'none', borderRadius:8, cursor:'pointer' }}>
                            <Pencil size={12}/> Edit
                        </button>
                        <button onClick={() => onDelete(day)}
                            style={{ flex:1, display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'8px 10px', fontSize:12, fontWeight:600, background:RED_BG, color:RED, border:'none', borderRadius:8, cursor:'pointer' }}>
                            <Trash2 size={12}/> Delete
                        </button>
                    </div>
                ) : (
                    <>
                        {isWeekend && (
                            <p style={{ fontSize:11.5, color:'#94A3B8', margin:'6px 0' }}>
                                This date is a scheduled weekly off. You can still add a named holiday if required.
                            </p>
                        )}
                        <button onClick={() => onAdd(day)}
                            style={{ width:'100%', display:'flex', alignItems:'center', justifyContent:'center', gap:6, padding:'9px 10px', fontSize:12, fontWeight:600, background:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', marginTop:4 }}>
                            <Plus size={13}/> Add Holiday
                        </button>
                    </>
                )}
            </div>
        </div>
    )
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN ADMIN CALENDAR PAGE — holidays only, no task/assignment fetching
// ─────────────────────────────────────────────────────────────────────────────
export default function AdminCalendarPage() {
    const { today: todayData } = useToday()
    const toast   = useToast()

    const todayBS = useMemo(() => {
        if (todayData?.today_bs) return todayData.today_bs
        const t = adToBS(nepalNow())
        return { year:t.year, month:t.month, day:t.day }
    }, [todayData])

    const [cur, setCur] = useState(() => {
        const t = adToBS(nepalNow())
        return { y:t.year, m:t.month }
    })

    const todayKey = todayBS?.year && todayBS?.month ? `${todayBS.year}-${todayBS.month}` : null
    const [syncedKey, setSyncedKey] = useState(todayKey)
    if (todayKey && todayKey !== syncedKey) {
        setSyncedKey(todayKey)
        setCur({ y:todayBS.year, m:todayBS.month })
    }

    const [backendCal, setBackendCal] = useState(null)
    const [calLoading, setCalLoading] = useState(false)

    const loadCalendar = useCallback(() => {
        setCalLoading(true)
        holidaysService.getCalendar(cur.y, cur.m)
            .then(setBackendCal)
            .catch(err => {
                console.error('Error loading holiday calendar:', err)
                toast.error('Failed to load holidays')
            })
            .finally(() => setCalLoading(false))
    }, [cur.y, cur.m, toast])

    useEffect(() => { loadCalendar() }, [loadCalendar])

    const [selected, setSelected] = useState(null)
    const prev    = () => { setSelected(null); setCur(c => c.m === 1  ? { y:c.y-1, m:12 } : { y:c.y, m:c.m-1 }) }
    const next    = () => { setSelected(null); setCur(c => c.m === 12 ? { y:c.y+1, m:1  } : { y:c.y, m:c.m+1 }) }
    const goToday = () => { if (todayBS) { setCur({ y:todayBS.year, m:todayBS.month }); setSelected(null) } }

    const rawDays = useMemo(() => buildMonthDays(cur.y, cur.m), [cur.y, cur.m])

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
                holidayType:  bk.holiday_type || null,
                holidayId:    bk.holiday_id || null,
            }
        })
    }, [rawDays, backendCal])

    const firstDow    = days.length ? days[0].dow : 0
    const trailBlanks = (7 - ((firstDow + days.length) % 7)) % 7
    const bsMonth     = BS_MONTH_NAMES[cur.m - 1]

    const adRangeStr = useMemo(() => {
        if (!days.length) return ''
        const first = days[0], last = days[days.length - 1]
        const ADM = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
        const fmt = d => `${d.adDate.getDate()} ${ADM[d.adDate.getMonth()]}`
        if (first.adDate.getMonth() !== last.adDate.getMonth())
            return `${fmt(first)} – ${fmt(last)} ${last.adDate.getFullYear()}`
        return `${ADM[first.adDate.getMonth()]} ${first.adDate.getFullYear()}`
    }, [days])

    const selectedDay = useMemo(() => selected ? days.find(d => d?.bsKey === selected) : null, [days, selected])
    const holidayCount = useMemo(() => days.filter(d => d?.isHoliday || d?.isSat || d?.isSun).length, [days])

    const [modalState, setModalState] = useState(null) // { mode: 'add'|'edit', initial }
    const [deleteTarget, setDeleteTarget] = useState(null)
    const [deleting, setDeleting] = useState(false)

    // ── Page-level tabs: Calendar / Upcoming Holidays ──────────────────────
    const [pageTab, setPageTab] = useState('calendar')
    const [allHolidays, setAllHolidays] = useState([])
    const [holidaysLoading, setHolidaysLoading] = useState(false)

    const loadAllHolidays = useCallback(() => {
        setHolidaysLoading(true)
        holidaysService.getAll()
            .then(data => setAllHolidays(Array.isArray(data) ? data : (data?.results || [])))
            .catch(() => toast.error('Failed to load holidays'))
            .finally(() => setHolidaysLoading(false))
    }, [toast])

    useEffect(() => { loadAllHolidays() }, [loadAllHolidays])

    const todayISO = useMemo(() => todayNepalISO(), [])

    const upcomingHolidays = useMemo(() => {
        return allHolidays
            .filter(h => h.date >= todayISO)
            .sort((a, b) => a.date.localeCompare(b.date))
    }, [allHolidays, todayISO])

    function handleEditHoliday(h) {
        setModalState({ mode:'edit', initial:{ id:h.id, title:h.title, date:h.date, holiday_type:h.holiday_type, description:h.description } })
    }
    function handleDeleteHoliday(h) {
        setDeleteTarget({ holidayId:h.id, holidayTitle:h.title })
    }

    function handleAdd(day) {
        setModalState({ mode:'add', initial:{ date: day.adISO } })
    }
    function handleEdit(day) {
        setModalState({ mode:'edit', initial:{ id: day.holidayId, title: day.holidayTitle, date: day.adISO, holiday_type: day.holidayType } })
    }
    function handleDelete(day) {
        setDeleteTarget(day)
    }
    async function confirmDelete() {
        if (!deleteTarget) return
        setDeleting(true)
        try {
            await holidaysService.remove(deleteTarget.holidayId)
            toast.success('Holiday deleted')
            setDeleteTarget(null)
            loadCalendar()
            loadAllHolidays()
        } catch (err) {
            toast.error(apiError(err))
        } finally {
            setDeleting(false)
        }
    }
    function handleSaved() {
        setModalState(null)
        loadCalendar()
        loadAllHolidays()
    }

    return (
        <div className="anim-fade-in">
            <div className="page-header">
                <div>
                    <h2 className="page-title">Holiday Calendar</h2>
                    <p className="page-subtitle">
                        Bikram Sambat · English {new Date().getFullYear()} 
                        {todayBS && (
                            <span style={{ marginLeft:8, fontWeight:600, color:BLUE }}>
                                Today: {BS_MONTH_NAMES[todayBS.month-1]?.en} {todayBS.day}, {todayBS.year} BS
                            </span>
                        )}
                    </p>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <button onClick={() => setModalState({ mode:'add', initial:{} })}
                        style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', fontSize:12, fontWeight:600, background:'#fff', color:BLUE, border:`1px solid ${BLUE}`, borderRadius:8, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                        <Plus size={13}/> Add Holiday
                    </button>
                    {pageTab === 'calendar' && (
                        <button onClick={goToday}
                            style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 14px', fontSize:12, fontWeight:600, background:BLUE, color:'#fff', border:'none', borderRadius:8, cursor:'pointer', fontFamily:'var(--font-display)' }}>
                            <CalendarDays size={13}/> Today
                        </button>
                    )}
                </div>
            </div>

            <div className="tab-bar" style={{ borderRadius:14, marginBottom:20 }}>
                {[
                    { key:'calendar', label:'Calendar' },
                    { key:'holidays', label:'Upcoming Holidays' },
                ].map(t => (
                    <button key={t.key} className={`tab-btn${pageTab === t.key ? ' active' : ''}`}
                        onClick={() => setPageTab(t.key)}>
                        {t.label}
                        {t.key === 'holidays' && upcomingHolidays.length > 0 && (
                            <span style={{ marginLeft:5, fontSize:11, fontWeight:600, padding:'1px 6px', borderRadius:99,
                                background: pageTab === 'holidays' ? 'rgba(84,82,228,0.12)' : 'var(--color-surface-subtle)', color:'inherit' }}>
                                {upcomingHolidays.length}
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {pageTab === 'calendar' ? (
            <div className="cal-pg-grid" style={{ marginBottom:24 }}>
                <div className="white-card" style={{ padding:20 }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                        <button className="cal-nav" onClick={prev} aria-label="Previous month">
                            <ChevronLeft size={14}/>
                        </button>
                        <div style={{ textAlign:'center' }}>
                            <div style={{ display:'flex', alignItems:'baseline', gap:6, justifyContent:'center' }}>
                                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#0F172A' }}>
                                    {bsMonth?.en}
                                </span>
                                <span style={{ fontSize:10, color:'#94A3B8' }}>{bsMonth?.ne}</span>
                                <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#0F172A' }}>
                                    {cur.y} BS
                                </span>
                            </div>
                            <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}>
                                <p style={{ fontSize:11, color:'#94A3B8', margin:'2px 0 0' }}>{adRangeStr}</p>
                                {calLoading && (
                                    <span style={{ display:'inline-flex', alignItems:'center', gap:3, fontSize:9, color:'#94A3B8', margin:'2px 0 0' }}>
                                        <Loader size={9} style={{ animation:'to-spin 1s linear infinite' }}/>
                                        Syncing…
                                    </span>
                                )}
                            </div>
                        </div>
                        <button className="cal-nav" onClick={next} aria-label="Next month">
                            <ChevronRight size={14}/>
                        </button>
                    </div>

                    <div className="cal-grid" style={{ marginBottom:4 }}>
                        {DOW_SHORT.map((d, i) => (
                            <div key={d} style={{ textAlign:'center', fontSize:11, fontWeight:600, padding:'5px 0 8px', letterSpacing:'0.03em', color: (i === 0 || i === 6) ? RED : '#94A3B8' }}>
                                {d}
                            </div>
                        ))}
                        {Array(firstDow).fill(null).map((_, i) => <div key={`b${i}`}/>)}
                        {days.map(day => {
                            const isToday = todayBS && day.bsDay===todayBS.day && cur.m===todayBS.month && cur.y===todayBS.year
                            const isSelected = day.bsKey === selected
                            return (
                                <DayCell
                                    key={day.bsKey}
                                    day={day}
                                    isToday={isToday}
                                    isSelected={isSelected}
                                    onClick={() => setSelected(isSelected ? null : day.bsKey)}
                                />
                            )
                        })}
                        {Array(trailBlanks).fill(null).map((_, i) => <div key={`e${i}`}/>)}
                    </div>

                    <div style={{ display:'flex', gap:14, paddingTop:10, borderTop:'1px solid #E2E8F0', justifyContent:'center', flexWrap:'wrap', marginTop:8 }}>
                        {[
                            { label:'Today', swatch: <span style={{ width:12, height:12, borderRadius:3, background:BLUE, border:`2px solid ${BLUE}`, flexShrink:0, display:'inline-block' }}/> },
                            { label:'Holiday / Weekend', swatch: <span style={{ width:12, height:12, borderRadius:3, background:RED, border:`1px solid ${RED}`, flexShrink:0, display:'inline-block' }}/> },
                        ].map(l => (
                            <div key={l.label} style={{ display:'flex', alignItems:'center', gap:5, fontSize:10, color:'#64748B' }}>
                                {l.swatch}
                                {l.label}
                            </div>
                        ))}
                    </div>

                    <div style={{ display:'flex', gap:16, justifyContent:'center', marginTop:8 }}>
                        <span style={{ fontSize:10, color:'#94A3B8' }}>
                            <span style={{ fontWeight:700, color:'#475569', fontSize:12 }}>{daysInBSMonth(cur.y, cur.m)}</span> days
                        </span>
                        <span style={{ fontSize:10, color:'#94A3B8' }}>
                            <span style={{ fontWeight:700, color:RED, fontSize:12 }}>{holidayCount}</span> holidays
                        </span>
                    </div>
                </div>

                <div className="white-card" style={{ padding:16, display:'flex', flexDirection:'column', minHeight:300 }}>
                    <AdminSidePanel
                        day={selectedDay}
                        bsMonth={bsMonth}
                        bsYear={cur.y}
                        onAdd={handleAdd}
                        onEdit={handleEdit}
                        onDelete={handleDelete}
                    />
                </div>
            </div>
            ) : (
            <div className="white-card" style={{ padding:0, marginBottom:24, overflow:'hidden' }}>
                {holidaysLoading ? (
                    <div style={{ padding:'44px 20px', textAlign:'center' }}>
                        <Loader size={20} style={{ color:'#94A3B8', animation:'to-spin 1s linear infinite' }}/>
                    </div>
                ) : upcomingHolidays.length === 0 ? (
                    <div style={{ padding:'44px 20px', textAlign:'center' }}>
                        <CalendarDays size={26} style={{ color:'#CBD5E1', margin:'0 auto 10px', display:'block' }}/>
                        <p style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'#0F172A', margin:'0 0 4px' }}>
                            No upcoming holidays
                        </p>
                        <p style={{ fontSize:12, color:'#94A3B8', margin:0 }}>
                            Holidays you add will show up here.
                        </p>
                    </div>
                ) : (
                    upcomingHolidays.map((h, i) => {
                        const typeInfo = HOLIDAY_TYPES.find(t => t.value === h.holiday_type)
                        const dateLabel = fmtDate(h.date)
                        return (
                            <div key={h.id}
                                style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 18px', borderTop: i === 0 ? 'none' : '1px solid var(--color-border)' }}>
                                <div style={{ flex:1, minWidth:0 }}>
                                    <p style={{ fontSize:13.5, fontWeight:700, color:'#0F172A', margin:'0 0 2px' }}>{h.title}</p>
                                    <p style={{ fontSize:11.5, color:'#94A3B8', margin:0 }}>
                                        {dateLabel}
                                        {typeInfo && <span style={{ marginLeft:8, fontWeight:600, color:BLUE }}>{typeInfo.label}</span>}
                                    </p>
                                </div>
                                <div style={{ display:'flex', gap:8, flexShrink:0 }}>
                                    <button onClick={() => handleEditHoliday(h)} aria-label={`Edit ${h.title}`}
                                        style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 10px', fontSize:12, fontWeight:600, background:BLUE_BG, color:BLUE, border:'none', borderRadius:8, cursor:'pointer' }}>
                                        <Pencil size={12}/> Edit
                                    </button>
                                    <button onClick={() => handleDeleteHoliday(h)} aria-label={`Delete ${h.title}`}
                                        style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 10px', fontSize:12, fontWeight:600, background:RED_BG, color:RED, border:'none', borderRadius:8, cursor:'pointer' }}>
                                        <Trash2 size={12}/> Delete
                                    </button>
                                </div>
                            </div>
                        )
                    })
                )}
            </div>
            )}

            {modalState && (
                <HolidayModal
                    initial={modalState.initial}
                    onClose={() => setModalState(null)}
                    onSaved={handleSaved}
                />
            )}

            {/* Delete confirmation modal — same pattern as CalendarPage.jsx */}
            {deleteTarget && (
                <div
                    onClick={() => !deleting && setDeleteTarget(null)}
                    style={{
                        position:'fixed', inset:0, background:'rgba(26,31,53,0.45)', backdropFilter:'blur(2px)',
                        display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000, padding:20,
                    }}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        className="white-card anim-fade-in"
                        style={{ width:'100%', maxWidth:400, padding:'26px 26px 22px', boxShadow:'0 12px 40px rgba(26,31,53,0.25)', position:'relative' }}
                    >
                        <button
                            onClick={() => !deleting && setDeleteTarget(null)}
                            disabled={deleting}
                            aria-label="Close"
                            style={{ position:'absolute', top:16, right:16, background:'none', border:'none', cursor: deleting ? 'default' : 'pointer', color:'#94A3B8' }}
                        >
                            <X size={16}/>
                        </button>
                        <div style={{ width:44, height:44, borderRadius:'50%', background:'#fbeceb', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14 }} aria-hidden="true">
                            <Trash2 size={19} style={{ color:'#c0392b' }}/>
                        </div>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#1a1f35', margin:'0 0 8px' }}>
                            Delete holiday?
                        </h3>
                        <p style={{ fontSize:13, color:'#7a7060', lineHeight:1.55, margin:'0 0 22px' }}>
                            Are you sure you want to delete <strong style={{ color:'#1a1f35' }}>"{deleteTarget.holidayTitle || 'this holiday'}"</strong> permanently?
                        </p>
                        <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                disabled={deleting}
                                className="btn-primary"
                                style={{ background:'#f0ece5', color:'#7a7060', cursor: deleting ? 'default' : 'pointer' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleting}
                                className="btn-primary"
                                style={{ background:'#c0392b', color:'#fff', cursor: deleting ? 'default' : 'pointer', opacity: deleting ? 0.75 : 1 }}
                            >
                                {deleting ? 'Deleting…' : 'Delete Holiday'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}