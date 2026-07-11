// src/hooks/useTasks.js
// Fetches and manages the current student's assigned tasks. Task status is
// a 5-state string: pending | submitted | completed | rejected | overdue.

import { useState, useEffect, useCallback } from 'react'
import tasksService from '../services/tasks.service.js'

// ── Status helpers ─────────────────────────────────────────────────────────
export function isCompleted(task)  { return task.status === 'completed'  }
export function isPending(task)    { return task.status === 'pending'    }
export function isSubmitted(task)  { return task.status === 'submitted'  }
export function isOverdue(task)    { return task.status === 'overdue'    }
export function isRejected(task)   { return task.status === 'rejected'   }
export function isActionable(task) { return task.status === 'pending' || task.status === 'overdue' || task.status === 'rejected' }

export function statusLabel(task) {
    switch (task.status) {
        case 'completed': return 'Completed'
        case 'submitted': return 'Submitted'
        case 'rejected':  return 'Rejected'
        case 'overdue':   return 'Overdue'
        default:          return 'Pending'
    }
}

export function statusColor(task) {
    switch (task.status) {
        case 'completed': return '#3cb87a'
        case 'submitted': return '#3b6fd4'
        case 'rejected':  return '#e05252'
        case 'overdue':   return '#e05252'
        default:          return '#d4a93c'
    }
}

export function statusBg(task) {
    switch (task.status) {
        case 'completed': return '#e0f7ee'
        case 'submitted': return '#eff3fd'
        case 'rejected':  return '#fde8e8'
        case 'overdue':   return '#fde8e8'
        default:          return '#fff8e6'
    }
}

// ── Main hook ──────────────────────────────────────────────────────────────
export function useTasks() {
    const [tasks,   setTasks]   = useState([])
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState(null)

    const fetchTasks = useCallback(async () => {
        try {
            setLoading(true)
            setError(null)
            const data = await tasksService.getMyTasks()
            setTasks(Array.isArray(data) ? data : [])
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load assignments')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => { fetchTasks() }, [fetchTasks])

    // Student submits an assignment
    const submitAssignment = useCallback(async (taskId, formData) => {
        const updated = await tasksService.submitAssignment(taskId, formData)
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
        return updated
    }, [])

    // Compute 5-state stats
    const stats = {
        total:     tasks.length,
        completed: tasks.filter(isCompleted).length,
        submitted: tasks.filter(isSubmitted).length,
        pending:   tasks.filter(isPending).length,
        overdue:   tasks.filter(isOverdue).length,
        rejected:  tasks.filter(isRejected).length,
        progress:  tasks.length
            ? Math.round(tasks.filter(isCompleted).length / tasks.length * 100)
            : 0,
    }

    return {
        tasks,
        loading,
        error,
        stats,
        refetch: fetchTasks,
        submitAssignment,
        // setTasks exposed for optimistic UI updates
        setTasks,
    }
}
