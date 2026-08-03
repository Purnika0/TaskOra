// A drop-in replacement for native <select> elements.
//
// WHY THIS EXISTS: a native <select>'s open popup is rendered by the
// browser/OS, completely outside the page's layout and CSS — its width is
// sized to the longest option's text, not to the trigger element, and it
// is not clamped to the viewport. On narrow screens (or a select sitting
// near the right edge), that popup can render partway off-screen with no
// way to fix it from CSS. This component renders the whole thing — trigger
// + option list — ourselves, so we can size and position it responsively
// like any other element on the page.
//
// Follows the same open/close + edge-detection conventions as
// BSDatePicker.jsx (outside-click to close, flips left/up near viewport
// edges, width capped with `calc(100vw - 24px)` as a hard safety net).

import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Check } from 'lucide-react'

// options: array of either plain strings, or { value, label } objects.
// value / onChange: onChange receives the raw value directly (not an event) —
// e.g. onChange={setSortBy}, not onChange={e => setSortBy(e.target.value)}.
export default function Select({
    value,
    onChange,
    options,
    placeholder = 'Select…',
    style = {},
    triggerStyle = {},
    className = '',
    ariaLabel,
    disabled = false,
}) {
    const [open, setOpen]       = useState(false)
    const [openLeft, setOpenLeft] = useState(false)
    const [openUp, setOpenUp]     = useState(false)
    const wrapRef = useRef(null)

    const norm = options.map(o => (typeof o === 'object' && o !== null) ? o : { value: o, label: String(o) })
    const selected = norm.find(o => String(o.value) === String(value))

    useEffect(() => {
        function handleClick(e) {
            if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false)
        }
        function handleKey(e) {
            if (e.key === 'Escape') setOpen(false)
        }
        document.addEventListener('mousedown', handleClick)
        document.addEventListener('keydown', handleKey)
        return () => {
            document.removeEventListener('mousedown', handleClick)
            document.removeEventListener('keydown', handleKey)
        }
    }, [])

    function toggle() {
        if (disabled) return
        setOpen(o => {
            const next = !o
            if (next && wrapRef.current) {
                const rect = wrapRef.current.getBoundingClientRect()
                const POPUP_WIDTH  = Math.max(rect.width, 200)
                const POPUP_HEIGHT = Math.min(norm.length * 36 + 12, 280)
                setOpenLeft(rect.left + POPUP_WIDTH > window.innerWidth - 8)
                setOpenUp(rect.bottom + POPUP_HEIGHT > window.innerHeight - 8)
            }
            return next
        })
    }

    function pick(optValue) {
        onChange(optValue)
        setOpen(false)
    }

    return (
        <div ref={wrapRef} style={{ position: 'relative', ...style }}>
            <button
                type="button"
                onClick={toggle}
                disabled={disabled}
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-label={ariaLabel}
                className={className}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                    padding: '6px 10px', fontSize: 11.5, fontWeight: 600,
                    border: '1px solid var(--color-border)', borderRadius: 8,
                    background: disabled ? 'var(--color-surface-subtle)' : 'var(--color-surface)',
                    color: 'var(--color-text-secondary)',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    fontFamily: 'var(--font-body)',
                    width: '100%', boxSizing: 'border-box',
                    maxWidth: 'calc(100vw - 24px)',
                    ...triggerStyle,
                }}
            >
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {selected ? selected.label : placeholder}
                </span>
                <ChevronDown size={13} style={{ flexShrink: 0, opacity: 0.6, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s ease' }}/>
            </button>

            {open && (
                <div
                    role="listbox"
                    style={{
                        position: 'absolute',
                        ...(openUp   ? { bottom: 'calc(100% + 4px)' } : { top: 'calc(100% + 4px)' }),
                        ...(openLeft ? { right: 0 } : { left: 0 }),
                        zIndex: 60,
                        minWidth: '100%',
                        width: 'max-content',
                        maxWidth: 'calc(100vw - 24px)',
                        maxHeight: 280,
                        overflowY: 'auto',
                        background: '#fff',
                        borderRadius: 10,
                        border: '1px solid var(--color-border)',
                        boxShadow: '0 12px 32px rgba(15,23,42,0.18)',
                        padding: 4,
                        boxSizing: 'border-box',
                    }}
                >
                    {norm.map(o => {
                        const isSelected = String(o.value) === String(value)
                        return (
                            <div
                                key={o.value}
                                role="option"
                                aria-selected={isSelected}
                                onClick={() => pick(o.value)}
                                style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
                                    padding: '8px 10px', borderRadius: 7, fontSize: 12.5, fontWeight: isSelected ? 700 : 500,
                                    color: isSelected ? 'var(--color-primary)' : 'var(--color-text)',
                                    background: isSelected ? 'color-mix(in srgb, var(--color-primary) 8%, white)' : 'transparent',
                                    cursor: 'pointer',
                                    whiteSpace: 'normal', wordBreak: 'break-word', lineHeight: 1.35,
                                }}
                                onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = 'var(--color-surface-subtle)' }}
                                onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = 'transparent' }}
                            >
                                <span>{o.label}</span>
                                {isSelected && <Check size={13} style={{ flexShrink: 0 }}/>}
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}