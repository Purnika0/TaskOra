import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

// Wraps the app to catch render-time errors in any child component and show
// a fallback screen instead of an unstyled crash/blank page. Does not catch
// errors from event handlers, async code, or effects — only React itself
// calls getDerivedStateFromError/componentDidCatch, and only for render errors.
//
// Uses inline styles (not the shared stylesheets) so the fallback still
// renders correctly even if a CSS load/parse issue was part of what broke.
export default class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false } }
    static getDerivedStateFromError() { return { hasError: true } }
    componentDidCatch(err, info) { console.error('[TaskOra]', err, info.componentStack) }

    render() {
        if (!this.state.hasError) return this.props.children
        return (
            <div style={{ minHeight: '100vh', background: '#F8FAFC', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
                <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 4px 12px rgba(0,0,0,0.08)', padding: 40, textAlign: 'center', maxWidth: 384, width: '100%' }}>
                    <div style={{ width: 48, height: 48, borderRadius: 16, background: '#FEF2F2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                        <AlertTriangle size={24} color="#EF4444" />
                    </div>
                    <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 20, color: '#0F172A', margin: '0 0 8px' }}>
                        Something went wrong
                    </h2>
                    <p style={{ fontSize: 14, color: '#64748B', margin: '0 0 24px' }}>
                        Refreshing the page will fix this. Your data is safe.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: '#0F172A', color: '#fff', fontSize: 14, fontWeight: 700, padding: '10px 20px', borderRadius: 12, border: 'none', cursor: 'pointer' }}
                    >
                        <RefreshCw size={14} /> Refresh Page
                    </button>
                </div>
            </div>
        )
    }
}