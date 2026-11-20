import { LogOut } from 'lucide-react'
import { NavLink, Outlet, Link, useLocation } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { ROLE_LABEL } from '../../lib/admin-format'
import { useStaffUnread } from '../../lib/support'
import { useSlidingIndicator } from '../../lib/use-sliding-indicator'
import { IconChartBar, IconDoc, IconHome, IconLock, IconSettings, IconUsers } from '../icons'
import { Seal } from '../Seal'
import type { UserRole } from '../../types/admin'

// The admin panel's own frame: a navy sidebar with an "Admin panel" chip, so staff can tell at a glance they are not in
// their own books. Web only: the server refuses the admin API to the phone app. On a narrow screen the menu is a row.
export function AdminShell() {
  const { user, logout } = useAuth()
  const { pathname } = useLocation()
  const { data: unread } = useStaffUnread()
  const { ref: navRef, box, gliding } = useSlidingIndicator<HTMLElement>(pathname)
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
      <aside className="flex flex-none flex-col bg-ink text-white md:sticky md:top-0 md:h-screen md:w-[248px]">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 pt-4 pb-3 md:flex-col md:items-start md:pt-6 md:pb-5">
          <div className="flex items-center gap-2.5">
            <Seal size={30} />
            <span className="font-display text-[17px] font-extrabold">Exin Finance</span>
          </div>
          <span className="rounded-md bg-brass-soft px-2.5 py-0.5 text-[11px] font-extrabold tracking-[0.09em] text-brass uppercase">Admin panel</span>
        </div>
        {/* The open page is a soft light pill with a mint bar on the left. It glides to the page you choose. */}
        <nav ref={navRef} aria-label="Admin" className="relative flex gap-1 overflow-x-auto px-3 pb-2 md:flex-col md:pb-0">
          {box && (
            <span
              aria-hidden
              className={`pointer-events-none absolute top-0 left-0 rounded-[10px] bg-white/[0.12] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)] ${gliding ? 'glide' : ''}`}
              style={{ transform: `translate(${box.x}px, ${box.y}px)`, width: box.w, height: box.h }}
            >
              <i className="absolute top-2.5 bottom-2.5 left-0 w-[3px] rounded-r-[3px] bg-stamp-light" />
            </span>
          )}
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `relative flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[14.5px] font-semibold whitespace-nowrap transition-colors ${isActive ? 'text-white' : 'text-ink-inverse-soft hover:bg-white/[0.06] hover:text-white'}`
              }
            >
              {({ isActive }) => (
                <>
                  <item.icon width={19} height={19} className={isActive ? 'text-stamp-light' : ''} />
                  <span>{item.label}</span>
                  {item.badge ? <span className="ml-auto rounded-full bg-rust px-1.5 text-[11px] font-bold text-white">{item.badge}</span> : null}
                </>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden flex-col gap-1.5 px-3 pb-4 md:flex">
          <Link to="/" className="flex items-center gap-3 rounded-[10px] px-3.5 py-2.5 text-[14.5px] font-semibold text-ink-inverse-soft transition-colors hover:bg-white/[0.06] hover:text-white">
            <IconHome width={19} height={19} />
            My books
          </Link>
          <div className="border-t border-white/10 px-3.5 pt-3.5 text-[12.5px] text-ink-inverse-soft">
            <b className="block truncate text-[13.5px] text-white">{user?.name}</b>
            {ROLE_LABEL[(user?.role ?? 'ADMIN') as UserRole]} · signed in on the web
            <button
              type="button"
              onClick={logout}
              className="mt-3 flex w-full items-center justify-center gap-2 rounded-[10px] border border-white/25 bg-white/[0.06] px-3 py-2 text-[13.5px] font-semibold text-white transition-colors hover:border-white/40 hover:bg-white/[0.14]"
            >
              <LogOut width={16} height={16} strokeWidth={1.9} aria-hidden />
              Sign out
            </button>
          </div>
        </div>
      </aside>
      {/* The page uses the width: the same gap on the left and on the right, and a page that is short still fills the height. */}
      <main className="min-w-0 flex-1 px-5 pt-6 pb-12 md:px-8 md:pt-8 xl:px-12">
        <div key={pathname} className="page-in mx-auto w-full max-w-[1800px]">
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
