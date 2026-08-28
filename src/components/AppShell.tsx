import { useState } from 'react'
import { Link, Outlet, useParams } from 'react-router-dom'
import { useBusinesses } from '../lib/businesses'
import { Seal } from './Seal'
import { NewBusinessModal } from './NewBusinessModal'

const BADGE_COLORS = ['text-stamp', 'text-rust', 'text-brass', 'text-ink-soft']

function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2)
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

export function AppShell() {
  const { businessId } = useParams<{ businessId?: string }>()
  const { data: businesses } = useBusinesses()
  const [showNewBusiness, setShowNewBusiness] = useState(false)

  return (
    <div className="grid min-h-screen grid-cols-1 md:grid-cols-[232px_1fr]">
      <aside className="flex flex-col gap-7 border-b border-paper-line p-5 md:border-b-0 md:border-r md:p-6">
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-2.5">
            <Seal />
            <div className="font-display text-[19px] leading-tight font-semibold tracking-tight">
              Accounting Tool
            </div>
          </div>
          <div className="text-xs tracking-wider text-ink-soft uppercase">Ledger for every venture</div>
        </div>

        <nav className="flex flex-col gap-2.5" aria-label="Businesses">
          <div className="mb-0.5 text-[11.5px] tracking-wider text-ink-soft uppercase">Ventures</div>

          <Link
            to="/"
            className={`flex items-center gap-2.5 rounded-ledger border border-dashed px-2.5 py-2 transition-colors hover:bg-black/[0.02] ${
              !businessId ? 'border-stamp bg-stamp-soft' : 'border-transparent'
            }`}
          >
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-[1.5px] border-stamp font-display text-sm font-semibold text-stamp">
              All
            </span>
            <span>
              <span className="block text-[14.5px] font-medium">All businesses</span>
              <span className="text-xs text-ink-soft">Combined view</span>
            </span>
          </Link>

          {businesses?.map((business, index) => (
            <Link
              key={business.id}
              to={`/businesses/${business.id}`}
              className={`flex items-center gap-2.5 rounded-ledger border border-dashed px-2.5 py-2 transition-colors hover:bg-black/[0.02] ${
                businessId === business.id ? 'border-stamp bg-stamp-soft' : 'border-transparent'
              }`}
            >
              <span
                className={`flex h-[34px] w-[34px] flex-none -rotate-6 items-center justify-center rounded-full border-[1.5px] border-current font-display text-sm font-semibold ${BADGE_COLORS[index % BADGE_COLORS.length]}`}
              >
                {initials(business.name)}
              </span>
              <span>
                <span className="block text-[14.5px] font-medium">{business.name}</span>
                <span className="text-xs text-ink-soft">{business.currency}</span>
              </span>
            </Link>
          ))}

          <button
            onClick={() => setShowNewBusiness(true)}
            className="flex w-full items-center gap-2.5 rounded-ledger border border-dashed border-transparent px-2.5 py-2 text-left transition-colors hover:bg-black/[0.02]"
          >
            <span className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full border-[1.5px] border-dashed border-ink-soft font-display text-sm font-semibold text-ink-soft">
              +
            </span>
            <span>
              <span className="block text-[14.5px] font-medium">New business</span>
              <span className="text-xs text-ink-soft">Add a venture</span>
            </span>
          </button>
        </nav>

        <div className="mt-auto text-xs text-ink-soft">
          <div className="mb-2 inline-flex items-center gap-1.5 rounded-full border border-paper-line px-2.5 py-1">
            <span className="h-1.5 w-1.5 flex-none rounded-full bg-brass" />
            Stage 1 — local storage
          </div>
          <div>Documents will move to Google Drive once Google sign-in is switched on.</div>
        </div>
      </aside>

      <main className="px-5 pt-8 pb-14 md:px-10">
        <Outlet />
      </main>

      {showNewBusiness && <NewBusinessModal onClose={() => setShowNewBusiness(false)} />}
    </div>
  )
}
