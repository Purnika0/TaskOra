// src/routes/AppRoutes.jsx
// "/" always renders LandingPage first — this is the browser's initial route.
// Logged-in users still land on "/" and see the marketing page with a
// "Go to Dashboard" CTA instead of being auto-redirected into /app.

import React from 'react'
import { Routes, Route, Navigate, Link } from 'react-router-dom'
import { useAuth }              from '../hooks/useAuth.js'
import ProtectedRoute           from './ProtectedRoute.jsx'
import DashboardShell           from './DashboardShell.jsx'
import LandingPage              from '../pages/portal/LandingPage.jsx'
import AuthPage                 from '../pages/auth/AuthPage.jsx'
import ContactPage              from '../pages/portal/ContactPage.jsx'
import AboutPage                from '../pages/portal/AboutPage.jsx'
import LegalPage                from '../pages/portal/LegalPage.jsx'
import StudentDashboard         from '../pages/app/StudentDashboard.jsx'
import TeacherDashboard         from '../pages/app/TeacherDashboard.jsx'
import AdminDashboard           from '../pages/app/AdminDashboard.jsx'
import AssignmentManagement     from '../pages/app/AssignmentManagement.jsx'
import AssignmentSubmissions    from '../pages/app/AssignmentSubmissions.jsx'
import SubmissionsInboxPage     from '../pages/app/SubmissionsInboxPage.jsx'
import CalendarPage             from '../pages/app/CalendarPage.jsx'
import AnalyticsPage            from '../pages/app/AnalyticsPage.jsx'
import CoursesPage              from '../pages/app/CoursesPage.jsx'
import SettingsPage             from '../pages/app/SettingsPage.jsx'
import RecommendationsPage      from '../pages/app/RecommendationsPage.jsx'
import NotificationsPage        from '../pages/app/NotificationsPage.jsx'
import { PageLoader }           from '../components/shared/Loader.jsx'

function AuthLayout({ children }) {
    return <div style={{ display:'flex', flexDirection:'column', minHeight:'100vh' }}>{children}</div>
}

function RoleRedirect() {
    const { user, loading } = useAuth()
    if (loading) return <PageLoader/>
    if (!user)   return <Navigate to="/auth" replace/>
    if (user.role === 'admin')   return <Navigate to="/app/admin"    replace/>
    if (user.role === 'teacher') return <Navigate to="/app/teacher"  replace/>
    return                              <Navigate to="/app/dashboard" replace/>
}

function NotFound() {
    return (
        <div style={{ minHeight:'100vh', background:'var(--color-bg)', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'var(--font-body)' }}>
            <div style={{ textAlign:'center' }}>
                <p style={{ fontSize:64, fontWeight:800, color:'var(--color-navy)', lineHeight:1, fontFamily:'var(--font-display)', margin:'0 0 8px', letterSpacing:'-0.04em' }}>404</p>
                <p style={{ fontSize:18, fontWeight:700, color:'var(--color-text)', marginBottom:6, fontFamily:'var(--font-display)' }}>Page not found</p>
                <p style={{ fontSize:13, color:'var(--color-text-muted)', marginBottom:22 }}>The page you are looking for doesn't exist.</p>
                <Link to="/" style={{ display:'inline-flex', alignItems:'center', gap:8, background:'var(--color-primary)', color:'#fff', fontWeight:600, padding:'10px 20px', borderRadius:10, textDecoration:'none', fontSize:13 }}>
                    Back to Home
                </Link>
            </div>
        </div>
    )
}

export default function AppRoutes() {
    const { user } = useAuth()

    return (
        <Routes>

            {/* ── "/" — browser ALWAYS opens here first, regardless of auth state ── */}
            <Route path="/"        element={<LandingPage/>}/>
            <Route path="/about"   element={<AboutPage/>}/>
            <Route path="/contact" element={<ContactPage/>}/>
            <Route path="/legal"   element={<LegalPage/>}/>

            <Route path="/auth" element={
                user ? <Navigate to="/app" replace/>
                        : <AuthLayout><AuthPage/></AuthLayout>
            }/>
            <Route path="/reset-password" element={
                <AuthLayout><AuthPage initialView="reset"/></AuthLayout>
            }/>

            {/* ── Protected app shell ──────────────────────────────────── */}
            <Route path="/app" element={
                <ProtectedRoute><DashboardShell/></ProtectedRoute>
            }>
                <Route index element={<RoleRedirect/>}/>

                <Route path="admin" element={
                    <ProtectedRoute allowedRoles={['admin']}><AdminDashboard/></ProtectedRoute>
                }/>
                <Route path="admin/teachers" element={
                    <ProtectedRoute allowedRoles={['admin']}><AdminDashboard initialTab="teachers"/></ProtectedRoute>
                }/>
                <Route path="admin/students" element={
                    <ProtectedRoute allowedRoles={['admin']}><AdminDashboard initialTab="students"/></ProtectedRoute>
                }/>

                <Route path="teacher" element={
                    <ProtectedRoute allowedRoles={['teacher']}><TeacherDashboard/></ProtectedRoute>
                }/>
                {/* Cross-course "To Review" inbox — every submission from every
                    assignment in one place, so a teacher doesn't have to open
                    each assignment individually. */}
                <Route path="submissions" element={
                    <ProtectedRoute allowedRoles={['teacher']}><SubmissionsInboxPage/></ProtectedRoute>
                }/>

                <Route path="dashboard" element={
                    <ProtectedRoute allowedRoles={['student']}><StudentDashboard/></ProtectedRoute>
                }/>
                <Route path="recommendations" element={
                    <ProtectedRoute allowedRoles={['student']}><RecommendationsPage/></ProtectedRoute>
                }/>

                <Route path="tasks" element={
                    <ProtectedRoute allowedRoles={['student','teacher']}><AssignmentManagement/></ProtectedRoute>
                }/>
                <Route path="assignments" element={
                    <ProtectedRoute allowedRoles={['student','teacher']}><AssignmentManagement/></ProtectedRoute>
                }/>
                <Route path="assignments/:id/submissions" element={
                    <ProtectedRoute allowedRoles={['teacher']}><AssignmentSubmissions/></ProtectedRoute>
                }/>
                <Route path="calendar" element={
                    <ProtectedRoute allowedRoles={['student','teacher']}><CalendarPage/></ProtectedRoute>
                }/>
                <Route path="analytics" element={
                    <ProtectedRoute allowedRoles={['student','teacher']}><AnalyticsPage/></ProtectedRoute>
                }/>
                <Route path="courses" element={
                    <ProtectedRoute allowedRoles={['student','teacher']}><CoursesPage/></ProtectedRoute>
                }/>

                <Route path="settings" element={<SettingsPage/>}/>
                <Route path="notifications" element={<NotificationsPage/>}/>
                <Route path="*" element={<RoleRedirect/>}/>
            </Route>

            <Route path="*" element={<NotFound/>}/>

        </Routes>
    )
}