    import React from 'react'
    import { NavLink } from 'react-router-dom'
    import {
    LayoutDashboard, CalendarDays, CheckSquare, BarChart3,
    Settings, LogOut, Users, ShieldCheck, Zap,
    GraduationCap, Sparkles, Activity, Globe,
    } from 'lucide-react'

    // ── Navigation configuration — role-scoped ──────────────────────────────────
    const NAV = {
    admin: [
        { to: '/app/admin', icon: <LayoutDashboard size={15}/>, label: 'Overview'         },
        { to: '/app/admin', icon: <Users size={15}/>,           label: 'User Management'  },
        { to: '/app/admin', icon: <BarChart3 size={15}/>,       label: 'Analytics'        },
        { to: '/app/admin', icon: <Activity size={15}/>,        label: 'Activity Monitor' },
        { to: '/app/admin', icon: <CalendarDays size={15}/>,    label: 'Calendar'         },
        // Settings deliberately excluded for admin — no system settings page
    ],
    teacher: [
        { to: '/app/teacher',  icon: <LayoutDashboard size={15}/>, label: 'Dashboard'  },
        { to: '/app/courses',  icon: <GraduationCap size={15}/>,   label: 'Courses'    },
        { to: '/app/tasks',    icon: <CheckSquare size={15}/>,     label: 'Tasks'      },
        { to: '/app/analytics',icon: <BarChart3 size={15}/>,       label: 'Analytics'  },
        { to: '/app/settings', icon: <Settings size={15}/>,        label: 'Settings'   },
    ],
    student: [
        { to: '/app/dashboard',       icon: <LayoutDashboard size={15}/>, label: 'Dashboard'        },
        { to: '/app/tasks',           icon: <CheckSquare size={15}/>,     label: 'Assignments'      },
        { to: '/app/calendar',        icon: <CalendarDays size={15}/>,    label: 'Calendar'         },
        { to: '/app/courses',         icon: <GraduationCap size={15}/>,   label: 'Courses'          },
        { to: '/app/analytics',       icon: <BarChart3 size={15}/>,       label: 'Analytics'        },
        { to: '/app/recommendations', icon: <Sparkles size={15}/>,        label: 'Recommendations'  },
        { to: '/app/settings',        icon: <Settings size={15}/>,        label: 'Settings'         },
    ],
    }

    const ROLE_BADGE = {
    admin:   { bg: 'rgba(251,191,36,0.13)',  color: 'rgb(252,211,77)',  label: 'Administrator' },
    teacher: { bg: 'rgba(167,139,250,0.13)', color: 'rgb(196,181,253)', label: 'Teacher'       },
    student: { bg: 'rgba(96,165,250,0.13)',  color: 'rgb(147,197,253)', label: 'Student'       },
    }

    export default function Sidebar({ user, onLogout, collapsed, mobileOpen }) {
    const links = NAV[user?.role] || NAV.student
    const badge = ROLE_BADGE[user?.role] || ROLE_BADGE.student
    const init  = (user?.full_name || user?.username || '?').charAt(0).toUpperCase()
    const name  = user?.full_name || user?.username || 'User'

    return (
        <aside className={`sidebar${collapsed ? ' collapsed' : ''}${mobileOpen ? ' mobile-open' : ''}`} aria-label="Main navigation">

        {/* Brand Header */}
        <div style={{ display:'flex', alignItems:'center', gap:10, padding: collapsed ? '16px 12px' : '16px 14px', borderBottom:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
            <div style={{ width:30, height:30, borderRadius:8, background:'linear-gradient(135deg,#3b6fd4,#6d4fc2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
            <Zap size={14} color="#fff"/>
            </div>
            {!collapsed && (
            <div style={{ overflow:'hidden' }}>
                <p style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:14, color:'#fff', letterSpacing:'-0.01em', lineHeight:1, margin:0 }}>TaskOra</p>
                <p style={{ fontSize:9, color:'rgba(255,255,255,0.22)', textTransform:'uppercase', letterSpacing:'0.12em', margin:'2px 0 0' }}>Academic Tracker</p>
            </div>
            )}
        </div>

        {/* Role Badge */}
        {!collapsed && (
            <div style={{ padding:'8px 14px 4px' }}>
            <span style={{ display:'inline-flex', alignItems:'center', gap:4, fontSize:9, fontWeight:700, textTransform:'uppercase', padding:'3px 8px', borderRadius:99, background:badge.bg, color:badge.color, fontFamily:'var(--font-display)' }}>
                {user?.role === 'admin' && <ShieldCheck size={9}/>}
                {badge.label}
            </span>
            </div>
        )}

        {/* Navigation List */}
        <nav style={{ flex:1, padding:'8px', display:'flex', flexDirection:'column', gap:1, overflowY:'auto', overflowX:'hidden' }}>
            {links.map((n, idx) => (
            <NavLink
                key={n.to + n.label + idx}
                to={n.to}
                end={user?.role === 'admin' ? false : (n.to === '/app/dashboard' || n.to === '/app/teacher')}
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

        {/* Footer / User Profile */}
        <div style={{ borderTop:'1px solid rgba(255,255,255,0.06)', padding:'8px', flexShrink:0 }}>
            {!collapsed && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'8px', marginBottom:4, borderRadius:8, background:'rgba(255,255,255,0.04)' }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'linear-gradient(135deg,#3b6fd4,#6d4fc2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:11, fontWeight:700, color:'#fff' }}>
                {init}
                </div>
                <div style={{ flex:1, minWidth:0 }}>
                <p style={{ fontSize:12, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', margin:0 }}>{name}</p>
                <p style={{ fontSize:10, color:'rgba(255,255,255,0.25)', margin:0, textTransform:'capitalize' }}>{user?.role}</p>
                </div>
            </div>
            )}
            <button
            onClick={onLogout}
            className="nav-item"
            style={{ color:'rgba(239,68,68,0.55)', width:'100%', border:'none', background:'none', textAlign:'left', cursor:'pointer' }}
            >
            <LogOut size={14} style={{ flexShrink:0 }}/>
            {!collapsed && <span style={{ fontSize:13, marginLeft:8 }}>Logout</span>}
            </button>
        </div>
        </aside>
    )
    }
