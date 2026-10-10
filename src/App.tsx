import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { AuthCallbackPage } from './routes/AuthCallbackPage'
import { DashboardPage } from './routes/DashboardPage'
import { AccountsPage } from './routes/AccountsPage'
import { AccountPage } from './routes/AccountPage'
import { InvoicesPage } from './routes/InvoicesPage'
import { InvoiceFormPage } from './routes/InvoiceFormPage'
import { InvoiceDetailPage } from './routes/InvoiceDetailPage'
import { BusinessSettingsPage } from './routes/BusinessSettingsPage'
import { ReportsPage } from './routes/ReportsPage'
import { SharingPage } from './routes/SharingPage'
import { SharedWithMePage } from './routes/SharedWithMePage'
import { AdminPage } from './routes/AdminPage'
import { NotFoundPage } from './routes/NotFoundPage'
import { LegalPage } from './routes/LegalPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { AppShell } from './components/AppShell'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      {/* Google is the only way in, so one page serves both sign-in and sign-up. */}
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route path="/auth/callback" element={<AuthCallbackPage />} />
      {/* Public on purpose (Google's OAuth review needs login-free URLs): outside ProtectedRoute. */}
      <Route path="/privacy" element={<LegalPage slug="privacy" />} />
      <Route path="/terms" element={<LegalPage slug="terms" />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppShell />}>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/shared-with-me" element={<SharedWithMePage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="/businesses/:businessId" element={<DashboardPage />} />
          <Route path="/businesses/:businessId/reports" element={<ReportsPage />} />
          <Route path="/businesses/:businessId/accounts" element={<AccountsPage />} />
          <Route path="/businesses/:businessId/accounts/:accountId" element={<AccountPage />} />
          <Route path="/businesses/:businessId/invoices" element={<InvoicesPage />} />
          <Route path="/businesses/:businessId/invoices/new" element={<InvoiceFormPage />} />
          <Route path="/businesses/:businessId/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="/businesses/:businessId/invoices/:invoiceId/edit" element={<InvoiceFormPage />} />
          <Route path="/businesses/:businessId/settings" element={<BusinessSettingsPage />} />
          <Route path="/businesses/:businessId/sharing" element={<SharingPage />} />
        </Route>
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  )
}
