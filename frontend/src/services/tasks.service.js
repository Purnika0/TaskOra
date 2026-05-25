// src/services/tasks.service.js
// Wraps all /api/tasks/ endpoints.
//
// Key data shapes from backend:
//   Task {
//     id, student, assignment (nested), display_title, is_personal,
//     title, description, course, due_date, due_date_bs,
//     estimated_hours, priority (int 1-5), task_type,
//     is_completed, priority_score, completed_at, created_at,
//     subtasks: [ { id, title, is_completed, created_at } ]
//   }
//
// Personal task create/update fields:
//   { title, description, course?, due_date, estimated_hours, priority, task_type, is_completed }

import api from './api.js'

const tasksService = {
    // ── Student: fetch all tasks (assigned + personal) ───────
    async getMyTasks(type) {
        // type = 'personal' | 'assigned' | undefined (all)
        const params = type ? { type } : {}
        const { data } = await api.get('/api/tasks/my/', { params })
        return data
    },

    // Smart priority ordering (Cosine Similarity algorithm)
    async getSmartPriority() {
        const { data } = await api.get('/api/tasks/my/smart-priority/')
        return data
    },

    // Toggle complete/incomplete
    async toggleComplete(taskId, isCompleted) {
        const { data } = await api.patch(`/api/tasks/my/${taskId}/complete/`, {
            is_completed: isCompleted,
        })
        return data
    },

    // ── Personal tasks CRUD ──────────────────────────────────
    async createPersonalTask(taskData) {
        const { data } = await api.post('/api/tasks/my/personal/', taskData)
        return data
    },

    async updatePersonalTask(taskId, updates) {
        const { data } = await api.patch(`/api/tasks/my/personal/${taskId}/`, updates)
        return data
    },

    async deletePersonalTask(taskId) {
        await api.delete(`/api/tasks/my/personal/${taskId}/`)
    },

    // ── Subtasks ─────────────────────────────────────────────
    async getSubtasks(taskId) {
        const { data } = await api.get(`/api/tasks/my/${taskId}/subtasks/`)
        return data
    },

    async createSubtask(taskId, title) {
        const { data } = await api.post(`/api/tasks/my/${taskId}/subtasks/`, { title })
        return data
    },

    async updateSubtask(taskId, subtaskId, updates) {
        const { data } = await api.patch(
            `/api/tasks/my/${taskId}/subtasks/${subtaskId}/`,
            updates
        )
        return data
    },

    async deleteSubtask(taskId, subtaskId) {
        await api.delete(`/api/tasks/my/${taskId}/subtasks/${subtaskId}/`)
    },

    // ── Teacher: assignments ─────────────────────────────────
    async getAssignments() {
        const { data } = await api.get('/api/tasks/assignments/')
        return data
    },

    async createAssignment(assignmentData) {
        const { data } = await api.post('/api/tasks/assignments/', assignmentData)
        return data
    },

    async updateAssignment(id, updates) {
        const { data } = await api.patch(`/api/tasks/assignments/${id}/`, updates)
        return data
    },

    async deleteAssignment(id) {
        await api.delete(`/api/tasks/assignments/${id}/`)
    },

    // ── Teacher: student submissions ─────────────────────────
    // Called by SubmissionTracker in TeacherDashboard
    async getSubmissions(assignmentId) {
        const { data } = await api.get(`/api/tasks/assignments/${assignmentId}/submissions/`)
        return data
    },
}

export default tasksService