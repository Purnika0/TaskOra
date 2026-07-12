// src/components/shared/Loader.jsx — pure CSS, no Tailwind classes

// Spinner
export function Spinner({ size=20, color='#0F172A' }) {
    return (
        <svg
        aria-label="Loading" width={size} height={size}
        viewBox="0 0 24 24" fill="none"
        style={{ animation:'to-spin 0.75s linear infinite', flexShrink:0 }}
        >
        <circle cx="12" cy="12" r="10" stroke={color} strokeWidth="3" opacity=".20"/>
        <path d="M12 2a10 10 0 0 1 10 10" stroke={color} strokeWidth="3" strokeLinecap="round"/>
        </svg>
    )
}

// Full-page loader
export function PageLoader() {
    return (
        <div style={{
        minHeight:'100vh', background:'#F8FAFC',
        display:'flex', alignItems:'center', justifyContent:'center',
        flexDirection:'column', gap:12, fontFamily:'var(--font-body)',
        }}>
        <Spinner size={32}/>
        <p style={{ fontSize:13, color:'#94A3B8' }}>Loading TaskOra…</p>
        </div>
    )
}

// Inline skeleton block
export function LoadingBlock({ rows=3 }) {
    return (
        <div style={{ display:'flex', flexDirection:'column', gap:8 }} aria-label="Loading content">
        {Array.from({length:rows}).map((_,i) => (
            <div key={i} style={{
            height:11, borderRadius:99, background:'#E2E8F0',
            width:`${70+(i%3)*10}%`,
            animation:'to-pulseLoad 1.5s ease-in-out infinite',
            animationDelay:`${i*80}ms`,
            }}/>
        ))}
        </div>
    )
}

// Inline error block
export function ErrorBlock({ message, onRetry }) {
    return (
        <div style={{
        display:'flex', alignItems:'center', justifyContent:'space-between', gap:12,
        padding:'12px 16px', background:'#fef2f2',
        border:'1px solid #fecaca', borderRadius:10,
        }}>
        <p style={{ fontSize:13, color:'#dc2626', margin:0, fontFamily:'var(--font-body)' }}>
            {message||'Something went wrong.'}
        </p>
        {onRetry && (
            <button onClick={onRetry} style={{
            fontSize:12, fontWeight:700, color:'#dc2626', background:'none',
            border:'none', cursor:'pointer', textDecoration:'underline',
            fontFamily:'var(--font-body)', flexShrink:0,
            }}>
            Retry
            </button>
        )}
        </div>
    )
}
