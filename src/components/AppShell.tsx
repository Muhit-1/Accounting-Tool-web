import { useState, type ComponentType, type FormEvent, type SVGProps } from 'react'
import { Link, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom'
import { useBusinesses } from '../lib/businesses'
import { useAuth } from '../lib/auth-context'
import { Seal } from './Seal'
import { NewBusinessModal } from './NewBusinessModal'
import {
  IconBank,
  IconBell,
  IconChartBar,
  IconChevronDown,
  IconGrid,
  IconPlus,
  IconReceipt,
  IconSearch,
  IconSettings,
  IconShare,
  IconShield,
} from './icons'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

function NavLink({
  to,
  label,
  active,
  icon: IconComponent,
}: {
  to: string
  label: string
  active: boolean
  icon: ComponentType<SVGProps<SVGSVGElement>>
}) {
  return (
    <Link
      to={to}
      className={`flex items-center gap-2.5 rounded-ledger px-2.5 py-1.5 text-[13.5px] font-semibold transition-colors ${
        active ? 'bg-stamp text-white' : 'text-ink-inverse-soft hover:bg-white/[0.06] hover:text-white'
      }`}
    >
      <IconComponent width={17} height={17} />
      {label}
    </Link>
  )
}

function BusinessSwitcher({ businessId }: { businessId?: string }) {
  const { data: businesses } = useBusinesses()
  const [open, setOpen] = useState(false)
  const [showNewBusiness, setShowNewBusiness] = useState(false)
  const current = businesses?.find((b) => b.id === businessId)

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 rounded-ledger border border-white/15 bg-white/[0.06] px-2.5 py-2 text-left transition-colors hover:bg-white/[0.1]"
      >
        <span className="flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full border border-white/25 bg-white/10 font-display text-[12px] font-bold text-white">
          {current ? initials(current.name) : 'All'}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13.5px] font-semibold">{current ? current.name : 'All businesses'}</span>
          <span className="text-[11.5px] text-ink-inverse-soft">{current ? current.currency : 'Combined view'}</span>
        </span>
        <IconChevronDown width={16} height={16} className="flex-none text-ink-inverse-soft" />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 z-50 mt-1.5 w-full rounded-ledger border border-white/15 bg-ink py-1.5 shadow-lg">
            <Link
              to="/"
              onClick={() => setOpen(false)}
              className={`flex items-center gap-2.5 px-2.5 py-2 transition-colors ${!businessId ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'}`}
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-white/25 bg-white/10 font-display text-[11px] font-bold text-white">
                All
              </span>
              <span className="text-[13.5px] font-semibold">All businesses</span>
            </Link>
            {businesses?.map((business) => (
              <Link
                key={business.id}
                to={`/businesses/${business.id}`}
                onClick={() => setOpen(false)}
                className={`flex items-center gap-2.5 px-2.5 py-2 transition-colors ${
                  businessId === business.id ? 'bg-white/[0.08]' : 'hover:bg-white/[0.06]'
                }`}
              >
                <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-white/25 bg-white/10 font-display text-[11px] font-bold text-white">
                  {initials(business.name)}
                </span>
                <span className="truncate text-[13.5px] font-semibold">{business.name}</span>
              </Link>
            ))}
            <button
              onClick={() => {
                setOpen(false)
                setShowNewBusiness(true)
              }}
              className="flex w-full items-center gap-2.5 px-2.5 py-2 text-left transition-colors hover:bg-white/[0.06]"
            >
              <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full border border-dashed border-white/30 text-[14px] font-bold text-ink-inverse-soft">
                +
              </span>
              <span className="text-[13.5px] font-semibold">New business</span>
            </button>
          </div>
        </>
      )}

      {showNewBusiness && <NewBusinessModal onClose={() => setShowNewBusiness(false)} />}
    </div>
  )
}

