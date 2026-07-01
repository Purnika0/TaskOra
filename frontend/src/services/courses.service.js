// src/services/courses.service.js
// UPDATED per backend integration guide:
//   GET  /api/courses/             → list enrolled courses (student) or owned courses (teacher)
//   POST /api/courses/join/        → student joins a course with enrollment_code
//   POST /api/courses/             → teacher creates a course
//   DELETE /api/courses/<id>/      → admin or teacher deletes a course

import api from './api.js'

const coursesService = {
    // List courses for current user (enrolled for students, owned for teachers, all for admin)
    async list() {
        const { data } = await api.get('/api/courses/')
        return data
    },

    // GET single course
    async get(id) {
        const { data } = await api.get(`/api/courses/${id}/`)
        return data
    },

    // Student: join a course by enrollment code
    async join(enrollmentCode) {
        const { data } = await api.post('/api/courses/join/', { enrollment_code: enrollmentCode })
        return data
    },

    // Teacher: create a new course
    async create(payload) {
        // payload: { name, description?, subject? }
        const { data } = await api.post('/api/courses/', payload)
        return data
    },

    // Teacher / Admin: update course
    async update(id, updates) {
        const { data } = await api.patch(`/api/courses/${id}/`, updates)
        return data
    },

    // Teacher / Admin: delete course
    async remove(id) {
        await api.delete(`/api/courses/${id}/`)
    },

    // Get enrollment code for a course (teacher only)
    async getEnrollmentCode(id) {
        const { data } = await api.get(`/api/courses/${id}/enrollment-code/`)
        return data
    },
}

export default coursesService
