import { useAudit, type AuditEvent } from '../../lib/trust'
import { Button } from '../Button'

const ICON: Record<string, string> = { row: '▤', table: '▦', field: '▥', rule: '⇄', entry: '₿', access: '⚿', books: '🔒' }
const iconOf = (action: string) => ICON[action.split('.')[0]] ?? '•'

function whenText(iso: string): string {
  const d = new Date(iso)
  return `${d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}, ${d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`
}

function Event({ event }: { event: AuditEvent }) {
  return (
    <li className="flex gap-3 border-b border-paper-edge px-5 py-3 text-[13.5px] last:border-b-0">
      <span aria-hidden className="mt-0.5 w-4 flex-none text-center text-ink-soft">
        {iconOf(event.action)}
      </span>
      <div className="min-w-0 flex-1">
        <div className="break-words">{event.summary}</div>
        <div className="text-[12px] text-ink-soft">
          {event.actor ?? 'Someone'} · {whenText(event.at)}
        </div>
      </div>
    </li>
  )
}

// The newest changes first, thirty at a time. With a tableId it is that table's history.
export function ActivityList({ businessId, tableId, rowId, emptyText = 'Nothing has changed yet.' }: { businessId: string; tableId?: string; rowId?: string; emptyText?: string }) {
  const { data, isLoading, error, hasNextPage, fetchNextPage, isFetchingNextPage } = useAudit(businessId, { tableId, rowId })
  const events = data?.pages.flatMap((p) => p.events) ?? []
  if (error) return <p className="px-5 py-6 text-sm text-rust">Could not load the history.</p>
  if (isLoading) return <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
  if (events.length === 0) return <p className="px-5 py-6 text-sm text-ink-soft">{emptyText}</p>
  return (
    <>
      <ul>
        {events.map((event) => (
          <Event key={event.id} event={event} />
        ))}
      </ul>
      {hasNextPage && (
        <div className="border-t border-paper-edge px-5 py-3">
          <Button variant="ghost" onClick={() => void fetchNextPage()} disabled={isFetchingNextPage}>
            {isFetchingNextPage ? 'Loading…' : 'Show older'}
          </Button>
        </div>
      )}
    </>
  )
}
