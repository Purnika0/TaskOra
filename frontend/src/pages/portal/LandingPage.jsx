import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { SiteFooter } from '../../components/layout/Footer.jsx'
import {
    GraduationCap, BarChart3, ArrowRight, Menu, X,
    Users, BookOpen, Upload, ClipboardList, ThumbsUp
} from 'lucide-react'

// STYLES
const LP_CSS = `
.lp-nav {
    position:sticky; top:0; z-index:100;
    background:#FFFFFF;
    border-bottom:1px solid var(--color-border);
    padding:0 24px; height:60px;
    display:flex; align-items:center; justify-content:space-between;
}
.lp-nav-link {
    font-size:13px; color:var(--color-text-secondary); text-decoration:none;
    padding:6px 12px; border-radius:8px;
    transition:background 0.13s, color 0.13s;
    font-family:var(--font-body); font-weight:500;
}
a.lp-nav-link:visited { color:var(--color-text-secondary); }
.lp-nav-link:hover { background:var(--color-surface-subtle); color:var(--color-text); }

/* Hero section */
.lp-hero {
    background:var(--color-surface-subtle);
    border-bottom:1px solid var(--color-border);
    padding:64px 24px 56px;
}
.lp-hero-inner {
    max-width:1040px; margin:0 auto;
    display:grid; grid-template-columns:1.1fr 0.9fr; gap:48px; align-items:center;
}
.lp-eyebrow {
    display:inline-flex; align-items:center; gap:6px;
    color:var(--color-primary); background:var(--color-primary-light);
    font-size:11px; font-weight:700; padding:5px 12px;
    border-radius:99px; margin-bottom:18px;
    font-family:var(--font-display); letter-spacing:0.04em;
    text-transform:uppercase;
}
.lp-h1 {
    font-family:var(--font-display); font-weight:800;
    font-size:clamp(28px,4.2vw,44px); color:var(--color-text);
    letter-spacing:-0.03em; line-height:1.12;
    margin:0 0 16px;
}
.lp-h1 em { font-style:normal; color:var(--color-primary); }
.lp-sub {
    font-size:15px; color:var(--color-text-secondary);
    max-width:480px; margin:0 0 28px; line-height:1.7;
}
.lp-cta-row { display:flex; gap:10px; flex-wrap:wrap; }

.lp-btn-primary {
    display:inline-flex; align-items:center; gap:8px;
    background:var(--color-primary); color:#fff;
    font-family:var(--font-display); font-weight:700; font-size:14px;
    padding:12px 22px; border-radius:10px; border:none; cursor:pointer;
    text-decoration:none; transition:background 0.15s;
}
.lp-btn-primary:hover { background:var(--color-primary-hover); }
.lp-btn-secondary {
    display:inline-flex; align-items:center; gap:8px;
    background:#fff; color:var(--color-text);
    font-family:var(--font-display); font-weight:600; font-size:14px;
    padding:12px 22px; border-radius:10px;
    border:1.5px solid var(--color-border); cursor:pointer;
    text-decoration:none; transition:border-color 0.15s, background 0.15s;
}
.lp-btn-secondary:hover { border-color:var(--color-text-placeholder); background:var(--color-surface-subtle); }

/* Mockup rendering */
.lp-mockup {
    background:#fff; border:1px solid var(--color-border);
    border-radius:14px; padding:18px;
    box-shadow:var(--shadow-md);
}
.lp-mockup-bar { display:flex; align-items:center; gap:6px; margin-bottom:14px; }
.lp-mockup-dot { width:7px; height:7px; border-radius:50%; background:var(--color-border); }
.lp-mockup-row { display:flex; gap:8px; margin-bottom:10px; }
.lp-mockup-stat {
    flex:1; background:var(--color-surface-subtle); border-radius:8px; padding:10px 12px;
    border:1px solid var(--color-border);
}

.lp-section { padding:64px 24px; max-width:1040px; margin:0 auto; }
.lp-section-head { max-width:560px; margin:0 0 36px; }
.lp-section-head.center { margin:0 auto 36px; text-align:center; }
.lp-section-title {
    font-family:var(--font-display); font-weight:800;
    font-size:clamp(22px,3vw,30px); color:var(--color-text);
    letter-spacing:-0.02em; margin:0 0 8px;
}
.lp-section-sub { font-size:14px; color:var(--color-text-secondary); line-height:1.7; margin:0; }

/* Features */
.lp-features {
    display:grid; grid-template-columns:1.2fr 1fr; gap:14px;
}
.lp-feature-lead {
    background:var(--color-navy); color:#fff;
    border-radius:14px; padding:28px;
    display:flex; flex-direction:column; justify-content:flex-end; min-height:260px;
}
.lp-feature-list { display:flex; flex-direction:column; gap:14px; }
.lp-feature-row {
    display:flex; gap:14px; align-items:flex-start;
    background:#fff; border:1px solid var(--color-border);
    border-radius:12px; padding:16px;
}
.lp-feature-icon {
    width:36px; height:36px; border-radius:9px; flex-shrink:0;
    background:var(--color-primary-light); color:var(--color-primary);
    display:flex; align-items:center; justify-content:center;
}

/* Benefits Grid (Responsive) */
.lp-benefits-grid {
    display:grid;
    grid-template-columns:repeat(3, 1fr);
    gap:14px;
}

@media(max-width:840px) {
    .lp-hero-inner { grid-template-columns:1fr; }
    .lp-features { grid-template-columns:1fr; }
}
@media(max-width:768px) {
    .lp-benefits-grid { grid-template-columns:1fr; gap:16px; }
}
@media(max-width:640px) {
    .lp-hero { padding:44px 20px; }
    .lp-section { padding:44px 20px; }
    .lp-nav-links { display:none; }
    .lp-mobile-btn { display:flex !important; }
}

.lp-mobile-menu {
    position:fixed; inset:0; z-index:200;
    background:var(--color-navy);
    padding:20px 24px; display:flex; flex-direction:column; gap:8px;
    animation: to-fadeIn 0.18s ease both;
}
.lp-mobile-menu a:focus-visible,
.lp-mobile-menu button:focus-visible {
    outline: 2px solid #fff; outline-offset: 2px; border-radius: 4px;
}
`

