import { Navigate, Outlet } from 'react-router-dom'
import { isStaff } from '../lib/admin-format'
import { useAuth } from '../lib/auth-context'

// Only admins and super admins get past this (inside ProtectedRoute, so a signed-in person is already sure). The role comes
// from the API answer, which reads it from the database; the admin API checks it again on every request.
export function StaffRoute() {
  const { user } = useAuth()
  if (!isStaff(user?.role)) return <Navigate to="/" replace />
  return <Outlet />
}
