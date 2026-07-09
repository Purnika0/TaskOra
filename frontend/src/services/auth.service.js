import api, { setTokens, clearTokens, TOKEN_KEYS } from './api.js'

const authService = {
    async register({ username, full_name, email, password, role }) {
        const { data } = await api.post('/api/users/register/', { username, full_name, email, password, role })
        return data
    },

    // Accept username OR email — detect by presence of "@"
    // portalRole: 'student' | 'teacher' — the login tab the user selected.
    //   Omit (or pass undefined) to skip portal enforcement (e.g. session restore).
    async login({ credential, password, portalRole }) {
        const cred = credential.trim()
        const isEmail = cred.includes('@')
        const payload = isEmail
            ? { email: cred, password }
            : { username: cred, password }

        let tokens
        try {
            const res = await api.post('/api/users/login/', payload)
            tokens = res.data
        } catch (err) {
            const data = err.response?.data
            const rawCode = data?.code
            const codeVal = Array.isArray(rawCode) ? rawCode[0] : rawCode
            if (codeVal === 'email_not_verified') {
                const detail = data.detail
                const msg = Array.isArray(detail) ? detail[0] : detail
                const vErr = new Error(msg || 'Please verify your email before logging in.')
                vErr.code = 'EMAIL_NOT_VERIFIED'
                // Backend returns the account's real email — always accurate, unlike
                // guessing from what was typed (which is unknown if they logged in
                // with their username instead of their email).
                const rawEmail = data?.email
                const emailVal = Array.isArray(rawEmail) ? rawEmail[0] : rawEmail
                vErr.email = emailVal || (isEmail ? cred : undefined)
                throw vErr
            }
            throw err
        }

        setTokens(tokens)
        const { data: user } = await api.get('/api/users/me/')

        // ── Strict portal-role gate ──────────────────────────────────────────────
        // Only enforced when portalRole is supplied (i.e. during an interactive login).
        // Session restore (getMe) does NOT pass portalRole, so it skips this gate.
        if (portalRole) {
            const backendRole = user.role

            const isAllowed =
                portalRole === 'student'
                    ? backendRole === 'student'
                    : portalRole === 'teacher'
                        ? backendRole === 'teacher' || backendRole === 'admin'
                        : true

            if (!isAllowed) {
                clearTokens()
                const err = new Error('Unauthorized login for this portal')
                err.code = 'ROLE_MISMATCH'
                throw err
            }
        }
        // ─────────────────────────────────────────────────────────────────────────

        sessionStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user))
        return user
    },

    async getMe() {
        const { data } = await api.get('/api/users/me/')
        return data
    },

    async updateMe({ full_name, email, username }) {
        const { data } = await api.patch('/api/users/me/', { full_name, email, username })
        return data
    },

    logout() { clearTokens() },

    getStoredUser() {
        try {
            const s = sessionStorage.getItem(TOKEN_KEYS.user)
            return s ? JSON.parse(s) : null
        } catch { return null }
    },

    saveUser(user) { sessionStorage.setItem(TOKEN_KEYS.user, JSON.stringify(user)) },

    // ── Email verification ──────────────────────────────────────────────────
    async verifyEmail(email, otp_code) {
        const { data } = await api.post('/api/users/verify-email/', { email, otp_code })
        return data
    },

    async resendOtp(email, purpose) {
        // purpose: 'email_verification' | 'password_reset'
        const { data } = await api.post('/api/users/resend-otp/', { email, purpose })
        return data
    },

    // ── Password change (authenticated, current-password based — teacher/admin only) ──
    async changePassword(current_password, new_password) {
        const { data } = await api.post('/api/users/change-password/', { current_password, new_password })
        return data
    },
    // ── Password reset (OTP-based) ──────────────────────────────────────────
    async requestPasswordReset(email) {
        const { data } = await api.post('/api/users/forgot-password/', { email })
        return data
    },

    async verifyResetOtp(email, otp_code) {
        const { data } = await api.post('/api/users/verify-otp/', { email, otp_code })
        return data
    },

    async resetPassword(email, otp_code, new_password) {
        const { data } = await api.post('/api/users/reset-password/', { email, otp_code, new_password })
        return data
    },

    // Admin
    async listUsers(role) {
        const params = role ? { role } : {}
        const { data } = await api.get('/api/users/', { params })
        return data
    },

    async getUserById(id) {
        const { data } = await api.get(`/api/users/${id}/`)
        return data
    },

    async updateUser(id, updates) {
        const { data } = await api.patch(`/api/users/${id}/`, updates)
        return data
    },

    async deleteUser(id) { await api.delete(`/api/users/${id}/`) },

    async promoteUser(id, role) {
        const { data } = await api.patch(`/api/users/${id}/promote/`, { role })
        return data
    },

    async createTeacher({ username, full_name, email, password }) {
        const { data } = await api.post('/api/users/create-teacher/', { username, full_name, email, password })
        return data
    },
}

export default authService