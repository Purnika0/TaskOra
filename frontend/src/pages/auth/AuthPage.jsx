// src/pages/auth/AuthPage.jsx
// CHANGE: Teacher signup removed. Only Students can self-register.
// Teacher login tab remains — teachers log in with admin-provided credentials.
// The signup view now only shows the Student form (no role selector).
// CHANGE: AuthPage now also honors a ?view=signup / ?view=login URL param,
// so links from other pages (About, Landing, etc.) can open directly to
// the right form instead of always landing on Login.
// CHANGE: Password reset converted from token-link based to OTP-code based,
// matching the backend's forgot-password / verify-otp / reset-password flow.
// CHANGE: Added email verification flow — new signups must enter a 6-digit
// OTP before they can log in. Login also redirects here if the backend
// reports the account as unverified.

import React, { useState, useRef, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import {
    User, Lock, Mail, Eye, EyeOff,
    GraduationCap, BookOpen, ArrowRight,
    AlertTriangle, RotateCcw, CheckCircle2, KeyRound, MailCheck,
} from 'lucide-react'
import { useAuth }    from '../../hooks/useAuth.js'
import authService    from '../../services/auth.service.js'
import { Spinner }    from '../../components/shared/Loader.jsx'

const MAX_ATTEMPTS  = 3
const LOCK_SECS     = 30
const RESEND_COOLDOWN = 30 // seconds, client-side only — backend allows 5/hour
const isEmailRe     = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

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

// Shared header used by every non-login auth view (forgot / verify-otp /
// reset / verify-email / success screens): icon badge + heading + subtext.
// Purely presentational — takes no state, so it's safe to hoist to module
// scope (matches the audit's fix for Label/FieldError in TaskForm.jsx).
function AuthStatusHeader({ icon, tone = 'primary', title, subtitle }) {
    return (
        <>
            <div className={`auth-icon-badge auth-icon-badge-${tone}`} aria-hidden="true">
                {icon}
            </div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'var(--color-text)', textAlign:'center', margin:'0 0 8px', letterSpacing:'-0.02em' }}>
                {title}
            </h2>
            {subtitle && (
                <p style={{ fontSize:13, color:'var(--color-text-secondary)', textAlign:'center', marginBottom:22, lineHeight:1.6 }}>
                    {subtitle}
                </p>
            )}
        </>
    )
}

