import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Button } from '../components/Button'
import { Note } from '../components/admin/ui'
import { Textarea } from '../components/Textarea'
import { TextField } from '../components/TextField'
import { MY_CATEGORY_LABEL } from '../lib/admin-format'
import { useCreateTicket } from '../lib/support'
import { useToast } from '../lib/toast-context'
import type { TicketCategory } from '../types/admin'

const ORDER: TicketCategory[] = ['QUESTION', 'BUG', 'ACCOUNT', 'FEATURE', 'OTHER']

export function SupportNewPage() {
  const navigate = useNavigate()
  const toast = useToast()
  const create = useCreateTicket()
  const [category, setCategory] = useState<TicketCategory>('QUESTION')
  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [requestId, setRequestId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const idOk = requestId.trim() === '' || /^[A-Za-z0-9_-]{1,64}$/.test(requestId.trim())
  const ready = subject.trim().length >= 3 && message.trim().length > 0 && idOk

  return (
    <div className="mx-auto max-w-[620px]">
      <Link to="/support" className="text-sm font-semibold text-ink-soft">← Back</Link>
      <h1 className="mt-1.5 mb-4 font-display text-2xl font-extrabold tracking-tight">New request</h1>
      <form
        className="flex flex-col gap-4 rounded-ledger border border-paper-edge bg-white p-5"
        onSubmit={(e) => {
          e.preventDefault()
          if (!ready) return
          setError(null)
          create.mutate(
            { subject: subject.trim(), category, message: message.trim(), requestId: requestId.trim() || undefined },
            {
              onSuccess: (t) => { toast('Request sent. We will write back here.'); navigate(`/support/${t.id}`, { replace: true }) },
              onError: (err) => setError(err instanceof Error ? err.message : 'Could not send.'),
            },
          )
        }}
      >
        <div>
          <div className="mb-1.5 text-xs font-medium tracking-wider text-ink-soft uppercase">What is it about?</div>
          <div className="flex flex-wrap gap-1.5">
            {ORDER.map((c) => (
              <button key={c} type="button" onClick={() => setCategory(c)} aria-pressed={category === c} className={`rounded-full border px-3.5 py-1 text-[13px] font-semibold ${category === c ? 'border-stamp bg-stamp text-white' : 'border-paper-line bg-white'}`}>
                {MY_CATEGORY_LABEL[c]}
              </button>
            ))}
          </div>
        </div>
        <TextField label="Subject" value={subject} maxLength={120} onChange={(e) => setSubject(e.target.value)} placeholder="A few words" />
        <Textarea label="Message" rows={6} value={message} maxLength={5000} onChange={(e) => setMessage(e.target.value)} placeholder="What happened? What did you expect?" />
        <div>
          <TextField label="Error id (if the app showed one)" value={requestId} maxLength={64} onChange={(e) => setRequestId(e.target.value)} placeholder="for example a4f1c9d2-77" error={idOk ? undefined : 'Letters, numbers, dash and underscore only.'} />
          <p className="mt-1 text-xs text-ink-soft">It helps us find what went wrong on the server.</p>
        </div>
        <Note>We add your device and app version automatically. We never open your books.</Note>
        {error && <p role="alert" className="text-sm text-rust">{error}</p>}
        <div className="flex justify-end gap-3">
          <Link to="/support" className="rounded-ledger border border-paper-line px-4 py-2.5 text-[13.5px] font-semibold hover:bg-black/[0.03]">Cancel</Link>
          <Button type="submit" disabled={!ready || create.isPending}>{create.isPending ? 'Sending…' : 'Send'}</Button>
        </div>
      </form>
    </div>
  )
}
