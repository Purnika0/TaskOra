// src/components/shared/ErrorBoundary.jsx
import React from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default class ErrorBoundary extends React.Component {
    constructor(props) { super(props); this.state = { hasError: false } }
    static getDerivedStateFromError() { return { hasError: true } }
    componentDidCatch(err, info) { console.error('[TaskOra]', err, info.componentStack) }

    render() {
        if (!this.state.hasError) return this.props.children
        return (
        <div className="min-h-screen bg-[#f5f0e8] flex items-center justify-center p-6">
            <div className="bg-white rounded-2xl shadow-md p-10 text-center max-w-sm w-full">
            <div className="w-12 h-12 rounded-2xl bg-red-50 flex items-center justify-center mx-auto mb-4">
                <AlertTriangle size={24} className="text-red-500" />
            </div>
            <h2 className="font-display font-bold text-xl text-[#1a1f35] mb-2">Something went wrong</h2>
            <p className="text-sm text-[#8a7e6e] mb-6">Refreshing the page will fix this. Your data is safe.</p>
            <button
                onClick={() => window.location.reload()}
                className="inline-flex items-center gap-2 bg-[#1a1f35] text-white text-sm font-bold px-5 py-2.5 rounded-xl hover:bg-[#2e3655] transition-colors"
            >
                <RefreshCw size={14} /> Refresh Page
            </button>
            </div>
        </div>
        )
    }
}
