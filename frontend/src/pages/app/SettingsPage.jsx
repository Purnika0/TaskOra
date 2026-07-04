// src/pages/app/SettingsPage.jsx
import React, { useState, useRef, useEffect } from 'react'
import { Save, LogOut, User, Trash2, Settings, Lock, KeyRound, Mail, ShieldCheck, CheckCircle2 } from 'lucide-react'
import { useAuth }     from '../../hooks/useAuth.js'
import { useToast }    from '../../context/ToastContext.jsx'
import { useConfirm }  from '../../context/ConfirmContext.jsx'
import authService     from '../../services/auth.service.js'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { apiError }    from '../../utils/helpers.js'

const RESEND_COOLDOWN = 30 // seconds, matches AuthPage

const baseInp = {
    width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px',
    padding: '10px 14px', fontSize: '13px', fontFamily: 'var(--font-body)',
    color: '#0f172a', background: '#f8fafc', outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
}

function SInput({ value, onChange, type='text', placeholder, disabled }) {
    const [f, setF] = useState(false)
    return (
        <input 
            value={value} onChange={onChange} type={type} placeholder={placeholder} disabled={disabled}
            style={{ 
                ...baseInp, 
                borderColor: f ? '#4f46e5' : '#cbd5e1', 
                boxShadow: f ? '0 0 0 3px rgba(79, 70, 229, 0.1)' : 'none', 
                background: disabled ? '#f1f5f9' : (f ? '#fff' : '#f8fafc'),
                cursor: disabled ? 'not-allowed' : 'text',
            }}
            onFocus={() => setF(true)} 
            onBlur={() => setF(false)}
        />
    )
}

function FieldLabel({ children }) {
    return (
        <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: 'var(--font-body)' }}>
            {children}
        </label>
    )
}

const primaryBtn = {
    display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start',
    background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px',
    padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    fontFamily: 'var(--font-display)', transition: 'background 0.2s',
}

// ── Teacher / Admin: current-password based change ───────────────────────────
function CurrentPasswordChangeForm() {
    const toast = useToast()
    const [currentPw, setCurrentPw] = useState('')
    const [newPw,     setNewPw]     = useState('')
    const [confirmPw, setConfirmPw] = useState('')
    const [saving,    setSaving]    = useState(false)
    const [errors,    setErrors]    = useState({})

    function validate() {
        const e = {}
        if (!currentPw)              e.current = 'Current password is required'
        if (!newPw)                  e.new     = 'New password is required'
        else if (newPw.length < 8)   e.new     = 'Minimum 8 characters'
        if (!confirmPw)               e.confirm = 'Please confirm your new password'
        else if (newPw !== confirmPw) e.confirm = 'Passwords do not match'
        if (newPw && currentPw && newPw === currentPw) e.new = 'New password must be different from current password'
        setErrors(e)
        return !Object.keys(e).length
    }

    async function handleSubmit(e) {
        e.preventDefault()
        if (!validate()) return
        setSaving(true); setErrors({})
        try {
            await authService.changePassword(currentPw, newPw)
            toast.success('Password changed successfully')
            setCurrentPw(''); setNewPw(''); setConfirmPw('')
        } catch (err) {
            setErrors({ form: apiError(err) })
        } finally { setSaving(false) }
    }

    return (
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div>
                <FieldLabel>Current Password</FieldLabel>
                <SInput type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} placeholder="Enter current password"/>
                {errors.current && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>{errors.current}</p>}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                    <FieldLabel>New Password</FieldLabel>
                    <SInput type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters"/>
                    {errors.new && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>{errors.new}</p>}
                </div>
                <div style={{ flex: 1 }}>
                    <FieldLabel>Confirm New Password</FieldLabel>
                    <SInput type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password"/>
                    {errors.confirm && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>{errors.confirm}</p>}
                </div>
            </div>
            {errors.form && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{errors.form}</p>}
            <button type="submit" disabled={saving} style={{ ...primaryBtn, opacity: saving ? 0.7 : 1, marginTop: 4 }}
                onMouseEnter={e => { if(!saving) e.currentTarget.style.background = '#334155' }}
                onMouseLeave={e => { e.currentTarget.style.background = '#0f172a' }}>
                <Lock size={14} aria-hidden="true"/>
                {saving ? 'Updating...' : 'Update Password'}
            </button>
        </form>
    )
}

