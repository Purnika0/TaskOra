import api from './api.js'

const contactService = {
    async submit({ name, email, subject, message }) {
        const { data } = await api.post('/api/contact/', {
            full_name: name,
            email,
            subject,
            message,
        })
        return data
    },

    // Admin only — list all submitted contact messages
    async listMessages() {
        const { data } = await api.get('/api/contact/messages/')
        return data
    },

    // Admin only — fetch a single message's full detail
    async getMessage(id) {
        const { data } = await api.get(`/api/contact/messages/${id}/`)
        return data
    },

    // Admin only — update a message's status ('READ' | 'RESOLVED')
    async updateStatus(id, status) {
        const { data } = await api.patch(`/api/contact/messages/${id}/`, { status })
        return data
    },

    // Admin only — delete a message
    async remove(id) {
        await api.delete(`/api/contact/messages/${id}/`)
    },
}

export default contactService