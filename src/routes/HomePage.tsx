import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { CopyBusinessDialog } from '../components/CopyBusinessDialog'
import { FloatingMenu, type MenuEntry } from '../components/FloatingMenu'
import { NewBusinessModal } from '../components/NewBusinessModal'
import { IconLock, IconPlus, IconUsers } from '../components/icons'
import { useBusinessSummaries, useBusinessTemplates } from '../lib/businesses'
import { filterSummaries, formatBalance, openedLabel, openPath, previewBars, roleLabel, type HomeSort, type OwnerFilter } from '../lib/home'
import type { BusinessSummary, BusinessTemplate } from '../types/api'

const TEMPLATE_COLORS: Record<string, string[]> = {
  'online-shop': ['#2457d6', '#0e9f6e', '#d97706'],
  freelancer: ['#8b5cf6', '#2457d6', '#d97706'],
  rental: ['#0891b2', '#d97706', '#db2777'],
  salon: ['#db2777', '#8b5cf6', '#2457d6'],
  club: ['#0e9f6e', '#d97706', '#2457d6'],
}

// A tiny picture of a sheet: bars in the colours of its tables.
function MiniSheet({ bars }: { bars: { width: number; color: string }[] }) {
  return (
    <div className="flex w-[70%] flex-col gap-[5px]" aria-hidden>
      {bars.map((bar, i) => (
        <i key={i} className="block h-[6px] rounded-[2px]" style={{ width: `${bar.width}%`, background: bar.color, opacity: i % 3 === 0 ? 0.55 : 0.3 }} />
      ))}
    </div>
  )
}

function TemplateCard({ template, onPick }: { template: BusinessTemplate | null; onPick: (key: string) => void }) {
  const colors = template ? (TEMPLATE_COLORS[template.key] ?? ['#2457d6']) : []
  const bars = colors.length ? previewBars({ tables: colors.map((c, i) => ({ id: String(i), name: '', color: c, kind: 'TABLE' as const })) }, 5) : []
  return (
    <button type="button" onClick={() => onPick(template?.key ?? 'blank')} className="group w-[150px] flex-none text-left">
      <span className="flex h-[100px] items-center justify-center rounded-[10px] border border-paper-line bg-white transition-colors group-hover:border-stamp group-focus-visible:border-stamp">
        {template ? <MiniSheet bars={bars} /> : <IconPlus width={40} height={40} className="text-stamp" strokeWidth={2.4} />}
      </span>
      <span className="mt-2 block text-[13.5px] font-semibold text-ink">{template ? template.name : 'Blank business'}</span>
      <span className="block text-[12px] leading-snug text-ink-soft">{template ? template.tables.join(', ') || template.description : 'Cash book and one empty table'}</span>
    </button>
  )
}

function BusinessCard({ b, onMenu }: { b: BusinessSummary; onMenu: (anchor: DOMRect, b: BusinessSummary) => void }) {
  const navigate = useNavigate()
  const role = roleLabel(b)
  return (
    <div
      role="link"
      tabIndex={0}
      onClick={() => navigate(openPath(b))}
      onKeyDown={(event) => {
        if (event.key === 'Enter') navigate(openPath(b))
      }}
      className="group cursor-pointer overflow-hidden rounded-[12px] border border-paper-line bg-white transition-shadow hover:shadow-[0_4px_16px_rgba(15,42,74,0.1)] focus-visible:shadow-[0_4px_16px_rgba(15,42,74,0.1)]"
    >
      <div className="relative flex h-[104px] items-center justify-center border-b border-paper-edge bg-[#f5f7fb]">
        <MiniSheet bars={previewBars(b)} />
        {b.balance !== null ? (
          <span className="tabular absolute right-2.5 bottom-2.5 rounded-full border border-paper-line bg-white px-2.5 py-0.5 text-[12.5px] font-semibold text-ink">{formatBalance(b.balance, b.currency)}</span>
        ) : (
          <span className="absolute right-2.5 bottom-2.5 flex items-center gap-1 rounded-full border border-brass-line bg-brass-row px-2.5 py-0.5 text-[12px] font-semibold text-brass">
            <IconLock width={12} height={12} />
            {b.tables.length === 1 ? 'one table' : `${b.tables.length} tables`}
          </span>
        )}
      </div>
      <div className="flex items-start gap-2 p-3">
        <div className="min-w-0 flex-1">
          <div className="truncate text-[14.5px] font-semibold text-ink">{b.name}</div>
          <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12px] text-ink-soft">
            <span className="rounded-md border border-paper-line px-1.5 py-px font-semibold">{b.currency}</span>
            {role && (
              <span className="flex items-center gap-1">
                <IconUsers width={13} height={13} />
                {role}
              </span>
            )}
          </div>
          <div className="mt-1 text-[12px] text-ink-soft">{openedLabel(b.lastOpenedAt)}</div>
        </div>
        <button
          type="button"
          aria-label={`${b.name} menu`}
          aria-haspopup="menu"
          onClick={(event) => {
            event.stopPropagation()
            onMenu(event.currentTarget.getBoundingClientRect(), b)
          }}
          className="flex h-8 w-8 flex-none items-center justify-center rounded-full text-ink-soft hover:bg-paper"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
            <circle cx="12" cy="5" r="1.7" />
            <circle cx="12" cy="12" r="1.7" />
            <circle cx="12" cy="19" r="1.7" />
          </svg>
        </button>
      </div>
    </div>
  )
}

