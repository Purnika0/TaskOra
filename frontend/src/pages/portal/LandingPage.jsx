import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import PublicNavbar from '../../components/layout/PublicNavbar.jsx'
import { SiteFooter } from '../../components/layout/Footer.jsx'
import {
    ArrowRight, ClipboardList, UploadCloud, LineChart, Mail,
} from 'lucide-react'

const LP_CSS = `
.lp-hero {
    background: linear-gradient(135deg, #EEEDFD 0%, #E6E5FB 100%);
    padding: 72px 24px 64px;
    text-align: center;
}
.lp-hero-inner {
    max-width: 720px; margin: 0 auto 48px;
}
.lp-h1 {
    font-family: var(--font-display); font-weight: 800;
    font-size: clamp(28px, 4.4vw, 44px); color: var(--color-text);
    letter-spacing: -0.03em; line-height: 1.15;
    margin: 0 0 18px;
}
.lp-sub {
    font-size: 15.5px; color: var(--color-text-secondary);
    max-width: 560px; margin: 0 auto 30px; line-height: 1.7;
}
.lp-cta-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; }

.lp-btn-primary {
    display: inline-flex; align-items: center; gap: 8px;
    background: var(--color-primary); color: #fff;
    font-family: var(--font-display); font-weight: 700; font-size: 14px;
    padding: 13px 24px; border-radius: 10px; border: none; cursor: pointer;
    text-decoration: none; transition: background 0.15s ease;
}
.lp-btn-primary:hover { background: var(--color-primary-hover); }
.lp-btn-secondary {
    display: inline-flex; align-items: center; gap: 8px;
    background: #fff; color: var(--color-text);
    font-family: var(--font-display); font-weight: 600; font-size: 14px;
    padding: 13px 24px; border-radius: 10px;
    border: 1.5px solid var(--color-border); cursor: pointer;
    text-decoration: none; transition: border-color 0.15s ease, background 0.15s ease;
}
.lp-btn-secondary:hover { border-color: var(--color-text-placeholder); background: var(--color-surface-subtle); }

/* Hero screenshot — sits inside the gradient hero, framed in white so it lifts off the color */
.lp-shot-wrap {
    max-width: 980px; margin: 0 auto;
}
.lp-shot-frame {
    border: 1px solid rgba(255,255,255,0.6); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xl);
    overflow: hidden; background: #fff;
    line-height: 0;
}
.lp-shot-frame img { display: block; width: 100%; height: auto; }

/* Intro section */
.lp-intro {
    padding: 64px 24px;
}
.lp-intro-panel {
    max-width: 1000px; margin: 0 auto;
    background: linear-gradient(180deg, #EEEDFD 0%, #F1F0FC 100%);
    border-radius: 28px;
    padding: 52px 40px;
}
.lp-intro-head { max-width: 620px; margin: 0 0 36px; }
.lp-section-title {
    font-family: var(--font-display); font-weight: 800;
    font-size: clamp(22px, 3vw, 28px); color: var(--color-primary);
    letter-spacing: -0.02em; margin: 0 0 10px;
}
.lp-section-sub { font-size: 14.5px; color: var(--color-text-secondary); line-height: 1.7; margin: 0; }

.lp-intro-grid {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px;
}
.lp-intro-item {
    display: flex; flex-direction: column; gap: 12px;
    background: #fff; border-radius: 16px; padding: 24px 22px;
    box-shadow: 0 6px 20px rgba(15,23,42,0.06);
}
.lp-intro-icon {
    width: 40px; height: 40px; border-radius: 10px;
    display: flex; align-items: center; justify-content: center; flex-shrink: 0;
}
.lp-intro-item h3 {
    font-family: var(--font-display); font-weight: 700; font-size: 15px;
    color: var(--color-text); margin: 0;
}
.lp-intro-item p {
    font-size: 13.5px; color: var(--color-text-muted); line-height: 1.65; margin: 0;
}

/* Contact preview */
.lp-contact {
    background: var(--color-primary-light);
}
.lp-contact-inner {
    max-width: 1000px; margin: 0 auto; padding: 44px 24px;
    display: flex; align-items: center; justify-content: space-between;
    gap: 24px; flex-wrap: wrap;
}
.lp-contact-text h3 {
    font-family: var(--font-display); font-weight: 700; font-size: 17px;
    color: var(--color-text); margin: 0 0 6px;
}
.lp-contact-text p {
    font-size: 13.5px; color: var(--color-text-secondary); margin: 0; line-height: 1.6;
}
.lp-contact-actions { display: flex; align-items: center; gap: 16px; flex-wrap: wrap; }
.lp-contact-email {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 13px; color: var(--color-text-secondary); text-decoration: none;
    transition: color 0.15s ease;
}
.lp-contact-email:hover { color: var(--color-text); }

@media (max-width: 720px) {
    .lp-intro-grid { grid-template-columns: 1fr; gap: 16px; }
    .lp-intro-panel { padding: 40px 28px; }
}
@media (max-width: 560px) {
    .lp-hero { padding: 48px 20px 40px; }
    .lp-intro { padding: 48px 20px; }
    .lp-intro-panel { padding: 32px 20px; border-radius: 20px; }
    .lp-contact-inner { padding: 32px 20px; justify-content: flex-start; }
}
`

