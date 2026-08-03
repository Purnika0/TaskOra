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
    padding: 72px 24px;
}
.lp-hero-grid {
    max-width: 1320px; margin: 0 auto;
    display: grid; grid-template-columns: 0.85fr 1.3fr; align-items: center; gap: 40px;
}
.lp-hero-inner {
    max-width: 480px; text-align: left;
}
.lp-h1-accent { color: var(--color-primary); }
.lp-h1 {
    font-family: var(--font-display); font-weight: 800;
    font-size: clamp(28px, 4.4vw, 44px); color: var(--color-text);
    letter-spacing: -0.03em; line-height: 1.15;
    margin: 0 0 18px;
}
.lp-sub {
    font-size: 15.5px; color: var(--color-text-secondary);
    margin: 0 0 30px; line-height: 1.7;
}
.lp-cta-row { display: flex; gap: 10px; flex-wrap: wrap; justify-content: flex-start; }

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

/* Hero visual — the real Dashboard screenshot, shown as-is (no cropping, no
   browser-chrome overlay) with a subtle 3D tilt so it reads as a dynamic
   product shot rather than a flat rectangle pasted on the page. */
.lp-hero-visual {
    position: relative;
    width: 100%; max-width: 820px; margin: 0 auto;
    padding: 40px 70px;
    /* The blur blobs below are positioned partly outside this box on
       purpose (for a soft glow effect) — without this, they widen the
       page's scrollable area past 100vw on some screen sizes, making the
       whole page horizontally scrollable and misaligning the sticky
       navbar against the rest of the page once scrolled. */
    overflow: hidden;
}
.lp-hero-blob-a {
    position: absolute; width: 340px; height: 340px; border-radius: 50%;
    background: var(--color-primary); opacity: 0.18; filter: blur(70px);
    top: -60px; right: -20px; z-index: 0;
}
.lp-hero-blob-b {
    position: absolute; width: 260px; height: 260px; border-radius: 50%;
    background: #2563EB; opacity: 0.14; filter: blur(70px);
    bottom: -40px; left: -30px; z-index: 0;
}
.lp-hero-shot {
    position: relative; z-index: 1;
    display: block; width: 100%; height: auto;
    border-radius: 10px;
    transform: perspective(1230px) rotateY(-28deg);
    transform-origin: center center;
    box-shadow: 40px 34px 60px -20px rgba(15, 23, 42, 0.45);
}

/* Course-based positioning line — section keeps its subtle background, but
   the content now sits in its own white boxed panel (same rounded-box idea
   as the intro section's panel below it) so it reads as a distinct card. */
.lp-about {
    background: #fff;
    padding: 56px 24px;
}
.lp-about-inner {
    max-width: 780px; margin: 0 auto;
}
.lp-about-panel {
    background: #fff;
    border-radius: 24px;
    padding: 44px 40px;
    text-align: center;
    box-shadow: 0 6px 20px rgba(15,23,42,0.06);
}
.lp-about-title {
    font-family: var(--font-display); font-weight: 700;
    font-size: clamp(19px, 2.6vw, 24px); color: var(--color-text);
    letter-spacing: -0.01em; line-height: 1.45;
    margin: 0 0 12px;
}
.lp-about-highlight { color: var(--color-primary); font-weight: 800; }
.lp-about-sub {
    font-size: 14px; color: var(--color-text-secondary);
    line-height: 1.7; margin: 0;
}

