

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
}

export default contactService