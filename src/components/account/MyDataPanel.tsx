import { useState, type FormEvent } from 'react'
import { api, ApiError } from '../../lib/api-client'
import { useAuth } from '../../lib/auth-context'
import { downloadFile } from '../../lib/download'
import { useToast } from '../../lib/toast-context'
import { Button } from '../Button'
import { Modal } from '../Modal'
import { Panel } from '../Panel'
import { TextField } from '../TextField'

// The person's own copy of their data and the way out (GET /me/export, DELETE /me). Both are the person's legal rights
// (access, portability, erasure), so they live in the web app too and not only in the Android app.
export function MyDataPanel() {
  const { user, logout } = useAuth()
  const toast = useToast()
  const [busy, setBusy] = useState(false)
  const [asking, setAsking] = useState(false)
  const [typed, setTyped] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  async function download() {
    setBusy(true)
    try {
      const copy = await api.get<unknown>('/me/export')
      const day = new Date().toISOString().slice(0, 10)
      downloadFile(JSON.stringify(copy, null, 2), `exin-finance-my-data-${day}.json`, 'application/json')
    } catch (error) {
      toast(error instanceof ApiError ? error.message : 'The copy could not be made. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  async function remove(event: FormEvent) {
    event.preventDefault()
    setBusy(true)
    setProblem(null)
    try {
      await api.delete('/me', { confirmEmail: typed.trim() })
      logout()
    } catch (error) {
      setProblem(error instanceof ApiError ? error.message : 'The account could not be deleted. Please try again.')
      setBusy(false)
    }
  }

  return (
    <Panel title="Your data">
      <div className="flex flex-col gap-4 px-5 py-4 text-[13.5px] text-ink-soft">
        <p>
          Download a copy of everything you own here (businesses, entries, invoices, tables) as one file. Files in your
          Google Drive are not part of it; they are already yours.
        </p>
        <div>
          <Button type="button" variant="ghost" disabled={busy} onClick={() => void download()}>
            {busy && !asking ? 'Preparing…' : 'Download my data'}
          </Button>
        </div>
        <p>
          Deleting your account removes every business you own with its entries, invoices, tables and files, and ends
          Exin Finance’s access to your Google account. It cannot be undone. Download your data first.
        </p>
        <div>
          <Button type="button" variant="danger" onClick={() => setAsking(true)}>
            Delete my account
          </Button>
        </div>
      </div>

      {asking && (
        <Modal title="Delete your account" onClose={() => (busy ? undefined : setAsking(false))}>
          <form className="flex flex-col gap-4" onSubmit={remove}>
            <p className="text-sm text-ink-soft">
              This permanently deletes your account and everything you own. Type your email address ({user?.email}) to
              confirm.
            </p>
            <TextField
              label="Your email address"
              name="confirmEmail"
              type="email"
              value={typed}
              maxLength={254}
              autoComplete="off"
              onChange={(event) => {
                setTyped(event.target.value)
                setProblem(null)
              }}
              error={problem ?? undefined}
            />
            <div className="flex justify-end gap-3">
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setAsking(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={busy || typed.trim().length === 0}>
                {busy ? 'Deleting…' : 'Delete everything'}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </Panel>
  )
}
