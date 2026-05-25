    // src/services/auth.service.js
    // Supports login with EITHER username OR email.
    // Detects @ in the credential and sends the right field.
    //
    // ── RBAC Portal Enforcement ─────────────────────────────────────────────────
    //  portalRole = the tab the user clicked on the login screen ('student' | 'teacher')
    //
    //  Student tab  → ONLY backend role 'student' is allowed
    //  Teacher tab  → backend role 'teacher' OR 'admin' is allowed
    //                 (admin credentials entered in the Teacher tab redirect to /app/admin)
    //
    //  Any mismatch: tokens are immediately cleared and a ROLE_MISMATCH error is thrown.
    //  The caller (AuthContext → AuthPage) catches it and shows the red error banner.
    // ─────────────────────────────────────────────────────────────────────────────

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

        const { data: tokens } = await api.post('/api/users/login/', payload)
        setTokens(tokens)
        const { data: user } = await api.get('/api/users/me/')

        // ── Strict portal-role gate ──────────────────────────────────────────────
        // Only enforced when portalRole is supplied (i.e. during an interactive login).
        // Session restore (getMe) does NOT pass portalRole, so it skips this gate.
        if (portalRole) {
        const backendRole = user.role

        // Student portal: ONLY 'student' accounts are permitted.
        // Teacher/Admin accounts must be rejected — admin NEVER opens from Student tab.
        const isAllowed =
            portalRole === 'student'
            ? backendRole === 'student'
            // Teacher portal: 'teacher' accounts login normally.
            // 'admin' accounts are also allowed here and are redirected to /app/admin.
            : portalRole === 'teacher'
            ? backendRole === 'teacher' || backendRole === 'admin'
            : true  // unknown portalRole — let through (future-proof)

        if (!isAllowed) {
            // Immediately invalidate the tokens — the session must not persist.
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

    // Password reset — backend: POST /api/users/password-reset/
    async requestPasswordReset(email) {
        const { data } = await api.post('/api/users/password-reset/', { email })
        return data
    },

    // Password reset confirm — backend: POST /api/users/password-reset/confirm/
    async confirmPasswordReset(token, new_password) {
        const { data } = await api.post('/api/users/password-reset/confirm/', { token, new_password })
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
    }

    export default authService