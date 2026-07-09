import React from 'react'
import { NavLink } from 'react-router-dom'
import {
    LayoutDashboard, CalendarDays, BookOpen, BarChart3,
    Settings, LogOut, Users, ShieldCheck,
    GraduationCap, ClipboardList, Upload, UserCircle,
} from 'lucide-react'

const NAV = {
    admin: [
        { to: '/app/admin',          icon: <LayoutDashboard size={15}/>, label: 'Dashboard'    },
        { to: '/app/admin/calendar', icon: <CalendarDays size={15}/>,    label: 'Calendar'     },
        { to: '/app/settings',       icon: <Settings size={15}/>,        label: 'Settings'     },
    ],
    teacher: [
        { to: '/app/teacher',        icon: <LayoutDashboard size={15}/>, label: 'Dashboard'    },
        { to: '/app/courses',        icon: <BookOpen size={15}/>,        label: 'Courses'      },
        { to: '/app/assignments',    icon: <ClipboardList size={15}/>,   label: 'Assignments'  },
        { to: '/app/submissions',    icon: <Upload size={15}/>,          label: 'Submissions'  },
        { to: '/app/analytics',      icon: <BarChart3 size={15}/>,       label: 'Analytics'    },
        { to: '/app/calendar',       icon: <CalendarDays size={15}/>,    label: 'Calendar'     },
        { to: '/app/settings',       icon: <Settings size={15}/>,        label: 'Settings'     },
    ],
    student: [
        { to: '/app/dashboard',      icon: <LayoutDashboard size={15}/>, label: 'Dashboard'    },
        { to: '/app/courses',        icon: <BookOpen size={15}/>,        label: 'My Courses'   },
        { to: '/app/assignments',    icon: <ClipboardList size={15}/>,   label: 'Assignments'  },
        { to: '/app/calendar',       icon: <CalendarDays size={15}/>,    label: 'Calendar'     },
        { to: '/app/recommendations',icon: <BarChart3 size={15}/>,       label: 'Recommendations' },
        { to: '/app/settings',       icon: <Settings size={15}/>,        label: 'Settings'        },
    ],
}

const ROLE_BADGE = {
    admin:   { bg: 'rgba(255,255,255,0.14)', color: '#fff', label: 'Administrator' },
    teacher: { bg: 'rgba(255,255,255,0.14)', color: '#fff', label: 'Teacher'       },
    student: { bg: 'rgba(255,255,255,0.14)', color: '#fff', label: 'Student'       },
}

export default function Sidebar({ user, onLogout, collapsed, mobileOpen }) {
    const links = NAV[user?.role] || NAV.student
    const badge = ROLE_BADGE[user?.role] || ROLE_BADGE.student
    const init  = (user?.full_name || user?.username || '?').charAt(0).toUpperCase()
    const name  = user?.full_name || user?.username || 'User'

    return (
        <aside
            className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`}
            aria-label="Main navigation"
        >
            {/* Brand */}
            <div style={{ display:'flex', alignItems:'center', gap:10, padding: collapsed ? '16px 12px' : '16px 14px', borderBottom:'1px solid rgba(255,255,255,0.10)', flexShrink:0 }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                    <GraduationCap size={14} color="#fff"/>
                </div>
                {!collapsed && (
                    <div style={{ overflow:'hidden' }}>
                        <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'#fff', letterSpacing:'-0.01em', lineHeight:1, margin:0 }}>TaskOra</p>
                        <p style={{ fontSize:9, color:'rgba(255,255,255,0.55)', textTransform:'uppercase', letterSpacing:'0.12em', margin:'2px 0 0' }}>Academic Tracker</p>
                    </div>
                )}
            </div>

            {/* Role badge */}
            {!collapsed && (
                <div style={{ padding:'8px 14px 4px' }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:9, fontWeight:700, textTransform:'uppercase', padding:'3px 8px', borderRadius:99, background:badge.bg, color:badge.color, fontFamily:'var(--font-display)' }}>
                        {user?.role === 'admin' && <ShieldCheck size={9}/>}
                        {badge.label}
                    </span>
                </div>
            )}

            {/* Nav */}
            <nav style={{ flex:1, padding:'8px', display:'flex', flexDirection:'column', gap:1, overflowY:'auto', overflowX:'hidden' }}>
                {links.map((n, idx) => (
                    <NavLink
                        key={n.to + idx}
                        to={n.to}
                        end={n.to === '/app/admin' || n.to === '/app/teacher' || n.to === '/app/dashboard'}
                        title={collapsed ? n.label : undefined}
                        className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                    >
                        <span className="nav-icon" style={{ flexShrink:0 }}>{n.icon}</span>
                        {!collapsed && (
                            <span style={{ fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                                {n.label}
                            </span>
                        )}
                    </NavLink>
                ))}
            </nav>

            {/* User footer */}
            <div style={{ borderTop:'1px solid rgba(255,255,255,0.10)', padding:'8px', flexShrink:0 }}>
                {!collapsed && (
                    <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px', marginBottom:4, borderRadius:8, background:'rgba(255,255,255,0.06)' }}>
                        <div style={{ width:28, height:28, borderRadius:'50%', background:'var(--color-primary)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'#fff' }}>
                            {init}
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                            <p style={{ fontSize:12, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{name}</p>
                            <p style={{ fontSize:10, color:'rgba(255,255,255,0.55)', margin:0, textTransform:'capitalize' }}>{user?.role}</p>
                        </div>
                    </div>
                )}
                <button onClick={onLogout} className="nav-item"
                    style={{ color:'rgba(255,255,255,0.85)', width:'100%', border:'none', background:'none', textAlign:'left', cursor:'pointer' }}>
                    <LogOut size={14} style={{ flexShrink:0 }}/>
                    {!collapsed && <span style={{ fontSize:13, marginLeft:8 }}>Sign Out</span>}
                </button>
            </div>
        </aside>
    )
}