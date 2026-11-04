import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError } from '../lib/api-client'
import { useCopyBusiness } from '../lib/businesses'
import { Button } from './Button'
import { Modal } from './Modal'
import { TextField } from './TextField'

// "Make a copy": the tables, columns, formulas, links, rules and categories of a business, in a new business of its
// own. The rows only if asked. The Cash book entries, invoices and sharing are never copied.
export function CopyBusinessDialog({ businessId, name, onClose }: { businessId: string; name: string; onClose: () => void }) {
  const navigate = useNavigate()
  const copy = useCopyBusiness(businessId)
  const [newName, setNewName] = useState(`${name} (copy)`.slice(0, 120))
  const [withRows, setWithRows] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const made = await copy.mutateAsync({ name: newName.trim() || undefined, withRows })
      onClose()
      navigate(`/businesses/${made.id}/workspace`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <Modal title="Make a copy" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={submit}>
        <p className="text-[13.5px] text-ink-soft">The copy gets the same tables, columns, formulas and rules. Cash book entries, invoices and sharing are not copied.</p>
        <TextField label="Name of the copy" name="name" required value={newName} maxLength={120} onChange={(event) => setNewName(event.target.value)} />
        <label className="flex items-start gap-2.5 text-[13.5px]">
          <input type="checkbox" checked={withRows} onChange={(event) => setWithRows(event.target.checked)} className="mt-0.5 h-4 w-4 accent-stamp" />
          <span>
            <b className="font-semibold">Copy the rows too</b>
            <span className="block text-ink-soft">Rows that post to the Cash book are posted again in the copy.</span>
          </span>
        </label>
        {error && <p className="text-sm text-rust">{error}</p>}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={copy.isPending}>
            {copy.isPending ? 'Copying…' : 'Make a copy'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
