import React from 'react'
import {
    FileText, CheckCircle2, XCircle, Clock, AlertTriangle, Upload,
    UserPlus, GraduationCap, BookOpen, Mail, RefreshCw,
} from 'lucide-react'

const CONFIG = {
    new_assignment:       { icon: FileText,     color: '#3b6fd4', bg: '#EFF3FD' },
    assignment_updated:   { icon: RefreshCw,    color: '#3b6fd4', bg: '#EFF3FD' },
    submission_approved:  { icon: CheckCircle2, color: '#16A34A', bg: '#DCFCE7' },
    submission_rejected:  { icon: XCircle,      color: '#DC2626', bg: '#FEE2E2' },
    deadline_reminder:    { icon: Clock,        color: '#D97706', bg: '#FEF3C7' },
    assignment_overdue:   { icon: AlertTriangle,color: '#DC2626', bg: '#FEE2E2' },
    new_submission:       { icon: Upload,       color: '#5452e4', bg: '#EEEDFD' },
    new_student_registered: { icon: UserPlus,      color: '#1d4ed8', bg: '#eff3fd' },
    new_teacher_registered: { icon: GraduationCap, color: '#5b21b6', bg: '#f0e8ff' },
    new_course_created:     { icon: BookOpen,      color: '#3b6fd4', bg: '#EFF3FD' },
    contact_message:        { icon: Mail,          color: '#92400e', bg: '#fffbeb' },
    course_assigned:         { icon: GraduationCap, color: '#5b21b6', bg: '#f0e8ff' },
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