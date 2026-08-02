// Lightweight toast notifications. No external library needed.
// Usage: const toast = useToast()
//        toast.success('Task added')
//        toast.error('Something went wrong')

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'

const ICON_COLOR = {
    success: '#3cb87a',
    error:   '#e05252',
    warning: '#d4a93c',
}

const ICON = {
    success: <CheckCircle2 size={15} style={{ color: ICON_COLOR.success, flexShrink: 0 }} />,
    error:   <XCircle      size={15} style={{ color: ICON_COLOR.error, flexShrink: 0 }} />,
    warning: <AlertTriangle size={15} style={{ color: ICON_COLOR.warning, flexShrink: 0 }} />,
}

const TOAST_CSS = `
.toast-region {
    position: fixed; bottom: 20px; right: 20px; z-index: 9999;
    display: flex; flex-direction: column; gap: 8px;
    pointer-events: none;
}
.toast-item {
    pointer-events: auto;
    display: flex; align-items: center; gap: 12px;
    background: #fff;
    box-shadow: 0 10px 25px -5px rgba(0,0,0,0.15), 0 8px 10px -6px rgba(0,0,0,0.08);
    border-radius: 12px;
    padding: 12px 16px;
    min-width: 240px; max-width: 320px;
}
.toast-message { font-size: 14px; color: #1a1f35; font-weight: 500; margin: 0; flex: 1; }
.toast-dismiss {
    color: #b0a898; background: none; border: none; cursor: pointer;
    margin-left: 4px; transition: color 0.15s ease; padding: 0; line-height: 0;
}
.toast-dismiss:hover { color: #1a1f35; }
`

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([])
    const timers = useRef({})

    const dismiss = useCallback(id => {
        clearTimeout(timers.current[id])
        setToasts(prev => prev.filter(t => t.id !== id))
    }, [])

    const show = useCallback((message, type = 'success', duration = 3500) => {
        const id = `toast_${Date.now()}`
        setToasts(prev => [...prev, { id, message, type }])
        timers.current[id] = setTimeout(() => dismiss(id), duration)
    }, [dismiss])

    const toast = {
        success: (msg, dur) => show(msg, 'success', dur),
        error:   (msg, dur) => show(msg, 'error',   dur || 5000),
        warning: (msg, dur) => show(msg, 'warning', dur),
    }

    return (
        <ToastContext.Provider value={toast}>
        {children}
        {toasts.length > 0 && (
            <>
            <style>{TOAST_CSS}</style>
            <div
            role="region"
            aria-label="Notifications"
            className="toast-region"
            >
            {toasts.map(t => (
                <div
                key={t.id}
                role="alert"
                className="toast-item anim-slide-up"
                style={{ borderLeft: `3px solid ${ICON_COLOR[t.type]}` }}
                >
                {ICON[t.type]}
                <p className="toast-message">{t.message}</p>
                <button
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss"
                    className="toast-dismiss"
                >
                    <X size={13} />
                </button>
                </div>
            ))}
            </div>
            </>
        )}
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be inside <ToastProvider>')
    return ctx
}