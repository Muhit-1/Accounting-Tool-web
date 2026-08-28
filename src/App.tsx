import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { RegisterPage } from './routes/RegisterPage'
import { DashboardPage } from './routes/DashboardPage'
import { LedgerPage } from './routes/LedgerPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/businesses/:businessId" element={<DashboardPage />} />
          <Route path="/businesses/:businessId/ledger" element={<LedgerPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
