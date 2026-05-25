// src/App.jsx
import React, { Suspense } from 'react'
import { BrowserRouter }   from 'react-router-dom'
import { AuthProvider }    from './context/AuthContext.jsx'
import { ToastProvider }   from './context/ToastContext.jsx'
import { ConfirmProvider } from './context/ConfirmContext.jsx'
import  ErrorBoundary   from './components/shared/ErrorBoundary.jsx'
import { PageLoader }      from './components/shared/Loader.jsx'
import AppRoutes           from './routes/AppRoutes.jsx'

export default function App() {
    return (
        <ErrorBoundary>
        <BrowserRouter>
            <ToastProvider>
            <ConfirmProvider>
                <AuthProvider>
                <Suspense fallback={<PageLoader/>}>
                    <AppRoutes/>
                </Suspense>
                </AuthProvider>
            </ConfirmProvider>
            </ToastProvider>
        </BrowserRouter>
        </ErrorBoundary>
    )
}
