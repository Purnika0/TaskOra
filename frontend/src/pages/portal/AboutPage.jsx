// Public page — no login required.

import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
    ArrowRight, Menu, X, Command, MessageCircle, RotateCw, CalendarDays,
    FileText, MessageSquare, Hourglass, TrendingUp, CheckCircle2,
} from 'lucide-react'
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

function AboutMockup() {
    const stats = [
        { label: 'Total Assignments', value: '4', accent: '#6d4fc2' },
        { label: 'Completed',         value: '0', accent: '#3cb87a' },
        { label: 'Submitted',         value: '0', accent: '#3b6fd4' },
        { label: 'Pending',           value: '4', accent: '#d4a93c' },
        { label: 'Rejected',          value: '0', accent: '#e05252' },
        { label: 'Overdue',           value: '0', accent: '#e05252' },
    ]
    return (
        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 14, padding: 14, boxShadow: 'var(--shadow-xl)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-border)' }}/>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-border)' }}/>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--color-border)' }}/>
                <div style={{ flex: 1 }}/>
                <div style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text-muted)', padding: '3px 10px', borderRadius: 99, border: '1px solid var(--color-border)' }}>Sign In</div>
                <div style={{ fontSize: 8, fontWeight: 700, color: '#fff', background: 'var(--color-primary)', padding: '3px 10px', borderRadius: 99 }}>Sign Up</div>
            </div>

            {/* Greeting banner — mirrors StudentDashboard's navy welcome card */}
            <div style={{ background: 'var(--color-navy)', borderRadius: 10, padding: '12px 14px', marginBottom: 10, position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: -20, right: -20, width: 80, height: 80, background: 'rgba(255,255,255,0.05)', borderRadius: '50%' }}/>
                <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.6)', margin: '0 0 2px' }}>Good morning,</p>
                <p style={{ fontSize: 12, fontWeight: 800, color: '#fff', margin: '0 0 3px', fontFamily: 'var(--font-display)' }}>Student Name 📖</p>
                <p style={{ fontSize: 7, color: 'rgba(255,255,255,0.45)', margin: 0 }}>4 pending · 0 under review · 0 completed</p>
            </div>

            {/* Stat cards — matches the 6-card status grid */}
            <div style={{ display: 'flex', gap: 5, marginBottom: 10 }}>
                {stats.map(s => (
                    <div key={s.label} style={{ flex: 1, background: '#fff', border: '1px solid var(--color-border)', borderTop: `2px solid ${s.accent}`, borderRadius: 6, padding: '5px 3px' }}>
                        <p style={{ fontSize: 11, fontWeight: 800, color: 'var(--color-text)', margin: 0, fontFamily: 'var(--font-display)' }}>{s.value}</p>
                        <p style={{ fontSize: 4.6, color: 'var(--color-text-muted)', margin: '1px 0 0', textTransform: 'uppercase', letterSpacing: '0.02em', lineHeight: 1.2 }}>{s.label}</p>
                    </div>
                ))}
            </div>

            {/* Widget row — BS calendar, Holidays, Upcoming (mirrors the dashboard's widget-grid) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr 1fr', gap: 8 }}>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                        <p style={{ fontSize: 8, fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>Baisakh 2082</p>
                        <span style={{ fontSize: 5.5, fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-light)', borderRadius: 99, padding: '1px 5px' }}>Today</span>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 3 }}>
                        {['S','M','T','W','T','F','S'].map((d, i) => (
                            <span key={i} style={{ fontSize: 5, fontWeight: 700, color: 'var(--color-text-placeholder)', textAlign: 'center' }}>{d}</span>
                        ))}
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
                        {Array.from({ length: 28 }, (_, i) => (
                            <span key={i} style={{ fontSize: 6, color: i === 22 ? '#fff' : (i % 7 === 0 ? '#DC2626' : 'var(--color-text-muted)'), background: i === 22 ? 'var(--color-primary)' : 'transparent', borderRadius: '50%', width: 12, height: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{i + 1}</span>
                        ))}
                    </div>
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 8 }}>
                    <p style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 1px' }}>★ Holidays</p>
                    <p style={{ fontSize: 5.5, color: 'var(--color-text-placeholder)', margin: '0 0 6px' }}>Next 30 days</p>
                    <p style={{ fontSize: 6.5, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 1px' }}>Republic Day</p>
                    <p style={{ fontSize: 5.5, color: 'var(--color-text-placeholder)', margin: 0 }}>29 Baisakh</p>
                </div>
                <div style={{ border: '1px solid var(--color-border)', borderRadius: 8, padding: 8 }}>
                    <p style={{ fontSize: 7.5, fontWeight: 700, color: 'var(--color-text)', margin: '0 0 6px' }}>📖 Upcoming</p>
                    <p style={{ fontSize: 6.5, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 1px' }}>Quiz 1: Data Comm.</p>
                    <p style={{ fontSize: 5.5, color: 'var(--color-text-placeholder)', margin: '0 0 5px' }}>12 Baisakh</p>
                    <p style={{ fontSize: 6.5, fontWeight: 600, color: 'var(--color-text)', margin: '0 0 1px' }}>Homework: Networks</p>
                    <p style={{ fontSize: 5.5, color: 'var(--color-text-placeholder)', margin: 0 }}>15 Baisakh</p>
                </div>
            </div>
        </div>
    )
}

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
            <section style={{ background: 'linear-gradient(135deg, #EEEDFD 0%, #E6E5FB 100%)', padding: '64px 24px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: 48, alignItems: 'center' }}>
                    <div>
                        <span style={{ display: 'inline-block', background: '#fff', color: 'var(--color-primary)', fontSize: 10, fontWeight: 700, padding: '5px 14px', borderRadius: 99, marginBottom: 18, letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                            ABOUT TASKORA
                        </span>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: 'var(--color-text)', letterSpacing: '-0.02em', margin: '0 0 18px', lineHeight: 1.15 }}>
                            Simplifying Academic Assignment Management
                        </h1>
                        <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.7, maxWidth: 460, margin: '0 0 28px' }}>
                            TaskOra is an academic assignment management platform designed to help students and teachers organize coursework, track deadlines, submit assignments, and manage academic activities through one centralized system.
                        </p>
                        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                            {user ? (
                                <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, padding: '12px 22px', borderRadius: 8, textDecoration: 'none' }}>
                                    Go to Dashboard <ArrowRight size={14}/>
                                </Link>
                            ) : (
                                <>
                                    <Link to="/auth?view=signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'var(--color-primary)', color: '#fff', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13, padding: '12px 22px', borderRadius: 8, textDecoration: 'none' }}>
                                        Create Your Account <ArrowRight size={14}/>
                                    </Link>
                                    <Link to="/auth?view=login" style={{ display: 'inline-flex', alignItems: 'center', background: '#fff', color: 'var(--color-text)', fontFamily: 'var(--font-display)', fontWeight: 600, fontSize: 13, padding: '12px 22px', borderRadius: 8, textDecoration: 'none', border: '1px solid var(--color-border)' }}>
                                        Sign In
                                    </Link>
                                </>
                            )}
                        </div>
                    </div>
                    <div style={{ transform: 'perspective(1400px) rotateY(-10deg) rotateX(4deg)' }}>
                        <AboutMockup/>
                    </div>
                </div>
            </section>

            {/* 2. What is TaskOra Section */}
            <section style={{ padding: '64px 24px', background: '#fff', borderBottom: '1px solid var(--color-border)' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 40, alignItems: 'center' }}>
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: '0 0 14px' }}>
                            What is TaskOra?
                        </h2>
                        <p style={{ fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.75, margin: 0 }}>
                            TaskOra is a centralized academic platform that simplifies assignment management for colleges. It provides students and teachers with an organized workspace to manage assignments, monitor deadlines, submit coursework, share feedback, and stay connected throughout the semester.
                        </p>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
                        {[
                            { icon: <Command size={20}/>, title: 'Centralized', desc: 'All your assignments, deadlines, and updates in one place.', bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
                            { icon: <MessageCircle size={20}/>, title: 'Collaborative', desc: 'Improved communication between teachers and students.', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
                            { icon: <RotateCw size={20}/>, title: 'Organized', desc: 'Structured workflows keep your academic life stress free.', bg: 'var(--color-amber-light)', color: 'var(--color-amber)' },
                            { icon: <CalendarDays size={20}/>, title: 'Always Update', desc: 'Real-time updates and notifications keep you ahead.', bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
                        ].map(f => (
                            <div key={f.title} style={{ textAlign: 'center' }}>
                                <div style={{ width: 44, height: 44, borderRadius: 12, background: f.bg, color: f.color, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                                    {f.icon}
                                </div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 13.5, color: 'var(--color-text)', margin: '0 0 6px' }}>{f.title}</h3>
                                <p style={{ fontSize: 11.5, color: 'var(--color-text-muted)', lineHeight: 1.5, margin: 0 }}>{f.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 3 & 4. Why Choose + Key Features Section */}
            <section style={{ padding: '64px 24px' }}>
                <div style={{ maxWidth: 1100, margin: '0 auto', background: 'linear-gradient(180deg, #EEEDFD 0%, #F1F0FC 100%)', borderRadius: 28, padding: '56px 40px' }}>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--color-primary)', letterSpacing: '-0.02em', marginBottom: 32, textAlign: 'center' }}>
                        Why choose TaskOra?
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20, marginBottom: 56 }}>
                        {[
                            { icon: <FileText size={18}/>, title: 'Organized Assignment Management', desc: 'Keep assignments, deadlines, and submissions organized in one place.', color: 'var(--color-primary)' },
                            { icon: <MessageSquare size={18}/>, title: 'Better Communications', desc: 'Improves collaboration between students and teachers through updates and feedbacks.', color: 'var(--color-green)' },
                            { icon: <Hourglass size={18}/>, title: 'Never Miss a Deadline', desc: 'Stay informed about upcoming assignments and important academic updates.', color: 'var(--color-amber)' },
                            { icon: <TrendingUp size={18}/>, title: 'Track Academic Progress', desc: 'Monitor submission, completed assignments, and overall academic progress.', color: '#2563EB' },
                        ].map(card => (
                            <div key={card.title} style={{ background: '#fff', borderRadius: 16, padding: '24px 22px', boxShadow: '0 6px 20px rgba(15,23,42,0.07)' }}>
                                <div style={{ width: 40, height: 40, borderRadius: 10, background: card.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}>
                                    {card.icon}
                                </div>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: 'var(--color-text)', margin: '0 0 8px', lineHeight: 1.35 }}>
                                    {card.title}
                                </h3>
                                <p style={{ fontSize: 12.5, color: 'var(--color-text-muted)', margin: 0, lineHeight: 1.6 }}>
                                    {card.desc}
                                </p>
                            </div>
                        ))}
                    </div>

                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-primary)', letterSpacing: '-0.02em', marginBottom: 32, textAlign: 'center' }}>
                        Key Features
                    </h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 18 }}>
                        {[
                            { title: 'Course Management', desc: 'Organize academic tracking seamlessly across your assigned courses.', bg: '#DEDCFA', color: 'var(--color-primary)' },
                            { title: 'Assignment Tracking', desc: 'Real-time visibility into active, pending, and evaluated workflows.', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
                            { title: 'Online Submission', desc: 'Digital portal for fast, direct, and authenticated file deliveries.', bg: 'var(--color-amber-light)', color: 'var(--color-amber)' },
                            { title: 'Academic Dashboard', desc: 'Visual charts mapping academic activity and completion rates.', bg: '#DBEAFE', color: '#2563EB' },
                            { title: 'Nepali BS Calendar', desc: 'Full integration with Native Bikram Sambat calendar layouts.', bg: 'var(--color-red-light)', color: 'var(--color-red)' },
                            { title: 'Secure Role-Based Access', desc: 'Dedicated workspaces tailored specifically for students and teachers.', bg: '#F3E8FF', color: '#9333EA' },
                        ].map((feat, index) => (
                            <div key={index} style={{ background: feat.bg, padding: '22px 24px', borderRadius: 14 }}>
                                <h3 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, color: feat.color, margin: '0 0 8px' }}>
                                    {feat.title}
                                </h3>
                                <p style={{ fontSize: 12.5, color: 'var(--color-text-secondary)', margin: 0, lineHeight: 1.55 }}>
                                    {feat.desc}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* 5. Our Goal Section */}
            <section style={{ background: '#fff', padding: '20px 24px 80px' }}>
                <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gridTemplateColumns: '0.7fr 1.3fr', gap: 48, alignItems: 'center' }}>
                    <div>
                        <svg viewBox="0 0 200 200" width="100%" style={{ maxWidth: 220 }} fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="85" cy="115" r="62" stroke="#1E1130" strokeWidth="10"/>
                            <circle cx="85" cy="115" r="42" stroke="#5452E4" strokeWidth="10"/>
                            <circle cx="85" cy="115" r="21" stroke="#9694F0" strokeWidth="10"/>
                            <circle cx="85" cy="115" r="7" fill="#1E1130"/>
                            <path d="M85 115 L156 44" stroke="#1E1130" strokeWidth="10" strokeLinecap="round"/>
                            <path d="M156 44 L133 41 L159 67 Z" fill="#1E1130"/>
                            <path d="M156 44 L153 21 L179 47 Z" fill="#1E1130"/>
                        </svg>
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-primary)', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
                            Our Goal
                        </h2>
                        <p style={{ fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.75, margin: '0 0 22px' }}>
                            We built TaskOra to cut down the manual back-and-forth around assignments so students always know what's due, and teachers spend less time chasing submissions.
                        </p>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                            {[
                                'Track deadlines effortlessly',
                                'Monitor academic progress',
                                'Submit assignments online',
                                'Collaborate with teachers',
                            ].map(item => (
                                <div key={item} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                    <CheckCircle2 size={20} color="#fff" fill="var(--color-primary)"/>
                                    <span style={{ fontSize: 13.5, color: 'var(--color-text-secondary)' }}>{item}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </section>

            <SiteFooter/>
        </div>
    )
}