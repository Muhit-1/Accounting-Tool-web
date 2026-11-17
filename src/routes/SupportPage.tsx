import { Link } from 'react-router-dom'
import { TicketStatusPill, ErrorLine, Loading } from '../components/admin/ui'
import { ticketRef, timeAgo } from '../lib/admin-format'
import { useMyTickets } from '../lib/support'

// Help and support: the person's own requests. We answer here and send a notification to their phone.
export function SupportPage() {
  const { data, isLoading, error } = useMyTickets()
  return (
    <div className="mx-auto max-w-[820px]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-2xl font-extrabold tracking-tight">Help and support</h1>
          <p className="text-ink-soft">Write to us. We answer here, and send a notification to your phone.</p>
        </div>
        <Link to="/support/new" className="rounded-ledger bg-stamp px-4 py-2.5 text-[13.5px] font-semibold text-white hover:bg-stamp/90">+ New request</Link>
      </div>
      <div className="rounded-ledger border border-paper-edge bg-white">
        {isLoading ? (
          <Loading />
        ) : error ? (
          <ErrorLine error={error} />
        ) : (data ?? []).length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-ink-soft">No requests yet.</p>
        ) : (
          (data ?? []).map((t) => (
            <Link key={t.id} to={`/support/${t.id}`} className="flex items-center gap-3 border-b border-paper-edge px-4 py-3.5 last:border-b-0 hover:bg-sel">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  {t.userUnread && <span className="h-2 w-2 flex-none rounded-full bg-stamp" aria-label="New answer" />}
                  <b className="truncate">{t.subject}</b>
                </div>
                <div className="text-[12.5px] text-ink-soft">{ticketRef(t.number)} · {timeAgo(t.lastMessageAt)}</div>
              </div>
              <TicketStatusPill status={t.status} />
            </Link>
          ))
        )}
      </div>
      <p className="mt-3 text-[12.5px] text-ink-soft">You can have up to 10 open requests. Please do not send passwords or card numbers.</p>
    </div>
  )
}
