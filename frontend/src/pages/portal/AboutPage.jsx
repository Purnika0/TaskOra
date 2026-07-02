import { SiteFooter } from '../../components/layout/Footer.jsx'
// src/pages/portal/AboutPage.jsx
// Public page — no login required.
// Professional educational website styling with Get Started + Login CTAs.

import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, BookOpen, Users, CalendarDays, BarChart3, ShieldCheck, GraduationCap } from 'lucide-react'

function PubNav() {
    return (
        <nav style={{ background:'#fff', borderBottom:'1px solid #E2E8F0', padding:'0 24px', height:60, display:'flex', alignItems:'center', justifyContent:'space-between', position:'sticky', top:0, zIndex:50, boxShadow:'0 1px 3px rgba(15,23,42,0.06)' }}>
            <Link to="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none' }}>
                <div style={{ width:30, height:30, borderRadius:8, background:'var(--color-primary)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <GraduationCap size={14} color="#fff"/>
                </div>
                <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:16, color:'#0F172A' }}>TaskOra</span>
            </Link>
            <div style={{ display:'flex', gap:8 }}>
                <Link to="/auth?view=login" style={{ padding:'8px 16px', fontSize:13, fontWeight:600, color:'#475569', textDecoration:'none', borderRadius:8, background:'transparent' }}>
                    Login
                </Link>
                <Link to="/auth?view=signup" style={{ padding:'8px 16px', fontSize:13, fontWeight:600, color:'#fff', textDecoration:'none', borderRadius:8, background:'var(--color-primary)' }}>
                    Get Started
                </Link>
            </div>
        </nav>
    )
}