function TopBar() {
  const navigate = useNavigate()
  const { data: businesses } = useBusinesses()
  const [query, setQuery] = useState('')
  const [showNotifications, setShowNotifications] = useState(false)
  const [showNewBusiness, setShowNewBusiness] = useState(false)

  function handleSearch(event: FormEvent) {
    event.preventDefault()
    const match = businesses?.find((b) => b.name.toLowerCase().includes(query.trim().toLowerCase()))
    if (match) {
      navigate(`/businesses/${match.id}`)
      setQuery('')
    }
  }

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-paper-line bg-white px-5 py-3 md:px-10">
      <form onSubmit={handleSearch} className="max-w-xs flex-1">
        <label className="relative block">
          <IconSearch width={16} height={16} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-soft" />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search a venture…"
            className="w-full rounded-ledger border border-paper-line bg-paper py-2 pr-3 pl-9 text-[13.5px] text-ink placeholder:text-ink-soft focus:border-stamp focus:bg-white focus:outline-none"
          />
        </label>
      </form>

      <div className="flex flex-none items-center gap-2.5">
        <div className="relative">
          <button
            onClick={() => setShowNotifications((s) => !s)}
            aria-label="Notifications"
            className="flex h-9 w-9 items-center justify-center rounded-ledger border border-paper-line text-ink-soft transition-colors hover:bg-black/[0.03]"
          >
            <IconBell width={17} height={17} />
          </button>
          {showNotifications && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowNotifications(false)} />
              <div className="absolute top-full right-0 z-50 mt-1.5 w-56 rounded-ledger border border-paper-line bg-white p-4 text-[13px] text-ink-soft shadow-lg">
                No new notifications.
              </div>
            </>
          )}
        </div>
        <button
          onClick={() => setShowNewBusiness(true)}
          className="flex items-center gap-1.5 rounded-ledger bg-stamp px-3.5 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-stamp/90"
        >
          <IconPlus width={15} height={15} />
          New
        </button>
      </div>

      {showNewBusiness && <NewBusinessModal onClose={() => setShowNewBusiness(false)} />}
    </header>
  )
}

export function AppShell() {
  const { businessId } = useParams<{ businessId?: string }>()
  const location = useLocation()
  const { user, logout } = useAuth()

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[248px_1fr]">
      <aside className="flex flex-col gap-6 bg-ink p-5 text-white md:p-5">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <Seal />
            <div className="font-display text-[17px] leading-tight font-bold">Accounting Tool</div>
          </div>
          <div className="text-[11px] tracking-wider text-ink-inverse-soft uppercase">Bookkeeping for every venture</div>
        </div>

        <BusinessSwitcher businessId={businessId} />

        {businessId && (
          <nav className="flex flex-col gap-1" aria-label="This venture">
            <div className="mb-0.5 px-1 text-[11px] tracking-wider text-ink-inverse-soft uppercase">This venture</div>
            <NavLink
              to={`/businesses/${businessId}`}
              label="Dashboard"
              icon={IconGrid}
              active={location.pathname === `/businesses/${businessId}`}
            />
            <NavLink
              to={`/businesses/${businessId}/accounts`}
              label="Accounts"
              icon={IconBank}
              active={location.pathname.startsWith(`/businesses/${businessId}/accounts`)}
            />
            <NavLink
              to={`/businesses/${businessId}/invoices`}
              label="Invoices"
              icon={IconReceipt}
              active={location.pathname.startsWith(`/businesses/${businessId}/invoices`)}
            />
            <NavLink
              to={`/businesses/${businessId}/reports`}
              label="Reports"
              icon={IconChartBar}
              active={location.pathname.startsWith(`/businesses/${businessId}/reports`)}
            />
            <NavLink
              to={`/businesses/${businessId}/sharing`}
              label="Sharing"
              icon={IconShare}
              active={location.pathname.startsWith(`/businesses/${businessId}/sharing`)}
            />
            <NavLink
              to={`/businesses/${businessId}/settings`}
              label="Settings"
              icon={IconSettings}
              active={location.pathname.startsWith(`/businesses/${businessId}/settings`)}
            />
          </nav>
        )}

        <nav className="flex flex-col gap-1" aria-label="Account">
          <div className="mb-0.5 px-1 text-[11px] tracking-wider text-ink-inverse-soft uppercase">Account</div>
          <NavLink
            to="/shared-with-me"
            label="Shared with you"
            icon={IconShare}
            active={location.pathname === '/shared-with-me'}
          />
          <NavLink to="/admin" label="Admin" icon={IconShield} active={location.pathname === '/admin'} />
        </nav>

        <div className="mt-auto flex flex-col gap-3 text-xs text-ink-inverse-soft">
          <div className="flex items-center justify-between border-t border-white/10 pt-3">
            <span className="truncate text-[13px] font-semibold text-white">{user?.name}</span>
            <button onClick={logout} className="flex-none border-b border-current text-ink-inverse-soft hover:text-white">
              Sign out
            </button>
          </div>
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-white/15 px-2.5 py-1">
              <span className="h-1.5 w-1.5 flex-none rounded-full bg-stamp" />
              Stage 1 — local storage
            </div>
            <div>Documents will move to Google Drive once Google sign-in is switched on.</div>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        <TopBar />
        <main className="flex-1 bg-paper px-5 pt-8 pb-14 md:px-10">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
