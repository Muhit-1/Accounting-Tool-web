import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { RegisterPage } from './routes/RegisterPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { useAuth } from './lib/auth-context'

// Placeholder landing page until the dashboard phase builds the real one.
function HomePlaceholder() {
  const { user, logout } = useAuth()
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="font-display text-2xl">Signed in as {user?.name}</p>
      <p className="text-ink-soft">The dashboard lands in the next phase.</p>
      <button onClick={logout} className="text-sm text-stamp underline underline-offset-2">
        Sign out
      </button>
    </div>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route path="/" element={<HomePlaceholder />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
