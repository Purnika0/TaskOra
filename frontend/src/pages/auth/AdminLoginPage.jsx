// src/pages/auth/AdminLoginPage.jsx
//
// Dedicated Admin Portal login screen.
//
// This is intentionally NOT linked from the Navbar, Sidebar, Footer, the
// public AuthPage's role tabs, or anywhere else in the UI. It is only
// reachable by knowing the route (see routes/AppRoutes.jsx: "/portal-admin").
//
// It reuses the exact same visual design as the public login screen
// (auth.css classes: auth-root / login-card / auth-input-wrap / auth-btn /
// auth-icon-badge, etc.) so it is indistinguishable in styling from the rest
// of the auth flow — only the route and the absence of any role tabs,
// signup link, or "forgot password" link differ.
//
// Auth flow: identical JWT login endpoint as Student/Teacher
// (authService.login), but submitted with portalRole: 'admin'. The backend
// role returned by /api/users/me/ must be 'admin' or the request is rejected
// with ROLE_MISMATCH — a Teacher or Student account (or anyone who stumbles
// onto this URL) cannot authenticate here, no matter the credentials.

import { useState, useRef, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { User, Lock, Eye, EyeOff, ArrowRight, AlertTriangle } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'
import { Spinner } from '../../components/shared/Loader.jsx'

const MAX_ATTEMPTS = 3
const LOCK_SECS    = 30

function Field({ id, label, iconL, showEye, eyeOpen, onEye, error, ...props }) {
    return (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
            {label && (
                <label htmlFor={id} style={{ fontSize:12, fontWeight:600, color:'var(--color-text)', marginBottom:5, fontFamily:'var(--font-body)', letterSpacing:'0.01em' }}>
                    {label}
                </label>
            )}
            <div className="auth-input-wrap">
                {iconL && <span className="auth-input-icon" aria-hidden="true">{iconL}</span>}
                <input id={id} className={`auth-input${error ? ' auth-input-error' : ''}`}
                    aria-invalid={!!error} aria-describedby={error ? `${id}-err` : undefined} {...props}/>
                {showEye && (
                    <button type="button" className="auth-input-right" onClick={onEye}
                        aria-label={eyeOpen ? 'Hide password' : 'Show password'}>
                        {eyeOpen ? <EyeOff size={14}/> : <Eye size={14}/>}
                    </button>
                )}
            </div>
            {error && (
                <p id={`${id}-err`} className="field-error" role="alert">
                    <AlertTriangle size={10} aria-hidden="true" style={{ flexShrink:0 }}/>{error}
                </p>
            )}
        </div>
    )
}

function ErrBanner({ msg }) {
    if (!msg) return null
    return (
        <div className="error-banner" role="alert">
            <AlertTriangle size={13} style={{ color:'#dc2626', flexShrink:0, marginTop:1 }}/>
            {msg}
        </div>
    )
}

function LockBar({ timer }) {
    return (
        <div className="lock-banner" role="alert">
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
                <AlertTriangle size={12} style={{ color:'#d97706' }}/>
                Too many failed attempts · Try again in {timer}s
            </div>
            <div style={{ height:4, background:'#fde68a', borderRadius:99, overflow:'hidden' }}>
                <div style={{ height:'100%', background:'#f59e0b', borderRadius:99, width:`${(timer/LOCK_SECS)*100}%`, transition:'width 1s linear' }}/>
            </div>
        </div>
    )
}

export default function AdminLoginPage() {
    const { login } = useAuth()

    const [cred,       setCred]       = useState('')
    const [pw,         setPw]         = useState('')
    const [showPw,     setShowPw]     = useState(false)
    const [errors,     setErrors]     = useState({})
    const [submitting, setSubmitting] = useState(false)

    const [attempts, setAttempts] = useState(0)
    const [locked,   setLocked]   = useState(false)
    const [timer,    setTimer]    = useState(0)
    const lockRef = useRef(null)
    useEffect(() => () => clearInterval(lockRef.current), [])

    function startLock() {
        setLocked(true); let t = LOCK_SECS; setTimer(t)
        lockRef.current = setInterval(() => {
            t -= 1; setTimer(t)
            if (t <= 0) { clearInterval(lockRef.current); setLocked(false); setAttempts(0); setTimer(0) }
        }, 1000)
    }

    function getApiError(err) {
        if (!err) return 'Something went wrong'
        const d = err.response?.data
        if (!d) return err.message || 'Cannot reach server'
        if (typeof d === 'string') return d
        if (d.detail) return Array.isArray(d.detail) ? d.detail[0] : d.detail
        const vals = Object.values(d).flat()
        return vals.length ? String(vals[0]) : 'Something went wrong'
    }

    function validate() {
        const e = {}
        if (!cred.trim()) e.cred = 'Username or email is required'
        if (!pw)          e.pw   = 'Password is required'
        setErrors(e); return !Object.keys(e).length
    }

    async function handleSubmit(evt) {
        evt.preventDefault()
        if (locked || submitting || !validate()) return
        setErrors({}); setSubmitting(true)
        try {
            await login({ credential: cred, password: pw, portalRole: 'admin' })
        } catch (err) {
            if (err.code === 'ROLE_MISMATCH') {
                setErrors({ form: 'Unauthorized login for this portal' }); return
            }
            const next = attempts + 1; setAttempts(next)
            if (next >= MAX_ATTEMPTS) { startLock(); return }
            setErrors({ form: `Invalid credentials — ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} remaining` })
        } finally { setSubmitting(false) }
    }

    return (
        <div className="auth-root">
            <div className="login-card">
                <Link to="/" className="auth-logo-wrap" aria-label="Go to home page">
                    <img src="/logo.png" alt="TaskOra logo" width={48} height={48} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </Link>

                <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--color-text)', fontSize:22, textAlign:'center', margin:'0 0 6px', letterSpacing:'-0.02em' }}>
                    Admin Portal
                </h1>
                <p style={{ fontSize:14, color:'var(--color-text-secondary)', textAlign:'center', marginBottom:22, lineHeight:1.5 }}>
                    Sign in with your administrator account
                </p>

                {locked ? (
                    <LockBar timer={timer}/>
                ) : (
                    <form onSubmit={handleSubmit} noValidate style={{ display:'flex', flexDirection:'column', gap:10 }}>
                        <Field id="ac" type="text" placeholder="Username or Email" autoComplete="username"
                            value={cred} onChange={e => setCred(e.target.value)} required
                            iconL={<User size={14}/>} error={errors.cred}/>
                        <Field id="apw" placeholder="Password" autoComplete="current-password"
                            type={showPw ? 'text' : 'password'}
                            value={pw} onChange={e => setPw(e.target.value)} required
                            iconL={<Lock size={14}/>} showEye eyeOpen={showPw} onEye={() => setShowPw(s => !s)}
                            error={errors.pw}/>
                        {errors.form && <ErrBanner msg={errors.form}/>}
                        <button type="submit" disabled={submitting} className="auth-btn auth-btn-navy" style={{ marginTop:4 }}>
                            {submitting ? <Spinner size={16} color="white"/> : <><ArrowRight size={14}/> Sign In</>}
                        </button>
                    </form>
                )}
            </div>
        </div>
    )
}