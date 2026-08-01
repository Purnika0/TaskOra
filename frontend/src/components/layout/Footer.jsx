import { Link } from 'react-router-dom'
import { Mail } from 'lucide-react'
import { currentBSYear } from '../../utils/helpers.js'

// Renders as <a> (href) for external/mailto links or <Link> (to) for
// internal routes, since react-router's <Link> can't handle mailto:/external URLs.
function FtLink({ to, href, children }) {
    const style = {
        color: 'rgba(255,255,255,0.75)',
        fontSize: 13,
        textDecoration: 'none',
        fontFamily: 'var(--font-body)',
        transition: 'color 0.13s',
        display: 'block',
        lineHeight: 1.5,
        marginBottom: 8,
    }
    const on  = e => (e.currentTarget.style.color = '#fff')
    const off = e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')
    if (href) return <a href={href} style={style} onMouseEnter={on} onMouseLeave={off}>{children}</a>
    return <Link to={to} style={style} onMouseEnter={on} onMouseLeave={off}>{children}</Link>
}

// Rendered only on public/marketing (portal) pages — app dashboard layouts
// (DashboardShell) never render a footer. Since signed-in users never see
// this, there's no Portal/Dashboard column or Sign In button here — just the
// public redirects a visitor actually needs, split into Explore / Legal /
// Get in touch so each group stays short and scannable.
export function SiteFooter() {
    return (
        <footer style={{
            background: 'var(--color-navy)', // same token as .sidebar, for a consistent dark UI chrome
            borderTop: '1px solid rgba(255,255,255,0.08)',
        }}>
            <style>{`
                .ft-wrap {
                    max-width: 1040px; margin: 0 auto;
                    padding: 44px 24px 28px;
                    display: grid; grid-template-columns: 1.4fr 0.8fr 0.8fr 1fr; gap: 40px;
                }
                @media (max-width: 900px) {
                    .ft-wrap { grid-template-columns: 1fr 1fr; gap: 32px 28px; }
                }
                @media (max-width: 600px) {
                    .ft-wrap { grid-template-columns: 1fr; gap: 28px; padding: 32px 20px 20px; text-align: center; }
                    .ft-wrap > div { display: flex; flex-direction: column; align-items: center; }
                }
                .ft-bar {
                    border-top: 1px solid rgba(255,255,255,0.08);
                    padding: 16px 24px; max-width: 1040px; margin: 0 auto;
                    display: flex; align-items: center;
                    justify-content: center; flex-wrap: wrap; gap: 10px;
                }
                .ft-col-title {
                    font-size: 10.5px; font-weight: 700;
                    color: rgba(255,255,255,0.80); text-transform: uppercase;
                    letter-spacing: 0.09em; margin: 0 0 14px;
                    font-family: var(--font-display);
                }
            `}</style>

            <div className="ft-wrap">
                {/* Brand */}
                <div>
                    <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                        <div style={{ width:28, height:28, borderRadius:8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                            <img src="/logo2.png" alt="TaskOra logo" width={28} height={28} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                        </div>
                        <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, color:'#fff', letterSpacing:'-0.01em' }}>
                            TaskOra
                        </span>
                    </div>
                    <p style={{ fontSize:13, color:'rgba(255,255,255,0.65)', lineHeight:1.65, margin:0, maxWidth:280 }}>
                        Course-based assignment and task management for students. Built for real classroom use.
                    </p>
                </div>

                {/* Explore */}
                <div>
                    <p className="ft-col-title">Explore</p>
                    <FtLink to="/">Home</FtLink>
                    <FtLink to="/about">About</FtLink>
                    <FtLink to="/contact">Contact Us</FtLink>
                </div>

                {/* Legal */}
                <div>
                    <p className="ft-col-title">Legal</p>
                    <FtLink to="/legal">Privacy & Terms</FtLink>
                </div>

                {/* Get in touch */}
                <div>
                    <p style={{ fontSize:13, fontWeight:600, color:'#fff', margin:'0 0 14px', fontFamily:'var(--font-body)' }}>
                        Get in touch:
                    </p>
                    <a href="mailto:taskora2083@gmail.com"
                        style={{ display:'inline-flex', alignItems:'center', gap:7, fontSize:13, color:'rgba(255,255,255,0.75)', textDecoration:'none', transition:'color 0.13s' }}
                        onMouseEnter={e => (e.currentTarget.style.color = '#fff')}
                        onMouseLeave={e => (e.currentTarget.style.color = 'rgba(255,255,255,0.75)')}>
                        <Mail size={13}/> taskora2083@gmail.com
                    </a>
                </div>
            </div>

            <div className="ft-bar">
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.60)', margin:0 }}>
                    © {currentBSYear()} TaskOra · Course-Based Assignment and Task Management System
                </p>
            </div>
        </footer>
    )
}

export default SiteFooter