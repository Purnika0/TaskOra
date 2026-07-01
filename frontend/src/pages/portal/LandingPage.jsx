// src/pages/portal/LandingPage.jsx
// Simplified and polished landing page for TaskOra (Students & Educators)

import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { SiteFooter } from '../../components/layout/Footer.jsx'
import {
    GraduationCap, BarChart3, ArrowRight, Menu, X,
    Users, BookOpen, Upload, ClipboardList, ThumbsUp
} from 'lucide-react'

// ─────────────────────────────────────────────────────────────────────────────
// STYLES
// ─────────────────────────────────────────────────────────────────────────────
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
.lp-nav-link:hover { background:var(--color-surface-subtle); color:var(--color-text); }

/* ── Hero section ── */
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
.lp-btn-secondary:hover { border-color:#94A3B8; background:var(--color-surface-subtle); }

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

/* ── Features ── */
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

/* ── Benefits Grid (Responsive) ── */
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
}
`

const FEATURE_ROWS = [
    { icon:<ClipboardList size={16}/>, title:'Assignment Tracking', desc:'View all your subject assignments and official due dates in one organized dashboard.' },
    { icon:<ThumbsUp size={16}/>, title:'Direct Submissions', desc:'Submit coursework files online and receive structured grades and remarks from teachers.' },
    { icon:<Users size={16}/>, title:'Quick Class Enrollment', desc:'Instantly connect to your classes by entering enrollment codes shared by your instructors.' },
]

const BENEFITS = [
    { icon:<Upload size={18}/>, title:'Hassle-Free File Uploads', desc:'Upload PDF, DOC, or DOCX assignment drafts directly from any computer or mobile device.' },
    { icon:<BookOpen size={18}/>, title:'Focused Workspace', desc:'Declutter your workspace by viewing only the active courses and assignments for this semester.' },
    { icon:<BarChart3 size={18}/>, title:'Clear Performance Progress', desc:'Monitor submission trends, pending flags, and completion statistics at a single glance.' },
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
                { title: 'Homework: Compare COCOMO and Function Point Estimation Models', course: 'Software Project Management', status: 'Submitted' },
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
    const [menuOpen, setMenuOpen] = useState(false)

    const ctaTo    = user ? '/app' : '/auth'
    const ctaLabel = user ? 'Go to Dashboard' : 'Get Started Free'

    return (
        <div style={{ fontFamily:'var(--font-body)', background:'var(--color-bg)', minHeight:'100vh' }}>
            <style>{LP_CSS}</style>

            {menuOpen && (
                <div className="lp-mobile-menu">
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:24 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                            <div style={{ width:30, height:30, borderRadius:8, background:'rgba(255,255,255,0.14)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <GraduationCap size={14} color="#fff"/>
                            </div>
                            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, color:'#fff' }}>TaskOra</span>
                        </div>
                        <button onClick={() => setMenuOpen(false)} style={{ background:'none', border:'none', color:'#fff', cursor:'pointer', padding:6 }}><X size={22}/></button>
                    </div>
                    {[['#features','Features'],['#benefits','Benefits']].map(([h,l]) => (
                        <a key={h} href={h} onClick={() => setMenuOpen(false)}
                            style={{ display:'block', color:'rgba(255,255,255,0.75)', fontSize:18, fontWeight:600, textDecoration:'none', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.10)', fontFamily:'var(--font-display)' }}>
                            {l}
                        </a>
                    ))}
                    <Link to="/contact" onClick={() => setMenuOpen(false)}
                        style={{ display:'block', color:'rgba(255,255,255,0.75)', fontSize:18, fontWeight:600, textDecoration:'none', padding:'14px 0', borderBottom:'1px solid rgba(255,255,255,0.10)', fontFamily:'var(--font-display)' }}>
                        Contact
                    </Link>
                    <div style={{ marginTop:20, display:'flex', flexDirection:'column', gap:10 }}>
                        <Link to={ctaTo} onClick={() => setMenuOpen(false)}
                            style={{ background:'#fff', color:'var(--color-navy)', textAlign:'center', fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, padding:14, borderRadius:10, textDecoration:'none' }}>
                            {ctaLabel}
                        </Link>
                    </div>
                </div>
            )}

            {/* ── Navbar ── */}
            <nav className="lp-nav">
                <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
                    <div style={{ width:32, height:32, borderRadius:9, background:'var(--color-navy)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                        <GraduationCap size={15} color="#fff"/>
                    </div>
                    <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:17, color:'var(--color-text)', letterSpacing:'-0.02em' }}>TaskOra</span>
                </Link>

                <div className="lp-nav-links" style={{ display:'flex', alignItems:'center', gap:2 }}>
                    <a href="#features" className="lp-nav-link">Features</a>
                    <a href="#benefits" className="lp-nav-link">Benefits</a>
                    <Link to="/contact" className="lp-nav-link">Contact</Link>
                </div>

                <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {user ? (
                        <Link to="/app" className="lp-btn-primary" style={{ padding:'8px 16px', fontSize:13 }}>
                            Dashboard <ArrowRight size={13}/>
                        </Link>
                    ) : (
                        <>
                            <Link to="/auth" className="lp-nav-link" style={{ fontWeight:600 }}>Login</Link>
                            <Link to="/auth" className="lp-btn-primary" style={{ padding:'8px 16px', fontSize:13 }}>
                                Sign Up <ArrowRight size={13}/>
                            </Link>
                        </>
                    )}
                    <button className="lp-mobile-btn" onClick={() => setMenuOpen(true)}
                        style={{ display:'none', background:'none', border:'none', cursor:'pointer', padding:6, color:'var(--color-text-secondary)', alignItems:'center', borderRadius:7 }}>
                        <Menu size={20}/>
                    </button>
                </div>
            </nav>

            {/* ── Hero Section ── */}
            <section className="lp-hero">
                <div className="lp-hero-inner">
                    <div>
                        <span className="lp-eyebrow"><GraduationCap size={10}/> Built for academic use</span>
                        <h1 className="lp-h1">
                            Your academic deadlines,<br/><em>beautifully organized</em>
                        </h1>
                        <p className="lp-sub">
                            TaskOra brings all your course assignments, submission deadlines, and instructor feedback into one focused workspace — built specifically for IT students and educators.
                        </p>
                        <div className="lp-cta-row">
                            {user ? (
                                <Link to="/app" className="lp-btn-primary">Go to Dashboard <ArrowRight size={15}/></Link>
                            ) : (
                                <>
                                    <Link to="/auth" className="lp-btn-primary">Get Started Free <ArrowRight size={15}/></Link>
                                    <Link to="/auth" className="lp-btn-secondary">Login</Link>
                                </>
                            )}
                        </div>
                    </div>
                    <DashboardMockup/>
                </div>
            </section>

            {/* ── Key Features Section ── */}
            <section className="lp-section" id="features">
                <div className="lp-section-head">
                    <h2 className="lp-section-title">Purpose-built for academic workflows</h2>
                    <p className="lp-section-sub">Designed around how IT students and teachers actually work — no clutter, no distractions.</p>
                </div>
                <div className="lp-features">
                    <div className="lp-feature-lead">
                        <BookOpen size={26} style={{ marginBottom:14, opacity:0.85 }}/>
                        <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:18, margin:'0 0 8px' }}>Course Coordination</h3>
                        <p style={{ fontSize:13, color:'rgba(255,255,255,0.70)', margin:0, lineHeight:1.6 }}>
                            Stay organized with an absolute separation of courses. View active timelines, submit assignments, and review instructor comments without distracting clutter.
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

            {/* ── Benefits Section ── */}
            <section className="lp-section" id="benefits">
                <div className="lp-section-head center">
                    <h2 className="lp-section-title">Designed to reduce academic stress</h2>
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
            </section>

            {/* ── Call to Action Section (Contrasted with Cream Background) ── */}
            <section style={{ 
                background: 'var(--color-cream)', 
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
                    Take control of your semester today
                </h2>
                <p style={{ 
                    fontFamily: 'var(--font-body)',
                    fontSize: '15px', 
                    color: 'var(--color-text-secondary)', 
                    maxWidth: '540px',
                    margin: '0 auto 28px',
                    lineHeight: '1.6'
                }}>
                    Join TaskOra for free and spend less time chasing deadlines — and more time doing great work.
                </p>
                <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                    {user ? (
                        <Link to="/app" className="lp-btn-primary">
                            Go to Dashboard <ArrowRight size={15}/>
                        </Link>
                    ) : (
                        <>
                            <Link to="/auth" className="lp-btn-primary">
                                Create Student Account <ArrowRight size={15}/>
                            </Link>
                            <Link to="/auth" className="lp-btn-secondary">
                                Login
                            </Link>
                        </>
                    )}
                </div>
            </section>

            {/* ── Footer Section (Deep brand color) ── */}
            <div style={{ background: 'var(--color-navy)', color: '#FFFFFF' }}>
                <SiteFooter />
            </div>
        </div>
    )
}