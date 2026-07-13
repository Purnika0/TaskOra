// Public page — no login required.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Menu, X } from 'lucide-react'
import { SiteFooter } from '../../components/layout/Footer.jsx'
import { useAuth } from '../../hooks/useAuth.js'

const PUB_NAV_CSS = `
.pub-nav-link {
    font-size:13px; color:var(--color-text-secondary); text-decoration:none;
    padding:6px 12px; border-radius:8px;
    transition:background 0.13s, color 0.13s;
    font-family:var(--font-body); font-weight:500;
}
a.pub-nav-link:visited { color:var(--color-text-secondary); }
.pub-nav-link:hover { background:var(--color-surface-subtle); color:var(--color-text); }
.pub-nav-link.active { font-weight:700; }
a.pub-nav-link.active:visited { color:var(--color-text-secondary); }
@media (max-width:640px) { .pub-nav-links { display:none; } }
.pub-nav-toggle { display:none; background:none; border:none; cursor:pointer; padding:6px; color:var(--color-text); align-items:center; justify-content:center; }
@media (max-width:640px) { .pub-nav-toggle { display:flex; } }
.pub-nav-mobile-menu {
    position:absolute; top:100%; left:0; right:0;
    background:#fff; border-bottom:1px solid var(--color-border);
    box-shadow:0 8px 24px rgba(15,23,42,0.10);
    display:flex; flex-direction:column; padding:8px; gap:2px; z-index:49;
}
.pub-nav-mobile-menu .pub-nav-link { padding:10px 14px; }
`

function PubNav({ user }) {
    const [open, setOpen] = useState(false)
    return (
        <nav style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50 }}>
            <style>{PUB_NAV_CSS}</style>
            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
                <div style={{ width: 30, height: 30, borderRadius: 8, overflow:'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <img src="/logo.png" alt="TaskOra logo" width={30} height={30} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>TaskOra</span>
            </Link>
            <div className="pub-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Link to="/" className="pub-nav-link">Home</Link>
                <Link to="/#features" className="pub-nav-link">Features</Link>
                <Link to="/about" className="pub-nav-link active" onClick={e => e.currentTarget.blur()}>About Us</Link>
                <Link to="/contact" className="pub-nav-link" onClick={e => e.currentTarget.blur()}>Contact Us</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user ? (
                    <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', borderRadius: 8, background: 'var(--color-primary)' }}>
                        Dashboard <ArrowRight size={14} />
                    </Link>
                ) : (
                    <>
                        <Link to="/auth?view=login" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', textDecoration: 'none', borderRadius: 8 }}>
                            Sign In
                        </Link>
                        <Link to="/auth?view=signup" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', borderRadius: 8, background: 'var(--color-primary)' }}>
                            Sign Up
                        </Link>
                    </>
                )}
                <button className="pub-nav-toggle" onClick={() => setOpen(o => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open}>
                    {open ? <X size={20}/> : <Menu size={20}/>}
                </button>
            </div>
            {open && (
                <div className="pub-nav-mobile-menu">
                    <Link to="/" className="pub-nav-link" onClick={() => setOpen(false)}>Home</Link>
                    <Link to="/#features" className="pub-nav-link" onClick={() => setOpen(false)}>Features</Link>
                    <Link to="/about" className="pub-nav-link active" onClick={() => setOpen(false)}>About Us</Link>
                    <Link to="/contact" className="pub-nav-link" onClick={() => setOpen(false)}>Contact Us</Link>
                </div>
            )}
        </nav>
    )
}

