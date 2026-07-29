import { Link } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { ArrowRight } from 'lucide-react'
import { SiteFooter } from '../../components/layout/Footer.jsx'
import PublicNavbar from '../../components/layout/PublicNavbar.jsx'

const LEGAL_CSS = `
.legal-section { padding: 30px 0; border-bottom: 1px solid var(--color-border); }
.legal-section:last-of-type { border-bottom: none; }
.legal-section h2 {
    font-family: var(--font-display); font-weight: 700; font-size: 18px;
    color: var(--color-text); margin: 0 0 12px;
}
.legal-section p, .legal-section li {
    font-size: 14px; color: var(--color-text-secondary); line-height: 1.7;
}
.legal-section ul { margin: 10px 0 0; padding-left: 20px; display: flex; flex-direction: column; gap: 6px; }
`

export default function LegalPage() {
    const { user } = useAuth()
    const updated = 'July 2026'

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)' }}>
            <style>{LEGAL_CSS}</style>
            <PublicNavbar/>

            <div style={{ maxWidth: 720, margin: '0 auto', padding: '48px 24px 64px' }}>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 30, color: 'var(--color-text)', margin: '0 0 8px', letterSpacing: '-0.02em' }}>
                    Terms, Privacy &amp; Disclaimer
                </h1>
                <p style={{ fontSize: 13.5, color: 'var(--color-text-muted)', margin: '0 0 36px' }}>
                    Last updated: {updated}
                </p>

                <section className="legal-section">
                    <h2>Terms and Conditions</h2>
                    <p>
                        TaskOra is intended for students, teachers, and school administrators for academic
                        purposes. Students register with their email address, verified by a one-time code;
                        teacher and administrator accounts are created manually by our system team.
                    </p>
                    <p>
                        Users must not submit plagiarized work, impersonate another user, upload malicious
                        files, or attempt to interfere with the platform or its security. Violating these
                        terms may lead to suspension or removal of an account.
                    </p>
                    <p>
                        Assignments can be submitted as PDF, DOC, or DOCX. Deadlines are tracked automatically
                        and late submissions remain visible to instructors — submit well ahead of time, since
                        TaskOra can't guarantee delivery during connectivity issues. Students keep ownership of
                        the files they upload; TaskOra stores and displays them only for grading and feedback.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>Privacy Policy</h2>
                    <p>
                        TaskOra collects only what's needed to run the platform: your name, email, course
                        enrollment, and assignment submissions. We do not sell or share this information for
                        advertising, and we don't use third-party trackers or ad networks.
                    </p>
                    <p>
                        Your uploaded work and grades are visible only to you, your instructor, and system
                        administrators supporting the platform. If you delete your account, your personal
                        information is removed from active systems except where records must be kept for
                        security or legal reasons.
                    </p>
                </section>

                <section className="legal-section">
                    <h2>Disclaimer</h2>
                    <p>
                        TaskOra is provided for educational use on an "as-is" basis. Reasonable effort is made
                        to keep it available, but uninterrupted service can't be guaranteed. TaskOra and its
                        developers aren't liable for indirect damages such as data loss or service
                        interruptions — please keep a personal backup of important assignments before
                        submission.
                    </p>
                </section>

                <div style={{ marginTop: 8, paddingTop: 28, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                    <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>
                        Questions? <a href="mailto:taskora2083@gmail.com" style={{ color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>taskora2083@gmail.com</a>
                    </span>
                    {user ? (
                        <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                            Go to Dashboard <ArrowRight size={14} />
                        </Link>
                    ) : (
                        <Link to="/auth?view=signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                            Create Account <ArrowRight size={14} />
                        </Link>
                    )}
                </div>
            </div>

            <SiteFooter/>
        </div>
    )
}