// Home: start a business (from a template or blank) and open one of the businesses you own or that were shared with you.
// It replaces the old Dashboard as the first screen; each business keeps its own Overview.
export function HomePage() {
  const { data: summaries, isLoading, isError } = useBusinessSummaries()
  const { data: templates } = useBusinessTemplates()
  const [owner, setOwner] = useState<OwnerFilter>('all')
  const [sort, setSort] = useState<HomeSort>('opened')
  const [creating, setCreating] = useState<string | null>(null)
  const [menu, setMenu] = useState<{ anchor: DOMRect; items: MenuEntry[] } | null>(null)
  const [copying, setCopying] = useState<{ id: string; name: string } | null>(null)
  const navigate = useNavigate()

  const list = filterSummaries(summaries ?? [], owner, sort)

  function openMenu(anchor: DOMRect, b: BusinessSummary) {
    const items: MenuEntry[] = [{ label: 'Open', onSelect: () => navigate(openPath(b)) }]
    if (b.role === 'OWNER') {
      items.push({ label: 'Make a copy…', onSelect: () => setCopying({ id: b.id, name: b.name }) }, { label: 'Settings', onSelect: () => navigate(`/businesses/${b.id}/settings`) })
    }
    setMenu({ anchor, items })
  }

  return (
    <div className="-mx-5 -mt-8 -mb-14 min-h-full bg-white md:-mx-10">
      <section className="bg-paper px-5 pt-7 pb-8 md:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-3 flex items-center justify-between">
            <h1 className="text-[15px] font-semibold tracking-normal text-ink">Start a new business</h1>
          </div>
          <div className="scrollbar-thin flex gap-4 overflow-x-auto pb-1">
            <TemplateCard template={null} onPick={setCreating} />
            {(templates ?? [])
              .filter((t) => t.key !== 'blank')
              .map((t) => (
                <TemplateCard key={t.key} template={t} onPick={setCreating} />
              ))}
          </div>
        </div>
      </section>

      <section className="px-5 py-7 md:px-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-[15px] font-semibold tracking-normal text-ink">Your businesses</h2>
            <div className="flex flex-wrap items-center gap-3 text-[13px]">
              <label className="flex items-center gap-1.5">
                <span className="sr-only">Show</span>
                <select value={owner} onChange={(event) => setOwner(event.target.value as OwnerFilter)} className="rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 font-medium text-ink">
                  <option value="all">Owned by anyone</option>
                  <option value="mine">Owned by me</option>
                  <option value="shared">Shared with me</option>
                </select>
              </label>
              <div role="group" aria-label="Order" className="inline-flex rounded-full bg-paper p-0.5">
                {(
                  [
                    ['opened', 'Last opened'],
                    ['name', 'A–Z'],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    aria-pressed={sort === value}
                    onClick={() => setSort(value)}
                    className={`rounded-full px-3 py-1 font-medium ${sort === value ? 'bg-white font-semibold text-ink shadow-sm' : 'text-ink-soft'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {isLoading && <p className="py-10 text-center text-[14px] text-ink-soft">Loading…</p>}
          {isError && <p className="py-10 text-center text-[14px] text-rust">Your businesses could not be loaded. Reload the page to try again.</p>}
          {!isLoading && !isError && list.length === 0 && (
            <div className="rounded-[12px] border border-dashed border-paper-line px-6 py-12 text-center">
              <p className="text-[15px] font-semibold text-ink">{summaries && summaries.length > 0 ? 'Nothing matches.' : 'No business yet.'}</p>
              <p className="mt-1 text-[13.5px] text-ink-soft">
                {summaries && summaries.length > 0 ? 'Show all businesses to see them again.' : 'Pick a template above, or start with a blank business. It takes a minute.'}
              </p>
              {summaries && summaries.length === 0 && (
                <button type="button" onClick={() => setCreating('blank')} className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-stamp px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-stamp/90">
                  <IconPlus width={16} height={16} />
                  New business
                </button>
              )}
            </div>
          )}
          <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4">
            {list.map((b) => (
              <BusinessCard key={b.id} b={b} onMenu={openMenu} />
            ))}
          </div>
          {list.length > 0 && (
            <p className="mt-6 text-[12.5px] text-ink-soft">
              Looking for the old overview of everything? <Link to="/dashboard" className="font-semibold text-stamp underline">Open it here</Link>.
            </p>
          )}
        </div>
      </section>

      {menu && <FloatingMenu anchor={menu.anchor} items={menu.items} onClose={() => setMenu(null)} />}
      {creating && <NewBusinessModal templateKey={creating} onClose={() => setCreating(null)} />}
      {copying && <CopyBusinessDialog businessId={copying.id} name={copying.name} onClose={() => setCopying(null)} />}
    </div>
  )
}
