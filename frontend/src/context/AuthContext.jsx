    // src/context/AuthContext.jsx
    //
    // ── loading=true GUARANTEES ───────────────────────────────────────────────────
    //
    //  loading stays true for the ENTIRE duration of:
    //   • login() call (login form submit → authService.login() → portal-role gate)
    //   • session restore (mount → getMe() → resolveRole probe)
    //
    //  Both RoleRedirect and ProtectedRoute render <PageLoader /> while loading=true.
    //  This means NO component ever mounts with a null or stale user.role — the
    //  StudentDashboard-for-admin flash is impossible.
    //
    // ── Session restore flow ──────────────────────────────────────────────────────
    //  1. Mount: read stored user (sync, instant) → setUser optimistically
    //  2. Verify with server: getMe() (async — NO portalRole gate during restore)
    //  3. Update user with fresh + fully-resolved role
    //  4. setLoading(false) → RoleRedirect fires with correct role
    //
    // ── Login flow ────────────────────────────────────────────────────────────────
    //  1. setLoading(true) — blocks all route rendering
    //  2. authService.login({ credential, password, portalRole }) →
    //       POST /login → GET /me → portal-role gate (ROLE_MISMATCH throws)
    //  3. On success: setUser(freshUser) with confirmed role
    //  4. setLoading(false) — RoleRedirect fires → navigates to correct dashboard
    //
    // ── RBAC portal gate ─────────────────────────────────────────────────────────
    //  portalRole is forwarded straight to authService.login().
    //  If the backend role doesn't match the tab the user selected, authService
    //  throws { code: 'ROLE_MISMATCH' }. AuthContext re-throws it so AuthPage
    //  can display "Unauthorized login for this portal".
    // ─────────────────────────────────────────────────────────────────────────────

    import React, { createContext, useState, useEffect, useCallback, useRef } from 'react'
    import authService from '../services/auth.service.js'
    import { getAccessToken, clearTokens } from '../services/api.js'

    export const AuthContext = createContext(null)

    export function AuthProvider({ children }) {
    const [user,    setUser]    = useState(null)
    const [loading, setLoading] = useState(true)   // true until FIRST auth check done
    const verifying = useRef(false)

    // ── Session restore on mount ──────────────────────────────────────────────
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

    // ── Listen for logout events dispatched by api.js 401 interceptor ─────────
    useEffect(() => {
        function handleForceLogout() {
        setUser(null)
        }
        window.addEventListener('taskora:logout', handleForceLogout)
        return () => window.removeEventListener('taskora:logout', handleForceLogout)
    }, [])

    // ── login ─────────────────────────────────────────────────────────────────
    // portalRole: 'student' | 'teacher' — the tab selected on the login screen.
    //   Forwarded to authService.login() for strict portal-role enforcement.
    //   If the backend role doesn't match the portal, authService throws
    //   { code: 'ROLE_MISMATCH' } and we re-throw so AuthPage can show the
    //   red "Unauthorized login for this portal" banner.
    //
    // setLoading(true) BEFORE the async work so RoleRedirect and ProtectedRoute
    // see loading=true and render <PageLoader /> — zero wrong-dashboard flash.
    const login = useCallback(async ({ credential, password, portalRole }) => {
        setLoading(true)
        try {
        const freshUser = await authService.login({ credential, password, portalRole })
        setUser(freshUser)                          // role is fully resolved + gated
        return freshUser
        } catch (err) {
        // Re-throw ALL errors (including ROLE_MISMATCH) so AuthPage can handle them.
        throw err
        } finally {
        setLoading(false)                           // always unblock, even on error
        }
    }, [])

    // ── logout ────────────────────────────────────────────────────────────────
    const logout = useCallback(() => {
        authService.logout()
        setUser(null)
    }, [])

    // ── refreshUser — called by SettingsPage after profile update ─────────────
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