// src/components/tasks/TaskItem.jsx
// Dual-mode renderer.
//   compact=false → rich card  (card view in TaskManagement)
//   compact=true  → <tr> row  (table view in TaskManagement)
//
// In compact/table mode the row is expandable: clicking the subtask badge
// opens an inline <tr> below showing SubtaskPanel — no card-view required.
// Returns a React.Fragment (two <tr> elements) when compact=true so the
// table body handles it correctly.

import React, { useState, useRef, useEffect } from 'react'
import { Edit3, Trash2, ChevronDown, ChevronUp, ListTodo } from 'lucide-react'
import SubtaskPanel from './SubtaskPanel.jsx'
import {
    getTaskTitle, getTaskDueDate, priorityColor, priorityLabel,
    deadlinePill, statusBadge, isOverdue,
} from '../../utils/helpers.js'

export default function TaskItem({ task, onToggle, onDelete, onEdit, index, compact = false }) {
    const [confirmDel,   setConfirmDel]   = useState(false)
    const [showSubtasks, setShowSubtasks] = useState(false)
    const delTimer = useRef(null)

    useEffect(() => () => clearTimeout(delTimer.current), [])

    const done     = task.is_completed
    const overdue  = isOverdue(task)
    const pill     = deadlinePill(task)
    const title    = getTaskTitle(task)
    const dueDate  = getTaskDueDate(task)
    const pColor   = priorityColor(task.priority)
    const pLabel   = priorityLabel(task.priority)
    const badge    = statusBadge(done)
    const subtasks = task.subtasks || []
    const subsDone = subtasks.filter(s => s.is_completed).length

    function handleDelete() {
        if (confirmDel) {
        clearTimeout(delTimer.current)
        onDelete(task.id)
        } else {
        setConfirmDel(true)
        delTimer.current = setTimeout(() => setConfirmDel(false), 2500)
        }
    }

    // ── Compact table row ──────────────────────────────────────
    if (compact) {
        return (
        <>
            <tr className="group hover:bg-[#faf8f5] transition-colors" style={{ borderBottom: showSubtasks ? 'none' : undefined }}>
            <td className="pl-4 text-[#b0a898] text-xs font-semibold w-8">{index + 1}.</td>
            <td className="py-3 pr-2">
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input
                    type="checkbox" checked={done}
                    onChange={() => onToggle(task.id, done)}
                    aria-label={`Mark "${title}" as ${done ? 'incomplete' : 'complete'}`}
                    style={{ width:14, height:14, cursor:'pointer', accentColor:'#1a1f35', flexShrink:0 }}
                />
                <div style={{ minWidth:0 }}>
                    <p style={{
                    fontSize:13, fontWeight:500, lineHeight:1.35, margin:0,
                    color: done ? '#b0a898' : overdue ? '#e05252' : '#1a1f35',
                    textDecoration: done ? 'line-through' : 'none',
                    fontFamily:'var(--font-display)',
                    }}>
                    {title}
                    </p>
                    {/* Subtask count badge — click to expand */}
                    <button
                    type="button"
                    onClick={() => setShowSubtasks(v => !v)}
                    aria-label={`${showSubtasks ? 'Hide' : 'Show'} subtasks for "${title}"`}
                    style={{
                        display:'inline-flex', alignItems:'center', gap:4, marginTop:3,
                        fontSize:10, fontWeight:600, padding:'2px 7px', borderRadius:6,
                        border:'1.5px solid', cursor:'pointer', transition:'all 0.13s',
                        fontFamily:'var(--font-body)',
                        borderColor: showSubtasks ? '#3b6fd4' : '#e2dbd0',
                        background:  showSubtasks ? '#e8eeff' : '#f5f2ed',
                        color:       showSubtasks ? '#3b6fd4' : '#8a7e6e',
                    }}
                    >
                    <ListTodo size={9}/>
                    {subtasks.length > 0
                        ? <>{subsDone}/{subtasks.length} {showSubtasks ? <ChevronUp size={9}/> : <ChevronDown size={9}/>}</>
                        : <>Subtasks {showSubtasks ? <ChevronUp size={9}/> : <ChevronDown size={9}/>}</>
                    }
                    </button>
                </div>
                </div>
            </td>
            <td className="pr-3">
                <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                <span style={{ width:7, height:7, borderRadius:'50%', background:pColor, flexShrink:0 }}/>
                <span style={{ fontSize:11, fontWeight:700, color:pColor, textTransform:'capitalize' }}>{pLabel}</span>
                </div>
            </td>
            <td className="pr-3" style={{ fontSize:12, color:'#8a7e6e', whiteSpace:'nowrap' }}>{dueDate || '—'}</td>
            <td>
                <span style={{
                display:'inline-flex', fontSize:10, fontWeight:700, padding:'2px 7px', borderRadius:99,
                }} className={pill.cls}>
                {pill.label}
                </span>
            </td>
            <td className="pr-4" style={{ width:64 }}>
                <div style={{ display:'flex', alignItems:'center', gap:3 }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                {task.is_personal !== false && (
                    <button
                    onClick={() => onEdit(task)}
                    aria-label={`Edit "${title}"`} title="Edit"
                    style={{ width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center', color:'#b0a898', background:'none', border:'none', cursor:'pointer', transition:'all 0.13s' }}
                    onMouseEnter={e=>{ e.currentTarget.style.background='#e8eeff'; e.currentTarget.style.color='#3b6fd4' }}
                    onMouseLeave={e=>{ e.currentTarget.style.background='none'; e.currentTarget.style.color='#b0a898' }}
                    >
                    <Edit3 size={11}/>
                    </button>
                )}
                {task.is_personal !== false && (
                    <button
                    onClick={handleDelete}
                    title={confirmDel ? 'Click again to confirm' : 'Delete'}
                    aria-label={confirmDel ? 'Confirm deletion' : `Delete "${title}"`}
                    style={{
                        width:26, height:26, borderRadius:6, display:'flex', alignItems:'center', justifyContent:'center',
                        cursor:'pointer', border:'none', transition:'all 0.13s',
                        background: confirmDel ? '#fee2e2' : 'none',
                        color:      confirmDel ? '#dc2626' : '#b0a898',
                    }}
                    onMouseEnter={e=>{ if (!confirmDel){ e.currentTarget.style.background='#fee2e2'; e.currentTarget.style.color='#ef4444' } }}
                    onMouseLeave={e=>{ if (!confirmDel){ e.currentTarget.style.background='none'; e.currentTarget.style.color='#b0a898' } }}
                    >
                    <Trash2 size={11}/>
                    </button>
                )}
                </div>
            </td>
            </tr>

            {/* ── Inline subtask expansion row ── */}
            {showSubtasks && (
            <tr>
                <td colSpan={6} style={{ padding:'0 20px 14px 52px', background:'#fafaf8', borderBottom:'1px solid #f0ece4' }}>
                <SubtaskPanel taskId={task.id} initialSubtasks={subtasks}/>
                </td>
            </tr>
            )}
        </>
        )
    }

    // ── Card mode ──────────────────────────────────────────────
    return (
        <div className={`bg-white border rounded-xl p-4 transition-all duration-200 hover:shadow-md group ${
        overdue && !done
            ? 'border-l-4 border-l-[#e05252] border-t-[#e0d9ce] border-r-[#e0d9ce] border-b-[#e0d9ce]'
            : 'border-[#e0d9ce] hover:border-[#1a1f35]/20'
        }`}>
        <div className="flex items-start gap-3">
            <input
            type="checkbox" checked={done}
            onChange={() => onToggle(task.id, done)}
            aria-label={`Mark "${title}" as ${done ? 'incomplete' : 'complete'}`}
            className="mt-0.5 w-4 h-4 rounded accent-[#1a1f35] cursor-pointer shrink-0"
            />

            <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
                <p className={`text-sm font-semibold font-display leading-snug ${
                done ? 'line-through text-[#b0a898]' : 'text-[#1a1f35]'
                }`}>
                {title}
                </p>
                {task.is_personal !== false && (
                <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                    onClick={() => onEdit(task)}
                    aria-label={`Edit "${title}"`}
                    className="w-6 h-6 rounded flex items-center justify-center text-[#b0a898] hover:bg-[#e8eeff] hover:text-[#3b6fd4] transition-colors"
                    >
                    <Edit3 size={11}/>
                    </button>
                    <button
                    onClick={handleDelete}
                    className={`w-6 h-6 rounded flex items-center justify-center transition-colors ${
                        confirmDel ? 'bg-red-100 text-red-600' : 'text-[#b0a898] hover:bg-red-50 hover:text-red-500'
                    }`}
                    title={confirmDel ? 'Click again to confirm' : 'Delete'}
                    aria-label={confirmDel ? 'Confirm deletion' : `Delete "${title}"`}
                    >
                    <Trash2 size={11}/>
                    </button>
                </div>
                )}
            </div>

            {task.description && (
                <p className="mt-0.5 text-xs text-[#b0a898] line-clamp-2">{task.description}</p>
            )}

            {/* Subtask toggle */}
            {subtasks.length > 0 ? (
                <button
                onClick={() => setShowSubtasks(v => !v)}
                className="flex items-center gap-1 mt-1.5 text-[10px] text-[#8a7e6e] hover:text-[#1a1f35] transition-colors"
                >
                {showSubtasks ? <ChevronUp size={11}/> : <ChevronDown size={11}/>}
                {subsDone}/{subtasks.length} subtask{subtasks.length !== 1 ? 's' : ''}
                </button>
            ) : (
                !showSubtasks && (
                <button
                    onClick={() => setShowSubtasks(true)}
                    className="flex items-center gap-1 mt-1.5 text-[10px] text-[#b0a898] hover:text-[#3b6fd4] transition-colors"
                >
                    <ChevronDown size={11}/>
                    Add subtask
                </button>
                )
            )}

            {showSubtasks && (
                <SubtaskPanel taskId={task.id} initialSubtasks={subtasks}/>
            )}

            {/* Meta pills */}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
                <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background:pColor }}/>
                <span className="text-[10px] font-bold capitalize" style={{ color:pColor }}>{pLabel}</span>
                </span>
                <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${badge.cls}`}>
                {badge.label}
                </span>
                {task.task_type && (
                <span className="text-[10px] text-[#b0a898] bg-[#f5f0e8] px-1.5 py-0.5 rounded-full capitalize">
                    {task.task_type}
                </span>
                )}
                {overdue && !done && (
                <span className="text-[10px] font-bold text-red-500">Overdue</span>
                )}
                <span className={`ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${pill.cls}`}>
                {pill.label}
                </span>
            </div>
            </div>
        </div>
        </div>
    )
}