export default function AboutPage() {
    const { user } = useAuth()

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
            <PubNav user={user}/>

            {/* 1. Hero Section */}
            <section style={{ background: 'var(--color-primary)', padding: '56px 24px', textAlign: 'center', color: '#fff' }}>
                <div style={{ maxWidth: 700, margin: '0 auto' }}>
                    <span style={{ display: 'inline-block', background: 'rgba(255,255,255,0.12)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '4px 12px', borderRadius: 99, marginBottom: 16, letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                        ABOUT TASKORA
                    </span>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(26px, 3.5vw, 40px)', color: '#fff', letterSpacing: '-0.02em', margin: '0 0 16px', lineHeight: 1.2 }}>
                        Simplifying Academic Assignment Management
                    </h1>
                    <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.85)', lineHeight: 1.6, maxWidth: 600, margin: '0 auto 28px' }}>
                        TaskOra is an academic assignment management platform designed to help students and teachers organize coursework, track deadlines, submit assignments, and manage academic activities through one centralized system.
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {user ? (
                            <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, padding: '11px 22px', borderRadius: 8, textDecoration: 'none' }}>
                                Go to Dashboard <ArrowRight size={14}/>
                            </Link>
                        ) : (
                            <>
                                <Link to="/auth?view=signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: '#fff', color: 'var(--color-primary)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, padding: '11px 22px', borderRadius: 8, textDecoration: 'none' }}>
                                    Create Your Account <ArrowRight size={14}/>
                                </Link>
                                <Link to="/auth?view=login" style={{ display: 'inline-flex', alignItems: 'center', background: 'rgba(255,255,255,0.12)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, padding: '11px 22px', borderRadius: 8, textDecoration: 'none', border: '1px solid rgba(255,255,255,0.15)' }}>
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            {/* 2. What is TaskOra Section */}
            <section style={{ padding: '64px 24px', background: '#fff', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 16 }}>
                        What is TaskOra?
                    </h2>
                    <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.75, margin: 0 }}>
                        TaskOra is a centralized academic platform that simplifies assignment management for colleges. It provides students and teachers with an organized workspace to manage assignments, monitor deadlines, submit coursework, share feedback, and stay connected throughout the semester.
                    </p>
                </div>
            </section>

            {/* 3. Why TaskOra Section */}
            <section style={{ padding: '64px 24px', maxWidth: 1040, margin: '0 auto' }}>
                <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 36, textAlign: 'center' }}>
                    Why TaskOra?
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(230px, 1fr))', gap: 20 }}>
                    {[
                        { title: 'Organized Assignment Management', desc: 'Keep assignments, deadlines, and submissions organized in one place.' },
                        { title: 'Better Communication', desc: 'Improve collaboration between students and teachers through assignment updates and feedback.' },
                        { title: 'Never Miss a Deadline', desc: 'Stay informed about upcoming assignments and important academic dates.' },
                        { title: 'Track Academic Progress', desc: 'Monitor submissions, completed assignments, and overall academic performance.' },
                    ].map(card => (
                        <div key={card.title} style={{ background: '#fff', border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-primary)', borderRadius: '0 0 14px 14px', padding: '24px 22px', boxShadow: '0 4px 20px rgba(15,23,42,0.015), 0 1px 2px rgba(15,23,42,0.02)' }}>
                            <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15.5, color: 'var(--color-text)', margin: '0 0 10px', lineHeight: 1.35 }}>
                                {card.title}
                            </h3>
                            <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                                {card.desc}
                            </p>
                        </div>
                    ))}
                </div>
            </section>

            {/* 4. Key Features Section */}
            <section style={{ background: '#fff', padding: '64px 24px', borderTop: '1px solid var(--color-border)', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: 940, margin: '0 auto' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 36, textAlign: 'center' }}>
                        Key Features
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                        {[
                            { title: 'Course Management', desc: 'Organize academic tracking seamlessly across your assigned courses.' },
                            { title: 'Assignment Tracking', desc: 'Real-time visibility into active, pending, and evaluated workflows.' },
                            { title: 'Online Assignment Submission', desc: 'Digital portal for fast, direct, and authenticated file deliveries.' },
                            { title: 'Academic Progress Dashboard', desc: 'Visual charts mapping academic activity and completion rates.' },
                            { title: 'Nepali BS Calendar Support', desc: 'Full integration with native Bikram Sambat calendar layouts.' },
                            { title: 'Secure Role-Based Access', desc: 'Dedicated workspaces tailored specifically for students and teachers to isolate coursework streams.' }
                        ].map((feat, index) => (
                            <div key={index} style={{ background: '#fff', padding: '20px 24px', borderRadius: 12, border: '1px solid var(--color-border)', borderTop: '3px solid var(--color-primary)' }}>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-text)', margin: '0 0 6px' }}>
                                    {feat.title}
                                </h3>
                                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.55 }}>
                                    {feat.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. Our Goal Section */}
            <section style={{ background: 'var(--color-surface-subtle)', padding: '64px 24px', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-text)', letterSpacing: '-0.02em', marginBottom: 16 }}>
                        Our Goal
                    </h2>
                    <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.8, margin: 0 }}>
                        We built TaskOra to cut down the manual back-and-forth around assignments — so students always know what's due, and teachers spend less time chasing submissions.
                    </p>
                </div>
            </section>

            {/* 6. Final CTA Section */}
            <section style={{ background: '#fff', padding: '60px 24px', textAlign: 'center' }}>
                <div style={{ maxWidth: 540, margin: '0 auto' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: '0 0 12px' }}>
                        Experience Smarter Assignment Management
                    </h2>
                    <p style={{ fontSize: 14.5, color: 'var(--color-text-secondary)', margin: '0 0 28px', lineHeight: 1.6 }}>
                        {user
                            ? 'Welcome back! Return to your dashboard to pick up right where you left off.'
                            : 'Create your account and simplify the way you manage assignments, deadlines, and academic progress with TaskOra.'
                        }
                    </p>
                    <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
                        {user ? (
                            <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, padding: '12px 24px', borderRadius: 8, textDecoration: 'none', boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}>
                                Go to Dashboard <ArrowRight size={14}/>
                            </Link>
                        ) : (
                            <>
                                <Link to="/auth?view=signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, padding: '12px 24px', borderRadius: 8, textDecoration: 'none', boxShadow: '0 4px 12px rgba(15,23,42,0.08)' }}>
                                    Create Your Account <ArrowRight size={14}/>
                                </Link>
                                <Link to="/auth?view=login" style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, padding: '12px 24px', borderRadius: 8, textDecoration: 'none', border: '1px solid var(--color-border)' }}>
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            </section>

            <SiteFooter/>
        </div>
    )
}