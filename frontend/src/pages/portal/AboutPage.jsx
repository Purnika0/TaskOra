import { Link } from 'react-router-dom'
import {
    ArrowRight, Command, MessageCircle, RotateCw, CalendarDays,
    FileText, MessageSquare, Hourglass, TrendingUp, CheckCircle2,
} from 'lucide-react'
import { SiteFooter } from '../../components/layout/Footer.jsx'
import PublicNavbar from '../../components/layout/PublicNavbar.jsx'
import { useAuth } from '../../hooks/useAuth.js'

const AB_CSS = `
.ab-hero {
    background: linear-gradient(135deg, #EEEDFD 0%, #E6E5FB 100%);
    padding: 64px 24px;
}
.ab-hero-grid {
    max-width: 1260px; margin: 0 auto;
    display: grid; grid-template-columns: 0.9fr 1.25fr; gap: 40px; align-items: center;
}
.ab-hero-cta { display: flex; gap: 12px; flex-wrap: wrap; }

/* Hero visual — the real My Analytics screenshot, shown as-is (no cropping, no
   browser-chrome overlay) with a subtle 3D tilt for depth. */
.ab-hero-visual {
    position: relative;
    width: 100%; max-width: 780px; margin: 0 auto;
    padding: 40px 70px;
    /* See the matching comment in LandingPage.jsx — clips the blur blobs
       so they can't widen the page's scrollable area past 100vw. */
    overflow: hidden;
}
.ab-hero-blob-a {
    position: absolute; width: 300px; height: 300px; border-radius: 50%;
    background: var(--color-primary); opacity: 0.16; filter: blur(70px);
    top: -50px; right: -20px; z-index: 0;
}
.ab-hero-blob-b {
    position: absolute; width: 240px; height: 240px; border-radius: 50%;
    background: #2563EB; opacity: 0.12; filter: blur(70px);
    bottom: -30px; left: -30px; z-index: 0;
}
.ab-hero-shot {
    position: relative; z-index: 1;
    display: block; width: 100%; height: auto;
    border-radius: 10px;
    transform: perspective(1170px) rotateY(-28deg);
    transform-origin: center center;
    box-shadow: 40px 34px 60px -20px rgba(15, 23, 42, 0.40);
}

.ab-what {
    padding: 64px 24px; background: #fff; border-bottom: 1px solid var(--color-border);
}
.ab-what-grid {
    max-width: 1100px; margin: 0 auto;
    display: grid; grid-template-columns: 1fr 1.4fr; gap: 40px; align-items: center;
}
.ab-what-features {
    display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px;
}
.ab-what-feature { text-align: center; }
.ab-what-feature-icon {
    width: 44px; height: 44px; border-radius: 12px;
    display: flex; align-items: center; justify-content: center; margin: 0 auto 12px;
}

.ab-why { padding: 64px 24px; }
.ab-why-panel {
    max-width: 1100px; margin: 0 auto;
    background: linear-gradient(180deg, #EEEDFD 0%, #F1F0FC 100%);
    border-radius: 28px; padding: 56px 40px;
}
.ab-why-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
    gap: 20px; margin-bottom: 56px;
}
.ab-why-card { background: #fff; border-radius: 16px; padding: 24px 22px; box-shadow: 0 6px 20px rgba(15,23,42,0.07); }
.ab-why-card-icon {
    width: 40px; height: 40px; border-radius: 10px; color: #fff;
    display: flex; align-items: center; justify-content: center; margin-bottom: 16px;
}
.ab-features-grid {
    display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 18px;
}
.ab-feature-card { padding: 22px 24px; border-radius: 14px; }

.ab-goal { background: #fff; padding: 20px 24px 80px; }
.ab-goal-grid {
    max-width: 1000px; margin: 0 auto;
    display: grid; grid-template-columns: 0.7fr 1.3fr; gap: 48px; align-items: center;
}
.ab-goal-img { width: 100%; max-width: 220px; height: auto; display: block; margin: 0 auto; }
.ab-goal-checklist { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.ab-goal-check-item { display: flex; align-items: center; gap: 10px; }

@media (max-width: 900px) {
    .ab-hero-grid { grid-template-columns: 1fr; gap: 32px; text-align: center; }
    .ab-hero-cta { justify-content: center; }
    .ab-hero-visual { max-width: 540px; margin: 0 auto; }
    .ab-what-grid { grid-template-columns: 1fr; gap: 32px; text-align: center; }
    .ab-goal-grid { grid-template-columns: 1fr; gap: 28px; text-align: center; }
}
@media (max-width: 640px) {
    .ab-hero { padding: 48px 20px; }
    .ab-what { padding: 48px 20px; }
    .ab-what-features { grid-template-columns: repeat(2, 1fr); gap: 24px 16px; }
    .ab-why { padding: 48px 16px; }
    .ab-why-panel { padding: 36px 24px; border-radius: 20px; }
    .ab-goal { padding: 16px 20px 56px; }
    .ab-goal-checklist { grid-template-columns: 1fr; }
}
`

