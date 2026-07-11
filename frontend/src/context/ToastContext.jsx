// src/context/ToastContext.jsx
// Lightweight toast notifications. No external library needed.
// Usage: const toast = useToast()
//        toast.success('Task added')
//        toast.error('Something went wrong')

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import { CheckCircle2, XCircle, AlertTriangle, X } from 'lucide-react'

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

    const ICON = {
        success: <CheckCircle2 size={15} className="text-[#3cb87a] shrink-0" />,
        error:   <XCircle      size={15} className="text-[#e05252] shrink-0" />,
        warning: <AlertTriangle size={15} className="text-[#d4a93c] shrink-0" />,
    }

    const BORDER = {
        success: 'border-l-[3px] border-[#3cb87a]',
        error:   'border-l-[3px] border-[#e05252]',
        warning: 'border-l-[3px] border-[#d4a93c]',
    }

    return (
        <ToastContext.Provider value={toast}>
        {children}
        {toasts.length > 0 && (
            <div
            role="region"
            aria-label="Notifications"
            className="fixed bottom-5 right-5 z-9999 flex flex-col gap-2 pointer-events-none"
            >
            {toasts.map(t => (
                <div
                key={t.id}
                role="alert"
                className={`pointer-events-auto flex items-center gap-3 bg-white shadow-lg rounded-xl px-4 py-3 min-w-60 max-w-[320px] animate-slide-up ${BORDER[t.type]}`}
                >
                {ICON[t.type]}
                <p className="text-sm text-[#1a1f35] font-medium flex-1">{t.message}</p>
                <button
                    onClick={() => dismiss(t.id)}
                    aria-label="Dismiss"
                    className="text-[#b0a898] hover:text-[#1a1f35] transition-colors ml-1"
                >
                    <X size={13} />
                </button>
                </div>
            ))}
            </div>
        )}
        </ToastContext.Provider>
    )
}

export function useToast() {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast must be inside <ToastProvider>')
    return ctx
}
