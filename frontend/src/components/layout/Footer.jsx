import React from 'react'
import { Link } from 'react-router-dom'
import { Mail, GraduationCap } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth.js'

function FtLink({ to, href, children }) {
    const style = {
        color: 'rgba(255,255,255,0.60)',
        fontSize: 13,
        textDecoration: 'none',
        fontFamily: 'var(--font-body)',
        transition: 'color 0.13s',
        display: 'block',
        lineHeight: 1.5,
        marginBottom: 8,
    }
    const on  = e => (e.currentTarget.style.color = '#fff')
    const off = e => (e.currentTarget.style.color = 'rgba(255,255,255,0.60)')
    if (href) return <a href={href} style={style} onMouseEnter={on} onMouseLeave={off}>{children}</a>
    return <Link to={to} style={style} onMouseEnter={on} onMouseLeave={off}>{children}</Link>
}

export function SiteFooter() {
    const { user, logout } = useAuth()

    return (
        <footer style={{
            background: 'var(--color-navy)',   /* same token as .sidebar */
            borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
            <style>{`
                .ft-wrap {
                    max-width: 1040px; margin: 0 auto;
                    padding: 36px 24px 24px;
                    display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 40px;
                }
                @media (max-width: 640px) {
                    .ft-wrap { grid-template-columns: 1fr; gap: 24px; padding: 24px 20px 16px; }
                }
                .ft-bar {
                    border-top: 1px solid rgba(255,255,255,0.08);
                    padding: 14px 24px; max-width: 1040px; margin: 0 auto;
                    display: flex; align-items: center;
                    justify-content: space-between; flex-wrap: wrap; gap: 10px;
                }
                .ft-col-title {
                    font-size: 10px; font-weight: 700;
                    color: rgba(255,255,255,0.30); text-transform: uppercase;
                    letter-spacing: 0.10em; margin-bottom: 12px;
                    font-family: var(--font-display);
                }
            `}</style>

            <div className="ft-wrap">
                <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <div style={{ width:28, height:28, borderRadius:8, background:'rgba(255,255,255,0.18)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <GraduationCap size={13} color="#fff"/>
                        </div>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, color:'#fff', letterSpacing:'-0.01em' }}>
                            TaskOra
                        </span>
                    </div>
                    <p style={{ fontSize:13, color:'rgba(255,255,255,0.45)', lineHeight:1.65, margin:'0 0 14px', maxWidth:300 }}>
                        Academic task management for IT students. Built for real classroom use.
                    </p>
                    <a href="mailto:taskora2083@gmail.com"
                        style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:12, color:'rgba(255,255,255,0.45)', textDecoration:'none', transition:'color 0.13s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.45)')}>
                        <Mail size={12}/> taskora2083@gmail.com
                    </a>
                </div>

                <div>
                    <p className="ft-col-title">Explore</p>
                    <FtLink to="/">Home</FtLink>
                    <FtLink to="/about">About</FtLink>
                    <FtLink to="/contact">Contact Us</FtLink>
                    {!user && <FtLink to="/auth">Sign In</FtLink>}
                </div>

                <div>
                    <p className="ft-col-title">App</p>
                    {user ? (
                        <>
                            <FtLink to="/app">Dashboard</FtLink>
                            <FtLink to="/app/assignments">Assignments</FtLink>
                            <FtLink to="/app/calendar">Calendar</FtLink>
                            <FtLink to="/app/analytics">Analytics</FtLink>
                        </>
                    ) : (
                        <>
                            <FtLink to="/auth">Assignments</FtLink>
                            <FtLink to="/auth">Calendar</FtLink>
                            <FtLink to="/auth">Analytics</FtLink>
                            <span style={{ fontSize:11, color:'rgba(255,255,255,0.22)', fontStyle:'italic', display:'block', marginTop:2 }}>
                                Sign in to access
                            </span>
                        </>
                    )}
                </div>
            </div>

            <div className="ft-bar">
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.30)', margin:0 }}>
                    © {new Date().getFullYear()} TaskOra · Academic Task Management System
                </p>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.18)', margin:0 }}>
                    Final Year Project
                </p>
            </div>
        </footer>
    )
}

export function DashboardFooter() { return null }

export default SiteFooter