export default function AboutPage() {
    const { user } = useAuth()

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)', color: 'var(--color-text-secondary)' }}>
            <style>{AB_CSS}</style>
            <PublicNavbar/>

            {/* 1. Hero Section */}
            <section className="ab-hero">
                <div className="ab-hero-grid">
                    <div>
                        <span style={{ display: 'inline-block', background: '#fff', color: 'var(--color-primary)', fontSize: 10, fontWeight: 700, padding: '5px 14px', borderRadius: 99, marginBottom: 18, letterSpacing: '0.06em', fontFamily: 'var(--font-display)' }}>
                            ABOUT TASKORA
                        </span>
                        <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 42px)', color: 'var(--color-text)', letterSpacing: '-0.02em', margin: '0 0 18px', lineHeight: 1.15 }}>
                            Simplifying Academic Assignment Management
                        </h1>
                        <p style={{ fontSize: 15, color: 'var(--color-text-secondary)', lineHeight: 1.7, maxWidth: 460, margin: '0 0 28px' }}>
                            TaskOra is a course-based assignment and task management platform designed to help students and teachers organize coursework, track deadlines, submit assignments, and manage academic activities through one centralized system.
                        </p>
                        <div className="ab-hero-cta">
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

                    {/* Hero visual — real My Analytics screenshot, shown as-is with a slight tilt */}
                    <div className="ab-hero-visual">
                        <div className="ab-hero-blob-a" />
                        <div className="ab-hero-blob-b" />
                        <img
                            className="ab-hero-shot"
                            src="/analytics-preview.png"
                            alt="TaskOra analytics overview showing completion rate, course progress, and recent activity"
                        />
                    </div>
                </div>
            </section>

            {/* 2. What is TaskOra Section */}
            <section className="ab-what">
                <div className="ab-what-grid">
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-text)', letterSpacing: '-0.02em', margin: '0 0 14px' }}>
                            What is TaskOra?
                        </h2>
                        <p style={{ fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.75, margin: 0 }}>
                            TaskOra is a centralized academic platform that simplifies assignment management for colleges. It provides students and teachers with an organized workspace to manage assignments, monitor deadlines, submit coursework, share feedback, and stay connected throughout the semester.
                        </p>
                    </div>
                    <div className="ab-what-features">
                        {[
                            { icon: <Command size={20}/>, title: 'Centralized', desc: 'All your assignments, deadlines, and updates in one place.', bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
                            { icon: <MessageCircle size={20}/>, title: 'Collaborative', desc: 'Improved communication between teachers and students.', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
                            { icon: <RotateCw size={20}/>, title: 'Organized', desc: 'Structured workflows keep your academic life stress free.', bg: 'var(--color-amber-light)', color: 'var(--color-amber)' },
                            { icon: <CalendarDays size={20}/>, title: 'Always Update', desc: 'Real-time updates and notifications keep you ahead.', bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
                        ].map(f => (
                            <div key={f.title} className="ab-what-feature">
                                <div className="ab-what-feature-icon" style={{ background: f.bg, color: f.color }}>
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
            <section className="ab-why">
                <div className="ab-why-panel">
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 28, color: 'var(--color-primary)', letterSpacing: '-0.02em', marginBottom: 32, textAlign: 'center' }}>
                        Why choose TaskOra?
                    </h2>
                    <div className="ab-why-grid">
                        {[
                            { icon: <FileText size={18}/>, title: 'Organized Assignment Management', desc: 'Keep assignments, deadlines, and submissions organized in one place.', color: 'var(--color-primary)' },
                            { icon: <MessageSquare size={18}/>, title: 'Better Communications', desc: 'Improves collaboration between students and teachers through updates and feedbacks.', color: 'var(--color-green)' },
                            { icon: <Hourglass size={18}/>, title: 'Never Miss a Deadline', desc: 'Stay informed about upcoming assignments and important academic updates.', color: 'var(--color-amber)' },
                            { icon: <TrendingUp size={18}/>, title: 'Track Academic Progress', desc: 'Monitor submission, completed assignments, and overall academic progress.', color: '#2563EB' },
                        ].map(card => (
                            <div key={card.title} className="ab-why-card">
                                <div className="ab-why-card-icon" style={{ background: card.color }}>
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
                    <div className="ab-features-grid">
                        {[
                            { title: 'Course Management', desc: 'Organize academic tracking seamlessly across your assigned courses.', bg: '#DEDCFA', color: 'var(--color-primary)' },
                            { title: 'Assignment Tracking', desc: 'Real-time visibility into active, pending, and evaluated workflows.', bg: 'var(--color-green-light)', color: 'var(--color-green)' },
                            { title: 'Online Submission', desc: 'Digital portal for fast, direct, and authenticated file deliveries.', bg: 'var(--color-amber-light)', color: 'var(--color-amber)' },
                            { title: 'Academic Dashboard', desc: 'Visual charts mapping academic activity and completion rates.', bg: '#DBEAFE', color: '#2563EB' },
                            { title: 'Nepali BS Calendar', desc: 'Full integration with Native Bikram Sambat calendar layouts.', bg: 'var(--color-red-light)', color: 'var(--color-red)' },
                            { title: 'Secure Role-Based Access', desc: 'Dedicated workspaces tailored specifically for students and teachers.', bg: '#F3E8FF', color: '#9333EA' },
                        ].map((feat, index) => (
                            <div key={index} className="ab-feature-card" style={{ background: feat.bg }}>
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
            <section className="ab-goal">
                <div className="ab-goal-grid">
                    <div>
                        <img
                            src="/target-icon.png"
                            alt="Target goal icon"
                            className="ab-goal-img"
                        />
                    </div>
                    <div>
                        <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 26, color: 'var(--color-primary)', letterSpacing: '-0.02em', margin: '0 0 16px' }}>
                            Our Goal
                        </h2>
                        <p style={{ fontSize: 14.5, color: 'var(--color-text-secondary)', lineHeight: 1.75, margin: '0 0 22px' }}>
                            We built TaskOra to cut down the manual back-and-forth around assignments so students always know what's due, and teachers spend less time chasing submissions.
                        </p>
                        <div className="ab-goal-checklist">
                            {[
                                'Track deadlines effortlessly',
                                'Monitor academic progress',
                                'Submit assignments online',
                                'Collaborate with teachers',
                            ].map(item => (
                                <div key={item} className="ab-goal-check-item">
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