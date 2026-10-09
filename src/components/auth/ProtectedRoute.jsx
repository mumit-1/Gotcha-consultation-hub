import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'
import { PageSpinner } from '../ui/Spinner'

/** Redirects to /login if not authenticated */
export function RequireAuth({ children }) {
  const { isLoggedIn, loading } = useAuth()
  const location = useLocation()
  if (loading)     return <PageSpinner />
  if (!isLoggedIn) return <Navigate to="/login" state={{ from: location }} replace />
  return children
}

/** Redirects non-admin users away from admin routes */
export function RequireAdmin({ children }) {
  const { isLoggedIn, isAdmin, loading } = useAuth()
  const location = useLocation()
  if (loading)          return <PageSpinner />
  if (!isLoggedIn)      return <Navigate to="/login" state={{ from: location }} replace />
  if (!isAdmin)         return <Navigate to="/dashboard" replace />
  return children
}

/** Redirects already-logged-in users away from auth pages */
export function RedirectIfAuth({ children }) {
  const { isLoggedIn, loading } = useAuth()
  if (loading)    return <PageSpinner />
  if (isLoggedIn) return <Navigate to="/dashboard" replace />
  return children
}
