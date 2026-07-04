// src/pages/portal/LegalPage.jsx
    // Public legal / terms page — no login required.

    import React, { useState } from 'react'
    import { Link } from 'react-router-dom'
    import { useAuth } from '../../hooks/useAuth.js'
    import { 
    ArrowRight, 
    GraduationCap, 
    ShieldCheck, 
    AlertTriangle, 
    ScrollText,
    BadgeInfo,
    Landmark
    } from 'lucide-react'
    import { SiteFooter } from '../../components/layout/Footer.jsx'

    function PubNav({ user }) {
    return (
        <nav style={{ background: '#fff', borderBottom: '1px solid var(--color-border)', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={14} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: 'var(--color-text)' }}>TaskOra</span>
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            {user ? (
                <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', borderRadius: 8, background: 'var(--color-primary)' }}>
                    Dashboard <ArrowRight size={13} />
                </Link>
            ) : (
                <>
                    <Link to="/auth?view=login" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: 'var(--color-text-secondary)', textDecoration: 'none', borderRadius: 8 }}>Sign In</Link>
                    <Link to="/auth?view=signup" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', borderRadius: 8, background: 'var(--color-primary)' }}>Sign Up</Link>
                </>
            )}
        </div>
        </nav>
    )
    }

    const LEGAL_CSS = `
    .legal-layout { display:grid; grid-template-columns:260px 1fr; gap:40px; }
    .legal-aside  { position:sticky; top:100px; height:fit-content; }
    @media (max-width:820px) {
        .legal-layout { grid-template-columns:1fr; }
        .legal-aside  { position:static; }
    }
    `

    export default function LegalPage() {
    const { user } = useAuth()
    const updated = 'July 2026'
    const [activeTab, setActiveTab] = useState('terms')

    const legalSections = [
        { id: 'terms', label: 'Terms of Service', icon: <ScrollText size={16} /> },
        { id: 'privacy', label: 'Privacy Policy', icon: <ShieldCheck size={16} /> },
        { id: 'disclaimer', label: 'Disclaimer', icon: <BadgeInfo size={16} /> }
    ]

    return (
        <div style={{ minHeight: '100vh', background: 'var(--color-bg)', fontFamily: 'var(--font-body)', color: '#334155' }}>
        <style>{LEGAL_CSS}</style>
        <PubNav user={user} />

        {/* Modern Compact Header */}
        <section style={{ background: '#FFFFFF', borderBottom: '1px solid var(--color-border)', padding: '40px 24px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--color-primary)', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                <Landmark size={16} /> Academic Trust Center
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: 'var(--color-text)', margin: 0, letterSpacing: '-0.02em' }}>
                Terms, Privacy &amp; Policies
                </h1>
                <p style={{ fontSize: 14, color: 'var(--color-text-secondary)', margin: '8px 0 0', maxWidth: 520, lineHeight: 1.6 }}>
                This page outlines TaskOra's Terms of Service, Privacy Policy, and Disclaimer.
                </p>
                <p style={{ fontSize: 13, color: 'var(--color-text-muted)', margin: '8px 0 0' }}>Last updated: {updated}</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
                {user ? (
                    <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
                    Go to Dashboard <ArrowRight size={14} />
                    </Link>
                ) : (
                    <Link to="/auth?view=signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: 'var(--color-primary)', color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
                    Create Account <ArrowRight size={14} />
                    </Link>
                )}
            </div>
            </div>
        </section>

        {/* Main Layout Container */}
        <div className="legal-layout" style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
            
            {/* Left Sticky Navigation Sidebar */}
            <aside className="legal-aside">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {legalSections.map((sec) => {
                const isSelected = activeTab === sec.id
                return (
                    <button
                    key={sec.id}
                    onClick={() => setActiveTab(sec.id)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 16px',
                        borderRadius: 8,
                        border: 'none',
                        background: isSelected ? 'var(--color-primary-light)' : 'transparent',
                        color: isSelected ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                        fontFamily: 'inherit',
                        fontWeight: isSelected ? 600 : 500,
                        fontSize: 14,
                        textAlign: 'left',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                    }}
                    >
                    {sec.icon}
                    {sec.label}
                    </button>
                )
                })}
            </div>

            <div style={{ marginTop: 32, padding: '16px', background: '#FFF', border: '1px solid var(--color-border)', borderRadius: 12 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: 'var(--color-text)' }}>Have questions?</h4>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--color-text-muted)', lineHeight: 1.5 }}>If you have any questions regarding these policies, please contact us.</p>
                <a href="mailto:taskora2083@gmail.com" style={{ fontSize: 13, color: 'var(--color-primary)', fontWeight: 600, textDecoration: 'none' }}>taskora2083@gmail.com</a>
            </div>
            </aside>

            {/* Right Content Section */}
            <main style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 16, padding: '40px', boxShadow: '0 1px 3px rgba(15,23,42,0.02)' }}>
            
            {activeTab === 'terms' && (
            <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', marginTop: 0, marginBottom: 24 }}>Terms of Service</h2>
                
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '14px 16px', marginBottom: 24, display: 'flex', gap: 12 }}>
                <AlertTriangle size={18} style={{ color: 'var(--color-amber)', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
                    <strong>Important Notice:</strong> TaskOra is an educational platform. Please review the Disclaimer tab before relying on it for high-stakes school projects.
                </p>
                </div>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>1. Who Can Use TaskOra</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    TaskOra is intended for use by students, teachers, and school administrators for academic purposes. Students may register using their email address, which is verified through a one-time verification code sent to that address. To keep the community secure, teacher and administrator accounts are created manually by our system team; there is no self-service process for obtaining elevated privileges.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>2. Acceptable Use</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
                    Users must use TaskOra responsibly and in accordance with applicable academic policies. The following activities are strictly prohibited:
                </p>
                <ul style={{ paddingLeft: 20, margin: 0, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: 1.6 }}>
                    <li>Submitting plagiarized assignments or impersonating another user.</li>
                    <li>Uploading malicious scripts, malware, or hacking tools.</li>
                    <li>Attempting to access, modify, or interfere with the platform, database, or security mechanisms without authorization.</li>
                </ul>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Violation of these terms may result in suspension or permanent removal of the associated account.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>3. File Formats &amp; Deadlines</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Our system accepts standard assignment file formats, including PDF, DOC, and DOCX. Assignment deadlines are tracked automatically, and late submissions will be visible to instructors. Users are responsible for submitting assignments before the applicable deadline. TaskOra cannot guarantee successful submission in the event of internet connectivity issues, power outages, or other circumstances beyond its control, and recommends submitting well in advance of the deadline.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>4. Intellectual Property</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Students retain ownership of the assignments and files they upload to TaskOra. Uploaded files are stored, processed, and displayed solely for educational purposes within the platform, including submission review, grading, and feedback between students and their instructors.
                </p>
                </section>
            </div>
            )}

            {activeTab === 'privacy' && (
            <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', marginTop: 0, marginBottom: 24 }}>Data Privacy Policy</h2>
                
                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>1. What We Collect (And What We Don't)</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
                    TaskOra collects only the information necessary to provide its services, including:
                </p>
                <ul style={{ paddingLeft: 20, margin: 0, marginBottom: 12, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 14, lineHeight: 1.6 }}>
                    <li>Name</li>
                    <li>Email address</li>
                    <li>Course enrollment information</li>
                    <li>Assignment submissions</li>
                </ul>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    <strong>We do not sell or share your personal information for advertising purposes.</strong> TaskOra does not use third-party trackers, advertising networks, or data monetization services.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>2. Who Can See Your Files</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Your learning and work are private. Uploaded assignments and grades are restricted to you, your instructor, and system administrators acting solely for the purpose of system maintenance and technical support. Performance data may be combined into aggregated, anonymous statistics, but individual details remain private.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>3. Your Right to Delete</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Upon account deletion, your personal information will be removed from active systems where technically and legally feasible. Certain records may be retained where required for security, auditing, or legal obligations.
                </p>
                </section>
            </div>
            )}

            {activeTab === 'disclaimer' && (
            <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: 'var(--color-text)', marginTop: 0, marginBottom: 24 }}>Disclaimer</h2>
                
                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>Service Availability</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    TaskOra is intended for educational use. While reasonable efforts are made to keep the platform available, uninterrupted service cannot be guaranteed. Temporary maintenance, technical issues, or unforeseen events may occasionally affect availability.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--color-text)', marginBottom: 10 }}>Limitation of Liability</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    This platform is provided strictly on an "as-is" and "as-available" basis. To the maximum extent permitted by applicable law, TaskOra and its developers shall not be liable for any indirect, incidental, or consequential damages — including data loss, service interruptions, file damage, or connection drops — resulting from the use or inability to use the platform. <strong>Users are strongly encouraged to keep a separate, personal backup of important assignments before submission.</strong>
                </p>
                </section>
            </div>
            )}

            {/* Quick Call to Action Footer inside Content card */}
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid var(--color-border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>By creating an account or using TaskOra, you acknowledge that you have read, understood, and agreed to these Terms of Service, Privacy Policy, and Disclaimer.</span>
            {user ? (
                <Link to="/app" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Go to Dashboard <ArrowRight size={14} />
                </Link>
            ) : (
                <Link to="/auth?view=signup" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Go to Registration <ArrowRight size={14} />
                </Link>
            )}
            </div>

            </main>
        </div>

        <SiteFooter />
        </div>
    )
    }