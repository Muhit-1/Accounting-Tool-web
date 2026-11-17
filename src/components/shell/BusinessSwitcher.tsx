import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useBusiness, useBusinessSummaries } from '../../lib/businesses'
import type { BusinessSummary } from '../../types/api'
import { CopyBusinessDialog } from '../CopyBusinessDialog'
import { NewBusinessModal } from '../NewBusinessModal'
import { IconCopy, IconHome, IconPlus } from '../icons'

// The list of businesses (yours and the ones shared with you) that opens under whatever button the caller draws: the name
// in the top bar, the badge in the side menu. Also "New business" and "Make a copy".
export function BusinessSwitcher({
  businessId,
  canManage,
  trigger,
  className = 'relative min-w-0',
}: {
  businessId: string
  canManage: boolean
  trigger: (state: { open: boolean; toggle: () => void }) => ReactNode
  className?: string
}) {
  const { data: business } = useBusiness(businessId)
  const { data: summaries } = useBusinessSummaries()
  const [open, setOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [copying, setCopying] = useState(false)
  const name = business?.name ?? summaries?.find((b) => b.id === businessId)?.name ?? ''

  return (
    <div className={className}>
      {trigger({ open, toggle: () => setOpen((o) => !o) })}

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div role="menu" className="absolute top-full left-0 z-50 mt-1 w-[300px] max-w-[90vw] overflow-hidden rounded-[12px] border border-paper-line bg-white py-1.5 shadow-[0_12px_32px_color-mix(in_srgb,var(--color-ink)_18%,transparent)]">
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
