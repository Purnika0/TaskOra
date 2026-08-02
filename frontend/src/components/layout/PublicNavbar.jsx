// Shared navbar for the public/portal pages (Home, About, Contact, Legal).
// Single source of truth so the logo, nav-link spacing, and header height are
// byte-identical on every page — no per-page drift, no layout shift when
// navigating between them. Only the active link's color/underline changes.

import { useState, useRef, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth.js'
import { ArrowRight, Menu, X } from 'lucide-react'

const NAV_CSS = `
.pnav-link {
    position: relative;
    font-size: 13.5px; font-weight: 600; color: var(--color-text-secondary);
    text-decoration: none; font-family: var(--font-body);
    padding: 8px 14px; border-radius: 8px;
    transition: color 0.15s ease;
}
a.pnav-link:visited { color: var(--color-text-secondary); }
.pnav-link:hover { color: var(--color-text); }
.pnav-link.active { color: var(--color-primary); }
.pnav-link.active::after {
    content: ''; position: absolute; left: 14px; right: 14px; bottom: 2px;
    height: 2px; border-radius: 2px; background: var(--color-primary);
}
.pnav-links {
    display: flex; align-items: center; gap: 4px;
}
.pnav-cta {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--font-display); font-weight: 700; font-size: 13.5px;
    color: #fff; background: var(--color-primary);
    padding: 9px 18px; border-radius: 9px; text-decoration: none;
    transition: background 0.15s ease;
    white-space: nowrap;
}
.pnav-cta:hover { background: var(--color-primary-hover); }
.pnav-signin {
    font-family: var(--font-body); font-weight: 600; font-size: 13.5px;
    color: var(--color-text-secondary); text-decoration: none;
    padding: 9px 14px; border-radius: 9px; transition: color 0.15s ease;
    white-space: nowrap;
}
.pnav-signin:hover { color: var(--color-text); }
.pnav-toggle {
    display: none; background: none; border: none; cursor: pointer;
    padding: 7px; color: var(--color-text); border-radius: 8px;
    align-items: center; justify-content: center;
}
@media (max-width: 760px) {
    .pnav-links { display: none; }
    .pnav-signin { display: none; }
    .pnav-toggle { display: flex; }
}
.pnav-mobile {
    position: fixed; inset: 0; z-index: 200;
    background: var(--color-navy);
    padding: 20px 24px; display: flex; flex-direction: column; gap: 6px;
}
.pnav-mobile-link {
    display: block; color: rgba(255,255,255,0.78); text-decoration: none;
    font-family: var(--font-display); font-weight: 600; font-size: 17px;
    padding: 14px 2px; border-bottom: 1px solid rgba(255,255,255,0.10);
}
.pnav-mobile-link.active { color: #fff; }
.pnav-mobile a:focus-visible, .pnav-mobile button:focus-visible {
    outline: 2px solid #fff; outline-offset: 2px; border-radius: 4px;
}
`

const NAV_LINKS = [
    { to: '/',        label: 'Home' },
    { to: '/about',   label: 'About Us' },
    { to: '/contact', label: 'Contact Us' },
]

export default function PublicNavbar() {
    const { user } = useAuth()
    const location = useLocation()
    const [open, setOpen] = useState(false)
    const menuRef = useRef(null)
    const toggleRef = useRef(null)

    useEffect(() => {
        if (!open) return
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        menuRef.current?.querySelector('a,button')?.focus()
        const onKey = e => { if (e.key === 'Escape') setOpen(false) }
        window.addEventListener('keydown', onKey)
        return () => {
            document.body.style.overflow = prevOverflow
            window.removeEventListener('keydown', onKey)
            toggleRef.current?.focus()
        }
    }, [open])

    return (
        <header style={{
            position: 'sticky', top: 0, zIndex: 100,
            background: '#fff', borderBottom: '1px solid var(--color-border)',
            height: 64, padding: '0 24px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
            <style>{NAV_CSS}</style>

            <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flexShrink: 0 }}>
                <div style={{ width: 32, height: 32, borderRadius: 9, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <img src="/logo.png" alt="TaskOra logo" width={32} height={32} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 17, color: 'var(--color-text)', letterSpacing: '-0.02em' }}>
                    TaskOra
                </span>
            </Link>

            <nav className="pnav-links" aria-label="Primary">
                {NAV_LINKS.map(link => (
                    <Link
                        key={link.to}
                        to={link.to}
                        className={`pnav-link${location.pathname === link.to ? ' active' : ''}`}
                        onClick={e => e.currentTarget.blur()}
                    >
                        {link.label}
                    </Link>
                ))}
            </nav>

            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {user ? (
                    <Link to="/app" className="pnav-cta">Dashboard <ArrowRight size={13} /></Link>
                ) : (
                    <>
                        <Link to="/auth?view=login" className="pnav-signin">Sign In</Link>
                        <Link to="/auth?view=signup" className="pnav-cta">Sign Up</Link>
                    </>
                )}
                <button
                    ref={toggleRef}
                    className="pnav-toggle"
                    onClick={() => setOpen(true)}
                    aria-label="Open menu"
                >
                    <Menu size={20} />
                </button>
            </div>

            {open && (
                <div className="pnav-mobile" ref={menuRef} role="dialog" aria-modal="true" aria-label="Site menu">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div style={{ width: 30, height: 30, borderRadius: 8, overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <img src="/logo.png" alt="TaskOra logo" width={30} height={30} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            </div>
                            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 16, color: '#fff' }}>TaskOra</span>
                        </div>
                        <button onClick={() => setOpen(false)} aria-label="Close menu" style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 6, borderRadius: 7 }}>
                            <X size={22} />
                        </button>
                    </div>

                    {NAV_LINKS.map(link => (
                        <Link
                            key={link.to}
                            to={link.to}
                            onClick={() => setOpen(false)}
                            className={`pnav-mobile-link${location.pathname === link.to ? ' active' : ''}`}
                        >
                            {link.label}
                        </Link>
                    ))}

                    <div style={{ marginTop: 18, display: 'flex', flexDirection: 'column', gap: 10 }}>
                        {user ? (
                            <Link to="/app" onClick={() => setOpen(false)}
                                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', color: 'var(--color-navy)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 10, textDecoration: 'none' }}>
                                Go to Dashboard <ArrowRight size={15} />
                            </Link>
                        ) : (
                            <>
                                <Link to="/auth?view=signup" onClick={() => setOpen(false)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: '#fff', color: 'var(--color-navy)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 10, textDecoration: 'none' }}>
                                    Sign Up <ArrowRight size={15} />
                                </Link>
                                <Link to="/auth?view=login" onClick={() => setOpen(false)}
                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, background: 'rgba(255,255,255,0.08)', color: '#fff', border: '1.5px solid rgba(255,255,255,0.25)', fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, padding: 14, borderRadius: 10, textDecoration: 'none' }}>
                                    Sign In
                                </Link>
                            </>
                        )}
                    </div>
                </div>
            )}
        </header>
    )
}