// ── Student: OTP-based change (send code to own email, then confirm) ────────
function OtpPasswordChangeForm({ email }) {
    const toast = useToast()
    const [step,        setStep]        = useState('idle') // 'idle' | 'sent' | 'done'
    const [sending,     setSending]     = useState(false)
    const [submitting,  setSubmitting]  = useState(false)
    const [cooldown,    setCooldown]    = useState(0)
    const [otpCode,     setOtpCode]     = useState('')
    const [newPw,       setNewPw]       = useState('')
    const [confirmPw,   setConfirmPw]   = useState('')
    const [errors,      setErrors]      = useState({})
    const cooldownRef = useRef(null)
    useEffect(() => () => clearInterval(cooldownRef.current), [])

    function startCooldown() {
        let t = RESEND_COOLDOWN; setCooldown(t)
        cooldownRef.current = setInterval(() => {
            t -= 1; setCooldown(t)
            if (t <= 0) clearInterval(cooldownRef.current)
        }, 1000)
    }

    async function handleSendCode() {
        if (sending || cooldown > 0) return
        setSending(true); setErrors({})
        try {
            await authService.requestPasswordReset(email)
            toast.success(`Verification code sent to ${email}`)
            setStep('sent')
            startCooldown()
        } catch (err) {
            setErrors({ form: apiError(err) })
        } finally { setSending(false) }
    }

    function validate() {
        const e = {}
        if (!otpCode.trim())                    e.code = 'Enter the 6-digit code'
        else if (otpCode.trim().length !== 6)   e.code = 'Code must be 6 digits'
        if (!newPw)                             e.new = 'New password is required'
        else if (newPw.length < 8)              e.new = 'Minimum 8 characters'
        if (!confirmPw)                          e.confirm = 'Please confirm your new password'
        else if (newPw !== confirmPw)            e.confirm = 'Passwords do not match'
        setErrors(e)
        return !Object.keys(e).length
    }

    async function handleConfirm(e) {
        e.preventDefault()
        if (!validate()) return
        setSubmitting(true); setErrors({})
        try {
            await authService.resetPassword(email, otpCode.trim(), newPw)
            toast.success('Password changed successfully')
            setStep('done')
            setOtpCode(''); setNewPw(''); setConfirmPw('')
        } catch (err) {
            const msg = apiError(err)
            setErrors({ form: msg.toLowerCase().includes('invalid') || msg.toLowerCase().includes('expired')
                ? 'This code is invalid or has expired. Please request a new one.'
                : msg })
        } finally { setSubmitting(false) }
    }

    if (step === 'idle') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                    For your security, students change their password using a verification code
                    sent to <strong>{email}</strong> — no need to remember your current password.
                </p>
                {errors.form && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{errors.form}</p>}
                <button type="button" onClick={handleSendCode} disabled={sending} style={{ ...primaryBtn, opacity: sending ? 0.7 : 1 }}
                    onMouseEnter={e => { if(!sending) e.currentTarget.style.background = '#334155' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0f172a' }}>
                    <Mail size={14} aria-hidden="true"/>
                    {sending ? 'Sending...' : 'Send Verification Code'}
                </button>
            </div>
        )
    }

    if (step === 'done') {
        return (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 0' }}>
                <CheckCircle2 size={18} style={{ color: '#16A34A', flexShrink: 0 }}/>
                <p style={{ fontSize: 13, color: '#0f172a', margin: 0, fontFamily: 'var(--font-body)' }}>
                    Password updated. Use your new password next time you sign in.
                </p>
            </div>
        )
    }

    // step === 'sent'
    return (
        <form onSubmit={handleConfirm} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0, fontFamily: 'var(--font-body)', lineHeight: 1.6 }}>
                A 6-digit code was sent to <strong>{email}</strong>. Enter it below along with your new password.
            </p>
            <div>
                <FieldLabel>Verification Code</FieldLabel>
                <SInput value={otpCode} onChange={e => setOtpCode(e.target.value.replace(/\D/g, ''))} placeholder="6-digit code"/>
                {errors.code && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>{errors.code}</p>}
            </div>
            <div style={{ display: 'flex', gap: 16 }}>
                <div style={{ flex: 1 }}>
                    <FieldLabel>New Password</FieldLabel>
                    <SInput type="password" value={newPw} onChange={e => setNewPw(e.target.value)} placeholder="Min. 8 characters"/>
                    {errors.new && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>{errors.new}</p>}
                </div>
                <div style={{ flex: 1 }}>
                    <FieldLabel>Confirm New Password</FieldLabel>
                    <SInput type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Re-enter new password"/>
                    {errors.confirm && <p style={{ fontSize: 12, color: '#dc2626', margin: '6px 0 0' }}>{errors.confirm}</p>}
                </div>
            </div>
            {errors.form && <p style={{ fontSize: 12, color: '#dc2626', margin: 0 }}>{errors.form}</p>}
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 4 }}>
                <button type="submit" disabled={submitting} style={{ ...primaryBtn, opacity: submitting ? 0.7 : 1 }}
                    onMouseEnter={e => { if(!submitting) e.currentTarget.style.background = '#334155' }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#0f172a' }}>
                    <KeyRound size={14} aria-hidden="true"/>
                    {submitting ? 'Updating...' : 'Update Password'}
                </button>
                <button type="button" onClick={handleSendCode} disabled={cooldown > 0 || sending}
                    style={{ background: 'none', border: 'none', fontSize: 12, fontWeight: 600, cursor: cooldown > 0 ? 'default' : 'pointer', color: cooldown > 0 ? '#94a3b8' : '#4f46e5', padding: 0 }}>
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Didn't get it? Resend"}
                </button>
            </div>
        </form>
    )
}