const FEATURE_ROWS = [
    {
        icon:<ClipboardList size={16}/>,
        title:'Assignment Tracking',
        desc:'View all your assignments and due dates in one organized dashboard.'
    },
    {
        icon:<ThumbsUp size={16}/>,
        title:'Online Submissions',
        desc:'Submit assignments online and receive grades and feedback from your teachers.'
    },
    {
        icon:<Users size={16}/>,
        title:'Class Enrollment',
        desc:'Join your classes quickly using enrollment codes provided by your teachers.'
    },
]

const BENEFITS = [
    {
        icon:<Upload size={18}/>,
        title:'Easy File Uploads',
        desc:'Upload assignment files securely from your computer or mobile device.'
    },
    {
        icon:<BookOpen size={18}/>,
        title:'Organized Workspace',
        desc:'Keep your courses, assignments, and deadlines organized in one place.'
    },
    {
        icon:<BarChart3 size={18}/>,
        title:'Track Your Progress',
        desc:'Monitor assignment status, submissions, and overall academic progress.'
    },
]
function DashboardMockup() {
    return (
        <div className="lp-mockup">
            <div className="lp-mockup-bar">
                <div className="lp-mockup-dot"/><div className="lp-mockup-dot"/><div className="lp-mockup-dot"/>
                <div style={{ flex:1, height:6, background:'var(--color-surface-subtle)', borderRadius:3, marginLeft:4 }}/>
            </div>
            <div className="lp-mockup-row">
                {[
                    { label:'Assignments', value:'12' },
                    { label:'Submitted',   value:'8'  },
                    { label:'Completed',   value:'5'  },
                    { label:'Pending',     value:'3'  },
                ].map(s => (
                    <div key={s.label} className="lp-mockup-stat">
                        <p style={{ fontSize:16, fontWeight:800, color:'var(--color-text)', margin:0, fontFamily:'var(--font-display)' }}>{s.value}</p>
                        <p style={{ fontSize:9, color:'var(--color-text-muted)', margin:0, textTransform:'uppercase', letterSpacing:'0.06em', fontWeight:600 }}>{s.label}</p>
                    </div>
                ))}
            </div>
            {[
                { title: 'Assignment: Implement JDBC — Connect Java Application to PostgreSQL', course: 'Advanced Java Programming', status: 'Completed' },
                { title: 'Lab Report: Deploy an Application on AWS/Azure/GCP', course: 'Cloud Computing', status: 'Pending' },
                { title: 'Homework: Effort Estimation Case Study', course: 'Software Project Management', status: 'Submitted' },
            ].map((a, i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'9px 10px', background:'var(--color-surface-subtle)', borderRadius:8, marginBottom:6, border:'1px solid var(--color-border)' }}>
                    <div style={{ minWidth:0, flex:1 }}>
                        <p style={{ fontSize:11, fontWeight:600, color:'var(--color-text)', margin:0, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{a.title}</p>
                        <p style={{ fontSize:9, color:'var(--color-text-muted)', margin:'1px 0 0' }}>{a.course}</p>
                    </div>
                    <span className={`pill pill-${a.status === 'Completed' ? 'completed' : a.status === 'Pending' ? 'pending' : 'submitted'}`} style={{ marginLeft:8, flexShrink:0 }}>{a.status}</span>
                </div>
            ))}
        </div>
    )
}

