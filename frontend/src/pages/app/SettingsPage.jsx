// src/pages/app/SettingsPage.jsx
import React, { useState } from 'react'
import { Save, LogOut, User, Trash2, Settings } from 'lucide-react'
import { useAuth }     from '../../hooks/useAuth.js'
import { useToast }    from '../../context/ToastContext.jsx'
import { useConfirm }  from '../../context/ConfirmContext.jsx'
import authService     from '../../services/auth.service.js'
import { DashboardFooter } from '../../components/layout/Footer.jsx'
import { apiError }    from '../../utils/helpers.js'

const baseInp = {
    width: '100%', border: '1px solid #cbd5e1', borderRadius: '8px',
    padding: '10px 14px', fontSize: '13px', fontFamily: 'var(--font-body)',
    color: '#0f172a', background: '#f8fafc', outline: 'none',
    transition: 'all 0.2s ease',
    boxSizing: 'border-box',
}

function SInput({ value, onChange, type='text', placeholder }) {
    const [f, setF] = useState(false)
    return (
        <input 
            value={value} onChange={onChange} type={type} placeholder={placeholder}
            style={{ 
                ...baseInp, 
                borderColor: f ? '#4f46e5' : '#cbd5e1', 
                boxShadow: f ? '0 0 0 3px rgba(79, 70, 229, 0.1)' : 'none', 
                background: f ? '#fff' : '#f8fafc' 
            }}
            onFocus={() => setF(true)} 
            onBlur={() => setF(false)}
        />
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
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                                    Full Name
                                </label>
                                <SInput value={fullName} onChange={e=>setFullName(e.target.value)} placeholder="Enter your full name"/>
                            </div>
                            <div style={{ flex: 1 }}>
                                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: 6, fontFamily: 'var(--font-body)' }}>
                                    Email Address
                                </label>
                                <SInput type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="name@company.com"/>
                            </div>
                        </div>
                        <button type="submit" disabled={saving}
                            style={{ display: 'flex', alignItems: 'center', gap: 8, alignSelf: 'flex-start', background: '#0f172a', color: '#fff', border: 'none', borderRadius: '8px', padding: '10px 20px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-display)', transition: 'background 0.2s', opacity: saving ? 0.7 : 1, marginTop: '8px' }}
                            onMouseEnter={e => { if(!saving) e.currentTarget.style.background = '#334155' }}
                            onMouseLeave={e => { e.currentTarget.style.background = '#0f172a' }}>
                            <Save size={14} aria-hidden="true"/>
                            {saving ? 'Saving Changes...' : 'Save Changes'}
                        </button>
                    </form>
                </div>
            </div>

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