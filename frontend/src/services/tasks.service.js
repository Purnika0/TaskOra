// Assignment/task lifecycle for students, teachers, and admins.
// Tasks have no separate "personal task" or subtask concept — every task is
// tied to a teacher-created assignment. Status is one of:
//   'pending' | 'submitted' | 'completed' | 'overdue'

import api from './api.js'

const tasksService = {

    // Student: fetch all assigned tasks.
    // status is one of: 'pending' | 'submitted' | 'completed' | 'overdue'
    async getMyTasks() {
        const { data } = await api.get('/api/tasks/my/')
        return data
    },

    // ── Student: submit assignment ───────────────────────────────────────────
    // PATCH /api/tasks/<id>/submit/
    // Body: multipart/form-data — at least one of submission_file or submission_text required
    async submitAssignment(taskId, formData) {
        const { data } = await api.patch(`/api/tasks/${taskId}/submit/`, formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
        })
        return data
    },

    // ── Teacher: view all submissions for an assignment ─────────────────────
    // GET /api/tasks/assignment/<assignment_id>/submissions/
    // Optional filter: ?status=submitted
    async getSubmissions(assignmentId, statusFilter) {
        const params = statusFilter ? { status: statusFilter } : {}
        const { data } = await api.get(
            `/api/tasks/assignment/${assignmentId}/submissions/`,
            { params }
        )
        return data
    },

    // Teacher: mark a submitted task as completed.
    // PATCH /api/tasks/<task_id>/review/  — body: { teacher_feedback?: string }
    // action: 'approve' | 'reject'
    async reviewSubmission(taskId, action, feedback = '') {
        const { data } = await api.patch(`/api/tasks/${taskId}/review/`, {
            teacher_feedback: feedback,
            action,
        })
        return data
    },

    // ── Teacher: assignments CRUD ────────────────────────────────────────────
    async getAssignments() {
        const { data } = await api.get('/api/tasks/assignments/')
        return data
    },

    // Used by the submissions review page header.
    async getAssignment(id) {
        const { data } = await api.get(`/api/tasks/assignments/${id}/`)
        return data
    },

    async createAssignment(payload) {
        // payload may be FormData (has file) or plain object
        const isForm = payload instanceof FormData
        const { data } = await api.post('/api/tasks/assignments/', payload, {
            headers: isForm ? { 'Content-Type': 'multipart/form-data' } : {},
        })
        return data
    },

    async updateAssignment(id, updates) {
        const { data } = await api.patch(`/api/tasks/assignments/${id}/`, updates)
        return data
    },

    async deleteAssignment(id) {
        await api.delete(`/api/tasks/assignments/${id}/`)
    },

    // ── Teacher: cross-course submissions inbox ─────────────────────────────
    // GET /api/tasks/teacher/submissions/
    // filters: { status?, course_id?, assignment_id?, search? }
    async getTeacherSubmissionsInbox(filters = {}) {
        const { data } = await api.get('/api/tasks/teacher/submissions/', { params: filters })
        return data
    },

    // ── Admin: mark all past-due pending tasks as overdue ───────────────────
    async markOverdue() {
        const { data } = await api.post('/api/tasks/mark-overdue/')
        return data
    },
}

export default tasksService