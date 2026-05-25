    // src/hooks/useTasks.js
    // Manages task state with real API calls.
    // Provides loading and error states for every operation.
    // Uses optimistic updates for toggleComplete to keep UI snappy.

    import { useState, useEffect, useCallback } from 'react'
    import tasksService from '../services/tasks.service.js'
    import { priorityToLevel, isOverdue } from '../utils/helpers.js'

    export function useTasks(type) {
    const [tasks,   setTasks]   = useState([])
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState(null)

    const fetchTasks = useCallback(async () => {
        try {
        setLoading(true)
        setError(null)
        const data = await tasksService.getMyTasks(type)
        setTasks(data)
        } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load tasks')
        } finally {
        setLoading(false)
        }
    }, [type])

    useEffect(() => { fetchTasks() }, [fetchTasks])

    // Toggle complete with optimistic update
    const toggleComplete = useCallback(async (taskId, currentState) => {
        const newState = !currentState
        // Optimistic update
        setTasks(prev => prev.map(t =>
        t.id === taskId ? { ...t, is_completed: newState } : t
        ))
        try {
        const updated = await tasksService.toggleComplete(taskId, newState)
        setTasks(prev => prev.map(t => t.id === taskId ? { ...t, ...updated } : t))
        } catch {
        // Roll back
        setTasks(prev => prev.map(t =>
            t.id === taskId ? { ...t, is_completed: currentState } : t
        ))
        throw new Error('Failed to update task')
        }
    }, [])

    const addTask = useCallback(async (taskData) => {
        const created = await tasksService.createPersonalTask(taskData)
        setTasks(prev => [created, ...prev])
        return created
    }, [])

    const updateTask = useCallback(async (taskId, updates) => {
        const updated = await tasksService.updatePersonalTask(taskId, updates)
        setTasks(prev => prev.map(t => t.id === taskId ? updated : t))
        return updated
    }, [])

    const deleteTask = useCallback(async (taskId) => {
        await tasksService.deletePersonalTask(taskId)
        setTasks(prev => prev.filter(t => t.id !== taskId))
    }, [])

    // Compute stats
    const stats = {
        total:      tasks.length,
        completed:  tasks.filter(t => t.is_completed).length,
        pending:    tasks.filter(t => !t.is_completed).length,
        overdue:    tasks.filter(t => isOverdue(t)).length,
        progress:   tasks.length
        ? Math.round(tasks.filter(t => t.is_completed).length / tasks.length * 100)
        : 0,
    }

    return {
        tasks,
        loading,
        error,
        stats,
        refetch: fetchTasks,
        toggleComplete,
        addTask,
        updateTask,
        deleteTask,
    }
    }

    // Separate hook for smart-priority task list (recommendations widget)
    export function useSmartPriority() {
    const [tasks,   setTasks]   = useState([])
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState(null)

    useEffect(() => {
        tasksService.getSmartPriority()
        .then(setTasks)
        .catch(err => setError(err.response?.data?.detail || 'Failed to load'))
        .finally(() => setLoading(false))
    }, [])

    return { tasks, loading, error }
    }
