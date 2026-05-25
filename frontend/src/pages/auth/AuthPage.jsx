    // src/pages/auth/AuthPage.jsx
    // Views: login | signup | forgot | sent | reset
    //
    // Forgot password flow:
    //   1. User enters email → POST /api/users/password-reset/   (view='forgot')
    //   2. Email arrives with link → /reset-password?token=TOKEN  (view='reset')
    //   3. User enters new password → POST /api/users/password-reset/confirm/
    //   4. Success → redirect to login (view='login')
    //
    // Password toggle: browser-native icons hidden via base.css + auth.css
    // Login: accepts BOTH username and email
    //
    // ── RBAC fix ─────────────────────────────────────────────────────────────────
    //  The `role` state (set by the Student / Teacher tab) is now forwarded to
    //  login() as `portalRole`. authService.login() validates the backend role
    //  against the tab and throws { code: 'ROLE_MISMATCH' } on mismatch.
    //
    //  handleLogin catches ROLE_MISMATCH specifically and shows the red banner
    //  "Unauthorized login for this portal" without burning an attempt counter.
    //
    //  Rules enforced (in authService, but reflected here in UX):
    //   Student tab → backend role must be 'student'          (teacher/admin → rejected)
    //   Teacher tab → backend role must be 'teacher'|'admin'  (student → rejected)
    //                 admin credentials via Teacher tab → RoleRedirect sends to /app/admin
    // ─────────────────────────────────────────────────────────────────────────────

    import React, { useState, useRef, useEffect } from 'react'
    import { useSearchParams } from 'react-router-dom'
    import {
    User, Lock, Mail, Eye, EyeOff, Zap,
    GraduationCap, BookOpen, ShieldCheck, ArrowRight,
    AlertTriangle, RotateCcw, CheckCircle2, KeyRound,
    } from 'lucide-react'
    import { useAuth }    from '../../hooks/useAuth.js'
    import authService    from '../../services/auth.service.js'
    import { Spinner }    from '../../components/shared/Loader.jsx'

    const MAX_ATTEMPTS = 3
    const LOCK_SECS    = 30
    const isEmailRe    = v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

    // ── Reusable field input ──────────────────────────────────────
    function Field({ id, label, iconL, showEye, eyeOpen, onEye, error, ...props }) {
    return (
        <div style={{ display:'flex', flexDirection:'column', gap:0 }}>
        {label && (
            <label htmlFor={id} style={{ fontSize:12, fontWeight:600, color:'#6a6052', marginBottom:5, fontFamily:'var(--font-body)', letterSpacing:'0.01em' }}>
            {label}
            </label>
        )}
        <div className="auth-input-wrap">
            {iconL && <span className="auth-input-icon" aria-hidden="true">{iconL}</span>}
            <input
            id={id}
            className={`auth-input${error ? ' auth-input-error' : ''}`}
            aria-invalid={!!error}
            aria-describedby={error ? `${id}-err` : undefined}
            {...props}
            />
            {showEye && (
            <button type="button" className="auth-input-right" onClick={onEye}
                aria-label={eyeOpen ? 'Hide password' : 'Show password'}>
                {eyeOpen ? <EyeOff size={14}/> : <Eye size={14}/>}
            </button>
            )}
        </div>
        {error && (
            <p id={`${id}-err`} className="field-error" role="alert">
            <AlertTriangle size={10} aria-hidden="true" style={{ flexShrink:0 }}/>
            {error}
            </p>
        )}
        </div>
    )
    }

    function ErrBanner({ msg }) {
    if (!msg) return null
    return (
        <div className="error-banner" role="alert">
        <AlertTriangle size={13} style={{ color:'#dc2626', flexShrink:0, marginTop:1 }} aria-hidden="true"/>
        {msg}
        </div>
    )
    }

    function LockBar({ timer }) {
    return (
        <div className="lock-banner" role="alert">
        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:6 }}>
            <AlertTriangle size={12} style={{ color:'#d97706' }} aria-hidden="true"/>
            Too many failed attempts · Try again in {timer}s
        </div>
        <div style={{ height:4, background:'#fde68a', borderRadius:99, overflow:'hidden' }}>
            <div style={{ height:'100%', background:'#f59e0b', borderRadius:99, width:`${(timer/LOCK_SECS)*100}%`, transition:'width 1s linear' }}/>
        </div>
        </div>
    )
    }

    function Divider({ text }) {
    return (
        <div style={{ display:'flex', alignItems:'center', gap:10, margin:'2px 0' }}>
        <div style={{ flex:1, height:1, background:'#ece7df' }}/>
        <span style={{ fontSize:11, color:'#b0a898', whiteSpace:'nowrap' }}>{text}</span>
        <div style={{ flex:1, height:1, background:'#ece7df' }}/>
        </div>
    )
    }

    // ─────────────────────────────────────────────────────────────
    export default function AuthPage({ initialView }) {
    const { login }    = useAuth()
    const [searchParams] = useSearchParams()

    // On mount: detect /reset-password?token= URL
    const urlToken = searchParams.get('token') || ''

    const [view,       setView]       = useState(() => {
        if (initialView) return initialView
        if (urlToken)    return 'reset'
        return 'login'
    })
    const [role,       setRole]       = useState('student')
    const [submitting, setSubmitting] = useState(false)

    // Lockout
    const [attempts, setAttempts] = useState(0)
    const [locked,   setLocked]   = useState(false)
    const [timer,    setTimer]    = useState(0)
    const lockRef = useRef(null)
    useEffect(() => () => clearInterval(lockRef.current), [])

    // Login
    const [loginCred,   setLoginCred]   = useState('')
    const [loginPw,     setLoginPw]     = useState('')
    const [showLoginPw, setShowLoginPw] = useState(false)
    const [loginErrors, setLoginErrors] = useState({})

    // Signup
    const [regName,     setRegName]     = useState('')
    const [regUser,     setRegUser]     = useState('')
    const [regEmail,    setRegEmail]    = useState('')
    const [regPw,       setRegPw]       = useState('')
    const [regConf,     setRegConf]     = useState('')
    const [showRegPw,   setShowRegPw]   = useState(false)
    const [showRegConf, setShowRegConf] = useState(false)
    const [regErrors,   setRegErrors]   = useState({})

    // Forgot
    const [forgotEmail,  setForgotEmail]  = useState('')
    const [forgotErrors, setForgotErrors] = useState({})

    // Reset (confirm new password)
    const [resetPw,      setResetPw]      = useState('')
    const [resetConf,    setResetConf]    = useState('')
    const [showResetPw,  setShowResetPw]  = useState(false)
    const [showResetConf,setShowResetConf]= useState(false)
    const [resetErrors,  setResetErrors]  = useState({})
    const [resetDone,    setResetDone]    = useState(false)
    // token comes from URL param or state (for deep-link robustness)
    const [resetToken,   setResetToken]   = useState(urlToken)

    function reset(v) {
        clearInterval(lockRef.current)
        setView(v)
        setAttempts(0); setLocked(false); setTimer(0)
        setLoginCred(''); setLoginPw(''); setLoginErrors({})
        setRegName(''); setRegUser(''); setRegEmail(''); setRegPw(''); setRegConf('')
        setRegErrors({}); setForgotEmail(''); setForgotErrors({})
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

    function getApiError(err) {
        if (!err) return 'Something went wrong'
        const d = err.response?.data
        if (!d) return 'Cannot reach server — check your connection'
        if (typeof d === 'string') return d
        if (d.detail) return d.detail
        const vals = Object.values(d).flat()
        return vals.length ? String(vals[0]) : 'Invalid credentials'
    }

    // ── Login ──────────────────────────────────────────────────
    function validateLogin() {
        const e = {}
        if (!loginCred.trim()) e.cred = 'Username or email is required'
        if (!loginPw)          e.pw   = 'Password is required'
        setLoginErrors(e); return !Object.keys(e).length
    }

    // ── RBAC-aware login handler ──────────────────────────────────────────────
    // `role` (the tab) is passed as `portalRole` to login().
    // authService enforces: Student tab → role=student only
    //                       Teacher tab → role=teacher OR role=admin
    // On ROLE_MISMATCH the error is caught here and shown as a red banner.
    // A mismatch does NOT burn an attempt counter — it is a portal violation,
    // not a wrong-password event.
    async function handleLogin(evt) {
        evt.preventDefault()
        if (locked || submitting || !validateLogin()) return
        setLoginErrors({}); setSubmitting(true)
        try {
        // Pass the selected tab as `portalRole` for strict enforcement.
        await login({ credential: loginCred, password: loginPw, portalRole: role })
        // On success AuthContext sets user → AppRoutes RoleRedirect navigates.
        } catch (err) {
        // ── Role mismatch: wrong portal for this account ───────────────────────
        // Show a clear, specific error. Do NOT increment the attempt counter.
        if (err.code === 'ROLE_MISMATCH') {
            setLoginErrors({ form: 'Unauthorized login for this portal' })
            return  // early return — no lockout logic
        }

        // ── Credentials error: wrong username / password ───────────────────────
        const next = attempts + 1
        setAttempts(next)
        if (next >= MAX_ATTEMPTS) { startLock(); return }
        setLoginErrors({
            form: `Invalid credentials — ${MAX_ATTEMPTS - next} attempt${MAX_ATTEMPTS - next !== 1 ? 's' : ''} remaining`,
        })
        } finally { setSubmitting(false) }
    }

    // ── Signup ─────────────────────────────────────────────────
    function validateSignup() {
        const e = {}
        if (!regName.trim())                    e.name  = 'Full name is required'
        if (!regUser.trim())                    e.user  = 'Username is required'
        else if (regUser.length < 3)            e.user  = 'At least 3 characters'
        else if (!/^[a-zA-Z0-9_]+$/.test(regUser)) e.user = 'Letters, numbers and underscores only'
        if (!regEmail.trim())                   e.email = 'Email is required'
        else if (!isEmailRe(regEmail))          e.email = 'Enter a valid email address'
        if (!regPw)                             e.pw    = 'Password is required'
        else if (regPw.length < 8)             e.pw    = 'Minimum 8 characters'
        if (!regConf)                           e.conf  = 'Please confirm your password'
        else if (regPw !== regConf)             e.conf  = 'Passwords do not match'
        setRegErrors(e); return !Object.keys(e).length
    }

    async function handleSignup(evt) {
        evt.preventDefault()
        if (submitting || !validateSignup()) return
        setRegErrors({}); setSubmitting(true)
        try {
        await authService.register({
            username: regUser.trim(), full_name: regName.trim(),
            email: regEmail.trim(), password: regPw, role,
        })
        // After signup, login using the selected role as portalRole.
        await login({ credential: regUser.trim(), password: regPw, portalRole: role })
        } catch (err) {
        const msg = getApiError(err).toLowerCase()
        const e = {}
        if (msg.includes('username'))   e.user  = 'Username already taken'
        else if (msg.includes('email')) e.email = 'Email already registered'
        else                            e.form  = getApiError(err)
        setRegErrors(e)
        } finally { setSubmitting(false) }
    }

    // ── Forgot ─────────────────────────────────────────────────
    async function handleForgot(evt) {
        evt.preventDefault()
        if (submitting) return
        if (!forgotEmail.trim())    { setForgotErrors({ email:'Email is required' }); return }
        if (!isEmailRe(forgotEmail)){ setForgotErrors({ email:'Enter a valid email address' }); return }
        setForgotErrors({}); setSubmitting(true)
        try {
        await authService.requestPasswordReset(forgotEmail.trim())
        } catch {
        // Silently swallow — never reveal whether email exists (security best practice)
        } finally {
        setSubmitting(false)
        }
        setView('sent')
    }

    // ── Reset (confirm new password) ───────────────────────────
    function validateReset() {
        const e = {}
        if (!resetToken.trim())    e.form = 'Reset token is missing. Use the link from your email.'
        if (!resetPw)              e.pw   = 'New password is required'
        else if (resetPw.length < 8) e.pw = 'Minimum 8 characters'
        if (!resetConf)            e.conf = 'Please confirm your new password'
        else if (resetPw !== resetConf) e.conf = 'Passwords do not match'
        setResetErrors(e); return !Object.keys(e).length
    }

    async function handleReset(evt) {
        evt.preventDefault()
        if (submitting || !validateReset()) return
        setResetErrors({}); setSubmitting(true)
        try {
        await authService.confirmPasswordReset(resetToken.trim(), resetPw)
        setResetDone(true)
        } catch (err) {
        const msg = getApiError(err).toLowerCase()
        if (msg.includes('token') || msg.includes('invalid') || msg.includes('expired')) {
            setResetErrors({ form: 'This reset link is invalid or has expired. Please request a new one.' })
        } else {
            setResetErrors({ form: getApiError(err) })
        }
        } finally { setSubmitting(false) }
    }

    // ── LOGIN ──────────────────────────────────────────────────
    if (view === 'login') return (
        <div className="auth-root">
        <div className="login-card">
            <div className="auth-logo-wrap" aria-hidden="true">
            <ShieldCheck size={22} style={{ color:'#fff' }}/>
            </div>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, color:'#1a1f35', fontSize:20, textAlign:'center', margin:'0 0 3px', letterSpacing:'-0.02em' }}>
            Welcome back
            </h1>
            <p style={{ fontSize:13, color:'#b0a898', textAlign:'center', marginBottom:20, lineHeight:1.5 }}>
            Sign in to your TaskOra account
            </p>

            {/* Role tabs — determines which portal is used for login validation */}
            <div className="role-tabs" role="tablist">
            {[{ r:'student', icon:<BookOpen size={12}/>, label:'Student' },
                { r:'teacher', icon:<GraduationCap size={12}/>, label:'Teacher' }].map(({r,icon,label}) => (
                <button key={r} type="button" role="tab" aria-selected={role===r}
                className={`role-tab ${role===r?'active':''}`}
                onClick={() => { setRole(r); setLoginErrors({}) }}>
                {icon} {label}
                </button>
            ))}
            </div>

            <form onSubmit={handleLogin} noValidate style={{ display:'flex', flexDirection:'column', gap:10 }}>
            <Field id="lc" type="text" placeholder="Username or Email" autoComplete="username"
                value={loginCred} onChange={e=>setLoginCred(e.target.value)} required
                iconL={<User size={14}/>} error={loginErrors.cred}/>

            <Field id="lpw" placeholder="Password" autoComplete="current-password"
                type={showLoginPw?'text':'password'}
                value={loginPw} onChange={e=>setLoginPw(e.target.value)} required
                iconL={<Lock size={14}/>}
                showEye eyeOpen={showLoginPw} onEye={()=>setShowLoginPw(s=>!s)}
                error={loginErrors.pw}/>

            <div style={{ textAlign:'right', marginTop:-2 }}>
                <button type="button" onClick={()=>reset('forgot')}
                style={{ fontSize:12, color:'#3b6fd4', background:'none', border:'none', cursor:'pointer', padding:0, fontFamily:'var(--font-body)' }}>
                Forgot password?
                </button>
            </div>

            {locked && <LockBar timer={timer}/>}
            {loginErrors.form && !locked && <ErrBanner msg={loginErrors.form}/>}

            <button type="submit" disabled={submitting||locked} className="auth-btn auth-btn-navy" style={{ marginTop:6 }}>
                {submitting ? <Spinner size={16} color="white"/> : <><ArrowRight size={14} aria-hidden="true"/> Sign In</>}
            </button>
            </form>

            <p style={{ textAlign:'center', fontSize:13, color:'#b0a898', marginTop:18 }}>
            No account?{' '}
            <button type="button" onClick={()=>reset('signup')}
                style={{ fontWeight:700, color:'#3b6fd4', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                Create one
            </button>
            </p>
        </div>
        </div>
    )

    // ── SIGNUP ─────────────────────────────────────────────────
    if (view === 'signup') return (
        <div className="auth-root">
        <div className="signup-split">
            <div className="signup-left">
            <div>
                <div style={{ width:40, height:40, borderRadius:10, background:'rgba(255,255,255,0.13)', display:'flex', alignItems:'center', justifyContent:'center', marginBottom:18 }} aria-hidden="true">
                <Zap size={18} style={{ color:'#fff' }}/>
                </div>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:20, color:'#fff', margin:'0 0 10px', letterSpacing:'-0.02em' }}>
                TaskOra
                </h2>
                <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.7, margin:0 }}>
                Academic task tracker for IT students in Nepal. Stay on top of your deadlines.
                </p>
            </div>
            <p style={{ fontSize:11, color:'rgba(255,255,255,0.2)', margin:0 }}>
                © {new Date().getFullYear()} TaskOra
            </p>
            </div>

            <div className="signup-right">
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'#1a1f35', margin:'0 0 3px', letterSpacing:'-0.02em' }}>
                Create Account
            </h2>
            <p style={{ fontSize:13, color:'#b0a898', marginBottom:16, lineHeight:1.5 }}>
                Join TaskOra to start tracking your tasks.
            </p>

            <div className="role-tabs" role="tablist">
                {[{r:'student',label:'Student'},{r:'teacher',label:'Teacher'}].map(({r,label})=>(
                <button key={r} type="button" role="tab" aria-selected={role===r}
                    className={`role-tab ${role===r?'active':''}`} onClick={()=>setRole(r)}>
                    {label}
                </button>
                ))}
            </div>

            <form onSubmit={handleSignup} noValidate style={{ display:'flex', flexDirection:'column', gap:9 }}>
                <Field id="rn" type="text" placeholder="Full name" autoComplete="name"
                value={regName} onChange={e=>setRegName(e.target.value)} required
                iconL={<User size={14}/>} error={regErrors.name}/>
                <Field id="ru" type="text" placeholder="Username" autoComplete="username"
                value={regUser} onChange={e=>setRegUser(e.target.value)} required
                iconL={<User size={14}/>} error={regErrors.user}/>
                <Field id="re" type="email" placeholder="Email address" autoComplete="email"
                value={regEmail} onChange={e=>setRegEmail(e.target.value)} required
                iconL={<Mail size={14}/>} error={regErrors.email}/>
                <Field id="rp" placeholder="Password (min. 8 chars)" autoComplete="new-password"
                type={showRegPw?'text':'password'}
                value={regPw} onChange={e=>setRegPw(e.target.value)} required
                iconL={<Lock size={14}/>}
                showEye eyeOpen={showRegPw} onEye={()=>setShowRegPw(s=>!s)}
                error={regErrors.pw}/>
                <Field id="rc" placeholder="Confirm password" autoComplete="new-password"
                type={showRegConf?'text':'password'}
                value={regConf} onChange={e=>setRegConf(e.target.value)} required
                iconL={<Lock size={14}/>}
                showEye eyeOpen={showRegConf} onEye={()=>setShowRegConf(s=>!s)}
                error={regErrors.conf}/>

                {regErrors.form && <ErrBanner msg={regErrors.form}/>}

                <button type="submit" disabled={submitting} className="auth-btn auth-btn-blue" style={{ marginTop:4 }}>
                {submitting ? <Spinner size={16} color="white"/> : <>Create {role} account <ArrowRight size={14}/></>}
                </button>
            </form>

            <p style={{ fontSize:13, color:'#b0a898', textAlign:'center', marginTop:14 }}>
                Already have an account?{' '}
                <button type="button" onClick={()=>reset('login')}
                style={{ fontWeight:700, color:'#3b6fd4', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                Sign in
                </button>
            </p>
            </div>
        </div>
        </div>
    )

    // ── FORGOT PASSWORD ────────────────────────────────────────
    if (view === 'forgot') return (
        <div className="auth-root">
        <div className="login-card">
            <div style={{ width:46, height:46, borderRadius:12, background:'#e8eeff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }} aria-hidden="true">
            <RotateCcw size={20} style={{ color:'#3b6fd4' }}/>
            </div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'#1a1f35', textAlign:'center', margin:'0 0 6px', letterSpacing:'-0.02em' }}>
            Reset Password
            </h2>
            <p style={{ fontSize:13, color:'#b0a898', textAlign:'center', marginBottom:22, lineHeight:1.6 }}>
            Enter your email and we'll send you a secure reset link.
            </p>

            <form onSubmit={handleForgot} noValidate style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <Field id="fe" type="email" placeholder="your@email.com" autoComplete="email"
                value={forgotEmail} onChange={e=>setForgotEmail(e.target.value)} required
                iconL={<Mail size={14}/>} error={forgotErrors.email}/>
            {forgotErrors.form && <ErrBanner msg={forgotErrors.form}/>}
            <button type="submit" disabled={submitting} className="auth-btn auth-btn-navy">
                {submitting ? <Spinner size={16} color="white"/> : <><ArrowRight size={14}/> Send Reset Link</>}
            </button>
            </form>

            <p style={{ textAlign:'center', fontSize:13, color:'#b0a898', marginTop:16 }}>
            <button type="button" onClick={()=>reset('login')}
                style={{ fontWeight:700, color:'#3b6fd4', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                ← Back to Sign In
            </button>
            </p>
        </div>
        </div>
    )

    // ── SENT (email dispatched) ────────────────────────────────
    if (view === 'sent') return (
        <div className="auth-root">
        <div className="login-card" style={{ textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#e0f7ee', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }} aria-hidden="true">
            <CheckCircle2 size={26} style={{ color:'#3cb87a' }}/>
            </div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'#1a1f35', margin:'0 0 8px', letterSpacing:'-0.02em' }}>
            Check your inbox
            </h2>
            <p style={{ fontSize:13, color:'#6a6052', lineHeight:1.7, marginBottom:6 }}>
            If an account exists for <strong>{forgotEmail}</strong>, a reset link has been sent.
            </p>
            <p style={{ fontSize:12, color:'#b0a898', marginBottom:24 }}>
            Check your spam folder if you don't see it within a few minutes.
            </p>
            <button type="button" onClick={()=>reset('login')} className="auth-btn auth-btn-navy">
            <ArrowRight size={14} aria-hidden="true"/> Back to Sign In
            </button>
        </div>
        </div>
    )

    // ── RESET — set new password (arrived via email link) ──────
    if (view === 'reset') {
        // Token missing guard
        const tokenMissing = !resetToken.trim()

        if (resetDone) return (
        <div className="auth-root">
            <div className="login-card" style={{ textAlign:'center' }}>
            <div style={{ width:56, height:56, borderRadius:'50%', background:'#e0f7ee', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }} aria-hidden="true">
                <CheckCircle2 size={26} style={{ color:'#3cb87a' }}/>
            </div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'#1a1f35', margin:'0 0 8px', letterSpacing:'-0.02em' }}>
                Password updated!
            </h2>
            <p style={{ fontSize:13, color:'#6a6052', lineHeight:1.7, marginBottom:24 }}>
                Your password has been changed successfully. You can now sign in with your new password.
            </p>
            <button type="button" onClick={()=>reset('login')} className="auth-btn auth-btn-navy">
                <ArrowRight size={14} aria-hidden="true"/> Sign In
            </button>
            </div>
        </div>
        )

        return (
        <div className="auth-root">
            <div className="login-card">
            <div style={{ width:46, height:46, borderRadius:12, background:'#e8eeff', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }} aria-hidden="true">
                <KeyRound size={20} style={{ color:'#3b6fd4' }}/>
            </div>
            <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:18, color:'#1a1f35', textAlign:'center', margin:'0 0 6px', letterSpacing:'-0.02em' }}>
                Set New Password
            </h2>
            <p style={{ fontSize:13, color:'#b0a898', textAlign:'center', marginBottom:22, lineHeight:1.6 }}>
                Choose a strong password for your account.
            </p>

            {tokenMissing ? (
                <>
                <ErrBanner msg="Reset token is missing. Please use the link from your email."/>
                <button type="button" onClick={()=>reset('forgot')} className="auth-btn auth-btn-navy" style={{ marginTop:16 }}>
                    Request a new link
                </button>
                </>
            ) : (
                <>
                {/* Editable token field — allows user to paste token manually */}
                <div style={{ marginBottom:14 }}>
                    <label style={{ fontSize:11, fontWeight:600, color:'#6a6052', display:'block', marginBottom:4, fontFamily:'var(--font-body)' }}>
                    Reset Token
                    </label>
                    <input
                    type="text"
                    value={resetToken}
                    onChange={e=>setResetToken(e.target.value)}
                    placeholder="Paste your reset token here"
                    style={{
                        width:'100%', boxSizing:'border-box',
                        fontSize:11, fontFamily:'monospace',
                        padding:'8px 10px', border:'1.5px solid #e2dbd0',
                        borderRadius:8, background:'#f7f4f0', color:'#1a1f35',
                        outline:'none',
                    }}
                    />
                    <p style={{ fontSize:10, color:'#b0a898', marginTop:4 }}>
                    This was included automatically from your reset email link.
                    </p>
                </div>

                <form onSubmit={handleReset} noValidate style={{ display:'flex', flexDirection:'column', gap:12 }}>
                    <Field id="rspw" placeholder="New password (min. 8 chars)" autoComplete="new-password"
                    type={showResetPw?'text':'password'}
                    value={resetPw} onChange={e=>setResetPw(e.target.value)} required
                    iconL={<Lock size={14}/>}
                    showEye eyeOpen={showResetPw} onEye={()=>setShowResetPw(s=>!s)}
                    error={resetErrors.pw}/>
                    <Field id="rscf" placeholder="Confirm new password" autoComplete="new-password"
                    type={showResetConf?'text':'password'}
                    value={resetConf} onChange={e=>setResetConf(e.target.value)} required
                    iconL={<Lock size={14}/>}
                    showEye eyeOpen={showResetConf} onEye={()=>setShowResetConf(s=>!s)}
                    error={resetErrors.conf}/>

                    {resetErrors.form && <ErrBanner msg={resetErrors.form}/>}

                    <button type="submit" disabled={submitting} className="auth-btn auth-btn-navy" style={{ marginTop:4 }}>
                    {submitting ? <Spinner size={16} color="white"/> : <><KeyRound size={14}/> Update Password</>}
                    </button>
                </form>
                </>
            )}

            <p style={{ textAlign:'center', fontSize:13, color:'#b0a898', marginTop:16 }}>
                <button type="button" onClick={()=>reset('login')}
                style={{ fontWeight:700, color:'#3b6fd4', background:'none', border:'none', cursor:'pointer', padding:0 }}>
                ← Back to Sign In
                </button>
            </p>
            </div>
        </div>
        )
    }

    return null
    }