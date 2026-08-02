// src/pages/portal/ContactPage.jsx

import { useState } from 'react'
import { useToast }            from '../../context/ToastContext.jsx'
import contactService          from '../../services/contact.service.js'
import { Mail, Phone, MapPin, CheckCircle2, ArrowRight } from 'lucide-react'
import { SiteFooter } from '../../components/layout/Footer.jsx'
import PublicNavbar from '../../components/layout/PublicNavbar.jsx'

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

    export default function ContactPage() {
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
        `}</style>

        <PublicNavbar/>

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