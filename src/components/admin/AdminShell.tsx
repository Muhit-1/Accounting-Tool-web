import { NavLink, Outlet, Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { ROLE_LABEL } from '../../lib/admin-format'
import { useStaffUnread } from '../../lib/support'
import { IconChartBar, IconDoc, IconHome, IconLock, IconSettings, IconUsers } from '../icons'
import { Seal } from '../Seal'
import type { UserRole } from '../../types/admin'

// The admin panel's own frame: a navy sidebar with an "Admin panel" chip, so staff can tell at a glance they are not in
// their own books. Web only: the server refuses the admin API to the phone app. On a narrow screen the menu is a row.
export function AdminShell() {
  const { user, logout } = useAuth()
  const { data: unread } = useStaffUnread()
  const items = [
    { to: '/admin', label: 'Dashboard', icon: IconChartBar, end: true },
    { to: '/admin/users', label: 'People', icon: IconUsers },
    { to: '/admin/support', label: 'Support', icon: IconDoc, badge: unread?.count },
    { to: '/admin/activity', label: 'Activity', icon: IconGraphLine },
    { to: '/admin/team', label: 'Team', icon: IconLock },
    { to: '/admin/settings', label: 'Settings', icon: IconSettings },
    { to: '/admin/system', label: 'System', icon: IconServer },
  ]
  return (
    <div className="flex min-h-screen flex-col bg-paper md:flex-row">
      <aside className="flex flex-none flex-col bg-ink text-white md:sticky md:top-0 md:h-screen md:w-[232px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 pt-3.5 pb-2 md:flex-col md:items-start md:pt-4 md:pb-3">
          <div className="flex items-center gap-2.5">
            <Seal size={26} />
            <span className="font-display text-[15.5px] font-extrabold">Exin Finance</span>
          </div>
          <span className="rounded-md bg-brass-soft px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.09em] text-brass uppercase">Admin panel</span>
        </div>
        <nav aria-label="Admin" className="flex gap-0.5 overflow-x-auto px-2.5 pb-2 md:flex-col md:pb-0">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-2.5 rounded-[7px] px-3 py-2 text-[14px] font-semibold whitespace-nowrap ${isActive ? 'bg-white/[0.13] text-white' : 'text-ink-inverse-soft hover:bg-white/[0.07] hover:text-white'}`
              }
            >
              <item.icon width={18} height={18} />
              <span>{item.label}</span>
              {item.badge ? <span className="ml-auto rounded-full bg-rust px-1.5 text-[11px] font-bold text-white">{item.badge}</span> : null}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-1.5 px-2.5 pb-3.5 md:flex">
          <Link to="/" className="flex items-center gap-2.5 rounded-[7px] px-3 py-2 text-[14px] font-semibold text-ink-inverse-soft hover:bg-white/[0.07] hover:text-white">
            <IconHome width={18} height={18} />
            My books
          </Link>
          <div className="border-t border-white/10 px-3 pt-3 text-[12.5px] text-ink-inverse-soft">
            <b className="block truncate text-[13.5px] text-white">{user?.name}</b>
            {ROLE_LABEL[(user?.role ?? 'ADMIN') as UserRole]} · signed in on the web
            <button type="button" onClick={logout} className="mt-2 block font-semibold text-white underline underline-offset-2">
              Sign out
            </button>
          </div>
        </div>
      </aside>
      <main className="min-w-0 flex-1 px-4 pt-5 pb-14 md:px-8 md:pt-7">
        <div className="mx-auto max-w-[1240px]">
          <Outlet />
        </div>
      </main>
    </div>
  )
}

// Two small icons this panel needs that the shared set does not have.
function IconGraphLine(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  )
}

function IconServer(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden {...props}>
      <path d="M4 4h16v6H4zM4 14h16v6H4zM8 7h.01M8 17h.01" />
    </svg>
  )
}
