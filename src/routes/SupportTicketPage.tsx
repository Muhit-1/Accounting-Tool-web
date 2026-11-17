import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ErrorLine, Loading, TicketStatusPill } from '../components/admin/ui'
import { Button } from '../components/Button'
import { formatDateTime, ticketRef } from '../lib/admin-format'
import { useCloseMine, useMyTicket, useRateMine, useReplyMine } from '../lib/support'
import { useToast } from '../lib/toast-context'

export function SupportTicketPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const { data: t, isLoading, error } = useMyTicket(id)
  const reply = useReplyMine(id ?? '')
  const close = useCloseMine(id ?? '')
  const rate = useRateMine(id ?? '')
  const [text, setText] = useState('')
  const [failure, setFailure] = useState<string | null>(null)

  if (isLoading) return <Loading />
  if (error || !t) return <ErrorLine error={error ?? new Error('Request not found.')} />
  const closed = t.status === 'CLOSED'
  const done = t.status === 'RESOLVED' || closed

  return (
    <div className="mx-auto max-w-[820px]">
      <Link to="/support" className="text-sm font-semibold text-ink-soft">← Back</Link>
      <div className="mt-1.5 mb-3 flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <h1 className="font-display text-xl font-extrabold tracking-tight">{t.subject}</h1>
          <div className="text-[12.5px] text-ink-soft">{ticketRef(t.number)} · {formatDateTime(t.createdAt)}</div>
        </div>
        <TicketStatusPill status={t.status} />
      </div>
      <div className="rounded-ledger border border-paper-edge bg-white">
        <div className="flex flex-col gap-2.5 p-4">
          {t.messages
            .filter((m) => m.authorKind !== 'SYSTEM')
            .map((m) => (
              <div key={m.id} className={`max-w-[84%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${m.authorKind === 'USER' ? 'self-end bg-stamp-soft' : 'self-start border border-paper-edge bg-white'}`}>
                <div className="mb-0.5 text-[11.5px] font-bold text-ink-soft2">{m.authorKind === 'USER' ? 'You' : `Support · ${m.authorName}`}</div>
                {m.body}
                <div className="mt-1 text-[11px] text-ink-soft">{formatDateTime(m.createdAt)}</div>
              </div>
            ))}
        </div>
        {closed ? (
          <div className="border-t border-paper-edge px-4 py-3 text-sm text-ink-soft">This request is closed. You can open a new one.</div>
        ) : (
          <form
            className="border-t border-paper-edge p-4"
            onSubmit={(e) => {
              e.preventDefault()
              if (!text.trim()) return
              setFailure(null)
              reply.mutate(text.trim(), { onSuccess: () => { setText(''); toast('Sent.') }, onError: (err) => setFailure(err instanceof Error ? err.message : 'Could not send.') })
            }}
          >
            <textarea aria-label="Your reply" value={text} maxLength={5000} onChange={(e) => setText(e.target.value)} placeholder="Write a reply" className="min-h-[90px] w-full rounded-ledger border border-paper-line bg-white px-3 py-2 text-sm focus:border-stamp focus:outline-none" />
            {failure && <p role="alert" className="mt-1 text-sm text-rust">{failure}</p>}
            <div className="mt-2 flex items-center gap-3">
              <Button type="button" variant="ghost" disabled={close.isPending} onClick={() => close.mutate(undefined, { onSuccess: () => toast('Request closed.') })}>Close request</Button>
              <div className="flex-1" />
              <Button type="submit" disabled={!text.trim() || reply.isPending}>Send</Button>
            </div>
          </form>
        )}
      </div>
      {done && t.rating === null && (
        <div className="mt-3 rounded-ledger border border-paper-edge bg-white px-4 py-3">
          <b>Did we help?</b>
          <div className="flex gap-1" role="group" aria-label="Rate this answer">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} type="button" aria-label={`${n} star${n === 1 ? '' : 's'}`} disabled={rate.isPending} onClick={() => rate.mutate(n, { onSuccess: () => toast('Thank you!') })} className="px-0.5 text-2xl text-[#c8cfda] hover:text-[#e0a800] disabled:opacity-60">★</button>
            ))}
          </div>
        </div>
      )}
      {done && t.rating !== null && <p className="mt-3 text-[12.5px] text-ink-soft">You rated this {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)}. Thank you.</p>}
    </div>
  )
}
