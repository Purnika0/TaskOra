// src/routes/DashboardShell.jsx
//
// App shell: Sidebar + Topbar + scrollable <Outlet> + SiteFooter.
// DashboardShell itself has NO role-based rendering logic — it only provides
// the layout frame.  Role decisions are entirely handled by:
//   • AppRoutes.jsx  (which URL maps to which component)
//   • ProtectedRoute (enforces allowedRoles before any component mounts)
//
// This means the <Outlet /> here will ONLY ever render whatever component
// AppRoutes assigned — it cannot accidentally render the wrong dashboard.
//
// FIX: SiteFooter now sits alongside a flex:1 content-inner wrapper so it
// sticks to the bottom of the viewport on short pages and flows naturally
// after long pages. No role logic changed.

import React, { useState } from 'react'
import { Outlet, useNavigate } from 'react-router-dom'
import { BookOpen, GraduationCap } from 'lucide-react'
import Sidebar        from '../components/layout/Sidebar.jsx'
import { SiteFooter } from '../components/layout/Footer.jsx'
import { useAuth }    from '../hooks/useAuth.js'
import NotificationBell from '../components/notifications/NotificationBell.jsx'

// Same icon/design language as the Student / Teacher role toggle on the
// auth page (see role-tabs in AuthPage.jsx) — reused here so the header
// avatar stays visually consistent with the login screen instead of
// introducing a new icon.
function RoleAvatarIcon({ role }) {
    if (role === 'student') return <BookOpen size={14} color="#ffffff" strokeWidth={2.25}/>
    return <GraduationCap size={14} color="#ffffff" strokeWidth={2.25}/>
}

function HamburgerIcon() {
    return (
        <svg width="16" height="13" viewBox="0 0 16 13" fill="none" aria-hidden="true">
            <rect y="0"   width="16" height="2" rx="1" fill="currentColor"/>
            <rect y="5.5" width="16" height="2" rx="1" fill="currentColor"/>
            <rect y="11"  width="16" height="2" rx="1" fill="currentColor"/>
        </svg>
    )
}

export default function DashboardShell() {
    const { user, logout } = useAuth()
    const navigate = useNavigate()
    const [collapsed,  setCollapsed]  = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)

    function toggle() {
        if (window.innerWidth < 768) setMobileOpen(o => !o)
        else setCollapsed(c => !c)
    }

    return (
        <div className="shell">
            <Sidebar user={user} onLogout={logout} collapsed={collapsed} mobileOpen={mobileOpen}/>

            {/* Mobile dim overlay — close sidebar on outside click */}
            {mobileOpen && (
                <div
                    onClick={() => setMobileOpen(false)}
                    style={{ position:'fixed', inset:0, zIndex:35, background:'rgba(0,0,0,0.42)', backdropFilter:'blur(1px)' }}
                    aria-hidden="true"
                />
            )}

            <div className="main-wrap">
                {/* Topbar */}
                <header className="topbar" style={{ justifyContent:'space-between' }}>
                    <button
                        onClick={toggle}
                        aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
                        aria-expanded={!collapsed}
                        style={{ background:'none', border:'none', cursor:'pointer', padding:'7px', display:'flex', alignItems:'center', justifyContent:'center', borderRadius:7, color:'#5a5060', transition:'background 0.12s, color 0.12s', flexShrink:0 }}
                        onMouseEnter={e => { e.currentTarget.style.background='rgba(26,31,53,0.06)' }}
                        onMouseLeave={e => { e.currentTarget.style.background='none' }}
                    >
                        <HamburgerIcon/>
                    </button>

                    {/* Right side — notifications + role badge + avatar */}
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <NotificationBell/>
                        {user?.role && (
                            <span style={{
                                fontSize:10, fontWeight:600, padding:'3px 9px', borderRadius:99,
                                background: user.role==='admin'   ? '#fffbeb'
                                        : user.role==='teacher' ? '#f0e8ff'
                                                                : '#eff3fd',
                                color:      user.role==='admin'   ? '#92400e'
                                        : user.role==='teacher' ? '#5b21b6'
                                                                : '#1d4ed8',
                                textTransform:'capitalize', fontFamily:'var(--font-display)',
                            }}>
                                {user.role}
                            </span>
                        )}
                        <div
                            title={user?.full_name || user?.username}
                            style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#3b6fd4,#6d4fc2)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', cursor:'default', flexShrink:0 }}
                        >
                            <RoleAvatarIcon role={user?.role}/>
                        </div>
                    </div>
                </header>

                {/* Main content — <Outlet /> renders whatever AppRoutes assigned for this URL.
                    content-inner is the flex:1 wrapper that pushes SiteFooter to the bottom
                    on short pages, and lets it flow naturally after long pages. */}
                <main className="content">
                    <div className="content-inner">
                        <Outlet/>
                    </div>
                    <SiteFooter/>
                </main>
            </div>
        </div>
    )
}