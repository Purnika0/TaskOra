import { useEffect, useState } from 'react'
import {
    FileCheck, Users, FolderLock, Copyright,
    Lock, Database, Eye, Archive, CloudOff, Scale,
    Mail, GraduationCap, ScrollText,
} from 'lucide-react'
import { SiteFooter } from '../../components/layout/Footer.jsx'
import PublicNavbar from '../../components/layout/PublicNavbar.jsx'

const LEGAL_CSS = `
.legal-hero {
    background: var(--color-bg);
    border-bottom: 1px solid var(--color-border);
    padding: 56px 24px 44px;
}
.legal-hero-inner { max-width: 900px; margin: 0 auto; }
.legal-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: var(--color-primary-light); color: var(--color-primary);
    font-size: 10px; font-weight: 700; padding: 5px 14px;
    border-radius: 99px; letter-spacing: 0.06em;
    font-family: var(--font-display); margin-bottom: 8px;
}
.legal-updated-badge {
    display: inline-flex; align-items: center; gap: 6px;
    background: #fff; border: 1px solid var(--color-border);
    color: var(--color-text-muted); font-size: 12px; font-weight: 600;
    padding: 5px 12px; border-radius: 99px; margin-top: 18px;
    font-family: var(--font-display);
}

.legal-body-wrap { max-width: 900px; margin: 0 auto; padding: 40px 24px 24px; }
.legal-grid { display: grid; grid-template-columns: 210px 1fr; gap: 40px; align-items: start; }
@media (max-width: 760px) { .legal-grid { grid-template-columns: 1fr; } }

.legal-toc { position: sticky; top: 88px; display: flex; flex-direction: column; gap: 2px; }
@media (max-width: 760px) { .legal-toc { display: none; } }
.legal-toc-group { display: flex; flex-direction: column; gap: 2px; }
.legal-toc-group + .legal-toc-group { margin-top: 24px; }
.legal-toc-label {
    font-size: 11px; font-weight: 800; color: var(--color-text);
    text-transform: uppercase; letter-spacing: 0.09em; margin: 0 0 10px;
    padding-bottom: 8px; border-bottom: 1px solid var(--color-border);
    font-family: var(--font-display);
}
.legal-toc a {
    display: block; font-size: 13px; color: var(--color-text-secondary); text-decoration: none;
    padding: 6px 10px; border-radius: 8px; border-left: 2px solid transparent;
    margin-left: -1px; transition: all 0.13s;
}
.legal-toc a:hover { color: var(--color-primary); background: var(--color-primary-light); border-left-color: var(--color-primary); }
.legal-toc a.active { color: var(--color-primary); background: var(--color-primary-light); border-left-color: var(--color-primary); font-weight: 600; }

.legal-section-divider {
    display: flex; align-items: center; gap: 12px; margin: 44px 0 18px;
}
.legal-section-divider:first-child { margin-top: 4px; }
.legal-section-divider h2 {
    font-family: var(--font-display); font-weight: 800; font-size: 20px;
    color: var(--color-text); margin: 0; letter-spacing: -0.01em; white-space: nowrap;
}
.legal-section-divider .line { height: 1px; background: var(--color-border); flex: 1; }

.legal-card {
    background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xs); padding: 30px 32px; margin-bottom: 20px;
    scroll-margin-top: 88px;
}
.legal-card-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.legal-card-icon {
    width: 38px; height: 38px; border-radius: 10px; flex-shrink: 0;
    display: flex; align-items: center; justify-content: center;
}
.legal-card h3 {
    font-family: var(--font-display); font-weight: 700; font-size: 22px;
    color: var(--color-text); margin: 0; letter-spacing: -0.01em;
}
.legal-card p, .legal-card li {
    font-size: 16px; color: var(--color-text-secondary); line-height: 1.75;
    margin: 0 0 12px;
}
.legal-card p:last-child, .legal-card ul:last-child { margin-bottom: 0; }
.legal-card ul { padding-left: 20px; display: flex; flex-direction: column; gap: 8px; margin: 0 0 12px; }
.legal-card ul li { margin: 0; }

.legal-academic-note {
    display: flex; gap: 12px; background: var(--color-primary-light);
    border-radius: var(--radius-lg); padding: 20px 22px; margin: 8px 0 8px;
}
.legal-academic-note p { font-size: 14px; color: var(--color-navy-dark); line-height: 1.65; margin: 0 0 6px; }
.legal-academic-note p:last-child { margin-bottom: 0; }

.legal-contact-card {
    background: #fff; border: 1px solid var(--color-border); border-radius: var(--radius-lg);
    box-shadow: var(--shadow-xs); padding: 26px 28px; margin-top: 28px;
    display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 16px;
}
`

