// src/components/notifications/NotificationIcon.jsx
// Small colored icon badge per notification type — shared by the bell
// dropdown and the full notifications page so the two stay visually in sync.

import React from 'react'
import {
    FileText, CheckCircle2, Clock, AlertTriangle, Upload,
} from 'lucide-react'

const CONFIG = {
    new_assignment:       { icon: FileText,     color: '#3b6fd4', bg: '#EFF3FD' },
    submission_approved:  { icon: CheckCircle2, color: '#16A34A', bg: '#DCFCE7' },
    deadline_reminder:    { icon: Clock,        color: '#D97706', bg: '#FEF3C7' },
    assignment_overdue:   { icon: AlertTriangle,color: '#DC2626', bg: '#FEE2E2' },
    new_submission:       { icon: Upload,       color: '#5452e4', bg: '#EEEDFD' },
}

export default function NotificationIcon({ type, size = 30 }) {
    const cfg = CONFIG[type] || { icon: FileText, color: '#64748B', bg: '#F1F5F9' }
    const Icon = cfg.icon
    return (
        <div style={{
            width: size, height: size, borderRadius: '50%', background: cfg.bg,
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
            <Icon size={Math.round(size * 0.5)} style={{ color: cfg.color }} />
        </div>
    )
}