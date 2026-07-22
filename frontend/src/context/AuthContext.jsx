// Auth state + session lifecycle for the whole app.
//
// `loading` stays true for the full duration of both session restore (on
// mount) and login() — RoleRedirect/ProtectedRoute render <PageLoader/>
// while it's true, so no component ever mounts with a null or stale
// user.role. This is what makes the "wrong dashboard flashes briefly"
// class of bug impossible.
//
// `portalRole` ('student' | 'teacher' | 'admin') is forwarded to
// authService.login() so the backend can reject a login attempted from
// the wrong portal (throws { code: 'ROLE_MISMATCH' }, which AuthPage
// displays as "Unauthorized login for this portal"). 'admin' only ever
// comes from the separate, unlisted AdminLoginPage — never the public
// login screen or any nav/menu.

import { createContext, useState, useEffect, useCallback, useRef } from 'react'
import authService from '../services/auth.service.js'
import { getAccessToken, clearTokens } from '../services/api.js'

export const AuthContext = createContext(null)

export function AuthProvider({ children }) {
    const [user,    setUser]    = useState(null)
    const [loading, setLoading] = useState(true)   // true until first auth check completes
    const verifying = useRef(false)

    // ── Session restore on mount ──────────────────────────────────────────
    useEffect(() => {
        if (verifying.current) return
        verifying.current = true

        const stored = authService.getStoredUser()   // sync, uses cached role
        const token  = getAccessToken()

        if (stored && token) {
            setUser(stored)                             // instant optimistic restore
            authService.getMe()                         // async verify — no portalRole gate
                .then(fresh => {
                    authService.saveUser(fresh)
                    setUser(fresh)                          // overwrite with server-confirmed role
                })
                .catch(() => {
                    clearTokens()
                    setUser(null)                           // token invalid — force re-login
                })
                .finally(() => setLoading(false))
        } else {
            clearTokens()
            setLoading(false)
        }
    }, [])

    // ── Listen for logout events dispatched by api.js's 401 interceptor ────
    useEffect(() => {
        function handleForceLogout() {
            setUser(null)
        }
        window.addEventListener('taskora:logout', handleForceLogout)
        return () => window.removeEventListener('taskora:logout', handleForceLogout)
    }, [])

    // ── login ────────────────────────────────────────────────────────────
    const login = useCallback(async ({ credential, password, portalRole }) => {
        setLoading(true)
        try {
            const freshUser = await authService.login({ credential, password, portalRole })
            setUser(freshUser)                          // role is fully resolved + gated
            return freshUser
            // Errors (including ROLE_MISMATCH) propagate automatically to the caller
            // so AuthPage can handle them — no catch needed here.
        } finally {
            setLoading(false)                           // always unblock, even on error
        }
    }, [])

    // ── logout ───────────────────────────────────────────────────────────
    const logout = useCallback(() => {
        authService.logout()
        setUser(null)
    }, [])

    // ── refreshUser — called by SettingsPage after profile update ──────────
    const refreshUser = useCallback(async () => {
        const fresh = await authService.getMe()       // no portalRole gate on refresh
        authService.saveUser(fresh)
        setUser(fresh)
        return fresh
    }, [])

    return (
        <AuthContext.Provider value={{ user, loading, login, logout, refreshUser }}>
            {children}
        </AuthContext.Provider>
    )
}