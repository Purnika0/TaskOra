// src/components/layout/Footer.jsx
import React from 'react'
import { Link } from 'react-router-dom'
import { Mail, Zap } from 'lucide-react'

function NavLink({ to, href, children }) {
    const base = {
        color: 'rgba(255,255,255,0.7)',
        fontSize: 13,
        textDecoration: 'none',
        fontFamily: 'var(--font-body)',
        transition: 'color 0.15s ease',
        display: 'block',
        lineHeight: 1.5,
        marginBottom: 8,
    }
    const on  = e => (e.currentTarget.style.color = '#ffffff')
    const off = e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')
    if (href) return <a href={href} style={base} onMouseEnter={on} onMouseLeave={off}>{children}</a>
    return <Link to={to} style={base} onMouseEnter={on} onMouseLeave={off}>{children}</Link>
}

export function SiteFooter() {
    return (
        <footer style={{
            background: '#0f172a',
            margin: 'auto -24px -24px -24px',
            borderTop: '1px solid rgba(255,255,255,0.1)'
        }}>
            <style>{`
                .ft-wrap {
                    max-width: 1080px; margin: 0 auto;
                    padding: 32px 24px 24px;
                    display: grid; grid-template-columns: 2fr 1fr; gap: 40px;
                }
                @media (max-width: 580px) {
                    .ft-wrap { grid-template-columns: 1fr; gap: 24px; padding: 24px 16px 20px; }
                }
                .ft-bar {
                    border-top: 1px solid rgba(255,255,255,0.1);
                    padding: 16px 24px; max-width: 1080px; margin: 0 auto;
                    display: flex; align-items: center;
                    justify-content: space-between; flex-wrap: wrap; gap: 12px;
                }
                @media (max-width: 580px) {
                    .ft-bar { padding: 12px 16px; flex-direction: column; align-items: flex-start; gap: 8px; }
                }
            `}</style>

            <div className="ft-wrap">
                <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:'linear-gradient(135deg, #4f46e5, #312e81)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <Zap size={14} color="#ffffff" />
                        </div>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#ffffff', letterSpacing:'-0.01em' }}>
                            TaskOra
                        </span>
                    </div>
                    <p style={{ fontSize:13, color:'rgba(255,255,255,0.6)', lineHeight:1.6, margin:'0 0 16px', maxWidth:320, fontFamily:'var(--font-body)' }}>
                        Academic task management for IT students. A final-year project built for real classroom use.
                    </p>
                    {/* FIXED: correct email — opens Gmail/mail client */}
                    <a
                        href="mailto:taskora2083@gmail.com"
                        style={{ display:'inline-flex', alignItems:'center', gap:8, fontSize:13, color:'rgba(255,255,255,0.7)', textDecoration:'none', fontFamily:'var(--font-body)', transition:'color 0.15s ease' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#ffffff')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    >
                        <Mail size={14} />
                        taskora2083@gmail.com
                    </a>
                </div>

                <div>
                    <p style={{ fontSize:11, fontWeight:700, color:'rgba(255,255,255,0.5)', textTransform:'uppercase', letterSpacing:'0.1em', marginBottom:12, fontFamily:'var(--font-display)' }}>
                        Links
                    </p>
                    <NavLink to="/contact">Contact Us</NavLink>
                    <NavLink to="/auth">Sign In</NavLink>
                    <NavLink to="/app/tasks">Task Management</NavLink>
                    <NavLink to="/app/calendar">Calendar</NavLink>
                    <NavLink to="/app/analytics">Analytics</NavLink>
                </div>
            </div>

            <div className="ft-bar">
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.5)', margin:0, fontFamily:'var(--font-body)' }}>
                    © {new Date().getFullYear()} TaskOra · Academic Task Management System
                </p>
                <a
                    href="mailto:taskora2083@gmail.com"
                    style={{ fontSize:12, color:'rgba(255,255,255,0.35)', textDecoration:'none', fontFamily:'var(--font-body)', transition:'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.7)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.35)')}
                >
                    taskora2083@gmail.com
                </a>
            </div>
        </footer>
    )
}

export function DashboardFooter() { return null }
export default SiteFooter