export default function LandingPage() {
    const { user } = useAuth()
    const location = useLocation()
    const [menuOpen, setMenuOpen] = useState(false)
    const menuRef = useRef(null)
    const menuBtnRef = useRef(null)

    const ctaLabel = user ? 'Go to Dashboard' : 'Get Started'

    // Scroll to the target section when arriving with a hash in the URL
    // (e.g. a "Features" link from another page navigating to /#features).
    useEffect(() => {
        if (!location.hash) return
        const el = document.getElementById(location.hash.slice(1))
        el?.scrollIntoView({ behavior: 'smooth' })
    }, [location.hash])

    // Close on Escape, lock body scroll, move focus into the menu on open,
    // and restore focus to the hamburger button on close.
    useEffect(() => {
        if (!menuOpen) return
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        menuRef.current?.querySelector('a,button')?.focus()
        const handler = e => { if (e.key === 'Escape') setMenuOpen(false) }
        window.addEventListener('keydown', handler)
        return () => {
            document.body.style.overflow = prevOverflow
            window.removeEventListener('keydown', handler)
            menuBtnRef.current?.focus()
        }
    }, [menuOpen])

    return (
        <div style={{ fontFamily:'var(--font-body)', background:'var(--color-bg)', minHeight:'100vh' }}>
            <style>{LP_CSS}</style>

            {menuOpen && (
                <div className="lp-mobile-menu" ref={menuRef} role="dialog" aria-modal="true" aria-label="Site menu">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <GraduationCap size={14} color="#fff"/>
                            </div>
                            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, color:'#fff' }}>TaskOra</span>
                        </div>
                        <button onClick={() => setMenuOpen(false)} aria-label="Close menu" style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:6, borderRadius:7 }}><X size={22}/></button>
                    </div>
                    <Link to="/" onClick={() => setMenuOpen(false)}
                        style={{ display:'block', color:'rgba(255,255,255,0.75)', fontSize:18, fontWeight:600, textDecoration:'none', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.10)', fontFamily:'var(--font-display)' }}>
                        Home
                    </Link>
                    <a href="#features" onClick={() => setMenuOpen(false)}
                        style={{ display:'block', color:'rgba(255,255,255,0.75)', fontSize:18, fontWeight:600, textDecoration:'none', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.10)', fontFamily:'var(--font-display)' }}>
                        Features
                    </a>
                    <Link to="/about" onClick={e => { setMenuOpen(false); e.currentTarget.blur() }}
                        style={{ display:'block', color:'rgba(255,255,255,0.75)', fontSize:18, fontWeight:600, textDecoration:'none', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.10)', fontFamily:'var(--font-display)' }}>
                        About Us
                    </Link>
                    <Link to="/contact" onClick={e => { setMenuOpen(false); e.currentTarget.blur() }}
                        style={{ display:'block', color:'rgba(255,255,255,0.75)', fontSize:18, fontWeight:600, textDecoration:'none', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.10)', fontFamily:'var(--font-display)' }}>
                        Contact Us
                    </Link>
                    <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:10 }}>
                        <Link to={user ? '/app' : '/auth?view=signup'} onClick={() => setMenuOpen(false)}
                            style={{ background:'#fff', color:'var(--color-navy)', textAlign:'center', fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, padding:14, borderRadius:10, textDecoration:'none' }}>
                            {ctaLabel}
                        </Link>
                    </div>
                </div>
            )}

            {/* Navbar */}
            <nav className="lp-nav">
                <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:'var(--color-navy)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <GraduationCap size={15} color="#fff"/>
                    </div>
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:17, color:'var(--color-text)', letterSpacing:'-0.02em' }}>TaskOra</span>
                </Link>

                <div className="lp-nav-links" style={{ display:'flex', alignItems:'center', gap:2 }}>
                    <Link to="/" className="lp-nav-link">Home</Link>
                    <a href="#features" className="lp-nav-link">Features</a>
                    <Link to="/about" className="lp-nav-link" onClick={e => e.currentTarget.blur()}>About Us</Link>
                    <Link to="/contact" className="lp-nav-link" onClick={e => e.currentTarget.blur()}>Contact Us</Link>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {user ? (
                        <Link to="/app" className="lp-btn-primary" style={{ padding:'8px 16px', fontSize:13 }}>
                            Dashboard <ArrowRight size={13}/>
                        </Link>
                    ) : (
                        <>
                            <Link to="/auth?view=login" className="lp-nav-link" style={{ fontWeight:600 }}>Sign In</Link>
                            <Link to="/auth?view=signup" className="lp-btn-primary" style={{ padding:'8px 16px', fontSize:13 }}>
                                Sign Up <ArrowRight size={13}/>
                            </Link>
                        </>
                    )}
                    <button ref={menuBtnRef} className="lp-mobile-btn" onClick={() => setMenuOpen(true)} aria-label="Open menu"
                        style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:6, color:'var(--color-text-secondary)', alignItems:'center', borderRadius:7 }}>
                        <Menu size={20}/>
                    </button>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="lp-hero">
                <div className="lp-hero-inner">
                    <div>
                        <span className="lp-eyebrow"><GraduationCap size={12}/> Smart Assignment Management</span>
                        <h1 className="lp-h1">
                            Manage Every Assignment,<br/><em>Meet Every Deadline.</em>
                        </h1>
                        <p className="lp-sub">
                            TaskOra helps students and teachers manage assignments, track deadlines, submit coursework, and receive feedback through one organized and easy-to-use platform.
                        </p>
                        <div className="lp-cta-row">
                            {user ? (
                                <Link to="/app" className="lp-btn-primary">Go to Dashboard <ArrowRight size={15}/></Link>
                            ) : (
                                <>
                                    <Link to="/auth?view=signup" className="lp-btn-primary">Create Your Account <ArrowRight size={15}/></Link>
                                    <Link to="/auth?view=login" className="lp-btn-secondary">Sign In</Link>
                                </>
                            )}
                        </div>
                    </div>
                    <DashboardMockup/>
                </div>
            </section>

            {/* Key Features Section */}
            <section className="lp-section" id="features">
                <div className="lp-section-head">
                    <h2 className="lp-section-title">Everything You Need to Stay Organized Throughout the Semester</h2>
                    <p className="lp-section-sub">Designed to simplify assignment management for students and teachers with an intuitive, distraction-free experience.</p>
                </div>
                <div className="lp-features">
                    <div className="lp-feature-lead">
                        <BookOpen size={26} style={{ marginBottom:14, opacity:0.85 }}/>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, margin:'0 0 8px' }}>Manage Your Courses</h3>
                        <p style={{ fontSize:13, color:'rgba(255,255,255,0.70)', margin:0, lineHeight:1.6 }}>
                            Keep all your courses organized in one place. View assignments, monitor deadlines, submit work, and receive feedback from teachers—all from an easy-to-use dashboard.
                        </p>
                    </div>
                    <div className="lp-feature-list">
                        {FEATURE_ROWS.map(f => (
                            <div key={f.title} className="lp-feature-row">
                                <div className="lp-feature-icon">{f.icon}</div>
                                <div>
                                    <h4 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--color-text)', margin:'0 0 4px' }}>{f.title}</h4>
                                    <p style={{ fontSize:13, color:'var(--color-text-secondary)', margin:0, lineHeight:1.55 }}>{f.desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Benefits Section */}
            <section style={{ background:'var(--color-surface-subtle)', borderTop:'1px solid var(--color-border)', borderBottom:'1px solid var(--color-border)' }}>
                <div className="lp-section" id="benefits">
                <div className="lp-section-head center">
                    <h2 className="lp-section-title">Simplify Your Academic Journey</h2>
                    <p className="lp-section-sub">From enrollment to graded feedback — everything your semester needs, in one place.</p>
                </div>
                <div className="lp-benefits-grid">
                    {BENEFITS.map(b => (
                        <div key={b.title} style={{ background:'#fff', border:'1px solid var(--color-border)', borderRadius:12, padding:'20px 18px' }}>
                            <div className="lp-feature-icon" style={{ marginBottom:12 }}>{b.icon}</div>
                            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, color:'var(--color-text)', margin:'0 0 6px' }}>{b.title}</h3>
                            <p style={{ fontSize:13, color:'var(--color-text-secondary)', margin:0, lineHeight:1.6 }}>{b.desc}</p>
                        </div>
                    ))}
                </div>
                </div>
            </section>

            {/* Call to Action Section */}
            <section style={{ 
                background: 'var(--color-primary-light)', 
                borderTop: '1px solid var(--color-border)',
                borderBottom: '1px solid var(--color-border)',
                padding: '64px 24px', 
                textAlign: 'center' 
            }}>
                <h2 style={{ 
                    fontFamily: 'var(--font-display)', 
                    fontWeight: 800, 
                    fontSize: 'clamp(22px,3.5vw,32px)', 
                    color: 'var(--color-text)', 
                    letterSpacing: '-0.02em', 
                    margin: '0 0 12px' 
                }}>
                    Stay Organized Throughout Your Semester
                </h2>
                <p style={{ 
                    fontFamily: 'var(--font-body)',
                    fontSize: '15px', 
                    color: 'var(--color-text-secondary)', 
                    maxWidth: '540px',
                    margin: '0 auto 28px',
                    lineHeight: '1.6'
                }}>
                    Experience a smarter way to manage assignments, submissions, and academic progress with TaskOra.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {user ? (
                        <Link to="/app" className="lp-btn-primary">
                            Go to Dashboard <ArrowRight size={15}/>
                        </Link>
                    ) : (
                        <>
                            <Link to="/auth?view=signup" className="lp-btn-primary">
                                Create Your Account <ArrowRight size={15}/>
                            </Link>
                            <Link to="/auth?view=login" className="lp-btn-secondary">
                                Sign In
                            </Link>
                        </>
                    )}
                </div>
            </section>

            {/* Footer Section (Deep brand color) */}
            <div style={{ background: 'var(--color-navy)', color: '#FFFFFF' }}>
                <SiteFooter />
            </div>
        </div>
    )
}