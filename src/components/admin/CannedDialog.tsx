import { useState } from 'react'
import { useCanned, useCreateCanned, useDeleteCanned } from '../../lib/support'
import { useToast } from '../../lib/toast-context'
import { Button } from '../Button'
import { Modal } from '../Modal'
import { Textarea } from '../Textarea'
import { TextField } from '../TextField'
import { Loading } from './ui'

// The ready replies staff can drop into an answer.
export function CannedDialog({ onClose }: { onClose: () => void }) {
  const { data, isLoading } = useCanned()
  const create = useCreateCanned()
  const remove = useDeleteCanned()
  const toast = useToast()
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal title="Ready replies" onClose={onClose}>
      {isLoading ? (
        <Loading />
      ) : (
        <div>
          {(data ?? []).length === 0 && <p className="py-2 text-sm text-ink-soft">None yet.</p>}
          {(data ?? []).map((c) => (
            <div key={c.id} className="flex items-center gap-2 border-b border-paper-edge py-2 text-sm">
              <span className="min-w-0 flex-1"><b>{c.title}</b><span className="block truncate text-[12.5px] text-ink-soft">{c.body}</span></span>
              <button type="button" disabled={remove.isPending} onClick={() => remove.mutate(c.id, { onSuccess: () => toast('Deleted.') })} className="rounded-ledger border border-rust-soft px-2.5 py-1 text-[12.5px] font-semibold text-rust hover:bg-err">Delete</button>
            </div>
          ))}
        </div>
      )}
      <TextField label="New: title" value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} />
      <Textarea label="Text" value={body} maxLength={2000} onChange={(e) => setBody(e.target.value)} />
      {error && <p role="alert" className="text-sm text-rust">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>Close</Button>
        <Button
          type="button"
          disabled={!title.trim() || !body.trim() || create.isPending}
          onClick={() =>
            create.mutate(
              { title: title.trim(), body: body.trim() },
              { onSuccess: () => { setTitle(''); setBody(''); setError(null); toast('Saved.') }, onError: (e) => setError(e instanceof Error ? e.message : 'Could not save.') },
            )
          }
        >
          Save
        </Button>
      </div>
    </Modal>
  )
}