const INTRO_ITEMS = [
    {
        icon: <ClipboardList size={18} />,
        title: 'Assignments & Deadlines',
        desc: 'Every assignment and due date in one dashboard, organized by course.',
        bg: 'var(--color-primary-light)', color: 'var(--color-primary)',
    },
    {
        icon: <UploadCloud size={18} />,
        title: 'Submissions & Feedback',
        desc: 'Submit coursework online and receive grades and feedback from teachers.',
        bg: 'var(--color-green-light)', color: 'var(--color-green)',
    },
    {
        icon: <LineChart size={18} />,
        title: 'Progress Tracking',
        desc: 'See completed, pending, and overdue work at a glance throughout the semester.',
        bg: 'var(--color-amber-light)', color: 'var(--color-amber)',
    },
]

export default function LandingPage() {
    const { user } = useAuth()

    return (
        <div style={{ fontFamily: 'var(--font-body)', background: 'var(--color-bg)', minHeight: '100vh' }}>
            <style>{LP_CSS}</style>

            <PublicNavbar />

            {/* Hero */}
            <section className="lp-hero">
                <div className="lp-hero-inner">
                    <h1 className="lp-h1">
                        Academic Assignment Management, Organized.
                    </h1>
                    <p className="lp-sub">
                        TaskOra helps students and teachers manage assignments, track deadlines, submit
                        coursework, and share feedback — all in one platform built for classroom use.
                    </p>
                    <div className="lp-cta-row">
                        {user ? (
                            <Link to="/app" className="lp-btn-primary">Go to Dashboard <ArrowRight size={15} /></Link>
                        ) : (
                            <>
                                <Link to="/auth?view=signup" className="lp-btn-primary">Get Started <ArrowRight size={15} /></Link>
                                <Link to="/auth?view=login" className="lp-btn-secondary">Sign In</Link>
                            </>
                        )}
                    </div>
                </div>

                {/* Hero screenshot — framed in white so it lifts off the gradient backdrop */}
                <div className="lp-shot-wrap">
                    <div className="lp-shot-frame">
                        <img src="/dashboard-preview.png" alt="TaskOra dashboard showing assignments, submissions, and progress" />
                    </div>
                </div>
            </section>

            {/* Short introduction */}
            <section className="lp-intro">
                <div className="lp-intro-panel">
                    <div className="lp-intro-head">
                        <h2 className="lp-section-title">Built for Real Classroom Use</h2>
                        <p className="lp-section-sub">
                            TaskOra brings assignment tracking, submissions, and academic progress
                            into a single, organized workspace for students and teachers.
                        </p>
                    </div>
                    <div className="lp-intro-grid">
                        {INTRO_ITEMS.map(item => (
                            <div key={item.title} className="lp-intro-item">
                                <div className="lp-intro-icon" style={{ background: item.bg, color: item.color }}>{item.icon}</div>
                                <h3>{item.title}</h3>
                                <p>{item.desc}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Small contact preview */}
            <section className="lp-contact">
                <div className="lp-contact-inner">
                    <div className="lp-contact-text">
                        <h3>Have a question?</h3>
                        <p>Reach out and we'll get back to you within a day.</p>
                    </div>
                    <div className="lp-contact-actions">
                        <a className="lp-contact-email" href="mailto:taskora2083@gmail.com">
                            <Mail size={14} /> taskora2083@gmail.com
                        </a>
                        <Link to="/contact" className="lp-btn-secondary">Contact Us</Link>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <div style={{ background: 'var(--color-navy)', color: '#fff' }}>
                <SiteFooter />
            </div>
        </div>
    )
}