function SecurityCard({ user }) {
    const isOtpBased = user?.role === 'student'
    return (
        <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                <ShieldCheck size={15} style={{ color: '#4f46e5' }} aria-hidden="true"/>
                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#0f172a', margin: 0 }}>
                    Password &amp; Security
                </h3>
            </div>
            <div style={{ padding: '24px 20px' }}>
                {isOtpBased
                    ? <OtpPasswordChangeForm email={user.email}/>
                    : <CurrentPasswordChangeForm/>}
            </div>
        </div>
    )
}

export default function SettingsPage() {
    const { user, logout, refreshUser } = useAuth()
    const toast   = useToast()
    const confirm = useConfirm()

    const [fullName, setFullName] = useState(user?.full_name || '')
    const [email,    setEmail]    = useState(user?.email     || '')
    const [saving,   setSaving]   = useState(false)

    async function handleSave(e) {
        e.preventDefault()
        setSaving(true)
        try {
            await authService.updateMe({ full_name:fullName.trim(), email:email.trim() })
            await refreshUser()
            toast.success('Profile updated successfully')
        } catch (err) {
            toast.error(apiError(err))
        } finally { setSaving(false) }
    }

    async function handleLogout() {
        const ok = await confirm({ 
            title: 'Sign out?', 
            message: 'You will be returned to the login screen.', 
            confirmLabel: 'Sign Out' 
        })
        if (ok) logout()
    }

    async function handleDeleteAccount() {
        const ok = await confirm({
            title: 'Delete Account',
            message: 'Are you sure you want to delete this account permanently?',
            confirmLabel: 'Delete',
            isDanger: true 
        })
        
        if (ok) {
            try {
                await authService.deleteAccount()
                toast.success('Account deleted successfully')
                logout()
            } catch (err) {
                toast.error(apiError(err))
            }
        }
    }

    const roleStyle = {
        admin:   { bg: '#fef3c7', text: '#92400e' },
        teacher: { bg: '#e0e7ff', text: '#3730a3' },
        student: { bg: '#f1f5f9', text: '#334155' },
    }[user?.role] || { bg: '#f1f5f9', text: '#334155' }

    return (
        <div style={{ maxWidth: 540, display: 'flex', flexDirection: 'column', gap: 20 }} className="anim-fade-in">

            {/* Profile Information */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    <User size={15} style={{ color: '#4f46e5' }} aria-hidden="true"/>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#0f172a', margin: 0 }}>
                        Personal Information
                    </h3>
                </div>
                
                <div style={{ padding: '24px 20px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
                        <div style={{ width: 56, height: 56, borderRadius: '12px', background: 'linear-gradient(135deg, #4f46e5, #312e81)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '20px', fontWeight: 700, fontFamily: 'var(--font-display)', flexShrink: 0 }}>
                            {(user?.full_name || user?.username || '?').charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <p style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '16px', color: '#0f172a', margin: '0 0 4px' }}>
                                {user?.full_name || user?.username}
                            </p>
                            <span style={{ display: 'inline-block', fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '99px', background: roleStyle.bg, color: roleStyle.text, textTransform: 'capitalize' }}>
                                {user?.role}
                            </span>
                        </div>
                    </div>

                    <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                        <div style={{ display: 'flex', gap: 16 }}>
                            <div style={{ flex: 1 }}>
                                <FieldLabel>Full Name</FieldLabel>
                                <SInput value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Enter your full name"/>
                            </div>
                            <div style={{ flex: 1 }}>
                                <FieldLabel>Email Address</FieldLabel>
                                <SInput type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/>
                            </div>
                        </div>
                        <button type="submit" disabled={saving}
                            style={{ ...primaryBtn, opacity: saving ? 0.7 : 1, marginTop: '8px' }}
                            onMouseEnter={e => { if(!saving) e.currentTarget.style.background = '#334155' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#0f172a' }}>
                            <Save size={14} aria-hidden="true"/>
                            {saving ? 'Saving Changes...' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </div>

            {/* Password & Security — role-branched */}
            <SecurityCard user={user}/>

            {/* Account Management & Actions */}
            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden', boxShadow: '0 1px 3px rgba(0,0,0,0.02)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fafafa' }}>
                    <Settings size={15} style={{ color: '#475569' }} aria-hidden="true"/>
                    <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: '14px', color: '#0f172a', margin: 0 }}>
                        Account Actions
                    </h3>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    {/* Sign Out Row */}
                    <div style={{ padding: '20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Sign Out</p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', fontFamily: 'var(--font-body)' }}>Securely end your session on this device.</p>
                        </div>
                        <button onClick={handleLogout}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#334155', border: '1px solid #cbd5e1', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#cbd5e1' }}>
                            <LogOut size={14} aria-hidden="true"/> Sign Out
                        </button>
                    </div>

                    {/* Delete Account Row */}
                    <div style={{ padding: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
                        <div>
                            <p style={{ fontSize: '13px', fontWeight: 600, color: '#0f172a', margin: 0 }}>Delete Account</p>
                            <p style={{ fontSize: '12px', color: '#64748b', margin: '4px 0 0', fontFamily: 'var(--font-body)' }}>Permanently remove your account and all associated data.</p>
                        </div>
                        <button onClick={handleDeleteAccount}
                            style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#fff', color: '#ef4444', border: '1px solid #fca5a5', borderRadius: '8px', padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.2s' }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#fef2f2'; e.currentTarget.style.borderColor = '#ef4444' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#fca5a5' }}>
                            <Trash2 size={14} aria-hidden="true"/> Delete Account
                        </button>
                    </div>
                </div>
            </div>

            <DashboardFooter/>
        </div>
    )
}