const GROUP_THEME = {
    terms: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
    privacy: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
    disclaimer: { bg: 'var(--color-primary-light)', color: 'var(--color-primary)' },
}

function LegalCard({ id, icon: Icon, heading, theme, children }) {
    const { bg, color } = GROUP_THEME[theme]
    return (
        <section id={id} className="legal-card">
            <div className="legal-card-header">
                <div className="legal-card-icon" style={{ background: bg, color }}><Icon size={18}/></div>
                <h3>{heading}</h3>
            </div>
            {children}
        </section>
    )
}

function SectionDivider({ id, label }) {
    return (
        <div id={id} className="legal-section-divider">
            <h2>{label}</h2>
            <div className="line"/>
        </div>
    )
}

const TOC = [
    { group: 'Terms', items: [
        { id: 'responsibilities', label: 'User Responsibilities' },
        { id: 'accounts', label: 'Account Management' },
        { id: 'submission', label: 'Assignment Submission' },
        { id: 'platform-usage', label: 'Platform Usage' },
    ]},
    { group: 'Privacy', items: [
        { id: 'collection', label: 'Information Collection' },
        { id: 'protection', label: 'Data Protection' },
        { id: 'visibility', label: 'Data Visibility' },
        { id: 'retention', label: 'Data Retention' },
    ]},
    { group: 'Disclaimer', items: [
        { id: 'availability', label: 'Service Availability' },
        { id: 'liability', label: 'Limitation of Liability' },
    ]},
]

const ALL_IDS = TOC.flatMap(g => g.items.map(i => i.id))

