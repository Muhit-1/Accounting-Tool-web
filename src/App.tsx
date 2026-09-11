import { Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { RegisterPage } from './routes/RegisterPage'
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
