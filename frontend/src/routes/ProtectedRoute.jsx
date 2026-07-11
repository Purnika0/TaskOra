import { Navigate, useLocation } from 'react-router-dom'
import { useAuth }    from '../hooks/useAuth.js'
import { PageLoader } from '../components/shared/Loader.jsx'

function dashboardFor(role) {
    if (role === 'admin')   return '/app/admin'
    if (role === 'teacher') return '/app/teacher'
    return '/app/dashboard'
}

    export default function ProtectedRoute({ children, allowedRoles }) {
    const { user, loading } = useAuth()
    const location = useLocation()

  // Gate 1 — Still resolving (session restore / role probe in flight)
    if (loading) return <PageLoader />

    // Gate 2 — Not authenticated → login page
    if (!user) return <Navigate to="/auth" state={{ from: location }} replace />

    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to={dashboardFor(user.role)} replace />
    }

    return children
}
