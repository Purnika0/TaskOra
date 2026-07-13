import { SiteFooter } from '../../components/layout/Footer.jsx'
    // src/pages/portal/ContactPage.jsx
    // Auth-aware navbar: shows Sign In OR logged-in user dropdown.
    // Fully responsive with proper mobile layout.

    import { useState, useRef, useEffect } from 'react'
    import { Link }  from 'react-router-dom'
    import { useAuth }             from '../../hooks/useAuth.js'
    import { useToast }            from '../../context/ToastContext.jsx'
    import contactService          from '../../services/contact.service.js'
    import { Mail, Phone, MapPin, CheckCircle2, ChevronDown, LayoutDashboard, LogOut, ArrowRight, Menu, X } from 'lucide-react'

    const inp = {
    width:'100%', border:'1.5px solid var(--color-border)', borderRadius:9, padding:'10px 12px',
    fontSize:13, fontFamily:'var(--font-body)', color:'var(--color-text)', background:'var(--color-bg)',
    outline:'none', boxSizing:'border-box', transition:'border-color 0.18s, box-shadow 0.18s, background 0.18s',
    }
    const lbl = {
    display:'block', fontSize:11, fontWeight:600, color:'var(--color-text)',
    marginBottom:5, letterSpacing:'0.04em', fontFamily:'var(--font-body)',
    }

    function FocusInput({ as: Tag = 'input', err, style: extraStyle, ...props }) {
    const [focused, setFocused] = useState(false)
    return (
        <Tag {...props}
        style={{
            ...inp, ...extraStyle,
            borderColor: err ? 'var(--color-red)' : focused ? 'var(--color-text)' : 'var(--color-border)',
            boxShadow: err ? '0 0 0 3px rgba(220,38,38,0.07)' : focused ? '0 0 0 3px rgba(26,31,53,0.07)' : 'none',
            background: focused ? '#fff' : 'var(--color-bg)',
        }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        />
    )
    }

    // Auth-aware user menu
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
            border:'1.5px solid var(--color-border)', borderRadius:9, cursor:'pointer',
            background:'#fff', transition:'border-color 0.15s', fontFamily:'var(--font-body)',
            }}
            onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--color-text-placeholder)')}
            onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--color-border)')}
        >
            <div style={{ width:26, height:26, borderRadius:'50%', background:'var(--color-navy)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, fontWeight:700, color:'#fff', fontFamily:'var(--font-display)', flexShrink:0 }}>
            {init}
            </div>
            <span style={{ fontSize:13, fontWeight:600, color:'var(--color-text)', maxWidth:120, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
            {name}
            </span>
            <ChevronDown size={12} style={{ color:'var(--color-text-placeholder)', transition:'transform 0.15s', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }} />
        </button>

        {open && (
            <div style={{
            position:'absolute', right:0, top:'calc(100% + 6px)', zIndex:50,
            background:'#fff', border:'1px solid var(--color-border)', borderRadius:10,
            boxShadow:'0 4px 20px rgba(26,31,53,0.12)', minWidth:168, padding:5,
            animation:'to-slideUp 0.15s ease both',
            }}>
            <Link to="/app/dashboard" onClick={() => setOpen(false)}
                style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 10px', fontSize:13, color:'var(--color-text)', borderRadius:6, textDecoration:'none', fontFamily:'var(--font-body)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-bg)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
                <LayoutDashboard size={13} style={{ color:'var(--color-text-muted)' }} />
                Dashboard
            </Link>
            <div style={{ height:1, background:'var(--color-bg)', margin:'3px 4px' }} />
            <button onClick={() => { logout(); setOpen(false) }}
                style={{ width:'100%', display:'flex', alignItems:'center', gap:8, padding:'8px 10px', fontSize:13, color:'var(--color-red)', background:'none', border:'none', cursor:'pointer', borderRadius:6, fontFamily:'var(--font-body)', textAlign:'left' }}
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
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

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

    async function submit(e) {
        e.preventDefault()
        if (!validate()) return
        setBusy(true)
        try {
            await contactService.submit({
                name: form.name, email: form.email, subject: form.subject, message: form.message,
            })
            toast.success("Message sent! We'll get back to you soon.")
            setSent(true)
        } catch (err) {
            const data = err.response?.data
            const firstError = data && Object.values(data)[0]
            toast.error(Array.isArray(firstError) ? firstError[0] : firstError || 'Something went wrong. Please try again.')
        } finally {
            setBusy(false)
        }
    }

    return (
        <div style={{ minHeight:'100vh', background:'var(--color-bg)', fontFamily:'var(--font-body)', display:'flex', flexDirection:'column' }}>
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
            .pub-nav-link {
            font-size:13px; color:var(--color-text-secondary); text-decoration:none;
            padding:6px 12px; border-radius:8px;
            transition:background 0.13s, color 0.13s;
            font-family:var(--font-body); font-weight:500;
            }
            a.pub-nav-link:visited { color:var(--color-text-secondary); }
            .pub-nav-link:hover { background:var(--color-surface-subtle); color:var(--color-text); }
            a.pub-nav-link.active:visited { color:var(--color-text-secondary); }
            @media (max-width:640px) { .pub-nav-links { display:none; } }
            .pub-nav-toggle { display:none; background:none; border:none; cursor:pointer; padding:6px; color:var(--color-text); align-items:center; justify-content:center; }
            @media (max-width:640px) { .pub-nav-toggle { display:flex; } }
            .pub-nav-mobile-menu {
            position:absolute; top:100%; left:0; right:0;
            background:#fff; border-bottom:1px solid var(--color-border);
            box-shadow:0 8px 24px rgba(15,23,42,0.10);
            display:flex; flex-direction:column; padding:8px; gap:2px; z-index:49;
            }
            .pub-nav-mobile-menu .pub-nav-link { padding:10px 14px; }
        `}</style>

        {/* Navbar */}
        <header style={{ padding:'12px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, borderBottom:'1px solid rgba(26,31,53,0.06)' }}>
            <Link to="/" style={{ display:'flex', alignItems:'center', gap:9, textDecoration:'none', flexShrink:0 }}>
            <div style={{ width:32, height:32, borderRadius:8, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <img src="/logo.png" alt="TaskOra logo" width={32} height={32} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            </div>
            <span style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:15, color:'var(--color-text)', letterSpacing:'-0.01em' }}>
                TaskOra
            </span>
            </Link>

            <div className="pub-nav-links" style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Link to="/" className="pub-nav-link">Home</Link>
                <Link to="/#features" className="pub-nav-link">Features</Link>
                <Link to="/about" className="pub-nav-link" onClick={e => e.currentTarget.blur()}>About Us</Link>
                <Link to="/contact" className="pub-nav-link active" onClick={e => e.currentTarget.blur()}>Contact Us</Link>
            </div>

            <div className="ct-nav-right">
            {user ? (
                <UserMenu user={user} logout={logout} />
            ) : (
                <>
                <Link to="/auth?view=signup" className="ct-register"
                    style={{ fontSize:13, fontWeight:500, color:'var(--color-text-muted)', textDecoration:'none', padding:'6px 12px', borderRadius:8, fontFamily:'var(--font-body)', transition:'color 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.color = 'var(--color-text)')}
                    onMouseLeave={e => (e.currentTarget.style.color = 'var(--color-text-muted)')}
                >
                    Register
                </Link>
                <Link to="/auth?view=login"
                    style={{ fontSize:13, fontWeight:600, color:'#fff', textDecoration:'none', padding:'7px 14px', borderRadius:8, background:'var(--color-primary)', fontFamily:'var(--font-display)', transition:'background 0.15s', letterSpacing:'-0.01em' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-primary-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'var(--color-primary)')}
                >
                    Sign In
                </Link>
                </>
            )}
            </div>
            <button className="pub-nav-toggle" onClick={() => setMobileMenuOpen(o => !o)} aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'} aria-expanded={mobileMenuOpen}>
                {mobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
            {mobileMenuOpen && (
                <div className="pub-nav-mobile-menu">
                    <Link to="/" className="pub-nav-link" onClick={() => setMobileMenuOpen(false)}>Home</Link>
                    <Link to="/#features" className="pub-nav-link" onClick={() => setMobileMenuOpen(false)}>Features</Link>
                    <Link to="/about" className="pub-nav-link" onClick={() => setMobileMenuOpen(false)}>About Us</Link>
                    <Link to="/contact" className="pub-nav-link active" onClick={() => setMobileMenuOpen(false)}>Contact Us</Link>
                </div>
            )}
        </header>

        {/* Page heading */}
        <div style={{ textAlign:'center', padding:'28px 24px 16px' }}>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:24, color:'var(--color-text)', margin:'0 0 6px', letterSpacing:'-0.03em' }}>
            Contact Us
            </h1>
            <p style={{ fontSize:13, color:'var(--color-text-muted)', margin:0 }}>
            Have a question or feedback? We'd love to hear from you.
            </p>
        </div>

        {/* Content */}
        <div style={{ flex:1, display:'flex', alignItems:'flex-start', justifyContent:'center', padding:'0 20px 40px' }}>
            <div className="ct-grid" style={{ width:'100%', maxWidth:820, background:'#fff' }}>

            {/* Left info panel */}
            <div className="ct-left" style={{ background:'var(--color-navy)', padding:'36px 28px', display:'flex', flexDirection:'column', gap:24, color:'#fff' }}>
                <div>
                <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, margin:'0 0 8px', letterSpacing:'-0.01em', color:'#fff' }}>
                    Get in touch
                </h2>
                <p style={{ fontSize:12, color:'rgba(255,255,255,0.85)', lineHeight:1.75, margin:0 }}>
                    We respond to all messages within 24 hours on business days.
                </p>
                </div>
                {[
                { icon:<Mail size={13}/>,   label:'Email',   val:'taskora2083@gmail.com' },
                { icon:<Phone size={13}/>,  label:'Phone',   val:'+977 9864160480' },
                { icon:<MapPin size={13}/>, label:'Address', val:'Kathmandu, Nepal' },
                ].map(row => (
                <div key={row.label} style={{ display:'flex', gap:11, alignItems:'flex-start' }}>
                    <div style={{ width:30, height:30, borderRadius:7, background:'rgba(255,255,255,0.07)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'rgba(255,255,255,0.60)' }}>
                    {row.icon}
                    </div>
                    <div>
                    <p style={{ fontSize:9, color:'rgba(255,255,255,0.60)', margin:'0 0 2px', textTransform:'uppercase', letterSpacing:'0.09em' }}>{row.label}</p>
                    <p style={{ fontSize:12, color:'#fff', margin:0 }}>{row.val}</p>
                    </div>
                </div>
                ))}
            </div>

            {/* Right form */}
            <div style={{ padding:'32px 28px', background:'#fff' }}>
                {sent ? (
                <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', minHeight:280, gap:12, textAlign:'center' }}>
                    <div style={{ width:52, height:52, borderRadius:'50%', background:'var(--color-green-light)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                    <CheckCircle2 size={24} style={{ color:'var(--color-green)' }} />
                    </div>
                    <h3 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--color-text)', margin:0 }}>Message Sent!</h3>
                    <p style={{ fontSize:13, color:'var(--color-text-muted)', margin:0, lineHeight:1.6 }}>
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
                    <h2 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:16, color:'var(--color-text)', margin:'0 0 18px', letterSpacing:'-0.01em' }}>
                    Send a Message
                    </h2>
                    <form onSubmit={submit} noValidate style={{ display:'flex', flexDirection:'column', gap:13 }}>
                    {[
                        { id:'cn', key:'name',    type:'text',  label:'Full Name',      required:true,  ph:'Your full name'       },
                        { id:'ce', key:'email',   type:'email', label:'Email Address',  required:true,  ph:'your@email.com'       },
                        { id:'cs', key:'subject', type:'text',  label:'Subject',        required:false, ph:'What is this about?'  },
                    ].map(({ id, key, type, label, required, ph }) => (
                        <div key={id}>
                        <label htmlFor={id} style={lbl}>{label}{required && <span style={{ color:'var(--color-red)' }} aria-hidden="true"> *</span>}</label>
                        <FocusInput id={id} type={type} placeholder={ph}
                            value={form[key]} onChange={e => f(key, e.target.value)} err={errs[key]} />
                        {errs[key] && <p style={{ color:'var(--color-red)', fontSize:11, marginTop:4 }}>{errs[key]}</p>}
                        </div>
                    ))}
                    <div>
                        <label htmlFor="cm" style={lbl}>Message <span style={{ color:'var(--color-red)' }} aria-hidden="true">*</span></label>
                        <FocusInput as="textarea" id="cm" rows={4} placeholder="Tell us how we can help…"
                        value={form.message} onChange={e => f('message', e.target.value)}
                        err={errs.message} style={{ resize:'vertical' }} />
                        {errs.message && <p style={{ color:'var(--color-red)', fontSize:11, marginTop:4 }}>{errs.message}</p>}
                    </div>
                    <button type="submit" disabled={busy}
                        style={{ background:'var(--color-primary)', color:'#fff', border:'none', borderRadius:9, padding:'11px 20px', fontSize:13, fontWeight:700, cursor:'pointer', fontFamily:'var(--font-display)', width:'100%', transition:'background 0.15s', opacity: busy ? 0.65 : 1, letterSpacing:'-0.01em', marginTop:2, display:'flex', alignItems:'center', justifyContent:'center', gap:6 }}
                        onMouseEnter={e => { if (!busy) e.currentTarget.style.background = 'var(--color-primary-hover)' }}
                        onMouseLeave={e => { e.currentTarget.style.background = 'var(--color-primary)' }}
                    >
                        {busy ? 'Sending…' : <>Send Message <ArrowRight size={14}/></>}
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