export default function AuthPage({ initialView }) {
    const { login }      = useAuth()
    const [searchParams] = useSearchParams()
    const urlView        = searchParams.get('view') || ''

    const [view, setView] = useState(() => {
        if (initialView) return initialView
        if (urlView === 'signup') return 'signup'
        if (urlView === 'login')  return 'login'
        return 'login'
    })

    const [loginRole,  setLoginRole]  = useState('student')
    const [submitting, setSubmitting] = useState(false)

    const [attempts, setAttempts] = useState(0)
    const [locked,   setLocked]   = useState(false)
    const [timer,    setTimer]    = useState(0)
    const lockRef = useRef(null)
    useEffect(() => () => clearInterval(lockRef.current), [])

    const [loginCred,   setLoginCred]   = useState('')
    const [loginPw,     setLoginPw]     = useState('')
    const [showLoginPw, setShowLoginPw] = useState(false)
    const [loginErrors, setLoginErrors] = useState({})

    // Signup — student only, no role selector
    const [regName,     setRegName]     = useState('')
    const [regUser,     setRegUser]     = useState('')
    const [regEmail,    setRegEmail]    = useState('')
    const [regPw,       setRegPw]       = useState('')
    const [regConf,     setRegConf]     = useState('')
    const [showRegPw,   setShowRegPw]   = useState(false)
    const [showRegConf, setShowRegConf] = useState(false)
    const [regErrors,   setRegErrors]   = useState({})
    const [agreeTerms,  setAgreeTerms]  = useState(false)

    // Email verification (post-signup, or when login is blocked)
    const [verifyEmail,   setVerifyEmail]   = useState('')
    const [verifyCode,    setVerifyCode]    = useState('')
    const [verifyErrors,  setVerifyErrors]  = useState({})
    const [resendCooldown, setResendCooldown] = useState(0)
    const resendRef = useRef(null)
    useEffect(() => () => clearInterval(resendRef.current), [])

    // Forgot / reset (OTP-based)
    const [forgotEmail,   setForgotEmail]   = useState('')
    const [forgotErrors,  setForgotErrors]  = useState({})
    const [resetOtp,      setResetOtp]      = useState('')
    const [resetOtpErrors, setResetOtpErrors] = useState({})
    const [resetPw,       setResetPw]       = useState('')
    const [resetConf,     setResetConf]     = useState('')
    const [showResetPw,   setShowResetPw]   = useState(false)
    const [showResetConf, setShowResetConf] = useState(false)
    const [resetErrors,   setResetErrors]   = useState({})
    const [resetDone,     setResetDone]     = useState(false)

    function reset(v) {
        clearInterval(lockRef.current)
        clearInterval(resendRef.current)
        setView(v); setAttempts(0); setLocked(false); setTimer(0)
        setLoginCred(''); setLoginPw(''); setLoginErrors({})
        setRegName(''); setRegUser(''); setRegEmail(''); setRegPw(''); setRegConf('')
        setRegErrors({}); setAgreeTerms(false)
        setVerifyEmail(''); setVerifyCode(''); setVerifyErrors({}); setResendCooldown(0)
        setForgotEmail(''); setForgotErrors({})
        setResetOtp(''); setResetOtpErrors({})
        setResetPw(''); setResetConf(''); setResetErrors({}); setResetDone(false)
        setShowLoginPw(false); setShowRegPw(false); setShowRegConf(false)
        setShowResetPw(false); setShowResetConf(false)
    }

    function startLock() {
        setLocked(true); let t = LOCK_SECS; setTimer(t)
        lockRef.current = setInterval(() => {
            t -= 1; setTimer(t)
            if (t <= 0) { clearInterval(lockRef.current); setLocked(false); setAttempts(0); setTimer(0) }
        }, 1000)
    }

    function startResendCooldown() {
        let t = RESEND_COOLDOWN; setResendCooldown(t)
        resendRef.current = setInterval(() => {
            t -= 1; setResendCooldown(t)
            if (t <= 0) clearInterval(resendRef.current)
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

    // ── LOGIN ────────────────────────────────────────────────────────────────
    function validateLogin() {
        const e = {}
        if (!loginCred.trim()) e.cred = 'Username or email is required'
        if (!loginPw)          e.pw   = 'Password is required'
        setLoginErrors(e); return !Object.keys(e).length
    }

    async function handleLogin(evt) {
        evt.preventDefault()
        if (locked || submitting || !validateLogin()) return
        setLoginErrors({}); setSubmitting(true)
        try {
            await login({ credential: loginCred, password: loginPw, portalRole: loginRole })
        } catch (err) {
            if (err.code === 'ROLE_MISMATCH') {
                setLoginErrors({ form: 'Unauthorized login for this portal' }); return
            }
            if (err.code === 'EMAIL_NOT_VERIFIED') {
                // Prefill email if we know it (they logged in with an email address)
                setVerifyEmail(err.email || (loginCred.includes('@') ? loginCred : ''))
                setView('verify')
                return
            }
            const next = attempts + 1; setAttempts(next)
            if (next >= MAX_ATTEMPTS) { startLock(); return }
            setLoginErrors({ form: `Invalid credentials — ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} remaining` })
        } finally { setSubmitting(false) }
    }

    // ── SIGNUP ───────────────────────────────────────────────────────────────
    function validateSignup() {
        const e = {}
        if (!regName.trim())                        e.name  = 'Please enter your full name.'
        if (!regUser.trim())                        e.user  = 'Please enter your username.'
        else if (regUser.length < 3)               e.user  ='Username must be at least 3 characters.'
        else if (!/^[a-zA-Z0-9_.]+$/.test(regUser)) e.user  = 'Username can only contain letters, numbers,dot,and underscores.'
        if (!regEmail.trim())                       e.email = 'Please enter your email address.'
        else if (!isEmailRe(regEmail))              e.email = 'Please enter a valid email address'
        if (!regPw)                                 e.pw    = 'Please enter your password.'
        else if (regPw.length < 8)                 e.pw    = 'Password must be at least 8 characters.'
        if (!regConf)                               e.conf  = 'Please confirm your password'
        else if (regPw !== regConf)                 e.conf  = 'Passwords do not match. Please try again.'
        if (!agreeTerms)                            e.agree = 'Please accept the Terms and Conditions to continue.'
        setRegErrors(e); return !Object.keys(e).length
    }

    async function handleSignup(evt) {
        evt.preventDefault()
        if (submitting || !validateSignup()) return
        setRegErrors({}); setSubmitting(true)
        try {
            await authService.register({
                username: regUser.trim(), full_name: regName.trim(),
                email: regEmail.trim(), password: regPw, role: 'student',
            })
            // New accounts must verify their email before they can log in —
            // don't attempt auto-login here.
            setVerifyEmail(regEmail.trim())
            setView('verify')
        } catch (err) {
            const msg = getApiError(err).toLowerCase()
            const e = {}
            if (msg.includes('username'))   e.user  = 'Username already exists'
            else if (msg.includes('email')) e.email = 'Email already registered'
            else                            e.form  = getApiError(err)
            setRegErrors(e)
        } finally { setSubmitting(false) }
    }

    // ── VERIFY EMAIL ─────────────────────────────────────────────────────────
    function validateVerify() {
        const e = {}
        if (!verifyEmail.trim())       e.email = 'Email is required'
        else if (!isEmailRe(verifyEmail)) e.email = 'Enter a valid email address'
        if (!verifyCode.trim())        e.code = 'Enter the 6-digit code'
        else if (verifyCode.trim().length !== 6) e.code = 'Code must be 6 digits'
        setVerifyErrors(e); return !Object.keys(e).length
    }

    async function handleVerifyEmail(evt) {
        evt.preventDefault()
        if (submitting || !validateVerify()) return
        setVerifyErrors({}); setSubmitting(true)
        try {
            await authService.verifyEmail(verifyEmail.trim(), verifyCode.trim())
            setView('verified')
        } catch (err) {
            setVerifyErrors({ form: getApiError(err) })
        } finally { setSubmitting(false) }
    }

    async function handleResendVerify() {
        if (resendCooldown > 0 || submitting) return
        if (!verifyEmail.trim() || !isEmailRe(verifyEmail)) {
            setVerifyErrors({ email: 'Enter a valid email to resend the code' }); return
        }
        setVerifyErrors({}); setSubmitting(true)
        try {
            await authService.resendOtp(verifyEmail.trim(), 'email_verification')
            startResendCooldown()
        } catch (err) {
            setVerifyErrors({ form: getApiError(err) })
        } finally { setSubmitting(false) }
    }

    // ── FORGOT PASSWORD ──────────────────────────────────────────────────────
    async function handleForgot(evt) {
        evt.preventDefault()
        if (submitting) return
        if (!forgotEmail.trim())    { setForgotErrors({ email:'Email is required' }); return }
        if (!isEmailRe(forgotEmail)){ setForgotErrors({ email:'Enter a valid email address' }); return }
        setForgotErrors({}); setSubmitting(true)
        try {
            await authService.requestPasswordReset(forgotEmail.trim())
            startResendCooldown()
            setView('resetOtp')
        } catch (err) {
            // Backend intentionally responds generically even for unknown emails,
            // so this branch should rarely fire except for network/server errors.
            setForgotErrors({ form: getApiError(err) })
        } finally { setSubmitting(false) }
    }

    async function handleResendReset() {
        if (resendCooldown > 0 || submitting) return
        setResetOtpErrors({}); setSubmitting(true)
        try {
            await authService.resendOtp(forgotEmail.trim(), 'password_reset')
            startResendCooldown()
        } catch (err) {
            setResetOtpErrors({ form: getApiError(err) })
        } finally { setSubmitting(false) }
    }

    // ── VERIFY RESET OTP ─────────────────────────────────────────────────────
    function validateResetOtp() {
        const e = {}
        if (!resetOtp.trim())               e.code = 'Enter the 6-digit code'
        else if (resetOtp.trim().length !== 6) e.code = 'Code must be 6 digits'
        setResetOtpErrors(e); return !Object.keys(e).length
    }

    async function handleVerifyResetOtp(evt) {
        evt.preventDefault()
        if (submitting || !validateResetOtp()) return
        setResetOtpErrors({}); setSubmitting(true)
        try {
            await authService.verifyResetOtp(forgotEmail.trim(), resetOtp.trim())
            setView('reset')
        } catch (err) {
            setResetOtpErrors({ form: getApiError(err) })
        } finally { setSubmitting(false) }
    }

    // ── RESET PASSWORD ───────────────────────────────────────────────────────
    function validateReset() {
        const e = {}
        if (!resetPw)                 e.pw   = 'New password is required'
        else if (resetPw.length < 8) e.pw   = 'Minimum 8 characters'
        if (!resetConf)               e.conf = 'Please confirm your new password'
        else if (resetPw !== resetConf) e.conf = 'Passwords do not match'
        setResetErrors(e); return !Object.keys(e).length
    }

    async function handleReset(evt) {
        evt.preventDefault()
        if (submitting || !validateReset()) return
        setResetErrors({}); setSubmitting(true)
        try {
            await authService.resetPassword(forgotEmail.trim(), resetOtp.trim(), resetPw)
            setResetDone(true)
        } catch (err) {
            const msg = getApiError(err).toLowerCase()
            setResetErrors({ form: msg.includes('invalid') || msg.includes('expired')
                ? 'This code is invalid or has expired. Please request a new one.'
                : getApiError(err) })
        } finally { setSubmitting(false) }
    }

    // ── LOGIN ──────────────────────────────────────────────────────────────────
    if (view === 'login') return (
        <div className="auth-root">
            <div className="login-card">
                <div className="auth-logo-wrap" aria-hidden="true">
                    <GraduationCap size={22} color="#ffffff"/>
                </div>
                <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'var(--color-text)', fontSize:22, textAlign:'center', margin:'0 0 6px', letterSpacing:'-0.02em' }}>
                    Welcome back
                </h1>
                <p style={{ fontSize:14, color:'var(--color-text-secondary)', textAlign:'center', marginBottom:22, lineHeight:1.5 }}>
                    Sign in to your TaskOra account
                </p>

                <div className="role-tabs" role="tablist">
                    {[
                        { r:'student', icon:<BookOpen size={12}/>,      label:'Student'  },
                        { r:'teacher', icon:<GraduationCap size={12}/>, label:'Teacher'  },
                    ].map(({ r, icon, label }) => (
                        <button key={r} type="button" role="tab" aria-selected={loginRole === r}
                            className={`role-tab ${loginRole === r ? 'active' : ''}`}
                            onClick={() => { setLoginRole(r); setLoginErrors({}) }}>
                            {icon} {label}
                        </button>
                    ))}
                </div>

                {loginRole === 'teacher' && (
                    <div style={{ background:'var(--color-primary-light)', border:'1px solid rgba(0,85,255,0.15)', borderRadius:8, padding:'9px 12px', marginBottom:4 }}>
                        <p style={{ fontSize:12, color:'var(--color-primary)', margin:0, lineHeight:1.5 }}>
                            <strong>Teacher accounts</strong> are created by your institution administrator. Use the credentials provided to you.
                        </p>
                    </div>
                )}

                <form onSubmit={handleLogin} noValidate style={{ display:'flex', flexDirection:'column', gap:10 }}>
                    <Field id="lc" type="text" placeholder="Username or Email" autoComplete="username"
                        value={loginCred} onChange={e => setLoginCred(e.target.value)} required
                        iconL={<User size={14}/>} error={loginErrors.cred}/>
                    <Field id="lpw" placeholder="Password" autoComplete="current-password"
                        type={showLoginPw ? 'text' : 'password'}
                        value={loginPw} onChange={e => setLoginPw(e.target.value)} required
                        iconL={<Lock size={14}/>} showEye eyeOpen={showLoginPw} onEye={() => setShowLoginPw(s => !s)}
                        error={loginErrors.pw}/>
                    <div style={{ textAlign:'right', marginTop:-2 }}>
                        <button type="button" onClick={() => reset('forgot')}
                            style={{ fontSize:12, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'var(--font-body)', textDecoration:'underline' }}>
                            Forgot password?
                        </button>
                    </div>
                    {locked && <LockBar timer={timer}/>}
                    {loginErrors.form && !locked && <ErrBanner msg={loginErrors.form}/>}
                    <button type="submit" disabled={submitting || locked} className="auth-btn auth-btn-navy" style={{ marginTop:6 }}>
                        {submitting ? <Spinner size={16} color="white"/> : <><ArrowRight size={14}/> Sign In</>}
                    </button>
                </form>

                <p style={{ textAlign:'center', fontSize:13, color:'var(--color-text-muted)', marginTop:18 }}>
                    New student?{' '}
                    <button type="button" onClick={() => reset('signup')}
                        style={{ fontWeight:700, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                        Create account
                    </button>
                </p>
            </div>
        </div>
    )

    // ── SIGNUP — Students only ──────────────────────────────────────────────────
    if (view === 'signup') return (
        <div className="auth-root">
            <div className="signup-split">
                <div className="signup-left">
                    <div>
                        <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.13)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }}>
                            <GraduationCap size={18} style={{ color:'#fff' }}/>
                        </div>
                        <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'#fff', margin:'0 0 10px', letterSpacing:'-0.02em' }}>
                            TaskOra
                        </h2>
                        <p style={{ fontSize:13, color:'rgba(255,255,255,0.80)', lineHeight:1.7, margin:0 }}>
                            Academic assignment tracker for IT students. Stay on top of your deadlines.
                        </p>
                    </div>
                    <p style={{ fontSize:11, color:'rgba(255,255,255,0.55)', margin:0 }}>
                        © {new Date().getFullYear()} TaskOra
                    </p>
                </div>

                <div className="signup-right">
                    <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:19, color:'var(--color-text)', margin:'0 0 6px', letterSpacing:'-0.02em' }}>
                        Create Student Account
                    </h2>
                    <p style={{ fontSize:14, color:'var(--color-text-secondary)', marginBottom:18, lineHeight:1.5 }}>
                        Join TaskOra to manage your assignments and deadlines.
                    </p>

                    <div style={{ display:'inline-flex', alignItems:'center', gap:6, background:'var(--color-primary-light)', border:'1px solid color-mix(in srgb, var(--color-primary) 20%, white)', borderRadius:99, padding:'5px 12px', marginBottom:14 }}>
                        <BookOpen size={12} style={{ color:'var(--color-primary)' }}/>
                        <span style={{ fontSize:12, fontWeight:600, color:'var(--color-primary)', fontFamily:'var(--font-display)' }}>Student Registration</span>
                    </div>

                    <form onSubmit={handleSignup} noValidate style={{ display:'flex', flexDirection:'column', gap:9 }}>
                        <Field id="rn" type="text" placeholder="Full name" autoComplete="name" aria-label="Full name"
                            value={regName} onChange={e => setRegName(e.target.value)} required
                            iconL={<User size={14}/>} error={regErrors.name}/>
                        <Field id="ru" type="text" placeholder="Username" autoComplete="username" aria-label="Username"
                            value={regUser} onChange={e => setRegUser(e.target.value)} required
                            iconL={<User size={14}/>} error={regErrors.user}/>
                        <Field id="re" type="email" placeholder="Email address" autoComplete="email" aria-label="Email address"
                            value={regEmail} onChange={e => setRegEmail(e.target.value)} required
                            iconL={<Mail size={14}/>} error={regErrors.email}/>
                        <Field id="rp" placeholder="Password (min. 8 chars)" autoComplete="new-password" aria-label="Password"
                            type={showRegPw ? 'text' : 'password'}
                            value={regPw} onChange={e => setRegPw(e.target.value)} required
                            iconL={<Lock size={14}/>} showEye eyeOpen={showRegPw} onEye={() => setShowRegPw(s => !s)}
                            error={regErrors.pw}/>
                        <Field id="rc" placeholder="Confirm password" autoComplete="new-password" aria-label="Confirm password"
                            type={showRegConf ? 'text' : 'password'}
                            value={regConf} onChange={e => setRegConf(e.target.value)} required
                            iconL={<Lock size={14}/>} showEye eyeOpen={showRegConf} onEye={() => setShowRegConf(s => !s)}
                            error={regErrors.conf}/>

                        <div style={{ display:'flex', alignItems:'center', gap:8, marginTop:4, marginBottom:2 }}>
                            <input
                                type="checkbox"
                                id="agreeTerms"
                                checked={agreeTerms}
                                onChange={e => setAgreeTerms(e.target.checked)}
                                style={{ cursor:'pointer', width:14, height:14 }}
                            />
                            <label htmlFor="agreeTerms" style={{ fontSize:12, color:'var(--color-text-secondary)', cursor:'pointer', userSelect:'none', fontFamily:'var(--font-body)' }}>
                                I agree to the <Link to="/legal" target="_blank" rel="noopener noreferrer" style={{ color:'var(--color-primary)', fontWeight:700, textDecoration:'underline' }}>Terms and Conditions</Link>
                            </label>
                        </div>
                        {regErrors.agree && (
                            <p className="field-error" style={{ marginTop:0 }}>
                                <AlertTriangle size={10} aria-hidden="true" style={{ flexShrink:0 }}/>{regErrors.agree}
                            </p>
                        )}

                        {regErrors.form && <ErrBanner msg={regErrors.form}/>}
                        <button type="submit" disabled={submitting} className="auth-btn auth-btn-blue" style={{ marginTop:4 }}>
                            {submitting ? <Spinner size={16} color="white"/> : <>Create Account <ArrowRight size={14}/></>}
                        </button>
                    </form>

                    <p style={{ fontSize:13, color:'var(--color-text-muted)', textAlign:'center', marginTop:14 }}>
                        Already have an account?{' '}
                        <button type="button" onClick={() => reset('login')}
                            style={{ fontWeight:700, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                            Sign in
                        </button>
                    </p>

                    <p style={{ fontSize:11, color:'var(--color-text-muted)', textAlign:'center', marginTop:10 }}>
                        Teacher? Contact your administrator for credentials.
                    </p>
                </div>
            </div>
        </div>
    )

    // ── VERIFY EMAIL ─────────────────────────────────────────────────────────
    if (view === 'verify') return (
        <div className="auth-root">
            <div className="login-card">
                <AuthStatusHeader icon={<MailCheck size={20}/>} title="Verify your email"
                    subtitle={verifyEmail
                        ? <>We sent a 6-digit code to <strong>{verifyEmail}</strong>. Enter it below to activate your account.</>
                        : 'Enter your email and the 6-digit code you received to activate your account.'}/>
                <form onSubmit={handleVerifyEmail} noValidate style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <Field id="ve" type="email" placeholder="your@email.com" autoComplete="email" aria-label="Email address"
                        value={verifyEmail} onChange={e => setVerifyEmail(e.target.value)} required
                        iconL={<Mail size={14}/>} error={verifyErrors.email}/>
                    <Field id="vcode" type="text" inputMode="numeric" placeholder="6-digit code" maxLength={6} aria-label="6-digit verification code"
                        value={verifyCode} onChange={e => setVerifyCode(e.target.value.replace(/\D/g, ''))} required
                        iconL={<KeyRound size={14}/>} error={verifyErrors.code}/>
                    {verifyErrors.form && <ErrBanner msg={verifyErrors.form}/>}
                    <button type="submit" disabled={submitting} className="auth-btn auth-btn-navy">
                        {submitting ? <Spinner size={16} color="white"/> : <><ArrowRight size={14}/> Verify Email</>}
                    </button>
                </form>
                <p style={{ textAlign:'center', fontSize:13, color:'var(--color-text-secondary)', marginTop:16 }}>
                    Didn't get a code?{' '}
                    <button type="button" onClick={handleResendVerify} disabled={resendCooldown > 0 || submitting}
                        style={{ fontWeight:700, color: resendCooldown > 0 ? 'var(--color-text-muted)' : 'var(--color-primary)', background:'none', border:'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', padding:0 }}>
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                </p>
                <p style={{ textAlign:'center', fontSize:13, color:'var(--color-text-secondary)', marginTop:8 }}>
                    <button type="button" onClick={() => reset('login')}
                        style={{ fontWeight:700, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                        ← Back to Sign In
                    </button>
                </p>
            </div>
        </div>
    )

    // ── VERIFIED (success) ───────────────────────────────────────────────────
    if (view === 'verified') return (
        <div className="auth-root">
            <div className="login-card" style={{ textAlign:'center' }}>
                <div className="auth-icon-badge-round auth-icon-badge-success" aria-hidden="true">
                    <CheckCircle2 size={26}/>
                </div>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'var(--color-text)', margin:'0 0 10px', letterSpacing:'-0.02em' }}>
                    Email verified!
                </h2>
                <p style={{ fontSize:13, color:'var(--color-text)', lineHeight:1.7, marginBottom:24 }}>
                    Your account is now active. You can sign in below.
                </p>
                <button type="button" onClick={() => reset('login')} className="auth-btn auth-btn-navy">
                    <ArrowRight size={14}/> Sign In
                </button>
            </div>
        </div>
    )

    // ── FORGOT PASSWORD ─────────────────────────────────────────────────────────
    if (view === 'forgot') return (
        <div className="auth-root">
            <div className="login-card">
                <div className="auth-header-inline">
                    <div className="auth-icon-badge auth-icon-badge-primary auth-icon-badge-sm" aria-hidden="true">
                        <RotateCcw size={18}/>
                    </div>
                    <h2 className="auth-heading-left">Reset Your Password</h2>
                </div>
                <p className="auth-subtext-left">
                    Enter the email address associated with your account and we'll send a verification code to reset your password.
                </p>
                <form onSubmit={handleForgot} noValidate style={{ display:'flex', flexDirection:'column', gap:8 }}>
                    <Field id="fe" type="email" placeholder="your@email.com" autoComplete="email" aria-label="Email address"
                        value={forgotEmail} onChange={e => setForgotEmail(e.target.value)} required
                        iconL={<Mail size={14}/>} error={forgotErrors.email}/>
                    <p className="auth-hint">
                        The code will arrive within a few minutes. If you don't see it, please check your spam folder or resend it.
                    </p>
                    {forgotErrors.form && <ErrBanner msg={forgotErrors.form}/>}
                    <button type="submit" disabled={submitting} className="auth-btn auth-btn-navy" style={{ marginTop:4 }}>
                        {submitting ? <Spinner size={16} color="white"/> : <><ArrowRight size={14}/> Send Verification Code</>}
                    </button>
                </form>
                <p style={{ textAlign:'center', fontSize:13, color:'var(--color-text-secondary)', marginTop:16 }}>
                    <button type="button" onClick={() => reset('login')}
                        style={{ fontWeight:700, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                        ← Back to Sign In
                    </button>
                </p>
            </div>
        </div>
    )

    // ── VERIFY RESET OTP ─────────────────────────────────────────────────────
    if (view === 'resetOtp') return (
        <div className="auth-root">
            <div className="login-card">
                <AuthStatusHeader icon={<KeyRound size={20}/>} title="Enter Reset Code"
                    subtitle={<>If an account exists for <strong>{forgotEmail}</strong>, a 6-digit code was sent. Enter it below.</>}/>
                <form onSubmit={handleVerifyResetOtp} noValidate style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <Field id="rotp" type="text" inputMode="numeric" placeholder="6-digit code" maxLength={6} aria-label="6-digit reset code"
                        value={resetOtp} onChange={e => setResetOtp(e.target.value.replace(/\D/g, ''))} required
                        iconL={<KeyRound size={14}/>} error={resetOtpErrors.code}/>
                    {resetOtpErrors.form && <ErrBanner msg={resetOtpErrors.form}/>}
                    <button type="submit" disabled={submitting} className="auth-btn auth-btn-navy">
                        {submitting ? <Spinner size={16} color="white"/> : <><ArrowRight size={14}/> Verify Code</>}
                    </button>
                </form>
                <p style={{ textAlign:'center', fontSize:13, color:'var(--color-text-secondary)', marginTop:16 }}>
                    Didn't get a code?{' '}
                    <button type="button" onClick={handleResendReset} disabled={resendCooldown > 0 || submitting}
                        style={{ fontWeight:700, color: resendCooldown > 0 ? 'var(--color-text-muted)' : 'var(--color-primary)', background:'none', border:'none', cursor: resendCooldown > 0 ? 'default' : 'pointer', padding:0 }}>
                        {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend code'}
                    </button>
                </p>
                <p style={{ textAlign:'center', fontSize:13, color:'var(--color-text-secondary)', marginTop:8 }}>
                    <button type="button" onClick={() => reset('login')}
                        style={{ fontWeight:700, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                        ← Back to Sign In
                    </button>
                </p>
            </div>
        </div>
    )

    // ── RESET PASSWORD ───────────────────────────────────────────────────────────
    if (view === 'reset') {
        if (resetDone) return (
            <div className="auth-root">
                <div className="login-card" style={{ textAlign:'center' }}>
                    <div className="auth-icon-badge-round auth-icon-badge-success" aria-hidden="true">
                        <CheckCircle2 size={26}/>
                    </div>
                    <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'var(--color-text)', margin:'0 0 10px', letterSpacing:'-0.02em' }}>
                        Password updated!
                    </h2>
                    <p style={{ fontSize:13, color:'var(--color-text)', lineHeight:1.7, marginBottom:24 }}>
                        Your password has been changed. You can now sign in with your new password.
                    </p>
                    <button type="button" onClick={() => reset('login')} className="auth-btn auth-btn-navy">
                        <ArrowRight size={14}/> Sign In
                    </button>
                </div>
            </div>
        )

        return (
            <div className="auth-root">
                <div className="login-card">
                    <AuthStatusHeader icon={<KeyRound size={20}/>} title="Set New Password"
                        subtitle="Choose a strong password for your account."/>
                    <form onSubmit={handleReset} noValidate style={{ display:'flex', flexDirection:'column', gap:12 }}>
                        <Field id="rspw" placeholder="New password (min. 8 chars)" autoComplete="new-password" aria-label="New password"
                            type={showResetPw ? 'text' : 'password'}
                            value={resetPw} onChange={e => setResetPw(e.target.value)} required
                            iconL={<Lock size={14}/>} showEye eyeOpen={showResetPw} onEye={() => setShowResetPw(s => !s)}
                            error={resetErrors.pw}/>
                        <Field id="rscf" placeholder="Confirm new password" autoComplete="new-password" aria-label="Confirm new password"
                            type={showResetConf ? 'text' : 'password'}
                            value={resetConf} onChange={e => setResetConf(e.target.value)} required
                            iconL={<Lock size={14}/>} showEye eyeOpen={showResetConf} onEye={() => setShowResetConf(s => !s)}
                            error={resetErrors.conf}/>
                        {resetErrors.form && <ErrBanner msg={resetErrors.form}/>}
                        <button type="submit" disabled={submitting} className="auth-btn auth-btn-navy" style={{ marginTop:4 }}>
                            {submitting ? <Spinner size={16} color="white"/> : <><KeyRound size={14}/> Update Password</>}
                        </button>
                    </form>
                    <p style={{ textAlign:'center', fontSize:13, color:'var(--color-text-secondary)', marginTop:16 }}>
                        <button type="button" onClick={() => reset('login')}
                            style={{ fontWeight:700, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                            ← Back to Sign In
                        </button>
                    </p>
                </div>
            </div>
        )
    }

    return null
}