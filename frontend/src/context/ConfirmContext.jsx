// src/context/ConfirmContext.jsx
// Async confirm dialog — replaces window.confirm() everywhere.
// Usage:
//   const confirm = useConfirm()
//   const ok = await confirm({ title: 'Delete task?', message: '...', danger: true })
//   if (ok) doDelete()

import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react'
import { AlertTriangle, X } from 'lucide-react'

const ConfirmContext = createContext(null)

export function ConfirmProvider({ children }) {
    const [dialog,  setDialog]  = useState(null)
    const resolveRef = useRef(null)

    const confirm = useCallback(({ title, message, confirmLabel = 'Confirm', danger = false }) => {
        return new Promise(resolve => {
            resolveRef.current = resolve
            setDialog({ title, message, confirmLabel, danger })
        })
    }, [])

    function answer(result) {
        setDialog(null)
        resolveRef.current?.(result)
    }

    // Lock body scroll while dialog is open
    useEffect(() => {
        if (!dialog) return
        const prev = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => { document.body.style.overflow = prev }
    }, [dialog])

    // Close on Escape key
    useEffect(() => {
        if (!dialog) return
        const handler = e => { if (e.key === 'Escape') answer(false) }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [dialog])

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {dialog && (
                <div
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="confirm-title"
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0,0,0,0.50)',
                        backdropFilter: 'blur(4px)',
                        WebkitBackdropFilter: 'blur(4px)',
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '16px',
                    }}
                    onClick={() => answer(false)}
                >
                    <div
                        style={{
                            background: '#ffffff',
                            borderRadius: 16,
                            boxShadow: '0 20px 60px rgba(0,0,0,0.22), 0 4px 16px rgba(0,0,0,0.10)',
                            width: '100%',
                            maxWidth: 400,
                            padding: '24px',
                            animation: 'confirmPop 0.22s cubic-bezier(0.22,1,0.36,1) both',
                            position: 'relative',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <style>{`
                            @keyframes confirmPop {
                                from { opacity:0; transform:scale(0.93) translateY(8px); }
                                to   { opacity:1; transform:scale(1) translateY(0); }
                            }
                        `}</style>

                        {/* Close button */}
                        <button
                            onClick={() => answer(false)}
                            aria-label="Close"
                            style={{
                                position: 'absolute',
                                top: 14, right: 14,
                                width: 28, height: 28,
                                border: 'none',
                                borderRadius: 8,
                                background: 'none',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#b0a898',
                                transition: 'background 0.12s, color 0.12s',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = '#f5f0e8'; e.currentTarget.style.color = '#1a1f35' }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = '#b0a898' }}
                        >
                            <X size={14} />
                        </button>

                        {/* Icon + content */}
                        <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom:20 }}>
                            <div style={{
                                width: 38, height: 38,
                                borderRadius: 10,
                                flexShrink: 0,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: dialog.danger ? 'rgba(239,68,68,0.10)' : 'rgba(245,158,11,0.10)',
                            }}>
                                <AlertTriangle
                                    size={18}
                                    style={{ color: dialog.danger ? '#ef4444' : '#f59e0b' }}
                                />
                            </div>
                            <div style={{ flex:1, paddingTop:2 }}>
                                <h3
                                    id="confirm-title"
                                    style={{
                                        fontFamily: 'var(--font-display)',
                                        fontWeight: 700,
                                        fontSize: 15,
                                        color: '#1a1f35',
                                        margin: '0 0 6px',
                                        letterSpacing: '-0.01em',
                                        lineHeight: 1.3,
                                        paddingRight: 24,
                                    }}
                                >
                                    {dialog.title}
                                </h3>
                                {dialog.message && (
                                    <p style={{
                                        fontSize: 13,
                                        color: '#8a7e6e',
                                        margin: 0,
                                        lineHeight: 1.6,
                                        fontFamily: 'var(--font-body)',
                                    }}>
                                        {dialog.message}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Action buttons */}
                        <div style={{
                            display: 'flex',
                            justifyContent: 'flex-end',
                            gap: 8,
                            paddingTop: 4,
                        }}>
                            <button
                                onClick={() => answer(false)}
                                style={{
                                    padding: '9px 18px',
                                    fontSize: 13,
                                    fontWeight: 500,
                                    color: '#1a1f35',
                                    background: '#f5f0e8',
                                    border: '1.5px solid #e0d9ce',
                                    borderRadius: 9,
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-body)',
                                    transition: 'background 0.12s, border-color 0.12s',
                                    lineHeight: 1,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = '#ede8df'; e.currentTarget.style.borderColor = '#c8c0b0' }}
                                onMouseLeave={e => { e.currentTarget.style.background = '#f5f0e8'; e.currentTarget.style.borderColor = '#e0d9ce' }}
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => answer(true)}
                                style={{
                                    padding: '9px 20px',
                                    fontSize: 13,
                                    fontWeight: 700,
                                    color: '#ffffff',
                                    background: dialog.danger ? '#ef4444' : '#1a1f35',
                                    border: 'none',
                                    borderRadius: 9,
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-display)',
                                    letterSpacing: '-0.01em',
                                    transition: 'background 0.12s, transform 0.10s',
                                    lineHeight: 1,
                                }}
                                onMouseEnter={e => { e.currentTarget.style.background = dialog.danger ? '#dc2626' : '#2e3655' }}
                                onMouseLeave={e => { e.currentTarget.style.background = dialog.danger ? '#ef4444' : '#1a1f35' }}
                                onMouseDown={e => { e.currentTarget.style.transform = 'scale(0.97)' }}
                                onMouseUp={e => { e.currentTarget.style.transform = 'scale(1)' }}
                            >
                                {dialog.confirmLabel}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    )
}

export function useConfirm() {
    const ctx = useContext(ConfirmContext)
    if (!ctx) throw new Error('useConfirm must be inside <ConfirmProvider>')
    return ctx
}
