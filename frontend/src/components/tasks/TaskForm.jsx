// src/components/tasks/TaskForm.jsx
// Polished modal form — minimal, professional, human-designed.
// Responsive: 2-column grid collapses to 1 column on mobile.
// Compatible with React 16–19 via useStableId.

import React, { useState, useEffect } from 'react'
import { X, Loader2 } from 'lucide-react'
import useStableId from '../../utils/useStableId.js'
import { apiError } from '../../utils/helpers.js'

const TASK_TYPES = ['assignment','exam','project','homework','quiz','personal','other']

const DEFAULTS = {
    title: '', description: '', priority: 3,
    task_type: 'personal', due_date: '', estimated_hours: 1.0,
}

const PRIORITY_OPTIONS = [
    { value: 5, label: 'High (5)' },
    { value: 4, label: 'High (4)' },
    { value: 3, label: 'Medium (3)' },
    { value: 2, label: 'Low (2)' },
    { value: 1, label: 'Low (1)' },
]

export default function TaskForm({ task, onSave, onClose }) {
    const isEdit = Boolean(task?.id)
    const uid    = useStableId('tf')

    const [form,   setForm]   = useState(() =>
        isEdit
        ? { ...DEFAULTS, ...task, priority: task.priority ?? 3, due_date: task.due_date || '' }
        : { ...DEFAULTS }
    )
    const [errors, setErrors] = useState({})
    const [saving, setSaving] = useState(false)
    const [apiErr, setApiErr] = useState('')

    // Lock body scroll while modal is open
    useEffect(() => {
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [])

    function set(k, v) {
        setForm(p => ({ ...p, [k]: v }))
        if (errors[k]) setErrors(p => ({ ...p, [k]: '' }))
        if (apiErr) setApiErr('')
    }

    function validate() {
        const e = {}
        if (!form.title.trim()) e.title    = 'Title is required'
        if (!form.due_date)     e.due_date = 'Due date is required'
        if (Number(form.estimated_hours) < 0.1) e.estimated_hours = 'Minimum 0.1h'
        return e
    }

    async function submit(e) {
        e.preventDefault()
        const errs = validate()
        if (Object.keys(errs).length) { setErrors(errs); return }
        setSaving(true)
        try {
        await onSave({
            ...form,
            title: form.title.trim(),
            priority: parseInt(form.priority, 10),
            estimated_hours: parseFloat(form.estimated_hours),
        })
        onClose()
        } catch (err) {
        setApiErr(apiError(err))
        } finally {
        setSaving(false)
        }
    }

    // Base input style
    const inputBase = {
        width: '100%', boxSizing: 'border-box',
        border: '1.5px solid #e0d9ce', borderRadius: 9,
        padding: '10px 12px', fontSize: 13, fontFamily: 'var(--font-body)',
        background: '#faf8f5', color: '#1a1f35', outline: 'none',
        transition: 'border-color 0.15s, box-shadow 0.15s, background 0.15s',
        lineHeight: 1.5,
    }

    function inputStyle(field) {
        if (errors[field]) return {
        ...inputBase,
        borderColor: '#dc2626',
        background: '#fff',
        boxShadow: '0 0 0 3px rgba(220,38,38,0.07)',
        }
        return inputBase
    }

    function Label({ htmlFor, children, required }) {
        return (
        <label htmlFor={htmlFor} style={{ display:'block', fontSize:12, fontWeight:600, color:'#3a3020', marginBottom:5, fontFamily:'var(--font-body)', letterSpacing:'0.01em' }}>
            {children}
            {required && <span style={{ color:'#dc2626', marginLeft:2 }} aria-hidden="true">*</span>}
        </label>
        )
    }

    function FieldError({ msg }) {
        if (!msg) return null
        return <p role="alert" style={{ fontSize:11, color:'#dc2626', marginTop:4, lineHeight:1.4 }}>{msg}</p>
    }

    // Focus styles (applied via onFocus/onBlur since CSS pseudo-classes need class toggling)
        function makeFocusHandlers(field) {
            return {
            onFocus: e => {
                if (!errors[field]) {
                e.target.style.borderColor = '#1a1f35'
                e.target.style.background  = '#fff'
                e.target.style.boxShadow   = '0 0 0 3px rgba(26,31,53,0.07)'
                }
            },
            onBlur: e => {
                if (!errors[field]) {
                e.target.style.borderColor = '#e0d9ce'
                e.target.style.background  = '#faf8f5'
                e.target.style.boxShadow   = 'none'
                }
            },
            }
    }

    return (
        <div
        role="dialog" aria-modal="true" aria-label={isEdit ? 'Edit task' : 'New task'}
        style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.38)', backdropFilter:'blur(3px)', zIndex:50, display:'flex', alignItems:'flex-end', justifyContent:'center', padding:'0' }}
        onClick={e => e.target === e.currentTarget && onClose()}
        >
        <style>{`
            @media (min-width: 560px) {
            .tf-modal { max-width: 500px !important; border-radius: 16px !important; margin: auto !important; }
            .tf-dialog { align-items: center !important; padding: 16px !important; }
            }
            @media (max-width: 480px) {
            .tf-grid2 { grid-template-columns: 1fr !important; }
            }
        `}</style>

        <div className="tf-dialog" style={{ display:'contents' }}>
            <div className="tf-modal"
            style={{ background:'#fff', width:'100%', borderRadius:'16px 16px 0 0', overflow:'hidden', boxShadow:'0 -4px 40px rgba(0,0,0,0.18)', animation:'to-slideUp 0.28s cubic-bezier(0.22,1,0.36,1) both', maxHeight:'92vh', display:'flex', flexDirection:'column' }}>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', borderBottom:'1px solid #f0ece4', flexShrink:0 }}>
                <div>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#1a1f35', margin:0, letterSpacing:'-0.01em' }}>
                    {isEdit ? 'Edit Task' : 'Add New Task'}
                </h2>
                <p style={{ fontSize:11, color:'#b0a898', margin:0, marginTop:1 }}>
                    {isEdit ? 'Update your task details' : 'Fill in the details to create a task'}
                </p>
                </div>
                <button onClick={onClose} aria-label="Close"
                style={{ width:30, height:30, borderRadius:8, background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:'#b0a898', transition:'all 0.12s' }}
                onMouseEnter={e => { e.currentTarget.style.background='#f5f0e8'; e.currentTarget.style.color='#1a1f35' }}
                onMouseLeave={e => { e.currentTarget.style.background='none'; e.currentTarget.style.color='#b0a898' }}
                >
                <X size={14}/>
                </button>
            </div>

            {/* Scrollable body */}
            <form onSubmit={submit} noValidate style={{ display:'flex', flexDirection:'column', flex:1, overflow:'hidden' }}>
                <div style={{ padding:'18px 20px', overflow:'auto', display:'flex', flexDirection:'column', gap:14 }}>

                {apiErr && (
                    <div role="alert" style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:8, padding:'10px 12px', fontSize:12, color:'#b91c1c', lineHeight:1.5 }}>
                    {apiErr}
                    </div>
                )}

                {/* Title */}
                <div>
                    <Label htmlFor={`${uid}-title`} required>Task Title</Label>
                    <input
                    id={`${uid}-title`} type="text" value={form.title}
                    onChange={e => set('title', e.target.value)} maxLength={255}
                    placeholder="e.g. Complete React assignment"
                    style={inputStyle('title')}
                    {...makeFocusHandlers('title')}
                    />
                    <FieldError msg={errors.title}/>
                </div>

                {/* Description */}
                <div>
                    <Label htmlFor={`${uid}-desc`}>Description</Label>
                    <textarea
                    id={`${uid}-desc`} value={form.description}
                    onChange={e => set('description', e.target.value)}
                    rows={3} maxLength={1000} placeholder="Add notes or context…"
                    style={{ ...inputStyle('description'), resize:'vertical' }}
                    {...makeFocusHandlers('description')}
                    />
                </div>

                {/* Priority + Type */}
                <div className="tf-grid2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                    <Label htmlFor={`${uid}-pri`}>Priority</Label>
                    <select id={`${uid}-pri`} value={form.priority} onChange={e => set('priority', e.target.value)}
                        style={{ ...inputStyle('priority'), appearance:'none', cursor:'pointer' }}
                        {...makeFocusHandlers('priority')}
                    >
                        {PRIORITY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                    </div>
                    <div>
                    <Label htmlFor={`${uid}-type`}>Task Type</Label>
                    <select id={`${uid}-type`} value={form.task_type} onChange={e => set('task_type', e.target.value)}
                        style={{ ...inputStyle('task_type'), appearance:'none', cursor:'pointer', textTransform:'capitalize' }}
                        {...makeFocusHandlers('task_type')}
                    >
                        {TASK_TYPES.map(t => <option key={t} value={t} style={{ textTransform:'capitalize' }}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
                    </select>
                    </div>
                </div>

                {/* Due date + Hours */}
                <div className="tf-grid2" style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
                    <div>
                    <Label htmlFor={`${uid}-due`} required>Due Date</Label>
                    <input id={`${uid}-due`} type="date" value={form.due_date}
                        onChange={e => set('due_date', e.target.value)}
                        style={inputStyle('due_date')}
                        {...makeFocusHandlers('due_date')}
                    />
                    <FieldError msg={errors.due_date}/>
                    </div>
                    <div>
                    <Label htmlFor={`${uid}-hrs`}>Est. Hours</Label>
                    <input id={`${uid}-hrs`} type="number" min="0.1" max="100" step="0.5"
                        value={form.estimated_hours} onChange={e => set('estimated_hours', e.target.value)}
                        style={inputStyle('estimated_hours')}
                        {...makeFocusHandlers('estimated_hours')}
                    />
                    <FieldError msg={errors.estimated_hours}/>
                    </div>
                </div>
                </div>

                {/* Footer actions */}
                <div style={{ display:'flex', justifyContent:'flex-end', gap:8, padding:'12px 20px', borderTop:'1px solid #f0ece4', background:'#faf8f5', flexShrink:0 }}>
                <button type="button" onClick={onClose}
                    style={{ padding:'9px 16px', fontSize:13, fontWeight:500, color:'#1a1f35', background:'#fff', border:'1.5px solid #e0d9ce', borderRadius:9, cursor:'pointer', fontFamily:'var(--font-body)', transition:'all 0.12s' }}
                    onMouseEnter={e => { e.currentTarget.style.background='#f5f0e8'; e.currentTarget.style.borderColor='#c8c0b2' }}
                    onMouseLeave={e => { e.currentTarget.style.background='#fff'; e.currentTarget.style.borderColor='#e0d9ce' }}
                >
                    Cancel
                </button>
                <button type="submit" disabled={saving}
                    style={{ padding:'9px 20px', fontSize:13, fontWeight:700, color:'#fff', background:'#1a1f35', border:'none', borderRadius:9, cursor:'pointer', fontFamily:'var(--font-display)', transition:'background 0.12s', letterSpacing:'-0.01em', display:'flex', alignItems:'center', gap:7, opacity: saving ? 0.65 : 1 }}
                    onMouseEnter={e => { if (!saving) e.currentTarget.style.background='#2e3655' }}
                    onMouseLeave={e => { e.currentTarget.style.background='#1a1f35' }}
                >
                    {saving && <Loader2 size={13} style={{ animation:'to-spin 0.75s linear infinite' }}/>}
                    {isEdit ? 'Save Changes' : 'Add Task'}
                </button>
                </div>
            </form>
            </div>
        </div>
        </div>
    )
    }
