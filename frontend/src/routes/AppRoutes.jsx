import React from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAuth }         from '../hooks/useAuth.js'
import ProtectedRoute      from './ProtectedRoute.jsx'
import DashboardShell      from './DashboardShell.jsx'
import AuthPage            from '../pages/auth/AuthPage.jsx'
import ContactPage         from '../pages/portal/ContactPage.jsx'
import StudentDashboard    from '../pages/app/StudentDashboard.jsx'
import TeacherDashboard    from '../pages/app/TeacherDashboard.jsx'
import AdminDashboard      from '../pages/app/AdminDashboard.jsx'
import TaskManagement      from '../pages/app/TaskManagement.jsx'
import CalendarPage        from '../pages/app/CalendarPage.jsx'
import AnalyticsPage       from '../pages/app/AnalyticsPage.jsx'
import CoursesPage         from '../pages/app/CoursesPage.jsx'
import SettingsPage        from '../pages/app/SettingsPage.jsx'
import RecommendationsPage from '../pages/app/RecommendationsPage.jsx'
import { PageLoader }      from '../components/shared/Loader.jsx'

function AuthLayout({ children }) {
    return (
        <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh', background:'var(--color-navy)' }}>
        {children}
        </div>
    )
    }

    // Waits for loading=false (probe done), then redirects to role-specific URL.
    function RoleRedirect() {
    const { user, loading } = useAuth()
    if (loading) return <PageLoader />
    if (!user)   return <Navigate to="/auth" replace />
    if (user.role === 'admin')   return <Navigate to="/app/admin"   replace />
    if (user.role === 'teacher') return <Navigate to="/app/teacher" replace />
    return                              <Navigate to="/app/dashboard" replace />
    }

    function NotFound() {
    return (
        <div style={{ minHeight:'100vh', background:'var(--color-cream)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-body)' }}>
        <div style={{ textAlign:'center' }}>
            <p style={{ fontSize:64, fontWeight:800, color:'#1a1f35', lineHeight:1, fontFamily:'var(--font-display)', margin:'0 0 8px', letterSpacing:'-0.04em' }}>404</p>
            <p style={{ fontSize:18, fontWeight:700, color:'#1a1f35', marginBottom:6, fontFamily:'var(--font-display)' }}>Page not found</p>
            <p style={{ fontSize:13, color:'#b0a898', marginBottom:22 }}>The page you are looking for doesn't exist.</p>
            <Link to="/app" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'#1a1f35', color:'#fff', fontWeight:600, padding:'10px 20px', borderRadius:10, textDecoration:'none', fontSize:13, fontFamily:'var(--font-display)' }}>
            Back to Dashboard
            </Link>
        </div>
        </div>
    )
    }

    export default function AppRoutes() {
    const { user } = useAuth()

    return (
        <Routes>

        {/* ── Public ──────────────────────────────────────────────────────── */}
        <Route path="/auth" element={
            user ? <Navigate to="/app" replace />
                : <AuthLayout><AuthPage /></AuthLayout>
        } />
        <Route path="/reset-password" element={
            <AuthLayout><AuthPage initialView="reset" /></AuthLayout>
        } />
        <Route path="/contact" element={<ContactPage />} />

        {/* ── Protected app shell ─────────────────────────────────────────── */}
        <Route
            path="/app"
            element={
            <ProtectedRoute>
                <DashboardShell />
            </ProtectedRoute>
            }
        >
            {/* Index — smart redirect, never renders UI */}
            <Route index element={<RoleRedirect />} />

            {/* ── ADMIN only ────────────────────────────────────────── */}
            <Route path="admin" element={
            <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
            </ProtectedRoute>
            } />
            {/* Legacy URL alias */}
            <Route path="users" element={
            <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
            </ProtectedRoute>
            } />

            {/* ── TEACHER only ──────────────────────────────────────── */}
            <Route path="teacher" element={
            <ProtectedRoute allowedRoles={['teacher']}>
                <TeacherDashboard />
            </ProtectedRoute>
            } />

            {/* ── STUDENT only ──────────────────────────────────────── */}
            <Route path="dashboard" element={
            <ProtectedRoute allowedRoles={['student']}>
                <StudentDashboard />
            </ProtectedRoute>
            } />
            <Route path="recommendations" element={
            <ProtectedRoute allowedRoles={['student']}>
                <RecommendationsPage />
            </ProtectedRoute>
            } />

            {/* ── Student + Teacher shared ──────────────────────────── */}
            {/* Calendar: both roles, page handles RBAC (student=read-only) */}
            <Route path="calendar" element={
            <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <CalendarPage />
            </ProtectedRoute>
            } />
            {/* Tasks: both roles, page handles RBAC (student=view-only) */}
            <Route path="tasks" element={
            <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <TaskManagement />
            </ProtectedRoute>
            } />
            <Route path="analytics" element={
            <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <AnalyticsPage />
            </ProtectedRoute>
            } />
            <Route path="courses" element={
            <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <CoursesPage />
            </ProtectedRoute>
            } />

            {/* ── Settings — student + teacher only (NOT admin) ────── */}
            {/* Admin has no settings page; this route blocks admin access */}
            <Route path="settings" element={
            <ProtectedRoute allowedRoles={['student', 'teacher']}>
                <SettingsPage />
            </ProtectedRoute>
            } />

            {/* ── Unknown /app/* → role redirect ───────────────────── */}
            <Route path="*" element={<RoleRedirect />} />
        </Route>

        {/* ── Root ────────────────────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to="/app" replace />} />

        {/* ── 404 ─────────────────────────────────────────────────────────── */}
        <Route path="*" element={<NotFound />} />

        </Routes>
    )
}
