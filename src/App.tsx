import { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { AuthCallbackPage } from './routes/AuthCallbackPage'
import { DashboardPage } from './routes/DashboardPage'
import { HomePage } from './routes/HomePage'
import { AccountsPage } from './routes/AccountsPage'
import { WorkspacePage } from './routes/WorkspacePage'
import { StatementPage } from './routes/StatementPage'
import { ConnectionsPage } from './routes/ConnectionsPage'
import { MonthlyPage } from './routes/MonthlyPage'
import { InvoicesPage } from './routes/InvoicesPage'
import { InvoiceFormPage } from './routes/InvoiceFormPage'
import { InvoiceDetailPage } from './routes/InvoiceDetailPage'
import { BusinessSettingsPage } from './routes/BusinessSettingsPage'
import { ReportsPage } from './routes/ReportsPage'
import { SharingPage } from './routes/SharingPage'
import { SharedWithMePage } from './routes/SharedWithMePage'
import { AccountPage } from './routes/AccountPage'
import { SupportPage } from './routes/SupportPage'
import { SupportNewPage } from './routes/SupportNewPage'
import { SupportTicketPage } from './routes/SupportTicketPage'
import { NotFoundPage } from './routes/NotFoundPage'
import { LegalPage } from './routes/LegalPage'
import { ProtectedRoute } from './components/ProtectedRoute'
import { StaffRoute } from './components/StaffRoute'
import { AppShell } from './components/AppShell'

// The admin panel is its own chunk: only staff ever load it.
const AdminRoutes = lazy(() => import('./routes/admin/AdminRoutes'))

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
        <Route element={<StaffRoute />}>
          <Route
            path="/admin/*"
            element={
              <Suspense fallback={<div className="flex min-h-screen items-center justify-center text-ink-soft">Loading…</div>}>
                <AdminRoutes />
              </Suspense>
            }
          />
        </Route>
        <Route element={<AppShell />}>
          <Route path="/" element={<HomePage />} />
          {/* The old combined overview stays reachable until the new Home has been checked on production. */}
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/shared-with-me" element={<SharedWithMePage />} />
          <Route path="/account" element={<AccountPage />} />
          <Route path="/support" element={<SupportPage />} />
          <Route path="/support/new" element={<SupportNewPage />} />
          <Route path="/support/:id" element={<SupportTicketPage />} />
          <Route path="/businesses/:businessId" element={<DashboardPage />} />
          <Route path="/businesses/:businessId/reports" element={<ReportsPage />} />
          <Route path="/businesses/:businessId/accounts" element={<AccountsPage />} />
          <Route path="/businesses/:businessId/accounts/:accountId" element={<WorkspacePage />} />
          <Route path="/businesses/:businessId/workspace" element={<WorkspacePage />} />
          <Route path="/businesses/:businessId/statement" element={<StatementPage />} />
          <Route path="/businesses/:businessId/monthly" element={<MonthlyPage />} />
          <Route path="/businesses/:businessId/connections" element={<ConnectionsPage />} />
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
