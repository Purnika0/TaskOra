// App shell: Sidebar + Topbar + scrollable <Outlet> + SiteFooter (Student/Teacher only).
// DashboardShell has one small piece of role-based rendering — whether
// SiteFooter shows (hidden for Admin) — everything else is layout-only.
// Which URL maps to which component, and role access itself, are still
// entirely handled by:
//   • AppRoutes.jsx  (which URL maps to which component)
//   • ProtectedRoute (enforces allowedRoles before any component mounts)
//
// The <Outlet /> here will ONLY ever render whatever component AppRoutes
// assigned — it cannot accidentally render the wrong dashboard.

import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { BookOpen, GraduationCap, ShieldCheck } from 'lucide-react'
import Sidebar        from '../components/layout/Sidebar.jsx'
import { SiteFooter } from '../components/layout/Footer.jsx'
import { useAuth }    from '../hooks/useAuth.js'
import NotificationBell from '../components/notifications/NotificationBell.jsx'

// Same icon/design language as the Student / Teacher role toggle on the
// auth page (see role-tabs in AuthPage.jsx) — reused here so the header
// avatar stays visually consistent with the login screen instead of
// introducing a new icon.
function RoleAvatarIcon({ role }) {
    if (role === 'admin')   return <ShieldCheck size={14} color="#ffffff" strokeWidth={2.25}/>
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
                    on short pages, and lets it flow naturally after long pages.
                    SiteFooter is intentionally omitted for Admin — the admin dashboard is
                    an internal tool, not a page visitors browse, so the marketing-style
                    footer (About/Contact/Legal links) doesn't belong there. Student and
                    Teacher dashboards keep it. */}
                <main className="content">
                    <div className="content-inner">
                        <Outlet/>
                    </div>
                    {user?.role !== 'admin' && <SiteFooter/>}
                </main>
            </div>
        </div>
    )
}