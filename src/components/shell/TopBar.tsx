import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../lib/auth-context'
import { useBusiness, useBusinessSummaries } from '../../lib/businesses'
import type { BusinessSummary } from '../../types/api'
import { CopyBusinessDialog } from '../CopyBusinessDialog'
import { NewBusinessModal } from '../NewBusinessModal'
import { ShareDialog } from '../sharing/ShareDialog'
import { Seal } from '../Seal'
import { IconChevronDown, IconCloudCheck, IconCopy, IconHome, IconPlus, IconShare } from '../icons'
import { SearchBox } from './SearchBox'

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

// The business's name in the top bar; a click lists the others (yours and the ones shared with you).
function BusinessTitle({ businessId, canManage }: { businessId: string; canManage: boolean }) {
  const { data: business } = useBusiness(businessId)
  const { data: summaries } = useBusinessSummaries()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copying, setCopying] = useState(false)
  const name = business?.name ?? summaries?.find((b) => b.id === businessId)?.name ?? ''
  const currency = business?.currency ?? summaries?.find((b) => b.id === businessId)?.currency

  return (
    <div className="relative min-w-0">
      <div className="flex items-center gap-2.5">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex min-w-0 items-center gap-1.5 rounded-ledger px-2 py-1 text-left hover:bg-paper"
        >
          <span className="truncate text-[17px] font-bold tracking-[-0.01em] text-ink">{name || '…'}</span>
          <IconChevronDown width={15} height={15} className="flex-none text-ink-soft" />
        </button>
        {currency && <span className="hidden flex-none rounded-md border border-paper-line px-1.5 py-px text-[11.5px] font-semibold text-ink-soft sm:inline">{currency}</span>}
        <span className="hidden flex-none items-center gap-1 text-[12.5px] text-ink-soft lg:flex" title="Everything you change is saved at once">
          <IconCloudCheck width={16} height={16} />
          Saved
        </span>
      </div>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute top-full left-0 z-50 mt-1 w-[300px] max-w-[90vw] overflow-hidden rounded-[12px] border border-paper-line bg-white py-1.5 shadow-[0_12px_32px_rgba(15,42,74,0.18)]">
            <Link to="/" onClick={() => setOpen(false)} role="menuitem" className="flex items-center gap-2.5 px-3 py-2 text-[13.5px] font-semibold hover:bg-paper">
              <IconHome width={17} height={17} className="text-ink-soft" />
              All businesses
            </Link>
            <div className="my-1 border-t border-paper-edge" />
            <div className="max-h-[300px] overflow-auto">
              {(summaries ?? []).map((b: BusinessSummary) => (
                <Link
                  key={b.id}
                  to={`/businesses/${b.id}/workspace`}
                  onClick={() => setOpen(false)}
                  role="menuitem"
                  className={`flex items-center gap-2.5 px-3 py-2 hover:bg-paper ${b.id === businessId ? 'bg-stamp-soft' : ''}`}
                >
                  <span className="flex h-7 w-7 flex-none items-center justify-center rounded-full bg-ink text-[11px] font-bold text-white">{initials(b.name)}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13.5px] font-semibold">{b.name}</span>
                    <span className="block truncate text-[12px] text-ink-soft">{b.role === 'OWNER' ? b.currency : `Shared by ${b.ownerName ?? 'someone'}`}</span>
                  </span>
                </Link>
              ))}
            </div>
            <div className="my-1 border-t border-paper-edge" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                setCreating(true)
              }}
              className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13.5px] font-semibold text-stamp hover:bg-stamp-soft"
            >
              <IconPlus width={17} height={17} />
              New business
            </button>
            {canManage && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  setCopying(true)
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2 text-left text-[13.5px] font-medium hover:bg-paper"
              >
                <IconCopy width={17} height={17} className="text-ink-soft" />
                Make a copy of “{name}”…
              </button>
            )}
          </div>
        </>
      )}
      {creating && <NewBusinessModal onClose={() => setCreating(false)} />}
      {copying && <CopyBusinessDialog businessId={businessId} name={name} onClose={() => setCopying(false)} />}
    </div>
  )
}

function AccountMenu() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  const name = user?.name ?? ''
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Your account"
        className="flex h-9 w-9 items-center justify-center rounded-full bg-ink text-[13px] font-bold text-white hover:opacity-90"
      >
        {initials(name || '?')}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute top-full right-0 z-50 mt-1.5 w-[240px] overflow-hidden rounded-[12px] border border-paper-line bg-white py-1.5 shadow-[0_12px_32px_rgba(15,42,74,0.18)]">
            <div className="px-3.5 pt-1.5 pb-2.5">
              <div className="truncate text-[14px] font-semibold text-ink">{name}</div>
              <div className="truncate text-[12px] text-ink-soft">{user?.email}</div>
            </div>
            <div className="border-t border-paper-edge" />
            <Link to="/shared-with-me" onClick={() => setOpen(false)} role="menuitem" className="block px-3.5 py-2 text-[13.5px] font-medium hover:bg-paper">
              Shared with you
            </Link>
            <Link to="/admin" onClick={() => setOpen(false)} role="menuitem" className="block px-3.5 py-2 text-[13.5px] font-medium hover:bg-paper">
              Admin
            </Link>
            <Link to="/privacy" onClick={() => setOpen(false)} role="menuitem" className="block px-3.5 py-2 text-[13.5px] font-medium hover:bg-paper">
              Privacy and terms
            </Link>
            <div className="border-t border-paper-edge" />
            <button
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false)
                logout()
              }}
              className="block w-full px-3.5 py-2 text-left text-[13.5px] font-medium text-rust hover:bg-paper"
            >
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  )
}

function ShareButton({ businessId }: { businessId: string }) {
  const { data: business } = useBusiness(businessId)
  const [open, setOpen] = useState(false)
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="hidden flex-none items-center gap-1.5 rounded-full bg-stamp-soft px-4 py-2 text-[13.5px] font-semibold text-stamp hover:bg-stamp hover:text-white sm:inline-flex">
        <IconShare width={16} height={16} />
        Share
      </button>
      {open && <ShareDialog businessId={businessId} businessName={business?.name ?? 'this business'} onClose={() => setOpen(false)} />}
    </>
  )
}

// The bar on top of every page: the logo (always the far left), the business (or the product name on Home), one search
// box, Share and the account. The button that hides and shows the left menu sits at the top of that menu.
export function TopBar({ businessId, canManage }: { businessId?: string; canManage: boolean }) {
  return (
    <header className="flex h-14 flex-none items-center gap-2 border-b border-paper-line bg-white px-2 sm:gap-3 sm:px-3">
      <Link to="/" aria-label="All businesses" className="ml-1 flex flex-none items-center gap-2 rounded-ledger p-1">
        <Seal size={32} />
        {!businessId && <span className="hidden font-display text-[18px] font-bold tracking-[-0.015em] sm:inline">Exin Finance</span>}
      </Link>
      {businessId && <BusinessTitle businessId={businessId} canManage={canManage} />}

      <div className="flex min-w-0 flex-1 justify-center px-1 sm:px-4">
        <SearchBox businessId={businessId} canManage={canManage} />
      </div>

      {businessId && canManage && <ShareButton businessId={businessId} />}
      <AccountMenu />
    </header>
  )
}
