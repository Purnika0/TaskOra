// Read-only analytics endpoints consumed by the Student and Teacher
// dashboards. All responses are pre-aggregated by the backend.

import api from './api.js'

const analyticsService = {
  // Student endpoints
    async getTaskSummary() {
        const { data } = await api.get('/api/analytics/student/task-summary/')
        return data   // { total, completed, pending, completion_rate }
    },

    async getWeeklyProgress() {
        const { data } = await api.get('/api/analytics/student/weekly-progress/')
        return data   // [{ date, completed }, ...]  (last 7 days)
    },

    async getCourseWorkload() {
        const { data } = await api.get('/api/analytics/student/course-workload/')
        return data   // [{ course, total, completed, pending }, ...]
    },

    // Teacher endpoints
    async getTaskProgress() {
        const { data } = await api.get('/api/analytics/teacher/task-progress/')
        return data   // [{ assignment, course, due_date, total_students, completed, pending, completion_rate }]
    },

    async getCourseOverview() {
        const { data } = await api.get('/api/analytics/teacher/course-overview/')
        return data
    },

    async getStudentRanking(courseId) {
        const params = courseId ? { course_id: courseId } : {}
        const { data } = await api.get('/api/analytics/teacher/student-ranking/', { params })
        return data   // [{ student, completed, total, completion_rate }]
    },
}

export default analyticsService