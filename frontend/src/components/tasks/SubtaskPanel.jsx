// src/components/tasks/SubtaskPanel.jsx
// Clean inline subtask list: add, toggle, delete.
// Endpoints: /api/tasks/my/<taskId>/subtasks/  (GET/POST/PATCH/DELETE)

import React, { useState } from 'react'
import { Plus, Trash2, Loader2, CheckCircle2, Circle } from 'lucide-react'
import tasksService from '../../services/tasks.service.js'
import { useToast } from '../../context/ToastContext.jsx'

export default function SubtaskPanel({ taskId, initialSubtasks = [] }) {
    const toast = useToast()
    const [subtasks,   setSubtasks]   = useState(initialSubtasks)
    const [newTitle,   setNewTitle]   = useState('')
    const [adding,     setAdding]     = useState(false)
    const [loadingId,  setLoadingId]  = useState(null)

    const done  = subtasks.filter(s => s.is_completed).length
    const total = subtasks.length

    async function handleAdd(e) {
        e.preventDefault()
        const title = newTitle.trim()
        if (!title) return
        setAdding(true)
        try {
        const created = await tasksService.createSubtask(taskId, title)
        setSubtasks(prev => [...prev, created])
        setNewTitle('')
        } catch {
        toast.error('Failed to add subtask')
        } finally {
        setAdding(false)
        }
    }

    async function handleToggle(sub) {
        setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, is_completed: !sub.is_completed } : s))
        setLoadingId(sub.id)
        try {
        const updated = await tasksService.updateSubtask(taskId, sub.id, { is_completed: !sub.is_completed })
        setSubtasks(prev => prev.map(s => s.id === sub.id ? updated : s))
        } catch {
        setSubtasks(prev => prev.map(s => s.id === sub.id ? { ...s, is_completed: sub.is_completed } : s))
        toast.error('Failed to update subtask')
        } finally {
        setLoadingId(null)
        }
    }

    async function handleDelete(sub) {
        setLoadingId(sub.id)
        try {
        await tasksService.deleteSubtask(taskId, sub.id)
        setSubtasks(prev => prev.filter(s => s.id !== sub.id))
        } catch {
        toast.error('Failed to delete subtask')
        } finally {
        setLoadingId(null)
        }
    }

    return (
        <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid #f0ece4' }}>

        {/* Progress bar */}
        {total > 0 && (
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8 }}>
            <div style={{ flex:1, height:3, background:'#f0ece4', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'#3cb87a', borderRadius:99, width:`${Math.round(done/total*100)}%`, transition:'width 0.4s ease' }}/>
            </div>
            <span style={{ fontSize:10, color:'#b0a898', flexShrink:0, fontFamily:'var(--font-body)', fontWeight:600 }}>
                {done}/{total}
            </span>
            </div>
        )}

        {/* Subtask list */}
        {subtasks.length > 0 && (
            <div style={{ display:'flex', flexDirection:'column', gap:4, marginBottom:8 }}>
            {subtasks.map(s => (
                <div key={s.id} style={{ display:'flex', alignItems:'center', gap:8 }}
                className="group">
                <button
                    onClick={() => handleToggle(s)}
                    disabled={loadingId === s.id}
                    aria-label={`Mark "${s.title}" as ${s.is_completed ? 'incomplete' : 'complete'}`}
                    style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'center', flexShrink:0, color: s.is_completed ? '#3cb87a' : '#c8c0b2', transition:'color 0.13s' }}
                >
                    {loadingId === s.id
                    ? <Loader2 size={13} style={{ animation:'to-spin 0.75s linear infinite', color:'#b0a898' }}/>
                    : s.is_completed
                        ? <CheckCircle2 size={13}/>
                        : <Circle size={13}/>
                    }
                </button>
                <span style={{ flex:1, fontSize:12, lineHeight:1.4, color: s.is_completed ? '#b0a898' : '#4a4030', textDecoration: s.is_completed ? 'line-through' : 'none', fontFamily:'var(--font-body)' }}>
                    {s.title}
                </span>
                <button
                    onClick={() => handleDelete(s)}
                    disabled={loadingId === s.id}
                    aria-label={`Delete "${s.title}"`}
                    style={{ background:'none', border:'none', padding:0, cursor:'pointer', display:'flex', alignItems:'center', color:'#d0c8be', transition:'color 0.13s', flexShrink:0, opacity: loadingId === s.id ? 0.4 : 1 }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#e05252')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#d0c8be')}
                >
                    <Trash2 size={11}/>
                </button>
                </div>
            ))}
            </div>
        )}

        {/* Add subtask input */}
        <form onSubmit={handleAdd} style={{ display:'flex', gap:6, alignItems:'center' }}>
            <input
            type="text"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            placeholder="Add a subtask…"
            maxLength={255}
            style={{
                flex:1, fontSize:12, padding:'7px 10px',
                border:'1.5px solid #e0d9ce', borderRadius:8,
                background:'#faf8f5', color:'#1a1f35', outline:'none',
                fontFamily:'var(--font-body)', transition:'border-color 0.15s',
            }}
            onFocus={e  => (e.target.style.borderColor = '#1a1f35')}
            onBlur={e   => (e.target.style.borderColor = '#e0d9ce')}
            />
            <button
            type="submit"
            disabled={!newTitle.trim() || adding}
            aria-label="Add subtask"
            style={{
                display:'flex', alignItems:'center', justifyContent:'center',
                gap:4, padding:'7px 10px', borderRadius:8, border:'none',
                background: newTitle.trim() ? '#1a1f35' : '#e8e4de',
                color: newTitle.trim() ? '#fff' : '#b0a898',
                cursor: newTitle.trim() ? 'pointer' : 'not-allowed',
                fontSize:11, fontWeight:600, fontFamily:'var(--font-display)',
                transition:'all 0.13s', flexShrink:0, whiteSpace:'nowrap',
            }}
            >
            {adding
                ? <Loader2 size={11} style={{ animation:'to-spin 0.75s linear infinite' }}/>
                : <><Plus size={11}/> Add</>
            }
            </button>
        </form>
        </div>
    )
    }