/* Intro section */
.lp-intro {
    padding: 56px 24px 64px;
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

/* Contact preview — floating card that overlaps into the footer */
.lp-contact {
    background: #fff;
    padding: 80px 24px;
    position: relative;
}
.lp-contact-card {
    max-width: 640px; margin: 0 auto; position: relative; z-index: 2;
    background: #fff;
    border-radius: 24px;
    box-shadow: 0 24px 60px -12px rgba(84,82,228,0.35), 0 4px 14px rgba(15,23,42,0.07);
    padding: 48px;
    display: flex; flex-direction: column; align-items: center; text-align: center;
    gap: 20px;
}
.lp-contact-left { display: flex; flex-direction: column; align-items: center; gap: 14px; }
.lp-contact-icon {
    width: 52px; height: 52px; border-radius: 14px; flex-shrink: 0;
    background: var(--color-primary-light); color: var(--color-primary);
    display: flex; align-items: center; justify-content: center;
}
.lp-contact-text h3 {
    font-family: var(--font-display); font-weight: 800; font-size: 21px;
    color: var(--color-text); margin: 0 0 6px; letter-spacing: -0.01em;
}
.lp-contact-text p {
    font-size: 14px; color: var(--color-text-secondary); margin: 0; line-height: 1.6;
}
.lp-contact-actions { display: flex; align-items: center; justify-content: center; gap: 20px; flex-wrap: wrap; }
.lp-contact-email {
    display: inline-flex; align-items: center; gap: 7px;
    font-size: 13.5px; color: var(--color-text-secondary); text-decoration: none;
    transition: color 0.15s ease;
}
.lp-contact-email:hover { color: var(--color-primary); }

@media (max-width: 900px) {
    .lp-hero-grid { grid-template-columns: 1fr; gap: 40px; text-align: center; }
    .lp-hero-inner { max-width: 620px; margin: 0 auto; text-align: center; }
    .lp-cta-row { justify-content: center; }
}
@media (max-width: 720px) {
    .lp-about-panel { padding: 36px 28px; }
    .lp-intro-grid { grid-template-columns: 1fr; gap: 16px; }
    .lp-intro-panel { padding: 40px 28px; }
    .lp-contact-card { padding: 32px 28px; }
    .lp-contact-actions { width: 100%; flex-direction: column; }
}
@media (max-width: 560px) {
    .lp-hero { padding: 48px 20px 40px; }
    .lp-about { padding: 40px 20px; }
    .lp-about-panel { padding: 28px 22px; border-radius: 18px; }
    .lp-intro { padding: 40px 20px 48px; }
    .lp-intro-panel { padding: 32px 20px; border-radius: 20px; }
    .lp-contact { padding: 56px 16px; }
    .lp-contact-card { padding: 28px 22px; border-radius: 18px; }
}
`

const INTRO_ITEMS = [
    {
        icon: <ClipboardList size={18} />,
        title: 'Assignments & Deadlines',
        desc: 'View assignments, due dates, and course tasks in one place.',
        bg: 'var(--color-primary-light)', color: 'var(--color-primary)',
    },
    {
        icon: <UploadCloud size={18} />,
        title: 'Submissions & Feedback',
        desc: 'Submit your work online and receive feedback and grades directly from teachers.',
        bg: 'var(--color-green-light)', color: 'var(--color-green)',
    },
    {
        icon: <LineChart size={18} />,
        title: 'Progress Tracking',
        desc: 'Track completed, pending, and overdue assignments throughout your semester.',
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
                <div className="lp-hero-grid">
                    <div className="lp-hero-inner">
                        <h1 className="lp-h1">
                            Manage Assignments. Track Progress.<br />
                            <span className="lp-h1-accent">Stay Organized.</span>
                        </h1>
                        <p className="lp-sub">
                            TaskOra helps students and teachers manage assignments, track deadlines, submit
                            coursework, and share feedback in one organized, course-based workspace.
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

                    {/* Hero visual — real Dashboard screenshot, shown as-is with a slight tilt */}
                    <div className="lp-hero-visual">
                        <div className="lp-hero-blob-a" />
                        <div className="lp-hero-blob-b" />
                        <img
                            className="lp-hero-shot"
                            src="/dashboard-preview.png"
                            alt="TaskOra student dashboard showing assignments, deadlines, and progress"
                        />
                    </div>
                </div>
            </section>

            {/* Course-based positioning line — section background stays the
                subtle tone; content sits inside a white boxed panel, mirroring
                the boxed-panel idea used by the intro section below it. */}
            <section className="lp-about">
                <div className="lp-about-inner">
                    <div className="lp-about-panel">
                        <h2 className="lp-about-title">
                            TaskOra is a <span className="lp-about-highlight">course-based assignment and task management system</span> designed for higher education institutions.
                        </h2>
                        <p className="lp-about-sub">
                            TaskOra helps students and teachers organize coursework, manage assignments, track
                            deadlines, submit work, provide feedback, and monitor academic progress through a
                            centralized platform.
                        </p>
                    </div>
                </div>
            </section>

            {/* Short introduction */}
            <section className="lp-intro">
                <div className="lp-intro-panel">
                    <div className="lp-intro-head">
                        <h2 className="lp-section-title">Designed for Students and Teachers</h2>
                        <p className="lp-section-sub">
                            Manage coursework, submissions, and progress from one place
                            without losing track of important deadlines.
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

            {/* Small contact preview — floating card, overlaps into the footer below */}
            <section className="lp-contact">
                <div className="lp-contact-card">
                    <div className="lp-contact-left">
                        <div className="lp-contact-icon"><Mail size={22} /></div>
                        <div className="lp-contact-text">
                            <h3>Have a question?</h3>
                            <p>Have questions about TaskOra? Contact us and we'll be happy to help.</p>
                        </div>
                    </div>
                    <div className="lp-contact-actions">
                        <a className="lp-contact-email" href="mailto:taskora2083@gmail.com">
                            taskora2083@gmail.com
                        </a>
                        <Link to="/contact" className="lp-btn-primary">Contact Us <ArrowRight size={15} /></Link>
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