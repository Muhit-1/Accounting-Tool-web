import { useState, type FormEvent } from 'react'
import { useCreateClient, useDeleteClient } from '../../lib/clients'
import { ApiError } from '../../lib/api-client'
import type { Client } from '../../types/api'
import { TextField } from '../TextField'
import { Textarea } from '../Textarea'
import { Button } from '../Button'
import { Panel } from '../Panel'
import { ConfirmDialog } from '../ConfirmDialog'

export function ClientManager({ businessId, clients }: { businessId: string; clients: Client[] }) {
  const createClient = useCreateClient(businessId)
  const deleteClient = useDeleteClient(businessId)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createClient.mutateAsync({ name, address, email: email || undefined })
      setName('')
      setAddress('')
      setEmail('')
      setShowForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return
    try {
      await deleteClient.mutateAsync(pendingDeleteId)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
    setPendingDeleteId(null)
  }

  return (
    <Panel
      title="Clients"
      action={
        <button onClick={() => setShowForm((s) => !s)} className="border-b border-current text-[13px] text-stamp">
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      }
    >
      {showForm && (
        <form className="flex flex-col gap-3 border-b border-paper-line px-5 py-4" onSubmit={handleAdd}>
          <TextField
            label="Name"
            required
            autoFocus
            placeholder="e.g. Nordica Ltd"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <Textarea
            label="Address"
            required
            placeholder="Street, city, country"
            value={address}
            onChange={(event) => setAddress(event.target.value)}
          />
          <TextField
            label="Email"
            type="email"
            placeholder="Optional"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          {error && <p className="text-sm text-rust">{error}</p>}
          <Button type="submit" disabled={createClient.isPending}>
            {createClient.isPending ? 'Adding…' : 'Add client'}
          </Button>
        </form>
      )}

      {clients.length === 0 && !showForm ? (
        <p className="px-5 py-6 text-sm text-ink-soft">No clients yet.</p>
      ) : (
        clients.map((client) => (
          <div
            key={client.id}
            className="flex items-center justify-between border-b border-paper-edge px-5 py-2.5 last:border-b-0"
          >
            <span className="text-[14.5px]">{client.name}</span>
            <button
              onClick={() => setPendingDeleteId(client.id)}
              className="text-xs text-ink-soft transition-colors hover:text-rust"
            >
              Delete
            </button>
          </div>
        ))
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete this client?"
          body="You can't delete a client that has invoices — delete those first."
          isPending={deleteClient.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </Panel>
  )
}
