// Central Axios instance for all backend requests.

// Token strategy:
//   access  → sessionStorage (60-min lifetime, cleared on tab close)
//   refresh → localStorage   (1-day lifetime, persists across tabs)

// The request interceptor attaches the access token to every call.
// The response interceptor catches 401s, silently refreshes the
// access token using the refresh endpoint, and retries the original
// request once. If the refresh also fails, the user is logged out.

import axios from 'axios'

const BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000'

export const TOKEN_KEYS = {
    access:  'taskora_access',
    refresh: 'taskora_refresh',
    user:    'taskora_user',
}

// ── Token helpers ────────────────────────────────────────────
export function getAccessToken()  { return sessionStorage.getItem(TOKEN_KEYS.access) }
export function getRefreshToken() { return localStorage.getItem(TOKEN_KEYS.refresh) }

export function setTokens({ access, refresh }) {
    if (access)  sessionStorage.setItem(TOKEN_KEYS.access, access)
    if (refresh) localStorage.setItem(TOKEN_KEYS.refresh, refresh)
}

export function clearTokens() {
    sessionStorage.removeItem(TOKEN_KEYS.access)
    localStorage.removeItem(TOKEN_KEYS.refresh)
    sessionStorage.removeItem(TOKEN_KEYS.user)
}

// ── Axios instance ───────────────────────────────────────────
const api = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
})

// Attach access token to every outgoing request
api.interceptors.request.use(config => {
    const token = getAccessToken()
    if (token) config.headers.Authorization = `Bearer ${token}`
    return config
})

// Handle 401 — try to refresh, then retry once
let isRefreshing = false
let waitQueue = [] // requests waiting while refresh is in progress

// Resolves or rejects every request that queued up while a refresh was
// already in flight, so they don't all trigger their own refresh calls.
function processQueue(error, token = null) {
    waitQueue.forEach(({ resolve, reject }) =>
    error ? reject(error) : resolve(token)
    )
    waitQueue = []
}

api.interceptors.response.use(
    res => res,
    async err => {
    const original = err.config

    // Not a 401 or already retried → bubble up
    if (err.response?.status !== 401 || original._retry) {
        return Promise.reject(err)
    }

    // No refresh token available — session can't be restored, log out.
    const refresh = getRefreshToken()
    if (!refresh) {
        clearTokens()
        window.dispatchEvent(new Event('taskora:logout'))
        return Promise.reject(err)
    }

    if (isRefreshing) {
      // Queue this request until the refresh completes
        return new Promise((resolve, reject) => {
        waitQueue.push({ resolve, reject })
        }).then(newToken => {
        original.headers.Authorization = `Bearer ${newToken}`
        return api(original)
        })
    }

    // First request to hit the 401 — perform the actual refresh call,
    // update the stored access token, then replay the original request.
    original._retry = true
    isRefreshing = true

    try {
        const { data } = await axios.post(`${BASE_URL}/api/users/token/refresh/`, { refresh })
        setTokens({ access: data.access })
        processQueue(null, data.access)
        original.headers.Authorization = `Bearer ${data.access}`
        return api(original)
    } catch (refreshErr) {
        processQueue(refreshErr, null)
        clearTokens()
        window.dispatchEvent(new Event('taskora:logout'))
        return Promise.reject(refreshErr)
    } finally {
        isRefreshing = false
    }
    }
)

export default api