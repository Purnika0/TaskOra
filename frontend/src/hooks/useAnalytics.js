// src/hooks/useAnalytics.js
// All analytics + ML data hooks.
// useApiData now exposes a `refetch` callback so pages can
// re-request data after user actions (e.g. completing tasks).

import { useState, useEffect, useCallback, useRef } from 'react'
import analyticsService from '../services/analytics.service.js'
import mlService        from '../services/ml.service.js'

// ── Core fetcher hook ─────────────────────────────────────────
// deps[] controls auto-refetch on prop change (e.g. courseId).
// refetch() lets the caller manually trigger a reload.
function useApiData(fetcher, deps = []) {
    const [data,    setData]    = useState(null)
    const [loading, setLoading] = useState(true)
    const [error,   setError]   = useState(null)
    const [tick,    setTick]    = useState(0)  // increment to force re-fetch

  // Stable fetch function
    const run = useCallback(() => {
    setLoading(true)
    fetcher()
        .then(d  => { setData(d);  setError(null) })
        .catch(e => {
        const msg = e?.response?.data?.detail
            || e?.response?.data?.error
            || e?.message
            || 'Failed to load data'
        setError(msg)
        })
        .finally(() => setLoading(false))
  // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    useEffect(() => { run() }, [run, tick])

    const refetch = useCallback(() => setTick(t => t + 1), [])

    return { data, loading, error, refetch }
}

// ── Student analytics ─────────────────────────────────────────
export function useStudentSummary()  { return useApiData(analyticsService.getTaskSummary) }
export function useWeeklyProgress()  { return useApiData(analyticsService.getWeeklyProgress) }
export function useCourseWorkload()  { return useApiData(analyticsService.getCourseWorkload) }

// ── Teacher analytics ─────────────────────────────────────────
export function useTaskProgress()    { return useApiData(analyticsService.getTaskProgress) }
export function useCourseOverview()  { return useApiData(analyticsService.getCourseOverview) }
export function useStudentRanking(courseId) {
    return useApiData(() => analyticsService.getStudentRanking(courseId), [courseId])
}

// ── ML hooks ─────────────────────────────────────────────────
// Collaborative Filtering — student-only
export function useRecommendations() { return useApiData(mlService.getRecommendations) }

// K-Means Clustering — teacher-only
export function useStudentGroups()   { return useApiData(mlService.getStudentGroups) }

// Isolation Forest — teacher-only
export function useOutliers()        { return useApiData(mlService.getOutliers) }
