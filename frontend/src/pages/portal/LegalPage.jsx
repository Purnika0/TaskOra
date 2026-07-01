    // src/pages/portal/LegalPage.jsx
    // Public legal / terms page — no login required.

    import React, { useState } from 'react'
    import { Link } from 'react-router-dom'
    import { 
    ArrowRight, 
    GraduationCap, 
    Shield, 
    FileText, 
    Eye, 
    Lock, 
    AlertTriangle, 
    Scale, 
    UserCheck, 
    FileSignature 
    } from 'lucide-react'
    import { SiteFooter } from '../../components/layout/Footer.jsx'

    function PubNav() {
    return (
        <nav style={{ background: '#fff', borderBottom: '1px solid #E2E8F0', padding: '0 24px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'sticky', top: 0, zIndex: 50, boxShadow: '0 1px 3px rgba(15,23,42,0.06)' }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none' }}>
            <div style={{ width: 30, height: 30, borderRadius: 8, background: '#0055FF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <GraduationCap size={14} color="#fff" />
            </div>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#0F172A' }}>TaskOra</span>
        </Link>
        <div style={{ display: 'flex', gap: 8 }}>
            <Link to="/auth" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#475569', textDecoration: 'none', borderRadius: 8 }}>Login</Link>
            <Link to="/auth" style={{ padding: '8px 16px', fontSize: 13, fontWeight: 600, color: '#fff', textDecoration: 'none', borderRadius: 8, background: '#0055FF' }}>Get Started</Link>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#0055FF', fontWeight: 600, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
                <Scale size={16} /> Trust &amp; Legal Center
                </div>
                <h1 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '32px', color: '#0F172A', margin: 0, letterSpacing: '-0.02em' }}>
                Legal Framework &amp; Agreements
                </h1>
                <p style={{ fontSize: 14, color: '#64748B', margin: '4px 0 0' }}>Last comprehensively reviewed: {updated}</p>
            </div>
            <div style={{ display: 'flex', gap: 12 }}>
                <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0055FF', color: '#fff', fontWeight: 600, fontSize: 14, padding: '10px 20px', borderRadius: 8, textDecoration: 'none' }}>
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
                        background: isSelected ? '#EFF6FF' : 'transparent',
                        color: isSelected ? '#0055FF' : '#475569',
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
                <h4 style={{ margin: '0 0 8px', fontSize: 13, fontWeight: 700, color: '#0F172A' }}>Need assistance?</h4>
                <p style={{ margin: '0 0 12px', fontSize: 12, color: '#64748B', lineHeight: 1.5 }}>For legal inquiries regarding data handling or academic integration, contact administration support.</p>
                <a href="mailto:taskora2083@gmail.com" style={{ fontSize: 13, color: '#0055FF', fontWeight: 600, textDecoration: 'none' }}>taskora2083@gmail.com</a>
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
                    <strong>Important:</strong> TaskOra is currently provisioned as an educational deployment. Please review Section 7 (Limitation of Liability) prior to uploading institutional deliverables.
                    </p>
                </div>

                <section style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>1. Provision of Service &amp; Eligibility</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    TaskOra grants users a limited, non-transferable right to access our task management and academic portal framework. Student registration requires verifiable identity validation. Teacher and administrator accounts are strictly provisioned by system directors; automated or programmatic self-registration for faculty status is structurally barred.
                    </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>2. Acceptable Use Safeguards</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, marginBottom: 12 }}>
                    Users pledge to interface with the site exclusively for authenticated academic objectives. The following behaviors are explicit grounds for account termination:
                    </p>
                    <ul style={{ paddingLeft: 20, margin: 0, display: 'flex', flexDirection: 'column', gap: 8, fontSize: 14, lineHeight: 1.6 }}>
                    <li>Plagiarized submissions or circumventing identity verification measures.</li>
                    <li>Injecting hostile payloads, malicious scripts, or raw files containing exploits.</li>
                    <li>Interference with administrative telemetry or scraping grading databases.</li>
                    </ul>
                </section>

                <section style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>3. File Management &amp; Submission Deadlines</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    The engine standardizes asset parsing for PDF, DOC, and DOCX extensions. System clocks operate autonomously; late check-ins are explicitly flags-tracked on teacher dashboards. TaskOra explicitly disclaims responsibility for localized connectivity failure during crucial submission intervals.
                    </p>
                </section>
                </div>
            )}

            {activeTab === 'privacy' && (
                <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 0, marginBottom: 24 }}>Data Privacy Policy</h2>
                
                <section style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>1. Data Collection Mapping</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    We limit dataset collection to core application infrastructure criteria: profile identity coordinates (names, academic emails, metadata tags), enrollment linkage keys, and submitted files. We maintain a zero-monetization architecture; data packages are never leased or bartered to third-party tracking conglomerates.
                    </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>2. Information Boundaries &amp; Visibility</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Student uploads are securely siloed. Submission records are accessible exclusively by the submitting individual, their authenticated instructor, and system database administrators troubleshooting technical anomalies. Aggregate metrics (such as performance coefficients and completion ratios) are isolated for private institutional review.
                    </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>3. Rights of Deletion</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    Users retain complete ownership over their files. Account deletion flags remove user records from hot databases within active retention windows, save for system event logging required to guarantee system integrity.
                    </p>
                </section>
                </div>
            )}

            {activeTab === 'academic' && (
                <div>
                <h2 style={{ fontSize: 22, fontWeight: 700, color: '#0F172A', marginTop: 0, marginBottom: 24 }}>Academic Project Disclaimer</h2>
                
                <section style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Context of Operation</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    TaskOra operates purely under an educational mandate as an academic pilot system. It does not certify standard mercantile uptimes or possess critical high-redundancy backup guarantees expected of permanent enterprise legal arrays.
                    </p>
                </section>

                <section style={{ marginBottom: 28 }}>
                    <h3 style={{ fontSize: 16, fontWeight: 600, color: '#0F172A', marginBottom: 10 }}>Limitation of Liability</h3>
                    <p style={{ fontSize: 14, lineHeight: 1.7, margin: 0 }}>
                    The application is made accessible strictly on an "as-is" and "as-available" architecture framework. Under no circumstances shall the developer foundation or affiliated academic bodies face legal accountability for data degradation, missing grades, server dropouts, or platform interruption. Students are strongly encouraged to preserve continuous, external backups of all work files.
                    </p>
                </section>
                </div>
            )}

            {/* Quick Call to Action Footer inside Content card */}
            <div style={{ marginTop: 40, paddingTop: 24, borderTop: '1px solid #E2E8F0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <span style={{ fontSize: 13, color: '#64748B' }}>By registering an account, you affirm these frameworks.</span>
                <Link to="/auth" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#0055FF', fontWeight: 600, fontSize: 14, textDecoration: 'none' }}>
                Proceed to Auth <ArrowRight size={14} />
                </Link>
            </div>

            </main>
        </div>

        <SiteFooter />
        </div>
    )
    }