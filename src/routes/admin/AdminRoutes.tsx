import { Route, Routes } from 'react-router-dom'
import { AdminShell } from '../../components/admin/AdminShell'
import { AdminActivityPage } from './AdminActivityPage'
import { AdminDashboardPage } from './AdminDashboardPage'
import { AdminSettingsPage } from './AdminSettingsPage'
import { AdminSupportPage } from './AdminSupportPage'
import { AdminSystemPage } from './AdminSystemPage'
import { AdminTeamPage } from './AdminTeamPage'
import { AdminTicketPage } from './AdminTicketPage'
import { AdminUserPage } from './AdminUserPage'
import { AdminUsersPage } from './AdminUsersPage'
import { NotFoundPage } from '../NotFoundPage'

// The whole admin panel is one lazy chunk (App.tsx), so people who are not staff never download it. The server is what
// refuses them; this is only about not sending code nobody needs.
export default function AdminRoutes() {
  return (
    <Routes>
      <Route element={<AdminShell />}>
        <Route index element={<AdminDashboardPage />} />
        <Route path="users" element={<AdminUsersPage />} />
        <Route path="users/:id" element={<AdminUserPage />} />
        <Route path="support" element={<AdminSupportPage />} />
        <Route path="support/:id" element={<AdminTicketPage />} />
        <Route path="activity" element={<AdminActivityPage />} />
        <Route path="team" element={<AdminTeamPage />} />
        <Route path="settings" element={<AdminSettingsPage />} />
        <Route path="system" element={<AdminSystemPage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
