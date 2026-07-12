// src/services/courses.service.js
// UPDATED per backend integration guide:
//   GET  /api/courses/             → list enrolled courses (student) or owned courses (teacher)
//   POST /api/courses/join/        → student joins a course with enrollment_code
//   POST /api/courses/             → teacher creates a course
//   DELETE /api/courses/<id>/      → admin or teacher deletes a course
//   GET  /api/courses/<id>/students/ → teacher/admin: list of enrollments for a course

import api from './api.js'

const coursesService = {
    // List courses for current user (enrolled for students, owned for teachers, all for admin)
    async list() {
        const { data } = await api.get('/api/courses/')
        return data
    },

    // Student: list only enrolled courses
    async getMyCourses() {
        const { data } = await api.get('/api/courses/my/')
        return data
    },

    // GET single course
    async get(id) {
        const { data } = await api.get(`/api/courses/${id}/`)
        return data
    },

    // Student: join a course by enrollment code
    async join(joinCode) {
        const { data } = await api.post('/api/courses/join/', { join_code: joinCode })
        return data
    },

    // Teacher: create a new course
    async create(payload) {
        // payload: { title, description? } — dates are auto-stamped server-side, not user-set
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

    // Teacher: list of enrollments (students) for one of their courses
    // GET /api/courses/<id>/students/
    async getStudents(id) {
        const { data } = await api.get(`/api/courses/${id}/students/`)
        return data
    },

    // Student: leave (un-enroll from) a course themselves
    // DELETE /api/courses/<id>/leave/
    async leave(id) {
        await api.delete(`/api/courses/${id}/leave/`)
    },

    // Teacher / Admin: un-enroll a specific student from a course
    // DELETE /api/courses/<id>/students/<studentId>/
    async unenrollStudent(id, studentId) {
        await api.delete(`/api/courses/${id}/students/${studentId}/`)
    },
}

export default coursesService