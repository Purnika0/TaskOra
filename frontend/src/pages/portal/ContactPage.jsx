import { SiteFooter } from '../../components/layout/Footer.jsx'
    // src/pages/portal/ContactPage.jsx
    // Auth-aware navbar: shows Sign In OR logged-in user dropdown.
    // Fully responsive with proper mobile layout.

    import React, { useState, useRef, useEffect } from 'react'
    import { Link, useNavigate }  from 'react-router-dom'
    import { useAuth }             from '../../hooks/useAuth.js'
    import { useToast }            from '../../context/ToastContext.jsx'
    import { GraduationCap, Mail, Phone, MapPin, CheckCircle2, ChevronDown, LayoutDashboard, LogOut } from 'lucide-react'

    const inp = {
    width:'100%', border:'1.5px solid #E2E8F0', borderRadius:9, padding:'10px 12px',
    fontSize:13, fontFamily:'var(--font-body)', color:'#0F172A', background:'#F8FAFC',
    outline:'none', boxSizing:'border-box', transition:'border-color 0.18s, box-shadow 0.18s, background 0.18s',
    }
    const lbl = {
    display:'block', fontSize:11, fontWeight:600, color:'#0F172A',
    marginBottom:5, letterSpacing:'0.04em', fontFamily:'var(--font-body)',
    }

    function FocusInput({ as: Tag = 'input', err, style: extraStyle, ...props }) {
    const [focused, setFocused] = useState(false)
    return (
        <Tag {...props}
        style={{
            ...inp, ...extraStyle,
            borderColor: err ? '#dc2626' : focused ? '#0F172A' : '#E2E8F0',
            boxShadow: err ? '0 0 0 3px rgba(220,38,38,0.07)' : focused ? '0 0 0 3px rgba(26,31,53,0.07)' : 'none',
            background: focused ? '#fff' : '#F8FAFC',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        />
    )
    }

    // ── Auth-aware user menu ───────────────────────────────────────
    function UserMenu({ user, logout }) {
    const [open, setOpen] = useState(false)
    const ref = useRef(null)
    const init = (user.full_name || user.username || '?').charAt(0).toUpperCase()
    const name = user.full_name || user.username || 'User'

    useEffect(() => {
        function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
        if (open) document.addEventListener('mousedown', handle)
        return () => document.removeEventListener('mousedown', handle)
    }, [open])

    return (
        <div ref={ref} style={{ position:'relative' }}>
        <button
            onClick={() => setOpen(v => !v)}
            aria-expanded={open}
            aria-label="User menu"
            style={{
            display:'flex', alignItems:'center', gap:8, padding:'6px 10px',
            border:'1.5px solid #E2E8F0', borderRadius:9, cursor:'pointer',
            background:'#fff', transition:'border-color 0.15s', fontFamily:'var(--font-body)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = '#94A3B8')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = '#E2E8F0')}
        >
            <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--color-navy)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', flexShrink:0 }}>
            {init}
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'#0F172A', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {name}
            </span>
            <ChevronDown size={12} style={{ color:'#94A3B8', transition:'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {open && (
            <div style={{
            position:'absolute', right:0, top:'calc(100% + 6px)', zIndex:50,
            background:'#fff', border:'1px solid #E2E8F0', borderRadius:10,
            boxShadow:'0 4px 20px rgba(26,31,53,0.12)', minWidth:168, padding:5,
            animation:'to-slideUp 0.15s ease both',
            }}>
            <Link to="/app/dashboard" onClick={() => setOpen(false)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', fontSize:13, color:'#0F172A', borderRadius:6, textDecoration:'none', fontFamily:'var(--font-body)' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#F8FAFC')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
                <LayoutDashboard size={13} style={{ color:'#64748B' }} />
                Dashboard
            </Link>
            <div style={{ height:1, background:'#F8FAFC', margin:'3px 4px' }} />
            <button onClick={() => { logout(); setOpen(false) }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', fontSize:13, color:'#dc2626', background:'none', border:'none', cursor:'pointer', borderRadius:6, fontFamily:'var(--font-body)', textAlign:'left' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
                <LogOut size={13} />
                Sign Out
            </button>
            </div>
        )}
        </div>
    )
    }

    export default function ContactPage() {
    const { user, logout } = useAuth()
    const toast = useToast()
    const [form, setForm] = useState({ name:'', email:'', subject:'', message:'' })
    const [errs, setErrs] = useState({})
    const [busy, setBusy] = useState(false)
    const [sent, setSent] = useState(false)

    const f = (k, v) => setForm(p => ({ ...p, [k]: v }))

    function validate() {
        const e = {}
        if (!form.name.trim())    e.name    = 'Name is required'
        if (!form.email.trim())   e.email   = 'Email is required'
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) e.email = 'Enter a valid email'
        if (!form.message.trim()) e.message = 'Message is required'
        setErrs(e)
        return !Object.keys(e).length
    }

    // OLD (fake — no API call)
    // async function submit(e) {
    //     e.preventDefault()
    //     if (!validate()) return
    //     setBusy(true)
    //     await new Promise(r => setTimeout(r, 800))
    //     toast.success("Message sent! We'll get back to you soon.")
    //     setSent(true)
    //     setBusy(false)
    // }

    // NEW — actually calls the backend
    async function submit(e) {
        e.preventDefault()
        if (!validate()) return
        setBusy(true)
        try {
            const res = await fetch('http://127.0.0.1:8000/api/contact/', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    full_name: form.name,
                    email:     form.email,
                    subject:   form.subject,
                    message:   form.message,
                }),
            })
            if (!res.ok) {
                const data = await res.json()
                // Show first validation error from backend if any
                const firstError = Object.values(data)[0]
                toast.error(Array.isArray(firstError) ? firstError[0] : firstError)
                return
            }
            toast.success("Message sent! We'll get back to you soon.")
            setSent(true)
        } catch {
            toast.error('Something went wrong. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div style={{ minHeight:'100vh', background:'#F8FAFC', fontFamily:'var(--font-body)', display:'flex', flexDirection:'column' }}>
        <style>{`
            .ct-grid {
            display: grid;
            grid-template-columns: 1fr 1.5fr;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 6px 32px rgba(26,31,53,0.12);
            }
            @media (max-width: 680px) {
            .ct-grid { grid-template-columns: 1fr !important; }
            .ct-left  { display: none !important; }
            }
            .ct-nav-right {
            display: flex;
            align-items: center;
            gap: 10px;
            }
            @media (max-width: 400px) {
            .ct-nav-right .ct-register { display: none !important; }
            }
        `}</style>

        {/* Navbar */}
        <header style={{ padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, borderBottom:'1px solid rgba(26,31,53,0.06)' }}>
            <Link to="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none', flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:8, background:'linear-gradient(135deg,var(--color-navy),var(--color-primary))', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <GraduationCap size={15} color="#fff" />
            </div>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, color:'#0F172A', letterSpacing:'-0.01em' }}>
                TaskOra
            </span>
            </Link>

            <div className="ct-nav-right">
            {user ? (
                <UserMenu user={user} logout={logout} />
            ) : (
                <>
                <Link to="/auth" className="ct-register"
                    style={{ fontSize:13, fontWeight:500, color:'#64748B', textDecoration:'none', padding:'6px 12px', borderRadius:8, fontFamily:'var(--font-body)', transition:'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = '#0F172A')}
                    onMouseLeave={e => (e.currentTarget.style.color = '#64748B')}
                >
                    Register
                </Link>
                <Link to="/auth"
                    style={{ fontSize:13, fontWeight:600, color:'#fff', textDecoration:'none', padding:'7px 14px', borderRadius:8, background:'#0F172A', fontFamily:'var(--font-display)', transition:'background 0.15s', letterSpacing:'-0.01em' }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#0F172A')}
                    onMouseLeave={e => (e.currentTarget.style.background = '#0F172A')}
                >
                    Sign In
                </Link>
                </>
            )}
            </div>
        </header>

        {/* Page heading */}
        <div style={{ textAlign:'center', padding:'28px 24px 16px' }}>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, color:'#0F172A', margin:'0 0 6px', letterSpacing:'-0.03em' }}>
            Contact Us
            </h1>
            <p style={{ fontSize:13, color:'#64748B', margin:0 }}>
            Have a question or feedback? We'd love to hear from you.
            </p>
        </div>

        {/* Content */}
        <div style={{ flex:1, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'0 20px 40px' }}>
            <div className="ct-grid" style={{ width:'100%', maxWidth:820, background:'#fff' }}>

            {/* Left info panel */}
            <div className="ct-left" style={{ background:'var(--color-navy)', padding:'36px 28px', display:'flex', flexDirection:'column', gap:24, color:'#fff' }}>
                <div>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, margin:'0 0 8px', letterSpacing:'-0.01em' }}>
                    Get in touch
                </h2>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.40)', lineHeight:1.75, margin:0 }}>
                    We respond to all messages within 24 hours on business days.
                </p>
                </div>
                {[
                { icon:<Mail size={13}/>,   label:'Email',   val:'taskora@gmail.com' },
                { icon:<Phone size={13}/>,  label:'Phone',   val:'+977 98XXXXXXXX' },
                { icon:<MapPin size={13}/>, label:'Address', val:'Kathmandu, Nepal' },
                ].map(row => (
                <div key={row.label} style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                    <div style={{ width:30, height:30, borderRadius:7, background:'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'rgba(255,255,255,0.60)' }}>
                    {row.icon}
                    </div>
                    <div>
                    <p style={{ fontSize:9, color:'rgba(255,255,255,0.25)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.09em' }}>{row.label}</p>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,0.70)', margin:0 }}>{row.val}</p>
                    </div>
                </div>
                ))}
            </div>

            {/* Right form */}
            <div style={{ padding:'32px 28px', background:'#fff' }}>
                {sent ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:280, gap:12, textAlign:'center' }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', background:'#DCFCE7', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <CheckCircle2 size={24} style={{ color:'#16A34A' }} />
                    </div>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#0F172A', margin:0 }}>Message Sent!</h3>
                    <p style={{ fontSize:13, color:'#64748B', margin:0, lineHeight:1.6 }}>
                    Thanks for reaching out. We'll get back to you within 24 hours.
                    </p>
                    <button
                    onClick={() => { setSent(false); setForm({ name:'', email:'', subject:'', message:'' }) }}
                    style={{ fontSize:13, fontWeight:600, color:'var(--color-primary)', background:'none', border:'none', cursor:'pointer', textDecoration:'underline', fontFamily:'var(--font-body)' }}
                    >
                    Send another message
                    </button>
                </div>
                ) : (
                <>
                    <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'#0F172A', margin:'0 0 18px', letterSpacing:'-0.01em' }}>
                    Send a Message
                    </h2>
                    <form onSubmit={submit} noValidate style={{ display:'flex', flexDirection:'column', gap:13 }}>
                    {[
                        { id:'cn', key:'name',    type:'text',  label:'Full Name',      required:true,  ph:'Your full name'       },
                        { id:'ce', key:'email',   type:'email', label:'Email Address',  required:true,  ph:'your@email.com'       },
                        { id:'cs', key:'subject', type:'text',  label:'Subject',        required:false, ph:'What is this about?'  },
                    ].map(({ id, key, type, label, required, ph }) => (
                        <div key={id}>
                        <label htmlFor={id} style={lbl}>{label}{required && <span style={{ color:'#dc2626' }} aria-hidden="true"> *</span>}</label>
                        <FocusInput id={id} type={type} placeholder={ph}
                            value={form[key]} onChange={e => f(key, e.target.value)} err={errs[key]} />
                        {errs[key] && <p style={{ color:'#dc2626', fontSize:11, marginTop:4 }}>{errs[key]}</p>}
                        </div>
                    ))}
                    <div>
                        <label htmlFor="cm" style={lbl}>Message <span style={{ color:'#dc2626' }} aria-hidden="true">*</span></label>
                        <FocusInput as="textarea" id="cm" rows={4} placeholder="Tell us how we can help…"
                        value={form.message} onChange={e => f('message', e.target.value)}
                        err={errs.message} style={{ resize:'vertical' }} />
                        {errs.message && <p style={{ color:'#dc2626', fontSize:11, marginTop:4 }}>{errs.message}</p>}
                    </div>
                    <button type="submit" disabled={busy}
                        style={{ background:'var(--color-primary)', color:'#fff', border:'none', borderRadius:9, padding:'11px 20px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', width:'100%', transition:'background 0.15s', opacity: busy ? 0.65 : 1, letterSpacing:'-0.01em', marginTop:2 }}
                        onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
                    >
                        {busy ? 'Sending…' : 'Send Message →'}
                    </button>
                    </form>
                </>
                )}
            </div>
            </div>
        </div>
            <SiteFooter/>
        </div>
    )
    }