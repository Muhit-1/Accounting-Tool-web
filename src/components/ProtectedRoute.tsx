import { lazy, Suspense } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'

// Loaded only for visitors, so people who are signed in never download it.
const LandingPage = lazy(() => import('../routes/LandingPage').then((m) => ({ default: m.LandingPage })))

export function ProtectedRoute() {
  const { user, isLoading } = useAuth()
  const location = useLocation()

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center text-ink-soft">Loading…</div>
  }

  if (!user) {
    // The address of the site itself is the public home page; every other page asks for a sign-in.
    if (location.pathname === '/') {
      return (
        <Suspense fallback={null}>
          <LandingPage />
        </Suspense>
      )
    }
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
