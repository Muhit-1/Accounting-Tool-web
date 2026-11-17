import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Avatar, Card, ErrorLine, Loading, Note, PageHeader, Pill, PriorityPill, selectClass, TicketStatusPill } from '../../components/admin/ui'
import { Button } from '../../components/Button'
import { formatDateTime, ticketRef, TICKET_CATEGORY_LABEL, TICKET_PRIORITY_LABEL, TICKET_STATUS_LABEL } from '../../lib/admin-format'
import { useTeam } from '../../lib/admin'
import { useCanned, useStaffReply, useStaffTicket, useUpdateTicket } from '../../lib/support'
import { useToast } from '../../lib/toast-context'
import type { TicketPriority, TicketStatus } from '../../types/admin'

export function AdminTicketPage() {
  const { id } = useParams<{ id: string }>()
  const toast = useToast()
  const { data: t, isLoading, error } = useStaffTicket(id)
  const { data: team } = useTeam()
  const { data: canned } = useCanned()
  const reply = useStaffReply(id ?? '')
  const update = useUpdateTicket(id ?? '')
  const [mode, setMode] = useState<'reply' | 'note'>('reply')
  const [text, setText] = useState('')
  const [failure, setFailure] = useState<string | null>(null)

  if (isLoading) return <Loading />
  if (error || !t) return <ErrorLine error={error ?? new Error('Request not found.')} />

  const internal = mode === 'note'
  const closed = t.status === 'CLOSED'
  const staff = (team ?? []).filter((m) => m.status !== 'disabled')
  const change = (input: { status?: TicketStatus; priority?: TicketPriority; assignedToId?: string | null }) =>
    update.mutate(input, { onSuccess: () => toast('Saved. The change is noted in the request.'), onError: (e) => toast(e instanceof Error ? e.message : 'Could not save.') })

  function send() {
    if (!text.trim()) return
    setFailure(null)
    reply.mutate(
      { body: text.trim(), internal },
      {
        onSuccess: () => {
          setText('')
          toast(internal ? 'Note saved. The person cannot see it.' : 'Reply sent. The person gets a notification.')
        },
        onError: (e) => setFailure(e instanceof Error ? e.message : 'Could not send.'),
      },
    )
  }

  return (
    <div>
      <PageHeader title={<><Link to="/admin/support" className="text-[15px] font-semibold text-ink-soft">Support</Link> <span className="text-ink-soft">/</span> {ticketRef(t.number)}</>} />
      <div className="grid items-start gap-3.5 lg:grid-cols-[1fr_290px]">
        <Card>
          <div className="border-b border-paper-edge px-[18px] py-4">
            <h2 className="font-display text-lg font-extrabold">{t.subject}</h2>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <TicketStatusPill status={t.status} />
              <PriorityPill priority={t.priority} />
              <Pill>{TICKET_CATEGORY_LABEL[t.category]}</Pill>
              <span className="text-[12.5px] text-ink-soft">opened {formatDateTime(t.createdAt)} · {t.userName}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2.5 p-4">
            {t.messages.map((m) =>
              m.authorKind === 'SYSTEM' ? (
                <div key={m.id} className="self-center text-center text-xs text-ink-soft">{m.body}</div>
              ) : (
                <div
                  key={m.id}
                  className={`max-w-[84%] rounded-xl px-3.5 py-2.5 text-sm whitespace-pre-wrap ${
                    m.internal ? 'max-w-full self-stretch border border-dashed border-brass-line bg-brass-row' : m.authorKind === 'STAFF' ? 'self-end bg-stamp-soft' : 'self-start border border-paper-edge bg-white'
                  }`}
                >
                  <div className="mb-0.5 text-[11.5px] font-bold text-ink-soft2">
                    {m.authorName}
                    {m.internal ? ' · note for staff, the person cannot see this' : m.authorKind === 'STAFF' ? ' · support' : ''}
                  </div>
                  {m.body}
                  <div className="mt-1 text-[11px] text-ink-soft">{formatDateTime(m.createdAt)}</div>
                </div>
              ),
            )}
          </div>
          {closed ? (
            <div className="border-t border-paper-edge px-4 py-3 text-sm text-ink-soft">This request is closed.</div>
          ) : (
            <div className={`border-t border-paper-edge p-4 ${internal ? '[&_textarea]:border-brass-line [&_textarea]:bg-brass-row' : ''}`}>
              <div className="mb-2 flex flex-wrap items-center gap-1.5">
                {(['reply', 'note'] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setMode(m)}
                    className={`rounded-full border px-3.5 py-1 text-[13px] font-semibold ${mode === m ? 'border-stamp bg-stamp text-white' : 'border-paper-line bg-white'}`}
                  >
                    {m === 'reply' ? 'Reply to person' : 'Note for staff'}
                  </button>
                ))}
                <div className="flex-1" />
                <select
                  aria-label="Ready reply"
                  className={`${selectClass} py-1`}
                  value=""
                  onChange={(e) => {
                    const c = (canned ?? []).find((x) => x.id === e.target.value)
                    if (c) setText((current) => (current ? `${current}\n${c.body}` : c.body))
                  }}
                >
                  <option value="">Ready reply…</option>
                  {(canned ?? []).map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>
              <textarea
                aria-label={internal ? 'Note for staff' : 'Reply to the person'}
                value={text}
                maxLength={5000}
                onChange={(e) => setText(e.target.value)}
                placeholder={internal ? 'Only staff see this.' : 'The person gets a notification with this request number, never the text.'}
                className="min-h-[90px] w-full rounded-ledger border border-paper-line bg-white px-3 py-2 text-sm focus:border-stamp focus:outline-none"
              />
              {failure && <p role="alert" className="mt-1 text-sm text-rust">{failure}</p>}
              <div className="mt-2 flex items-center gap-3">
                <span className="text-[12.5px] text-ink-soft">{internal ? 'Internal note' : `Goes to ${t.userEmail}`}</span>
                <div className="flex-1" />
                <Button type="button" disabled={!text.trim() || reply.isPending} onClick={send}>{internal ? 'Save note' : 'Send reply'}</Button>
              </div>
            </div>
          )}
        </Card>

        <div className="flex flex-col gap-3.5">
          <Card className="px-[18px] py-4">
            <div className="mb-2 text-[11.5px] font-semibold tracking-wider text-ink-soft uppercase">Request</div>
            <div className="grid grid-cols-[84px_1fr] items-center gap-x-2.5 gap-y-2 text-[13px]">
              <span className="text-ink-soft">Status</span>
              <select aria-label="Status" className={selectClass} value={t.status} onChange={(e) => change({ status: e.target.value as TicketStatus })}>
                {(Object.keys(TICKET_STATUS_LABEL) as TicketStatus[]).map((s) => <option key={s} value={s}>{TICKET_STATUS_LABEL[s]}</option>)}
              </select>
              <span className="text-ink-soft">Priority</span>
              <select aria-label="Priority" className={selectClass} value={t.priority} onChange={(e) => change({ priority: e.target.value as TicketPriority })}>
                {(Object.keys(TICKET_PRIORITY_LABEL) as TicketPriority[]).map((p) => <option key={p} value={p}>{TICKET_PRIORITY_LABEL[p]}</option>)}
              </select>
              <span className="text-ink-soft">Taken by</span>
              <select aria-label="Taken by" className={selectClass} value={t.assignedToId ?? ''} onChange={(e) => change({ assignedToId: e.target.value || null })}>
                <option value="">Nobody (inbox)</option>
                {staff.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
                {t.assignedToId && !staff.some((m) => m.id === t.assignedToId) && <option value={t.assignedToId}>{t.assignedToName}</option>}
              </select>
            </div>
            {t.rating ? <div className="mt-2.5 text-[12.5px] text-ink-soft">Rated {'★'.repeat(t.rating)}{'☆'.repeat(5 - t.rating)} by the person</div> : null}
          </Card>
          <Card className="px-[18px] py-4">
            <div className="mb-2 text-[11.5px] font-semibold tracking-wider text-ink-soft uppercase">Person</div>
            <div className="flex items-center gap-2.5">
              <Avatar name={t.userName} />
              <div className="min-w-0"><b className="block truncate">{t.userName}</b><span className="block truncate text-[12.5px] text-ink-soft">{t.userEmail}</span></div>
            </div>
            {t.userId ? (
              <Link to={`/admin/users/${t.userId}`} className="mt-2.5 inline-block rounded-ledger border border-paper-line px-3 py-1.5 text-[12.5px] font-semibold hover:bg-paper">Open profile →</Link>
            ) : (
              <div className="mt-2.5 text-[12.5px] text-ink-soft"><Pill tone="rust">Account deleted</Pill> name and email kept as they were</div>
            )}
            <dl className="mt-3 grid grid-cols-[84px_1fr] gap-x-2.5 gap-y-1.5 text-[13px]">
              <dt className="text-ink-soft">Platform</dt>
              <dd>{t.platform === 'app' ? 'Phone app' : 'Web'}{t.appVersion ? ` · ${t.appVersion}` : ''}</dd>
              <dt className="text-ink-soft">Error id</dt>
              <dd className="tabular break-all">{t.requestId ?? '—'}</dd>
            </dl>
            {t.requestId && <p className="mt-2 text-[12.5px] text-ink-soft">Search this id in the server log (Coolify) to see what happened.</p>}
          </Card>
          <Note>Staff see this request only. The person’s books are never opened from here.</Note>
        </div>
      </div>
    </div>
  )
}
