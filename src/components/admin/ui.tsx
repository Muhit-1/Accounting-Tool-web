import type { ReactNode } from 'react'
import { barHeights, ROLE_LABEL, STATUS_LABEL, TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL } from '../../lib/admin-format'
import type { PersonStatus, TicketPriority, TicketStatus, UserRole } from '../../types/admin'

// Small shared pieces of the admin panel (same tokens as the rest of the site).

type Tone = 'blue' | 'green' | 'rust' | 'brass' | 'grey' | 'ink'
const TONES: Record<Tone, string> = {
  blue: 'bg-stamp-soft text-stamp',
  green: 'bg-green-soft text-green',
  rust: 'bg-rust-soft text-rust',
  brass: 'bg-brass-soft text-brass',
  grey: 'bg-paper-edge text-ink-soft2',
  ink: 'bg-ink text-white',
}

export function Pill({ tone = 'grey', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-px text-[11.5px] font-bold whitespace-nowrap ${TONES[tone]}`}>{children}</span>
}

export const RolePill = ({ role }: { role: UserRole }) => <Pill tone={role === 'SUPER_ADMIN' ? 'ink' : role === 'ADMIN' ? 'brass' : 'grey'}>{ROLE_LABEL[role]}</Pill>

export const StatusPill = ({ status }: { status: PersonStatus }) => <Pill tone={status === 'active' ? 'green' : status === 'disabled' ? 'rust' : 'blue'}>{STATUS_LABEL[status]}</Pill>

const TICKET_TONE: Record<TicketStatus, Tone> = { OPEN: 'blue', IN_PROGRESS: 'brass', WAITING_USER: 'grey', RESOLVED: 'green', CLOSED: 'grey' }
export const TicketStatusPill = ({ status }: { status: TicketStatus }) => <Pill tone={TICKET_TONE[status]}>{TICKET_STATUS_LABEL[status]}</Pill>

export const PriorityPill = ({ priority }: { priority: TicketPriority }) => <Pill tone={priority === 'URGENT' ? 'rust' : priority === 'HIGH' ? 'brass' : 'grey'}>{TICKET_PRIORITY_LABEL[priority]}</Pill>

function hue(text: string): number {
  let h = 0
  for (const c of text) h = (h * 31 + c.charCodeAt(0)) % 360
  return h
}

export function Avatar({ name, size = 32 }: { name: string; size?: number }) {
  const initials = name.split(/\s+/).filter(Boolean).map((w) => w[0]).join('').slice(0, 2).toUpperCase() || '?'
  return (
    <span
      aria-hidden
      className="inline-grid flex-none place-items-center rounded-full font-bold text-white"
      style={{ width: size, height: size, fontSize: size * 0.38, background: `hsl(${hue(name)} 45% 42%)` }}
    >
      {initials}
    </span>
  )
}

export function Card({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <div className={`min-w-0 rounded-ledger border border-paper-edge bg-white ${className}`}>{children}</div>
}

export function Kpi({ label, value, hint }: { label: string; value: ReactNode; hint?: ReactNode }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-[11.5px] font-semibold tracking-wider text-ink-soft uppercase">{label}</div>
      <div className="tabular mt-0.5 text-[26px] leading-tight font-extrabold">{value}</div>
      {hint && <div className="text-[12.5px] text-ink-soft2">{hint}</div>}
    </Card>
  )
}

export function Note({ tone = 'info', children }: { tone?: 'info' | 'warn' | 'bad'; children: ReactNode }) {
  const cls = tone === 'bad' ? 'border border-rust-soft bg-err text-rust' : tone === 'warn' ? 'border border-brass-line bg-brass-row text-warn-ink' : 'bg-stamp-soft text-info-ink'
  return <div className={`rounded-ledger px-3.5 py-2.5 text-[13.5px] ${cls}`}>{children}</div>
}

export function PageHeader({ title, children }: { title: ReactNode; children?: ReactNode }) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-3">
      <h1 className="font-display text-[22px] font-extrabold tracking-tight">{title}</h1>
      <div className="flex-1" />
      {children}
    </div>
  )
}

export function BarChart({ values, labels, tone = 'blue', unit }: { values: number[]; labels: string[]; tone?: 'blue' | 'green'; unit?: string }) {
  const heights = barHeights(values)
  return (
    <div>
      <div className="flex h-24 items-end gap-[3px]" role="img" aria-label={`Chart of the last ${values.length} days`}>
        {heights.map((h, i) => (
          <i
            key={labels[i] ?? i}
            title={`${labels[i]}: ${values[i]}${unit ? ` ${unit}` : ''}`}
            style={{ height: `${h}%` }}
            className={`block min-h-0.5 flex-1 rounded-t-[3px] ${tone === 'green' ? 'bg-green' : 'bg-stamp'} ${i === values.length - 1 ? 'opacity-100' : 'opacity-85'}`}
          />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[11px] text-ink-soft">
        <span>{values.length} days ago</span>
        <span>today</span>
      </div>
    </div>
  )
}

export function Loading({ children = 'Loading…' }: { children?: ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-ink-soft">{children}</p>
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="px-5 py-8 text-center text-sm text-ink-soft">{children}</p>
}

export function ErrorLine({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : 'Something went wrong.'
  return <p role="alert" className="px-5 py-6 text-sm text-rust">{message}</p>
}

export function LoadMore({ hasMore, loading, onClick }: { hasMore: boolean; loading: boolean; onClick: () => void }) {
  if (!hasMore) return null
  return (
    <div className="py-3 text-center">
      <button type="button" disabled={loading} onClick={onClick} className="rounded-ledger border border-paper-line bg-white px-4 py-2 text-[13.5px] font-semibold hover:bg-paper disabled:opacity-50">
        {loading ? 'Loading…' : 'Show more'}
      </button>
    </div>
  )
}

export const selectClass = 'rounded-ledger border border-paper-line bg-white px-3 py-2 text-[14px] text-ink focus:border-stamp focus:outline-none'
export const inputClass = 'rounded-ledger border border-paper-line bg-white px-3 py-2 text-[14px] text-ink placeholder:text-ink-soft/60 focus:border-stamp focus:outline-none'

/** A table that scrolls sideways on a narrow screen instead of squeezing. */
export function DataTable({ head, children }: { head: ReactNode; children: ReactNode }) {
  return (
    <Card className="overflow-x-auto">
      <table className="w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="[&>th]:border-b [&>th]:border-paper-edge [&>th]:bg-sheet [&>th]:px-3 [&>th]:py-2.5 [&>th]:text-left [&>th]:text-[11.5px] [&>th]:font-bold [&>th]:tracking-wider [&>th]:whitespace-nowrap [&>th]:text-ink-soft2 [&>th]:uppercase">{head}</tr>
        </thead>
        <tbody className="[&>tr>td]:border-b [&>tr>td]:border-paper-edge [&>tr>td]:px-3 [&>tr>td]:py-2.5 [&>tr:last-child>td]:border-b-0">{children}</tbody>
      </table>
    </Card>
  )
}
