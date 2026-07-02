    // src/pages/portal/LegalPage.jsx
    // Public legal / terms page — no login required.

    import React, { useState } from 'react'
    import { Link } from 'react-router-dom'
    import { 
    ArrowRight, 
    GraduationCap, 
    Lock, 
    AlertTriangle, 
    Scale, 
    FileSignature 
    } from 'lucide-react'
    import { SiteFooter } from '../../components/layout/Footer.jsx'

    function PubNav() {
    return (
        <nav style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#5452e4', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={14} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#0F172A' }}>TaskOra</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/auth" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#475569', textDecoration: 'none', borderRadius: 8 }}>Login</Link>
            <Link to="/auth" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', borderRadius: 8, background: '#5452e4' }}>Get Started</Link>
        </div>
        </nav>
    )
    }

    export default function LegalPage() {
    const updated = 'July 2026'
    const [activeTab, setActiveTab] = useState('terms')

    const legalSections = [
        { id: 'terms', label: 'Terms of Service', icon: <FileSignature size={16} /> },
        { id: 'privacy', label: 'Privacy Policy', icon: <Lock size={16} /> },
        { id: 'academic', label: 'Academic Disclaimer', icon: <AlertTriangle size={16} /> }
    ]

    return (
        <div style={{ minHeight: '100vh', background: '#F8FAFC', fontFamily: 'var(--font-body)', color: '#334155' }}>
        <PubNav />

        {/* Modern Compact Header */}
        <section style={{ background: '#FFFFFF', borderBottom: '1px solid #E2E8F0', padding: '40px 24px' }}>
            <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 24 }}>
            <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#5452e4', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                <Scale size={16} /> Trust &amp; Legal Center
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Simple, Honest Terms
                </h1>
                <p style={{ fontSize: 14, color: '#64748B', margin: '4px 0 0' }}>Last updated: {updated}</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
                <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#5452e4', color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
                Create Account <ArrowRight size={14} />
                </Link>
            </div>
            </div>
        </section>

        {/* Main Layout Container */}
        <div style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px', display: 'grid', gridTemplateColumns: '260px 1fr', gap: 40 }}>
            
            {/* Left Sticky Navigation Sidebar */}
            <aside style={{ position: 'sticky', top: 100, height: 'fit-content' }}>
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
                        background: isSelected ? '#EEEDFD' : 'transparent',
                        color: isSelected ? '#5452e4' : '#475569',
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

            <div style={{ marginTop: 32, padding: '16px', background: '#FFF', border: '1px solid #E2E8F0', borderRadius: 12 }}>
                <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Have questions?</h4>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>If anything here seems confusing or you need support, drop us an email.</p>
                <a href="mailto:taskora2083@gmail.com" style={{ fontSize: 13, color: '#5452e4', fontWeight: 600, textDecoration: 'none' }}>taskora2083@gmail.com</a>
            </div>
            </aside>

            {/* Right Content Section */}
            <main style={{ background: '#fff', border: '1px solid #E2E8F0', borderRadius: 16, padding: '40px', boxShadow: '0 1px 3px rgba(15,23,42,0.02)' }}>
            
            {activeTab === 'terms' && (
            <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 0, marginBottom: 24 }}>Terms of Service</h2>
                
                <div style={{ background: '#FFFBEB', border: '1px solid #FDE68A', borderRadius: 8, padding: '14px 16px', marginBottom: 24, display: 'flex', gap: 12 }}>
                <AlertTriangle size={18} style={{ color: '#D97706', flexShrink: 0, marginTop: 2 }} />
                <p style={{ margin: 0, fontSize: 13, color: '#92400E', lineHeight: 1.6 }}>
                    <strong>Heads up:</strong> TaskOra is an educational platform. Please check out the Academic Disclaimer tab before relying on it for high-stakes school projects.
                </p>
                </div>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>1. Who Can Use TaskOra</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    TaskOra is built for students, teachers, and school administrators. Students can easily register using verified academic identities. To keep the community secure, teacher and administrator accounts are set up manually by our system team—there is no automated trick to get teacher privileges.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>2. Golden Rules (Acceptable Use)</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
                    We want to maintain a fair, safe space for learning. Accounts will be permanently banned for any of the following behavior:
                </p>
                <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: 1.6 }}>
                    <li>Submitting plagiarized assignments or pretending to be someone else.</li>
                    <li>Uploading malicious scripts, malware, or hacking tools.</li>
                    <li>Trying to mess with our database, grading logs, or administrator settings.</li>
                </ul>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>3. File Formats &amp; Deadlines</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Our system reads standard assignment files like PDF, DOC, and DOCX. Keep an eye on the clock: assignment deadlines are tracked automatically, and late submissions will be visible to your instructors. We aren't responsible if your local internet drops right as a deadline passes, so submit early!
                </p>
                </section>
            </div>
            )}

            {activeTab === 'privacy' && (
            <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 0, marginBottom: 24 }}>Data Privacy Policy</h2>
                
                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>1. What We Collect (And What We Don't)</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    We only ask for details needed to run your dashboard: your name, school email, enrollment link keys, and assignment uploads. <strong>We strictly do not sell or trade your data.</strong> No trackers, no ad networks, no monetization conglomerates. Your info stays clean.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>2. Who Can See Your Files</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Your learning and work are private. Uploaded assignments and grades are strictly restricted to you, your specific teacher, and our system admin (solely for fixing technical glitches). Performance stats may be combined into anonymous school-wide reports, but individual details remain private.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>3. Your Right to Delete</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Your data belongs to you. If you choose to delete your account, your personal details and assignments are completely wiped out from our active databases, leaving only basic secure event logs necessary to keep the system's infrastructure stable.
                </p>
                </section>
            </div>
            )}

            {activeTab === 'academic' && (
            <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 0, marginBottom: 24 }}>Academic Project Disclaimer</h2>
                
                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Educational Pilot Context</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    TaskOra is a specialized educational pilot program. Because it is a learning-centered deployment rather than a giant enterprise commercial engine, we cannot guarantee constant 100% server uptime or high-redundancy immediate backup recovery found in corporate software packages.
                </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Limitation of Liability</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    This platform is provided strictly on an "as-is" and "as-available" basis. The developer team and associated academic mentors cannot be held liable for accidental missing grades, file damage, connection drops, or temporary server outages. <strong>Please always save a separate, personal backup of your critical schoolwork.</strong>
                </p>
                </section>
            </div>
            )}

            {/* Quick Call to Action Footer inside Content card */}
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
            <span style={{ fontSize: 13, color: '#64748B' }}>By registering or using TaskOra, you agree to these simple rules.</span>
            <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#5452e4', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Go to Registration <ArrowRight size={14} />
            </Link>
            </div>

            </main>
        </div>

        <SiteFooter />
        </div>
    )
    }