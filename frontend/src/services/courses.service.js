// src/services/courses.service.js
import api from './api.js'

const coursesService = {
    async list()               { const { data } = await api.get('/api/courses/'); return data },
    async getMyCourses()       { const { data } = await api.get('/api/courses/my/'); return data },
    async getById(id)          { const { data } = await api.get(`/api/courses/${id}/`); return data },
    async create(payload)      { const { data } = await api.post('/api/courses/', payload); return data },
    async update(id, payload)  { const { data } = await api.patch(`/api/courses/${id}/`, payload); return data },
    async remove(id)           { await api.delete(`/api/courses/${id}/`) },
    async join(join_code)      { const { data } = await api.post('/api/courses/join/', { join_code }); return data },
    async getStudents(id)      { const { data } = await api.get(`/api/courses/${id}/students/`); return data },
}

export default coursesService