export default function LegalPage() {
    const [activeId, setActiveId] = useState(ALL_IDS[0])
    const updated = 'July 2026'

    useEffect(() => {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) setActiveId(entry.target.id)
                })
            },
            { rootMargin: '-96px 0px -75% 0px', threshold: 0 }
        )
        ALL_IDS.forEach(id => {
            const el = document.getElementById(id)
            if (el) observer.observe(el)
        })
        return () => observer.disconnect()
    }, [])

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
            <style>{LEGAL_CSS}</style>
            <PublicNavbar/>

            <section className="legal-hero">
                <div className="legal-hero-inner">
                    <span className="legal-badge"><ScrollText size={12}/> LEGAL</span>
                    <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 'clamp(28px, 4vw, 38px)', color: 'var(--color-text)', margin: '4px 0 10px', letterSpacing: '-0.02em', lineHeight: 1.15 }}>
                        TaskOra Terms, Privacy Policy & Disclaimer
                    </h1>
                    <p style={{ fontSize: 16, color: 'var(--color-text-secondary)', lineHeight: 1.7, maxWidth: 580, margin: 0 }}>
                        These documents explain how TaskOra handles user responsibilities, academic data,
                        privacy, and platform usage for students, teachers, and administrators.
                    </p>
                    <span className="legal-updated-badge">Last Updated: {updated}</span>
                </div>
            </section>

            <div className="legal-body-wrap">
                <div className="legal-grid">
                    <div className="legal-toc">
                        {TOC.map(g => (
                            <div key={g.group} className="legal-toc-group">
                                <p className="legal-toc-label">{g.group}</p>
                                {g.items.map(t => (
                                    <a key={t.id} href={`#${t.id}`} className={activeId === t.id ? 'active' : ''}>
                                        {t.label}
                                    </a>
                                ))}
                            </div>
                        ))}
                    </div>

                    <div>
                        <div className="legal-academic-note">
                            <GraduationCap size={20} style={{ flexShrink: 0, marginTop: 2, color: 'var(--color-primary)' }}/>
                            <div>
                                <p>
                                    TaskOra is designed to support academic activities within educational institutions.
                                    Where they apply, the policies of your school, college, or university take precedence
                                    over anything written here.
                                </p>
                                <p>
                                    TaskOra does not replace institutional academic policies. Teachers and institutions
                                    remain responsible for their own academic rules, grading decisions, and course
                                    requirements.
                                </p>
                            </div>
                        </div>

                        <SectionDivider id="terms" label="Terms & Conditions"/>

                        <LegalCard id="responsibilities" icon={Users} heading="User Responsibilities" theme="terms">
                            <p>
                                TaskOra is intended for students, teachers, and administrators affiliated with a
                                participating institution, for academic purposes only. By using TaskOra, you agree
                                to the following:
                            </p>
                            <ul>
                                <li>Use your own account, not one issued to someone else</li>
                                <li>Provide accurate information when registering or updating your profile</li>
                                <li>Follow your institution's academic and conduct policies</li>
                                <li>Submit original work and avoid impersonating another user</li>
                                <li>Use join codes only for courses you are enrolled in</li>
                                <li>Avoid uploading harmful files or interfering with platform security</li>
                            </ul>
                            <p>Violating these terms may lead to suspension or removal of an account.</p>
                        </LegalCard>

                        <LegalCard id="accounts" icon={FolderLock} heading="Account Management" theme="terms">
                            <p>
                                Students register with their institutional or personal email address, verified
                                through a one-time code sent by TaskOra. Teacher and administrator accounts are
                                provisioned manually by the school's system team rather than self-registered.
                            </p>
                            <p>
                                Account holders are responsible for keeping their login credentials confidential
                                and for all activity under their account. Notify us promptly if unauthorized
                                access is suspected. TaskOra or an institution's administrators may suspend or
                                remove an account that violates these terms or poses a security risk; where
                                possible, the account holder will be notified of the reason.
                            </p>
                        </LegalCard>

                        <LegalCard id="submission" icon={FileCheck} heading="Assignment Submission" theme="terms">
                            <p>
                                Assignments can be submitted as PDF, DOC, or DOCX. Deadlines are tracked
                                automatically, and late submissions remain visible to instructors. Students are
                                encouraged to submit well ahead of time and keep a personal backup of important
                                work.
                            </p>
                            <p>
                                Students retain ownership of the files they upload. TaskOra stores and displays
                                submitted work only for grading, feedback, and academic record-keeping.
                            </p>
                        </LegalCard>

                        <LegalCard id="platform-usage" icon={Copyright} heading="Platform Usage" theme="terms">
                            <p>
                                The TaskOra platform, its interface, and its underlying code belong to the TaskOra
                                team. Course materials, assignment content, and grading rubrics remain the property
                                of the teacher or institution that created them.
                            </p>
                        </LegalCard>

                        <SectionDivider id="privacy" label="Privacy Policy"/>

                        <LegalCard id="collection" icon={Database} heading="Information Collection" theme="privacy">
                            <p>TaskOra collects only the information needed to run the platform:</p>
                            <ul>
                                <li>Name and email address</li>
                                <li>Course enrollment and join-code activity</li>
                                <li>Assignment submissions, grades, and feedback</li>
                                <li>Basic usage data used to power notifications and analytics</li>
                            </ul>
                            <p>
                                This information is never sold or shared for advertising purposes, and TaskOra
                                does not use third-party trackers or ad networks.
                            </p>
                        </LegalCard>

                        <LegalCard id="protection" icon={Lock} heading="Data Protection" theme="privacy">
                            <p>
                                TaskOra uses security measures designed to protect user accounts and information,
                                including verification steps at sign-in and restricted access for administrator
                                accounts. Access to student and teacher data is limited to what each role needs to
                                do its job.
                            </p>
                        </LegalCard>

                        <LegalCard id="visibility" icon={Eye} heading="Data Visibility" theme="privacy">
                            <p>
                                Uploaded work and grades are visible only to the student, the instructor for that
                                course, and system administrators supporting the platform. Class-wide analytics,
                                such as performance groupings or completion rates, are shown to teachers in
                                aggregate form and are not shared with other students.
                            </p>
                        </LegalCard>

                        <LegalCard id="retention" icon={Archive} heading="Data Retention" theme="privacy">
                            <p>
                                If an account is deleted, the associated personal information is removed from
                                active systems except where records must be kept for security, academic
                                record-keeping, or legal reasons.
                            </p>
                        </LegalCard>

                        <SectionDivider id="disclaimer" label="Disclaimer"/>

                        <LegalCard id="availability" icon={CloudOff} heading="Service Availability" theme="disclaimer">
                            <p>
                                TaskOra is provided for educational use on an "as-is" basis. Reasonable effort is
                                made to keep it accurate, reliable, and available, but uninterrupted service
                                cannot be guaranteed.
                            </p>
                            <p>
                                Deadlines are tracked automatically. Students are encouraged to submit assignments
                                well ahead of time and keep a personal backup of important work, as TaskOra cannot
                                guarantee delivery during connectivity issues or downtime.
                            </p>
                        </LegalCard>

                        <LegalCard id="liability" icon={Scale} heading="Limitation of Liability" theme="disclaimer">
                            <p>
                                TaskOra and its developers are not liable for indirect damages such as data loss,
                                missed deadlines caused by service interruptions, or decisions made based on
                                analytics, rankings, or recommendations generated by the platform.
                            </p>
                        </LegalCard>

                        <div className="legal-contact-card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                <div className="legal-card-icon" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Mail size={18}/></div>
                                <div>
                                    <p style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, color: 'var(--color-text)', margin: '0 0 2px' }}>Need Help?</p>
                                    <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: 0 }}>
                                        Questions about these terms or your data?{' '}
                                        <a href="mailto:taskora2083@gmail.com" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>
                                            taskora2083@gmail.com
                                        </a>
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div style={{ marginTop: 80 }}>
                <SiteFooter/>
            </div>
        </div>
    )
}