export default function AboutPage() {
    const team = [
        { role:'Project Lead', icon:<GraduationCap size={18}/> },
        { role:'Frontend Developer', icon:<GraduationCap size={18}/> },
        { role:'Backend Developer', icon:<ShieldCheck size={18}/> },
    ]

    return (
        <div style={{ minHeight:'100vh', background:'#F8FAFC', fontFamily:'var(--font-body)' }}>
            <PubNav/>

            {/* Hero */}
            <section style={{ background:'var(--color-primary)', padding:'60px 24px', textAlign:'center' }}>
                <div style={{ maxWidth:640, margin:'0 auto' }}>
                    <span style={{ display:'inline-block', background:'rgba(255,255,255,0.12)', color:'rgba(255,255,255,0.85)', fontSize:11, fontWeight:600, padding:'5px 14px', borderRadius:99, marginBottom:18, letterSpacing:'0.06em', fontFamily:'var(--font-display)' }}>
                        ABOUT TASKORA
                    </span>
                    <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:'clamp(28px,4vw,44px)', color:'#fff', letterSpacing:'-0.03em', margin:'0 0 16px', lineHeight:1.1 }}>
                        Built for Real Classroom Use
                    </h1>
                    <p style={{ fontSize:16, color:'rgba(255,255,255,0.65)', lineHeight:1.7, margin:'0 0 32px' }}>
                        TaskOra is a final-year IT project designed to solve real academic management problems for students and teachers.
                    </p>
                    <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                        <Link to="/auth?view=signup" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#fff', color:'#0055FF', fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, padding:'12px 24px', borderRadius:10, textDecoration:'none' }}>
                            Get Started <ArrowRight size={15}/>
                        </Link>
                        <Link to="/auth?view=login" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'rgba(255,255,255,0.12)', color:'#fff', fontFamily:'var(--font-display)', fontWeight:600, fontSize:14, padding:'12px 24px', borderRadius:10, textDecoration:'none', border:'1px solid rgba(255,255,255,0.20)' }}>
                            Login
                        </Link>
                    </div>
                </div>
            </section>

            {/* What is TaskOra */}
            <section style={{ padding:'64px 24px', maxWidth:960, margin:'0 auto' }}>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:28, color:'#0F172A', letterSpacing:'-0.02em', marginBottom:16, textAlign:'center' }}>
                    What is TaskOra?
                </h2>
                <p style={{ fontSize:15, color:'#475569', lineHeight:1.75, maxWidth:680, margin:'0 auto 40px', textAlign:'center' }}>
                    TaskOra is an academic task management system purpose-built for IT departments. It bridges the gap between teachers and students by providing a unified platform for assignment management, progress tracking, and academic analytics — with full Nepali Bikram Sambat calendar support.
                </p>

                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(220px,1fr))', gap:16 }}>
                    {[
                        { icon:<BookOpen size={20}/>, color:'var(--color-primary)', bg:'var(--color-primary-light)', title:'Course Management', desc:'Organize assignments by course. Students join courses with enrollment codes.' },
                        { icon:<CalendarDays size={20}/>, color:'#0055FF', bg:'#E8F0FF', title:'BS Calendar', desc:'Full Bikram Sambat calendar with Nepal public holidays and assignment due dates.' },
                        { icon:<BarChart3 size={20}/>, color:'#059669', bg:'#D1FAE5', title:'Analytics', desc:'Track completion rates, identify at-risk students with K-Means clustering.' },
                        { icon:<ShieldCheck size={20}/>, color:'#D97706', bg:'#FEF3C7', title:'Role-Based Access', desc:'Secure RBAC with separate dashboards for students, teachers, and admins.' },
                    ].map(f => (
                        <div key={f.title} style={{ background:'#fff', border:'1px solid #E2E8F0', borderRadius:14, padding:22, boxShadow:'0 1px 4px rgba(15,23,42,0.05)' }}>
                            <div style={{ width:44, height:44, borderRadius:12, background:f.bg, display:'flex', alignItems:'center', justifyContent:'center', marginBottom:14, color:f.color }}>
                                {f.icon}
                            </div>
                            <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:15, color:'#0F172A', margin:'0 0 8px' }}>{f.title}</h3>
                            <p style={{ fontSize:13, color:'#64748B', margin:0, lineHeight:1.6 }}>{f.desc}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* Mission */}
            <section style={{ background:'#fff', padding:'64px 24px' }}>
                <div style={{ maxWidth:760, margin:'0 auto', textAlign:'center' }}>
                    <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color:'#0F172A', letterSpacing:'-0.02em', marginBottom:16 }}>Our Mission</h2>
                    <p style={{ fontSize:15, color:'#475569', lineHeight:1.75, marginBottom:14 }}>
                        Academic institutions in Nepal face unique challenges — managing assignments across multiple courses, tracking student progress, and ensuring timely submissions. TaskOra was built to address these challenges with technology that feels familiar and works in the Nepali academic context.
                    </p>
                    <p style={{ fontSize:15, color:'#475569', lineHeight:1.75 }}>
                        From the full Nepali BS calendar with accurate month lengths to role-based dashboards that separate teacher and student workflows, every feature was designed for real classroom use.
                    </p>
                </div>
            </section>

            {/* Tech stack */}
            <section style={{ padding:'64px 24px', maxWidth:960, margin:'0 auto' }}>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color:'#0F172A', letterSpacing:'-0.02em', marginBottom:32, textAlign:'center' }}>Technology Stack</h2>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
                    {[
                        { label:'Frontend', value:'React + Vite', color:'var(--color-primary)' },
                        { label:'Backend',  value:'Django REST Framework', color:'#059669' },
                        { label:'Database', value:'PostgreSQL / SQLite', color:'#0055FF' },
                        { label:'Auth',     value:'JWT Tokens', color:'#D97706' },
                        { label:'ML',       value:'K-Means + Isolation Forest', color:'#DC2626' },
                        { label:'Calendar', value:'Bikram Sambat Engine', color:'#0055FF' },
                    ].map(t => (
                        <div key={t.label} style={{ background:'#fff', border:`1px solid #E2E8F0`, borderTop:`3px solid ${t.color}`, borderRadius:12, padding:'16px 18px' }}>
                            <p style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.08em', color:'#94A3B8', margin:'0 0 6px' }}>{t.label}</p>
                            <p style={{ fontSize:13, fontWeight:600, color:'#0F172A', margin:0 }}>{t.value}</p>
                        </div>
                    ))}
                </div>
            </section>

            {/* CTA */}
            <section style={{ background:'var(--color-cream)', padding:'56px 24px', textAlign:'center' }}>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, color:'#0F172A', letterSpacing:'-0.02em', margin:'0 0 12px' }}>
                    Ready to get started?
                </h2>
                <p style={{ fontSize:14, color:'#475569', margin:'0 0 28px' }}>Join TaskOra and organize your academic life.</p>
                <div style={{ display:'flex', gap:12, justifyContent:'center', flexWrap:'wrap' }}>
                    <Link to="/auth?view=signup" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--color-primary)', color:'#fff', fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, padding:'12px 24px', borderRadius:10, textDecoration:'none' }}>
                        Get Started <ArrowRight size={15}/>
                    </Link>
                    <Link to="/auth?view=login" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#fff', color:'#0F172A', fontFamily:'var(--font-display)', fontWeight:600, fontSize:14, padding:'12px 24px', borderRadius:10, textDecoration:'none', border:'1px solid #E2E8F0' }}>
                        Login
                    </Link>
                </div>
            </section>
        <SiteFooter/>
        </div>
    )
}