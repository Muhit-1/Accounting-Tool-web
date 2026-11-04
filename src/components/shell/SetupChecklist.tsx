import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useAccessGrants } from '../../lib/access-grants'
import { setupCount, setupDone, setupSteps } from '../../lib/setup'
import { useTables } from '../../lib/tables'
import { IconCheck, IconClose } from '../icons'

const key = (businessId: string) => `exin_setup_closed:${businessId}`

function wasClosed(businessId: string): boolean {
  try {
    return localStorage.getItem(key(businessId)) === '1'
  } catch {
    return false
  }
}

// A short list for the first hour of a new business. It goes away when every step is done, or when it is closed.
export function SetupChecklist({ businessId }: { businessId: string }) {
  const { data: tables } = useTables(businessId)
  const { data: grants } = useAccessGrants(businessId)
  const [closed, setClosed] = useState(() => wasClosed(businessId))
  if (closed || !tables || !grants) return null

  const rows = tables.filter((t) => t.kind === 'TABLE').reduce((sum, t) => sum + t.rowCount, 0)
  const ledgerEntries = tables.find((t) => t.kind === 'LEDGER')?.rowCount ?? 0
  const sharedWith = grants.filter((g) => g.status === 'active').length
  const steps = setupSteps(businessId, { rows, ledgerEntries, sharedWith })
  if (setupDone(steps)) return null

  return (
    <section aria-label="Set up in 3 steps" className="mx-2.5 mt-3 mb-4 rounded-[12px] border border-paper-line bg-paper p-3">
      <div className="mb-1.5 flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-ink">Set up in 3 steps</h2>
        <span className="flex items-center gap-1 text-[12px] text-ink-soft">
          {setupCount(steps)} of 3
          <button
            type="button"
            aria-label="Hide this list"
            onClick={() => {
              setClosed(true)
              try {
                localStorage.setItem(key(businessId), '1')
              } catch {
                // closed for this visit only
              }
            }}
            className="flex h-6 w-6 items-center justify-center rounded-full hover:bg-white"
          >
            <IconClose width={14} height={14} />
          </button>
        </span>
      </div>
      <ul className="flex flex-col">
        {steps.map((s) => (
          <li key={s.key}>
            {s.done || !s.to ? (
              <span className={`flex items-center gap-2 py-1 text-[13px] ${s.done ? 'text-ink-soft line-through decoration-ink-soft/50' : 'text-ink'}`}>
                <Mark done={s.done} />
                {s.label}
              </span>
            ) : (
              <Link to={s.to} className="flex items-center gap-2 py-1 text-[13px] font-medium text-ink hover:text-stamp">
                <Mark done={false} />
                {s.label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </section>
  )
}

function Mark({ done }: { done: boolean }) {
  return (
    <span className={`flex h-[18px] w-[18px] flex-none items-center justify-center rounded-full border-2 ${done ? 'border-green bg-green text-white' : 'border-paper-line bg-white'}`} aria-hidden>
      {done && <IconCheck width={11} height={11} strokeWidth={3} />}
    </span>
  )
}
