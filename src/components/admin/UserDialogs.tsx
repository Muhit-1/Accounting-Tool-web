import { useState } from 'react'
import { useDeletePreview, useDisableUser, useEnableUser, useLogoutAll, useRemoveUser } from '../../lib/admin'
import { formatCount } from '../../lib/admin-format'
import { useToast } from '../../lib/toast-context'
import { Button } from '../Button'
import { Modal } from '../Modal'
import { Textarea } from '../Textarea'
import { TextField } from '../TextField'
import { Loading, Note } from './ui'

export interface TargetPerson {
  id: string
  name: string
  email: string
  disabled: boolean
}

const messageOf = (error: unknown) => (error instanceof Error ? error.message : 'Something went wrong.')

function Buttons({ cancel, children }: { cancel: () => void; children: React.ReactNode }) {
  return (
    <div className="flex justify-end gap-3">
      <Button type="button" variant="ghost" onClick={cancel}>
        Cancel
      </Button>
      {children}
    </div>
  )
}

export function DisableDialog({ person, onClose }: { person: TargetPerson; onClose: () => void }) {
  const disable = useDisableUser()
  const toast = useToast()
  const [reason, setReason] = useState('')
  const [error, setError] = useState<string | null>(null)
  const ok = reason.trim().length >= 3
  return (
    <Modal title={`Deactivate ${person.name}?`} onClose={onClose}>
      <p className="text-sm text-ink-soft2">
        They are signed out everywhere, their phones stop getting notifications, and they cannot sign in. Nothing is deleted. You can activate the account again.
      </p>
      <Textarea label="Why? (only staff see this)" value={reason} maxLength={200} onChange={(e) => setReason(e.target.value)} placeholder="At least a few words" />
      {error && <p role="alert" className="text-sm text-rust">{error}</p>}
      <Buttons cancel={onClose}>
        <Button
          type="button"
          variant="danger"
          disabled={!ok || disable.isPending}
          onClick={() =>
            disable.mutate(
              { id: person.id, reason: reason.trim() },
              { onSuccess: () => { toast('Deactivated. Signed out everywhere.'); onClose() }, onError: (e) => setError(messageOf(e)) },
            )
          }
        >
          {disable.isPending ? 'Working…' : 'Deactivate'}
        </Button>
      </Buttons>
    </Modal>
  )
}

export function EnableDialog({ person, onClose }: { person: TargetPerson; onClose: () => void }) {
  const enable = useEnableUser()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal title={`Activate ${person.name}?`} onClose={onClose}>
      <p className="text-sm text-ink-soft2">They can sign in again. Their data is as they left it.</p>
      {error && <p role="alert" className="text-sm text-rust">{error}</p>}
      <Buttons cancel={onClose}>
        <Button type="button" disabled={enable.isPending} onClick={() => enable.mutate(person.id, { onSuccess: () => { toast('Activated.'); onClose() }, onError: (e) => setError(messageOf(e)) })}>
          Activate
        </Button>
      </Buttons>
    </Modal>
  )
}

export function LogoutDialog({ person, onClose }: { person: TargetPerson; onClose: () => void }) {
  const logout = useLogoutAll()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal title={`Sign ${person.name} out everywhere?`} onClose={onClose}>
      <p className="text-sm text-ink-soft2">Every phone and browser is signed out at once. They can sign in again.</p>
      {error && <p role="alert" className="text-sm text-rust">{error}</p>}
      <Buttons cancel={onClose}>
        <Button type="button" disabled={logout.isPending} onClick={() => logout.mutate(person.id, { onSuccess: () => { toast('Signed out everywhere.'); onClose() }, onError: (e) => setError(messageOf(e)) })}>
          Sign out
        </Button>
      </Buttons>
    </Modal>
  )
}

/** Delete for good: only a deactivated person; shows what would be lost (counts only); the email is typed again. */
export function DeleteDialog({ person, onClose, onDeleted }: { person: TargetPerson; onClose: () => void; onDeleted: () => void }) {
  const { data: preview, isLoading } = useDeletePreview(person.id, person.disabled)
  const remove = useRemoveUser()
  const toast = useToast()
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)

  if (!person.disabled) {
    return (
      <Modal title={`Delete ${person.name}?`} onClose={onClose}>
        <Note tone="warn">Deactivate the account first. This keeps a delete from being one click away.</Note>
        <div className="flex justify-end"><Button type="button" variant="ghost" onClick={onClose}>Close</Button></div>
      </Modal>
    )
  }
  const matches = typed.trim().toLowerCase() === person.email.toLowerCase()
  return (
    <Modal title={`Delete ${person.name} for good?`} onClose={onClose}>
      <Note tone="bad"><b>This cannot be undone.</b> It deletes:</Note>
      {isLoading || !preview ? (
        <Loading />
      ) : (
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li><b>{preview.businesses}</b> business{preview.businesses === 1 ? '' : 'es'} with <b>{preview.tables}</b> tables, <b>{formatCount(preview.entries)}</b> entries and <b>{preview.invoices}</b> invoices</li>
          <li>their uploaded files and the “Exin Finance” folder in their Google Drive</li>
          <li>access they gave to <b>{preview.peopleWithAccess}</b> people, and access others gave them</li>
        </ul>
      )}
      <p className="text-xs text-ink-soft2">Their support requests and the activity log stay, with the name and email as they were.</p>
      <TextField label={`Type ${person.email} to confirm`} value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" />
      {error && <p role="alert" className="text-sm text-rust">{error}</p>}
      <Buttons cancel={onClose}>
        <Button
          type="button"
          variant="danger"
          disabled={!matches || remove.isPending}
          onClick={() =>
            remove.mutate(
              { id: person.id, confirmEmail: typed.trim() },
              { onSuccess: () => { toast('Deleted.'); onDeleted() }, onError: (e) => setError(messageOf(e)) },
            )
          }
        >
          {remove.isPending ? 'Deleting…' : 'Delete for good'}
        </Button>
      </Buttons>
    </Modal>
  )
}
