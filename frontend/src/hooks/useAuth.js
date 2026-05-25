// src/hooks/useAuth.js
// Thin wrapper over AuthContext so components don't import the context directly.

import { useContext } from 'react'
import { AuthContext } from '../context/AuthContext.jsx'

export function useAuth() {
    const ctx = useContext(AuthContext)
    if (!ctx) throw new Error('useAuth must be inside <AuthProvider>')
  return ctx   // { user, loading, login, logout, refreshUser }
}
