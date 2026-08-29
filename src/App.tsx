import { Navigate, Route, Routes } from 'react-router-dom'
import { LoginPage } from './routes/LoginPage'
import { RegisterPage } from './routes/RegisterPage'
import { DashboardPage } from './routes/DashboardPage'
import { LedgerPage } from './routes/LedgerPage'
import { InvoicesPage } from './routes/InvoicesPage'
import { NewInvoicePage } from './routes/NewInvoicePage'
import { InvoiceDetailPage } from './routes/InvoiceDetailPage'
import { SharingPage } from './routes/SharingPage'
import { SharedWithMePage } from './routes/SharedWithMePage'
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
          <Route path="/shared-with-me" element={<SharedWithMePage />} />
          <Route path="/businesses/:businessId" element={<DashboardPage />} />
          <Route path="/businesses/:businessId/ledger" element={<LedgerPage />} />
          <Route path="/businesses/:businessId/invoices" element={<InvoicesPage />} />
          <Route path="/businesses/:businessId/invoices/new" element={<NewInvoicePage />} />
          <Route path="/businesses/:businessId/invoices/:invoiceId" element={<InvoiceDetailPage />} />
          <Route path="/businesses/:businessId/sharing" element={<SharingPage />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
