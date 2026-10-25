import { useState, type FormEvent } from 'react'
import {
  useAccessGrants,
  useCreateAccessGrant,
  useRevokeAccessGrant,
} from '../../lib/access-grants'
import { ApiError } from '../../lib/api-client'
import { useTables } from '../../lib/tables'
import type { AccessGrant, AccessGrantStatus, AccessPermission } from '../../types/api'
import { daysUntil, formatShortDate } from '../../lib/format'
import { TextField } from '../TextField'
import { Select } from '../Select'
import { Button } from '../Button'
import { Panel } from '../Panel'
import { ConfirmDialog } from '../ConfirmDialog'

const STATUS_STYLES: Record<AccessGrantStatus, string> = {
  active: 'bg-green-soft text-green',
  expired: 'border border-dashed border-ink-soft text-ink-soft',
  revoked: 'bg-rust-soft text-rust',
}

function tomorrow(): string {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  return date.toISOString().slice(0, 10)
}

export function AccessGrantManager({ businessId }: { businessId: string }) {
  const { data: grants, isLoading } = useAccessGrants(businessId)
  const createGrant = useCreateAccessGrant(businessId)
  const revokeGrant = useRevokeAccessGrant(businessId)

  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState('')
  const [permission, setPermission] = useState<AccessPermission>('VIEW')
  const [scope, setScope] = useState<'BUSINESS' | 'TABLE'>('BUSINESS')
  const [tableId, setTableId] = useState('')
  const { data: allTables } = useTables(businessId)
  const ownTables = (allTables ?? []).filter((t) => t.kind === 'TABLE')
  const [expiresAt, setExpiresAt] = useState(tomorrow())
  const [error, setError] = useState<string | null>(null)
  const [pendingRevokeId, setPendingRevokeId] = useState<string | null>(null)

  async function handleGrant(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (scope === 'TABLE' && !tableId) {
      setError('Choose the table to share.')
      return
    }
    try {
      await createGrant.mutateAsync({
        granteeEmail: email,
        ...(scope === 'TABLE' ? { scope: 'TABLE' as const, tableId } : { scope: 'BUSINESS' as const }),
        permission,
        expiresAt: new Date(expiresAt).toISOString(),
      })
      setEmail('')
      setScope('BUSINESS')
      setTableId('')
      setPermission('VIEW')
      setExpiresAt(tomorrow())
      setShowForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function confirmRevoke() {
    if (!pendingRevokeId) return
    await revokeGrant.mutateAsync(pendingRevokeId)
    setPendingRevokeId(null)
  }

  const grantList = (grants ?? []) as (AccessGrant & { status: AccessGrantStatus })[]

  return (
    <Panel
      title="Shared access"
      action={
        <button onClick={() => setShowForm((s) => !s)} className="border-b border-current text-[13px] text-stamp">
          {showForm ? 'Cancel' : '+ Grant access'}
        </button>
      }
    >
      {showForm && (
        <form className="flex flex-col gap-4 border-b border-paper-line px-5 py-4" onSubmit={handleGrant}>
          <TextField
            label="Their email"
            type="email"
            required
            autoFocus
            placeholder="collaborator@example.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <p className="text-xs text-ink-soft">Must already be a registered user of this app.</p>

          <div className="flex gap-2" role="group" aria-label="What to share">
            {(['BUSINESS', 'TABLE'] as const).map((choice) => (
              <button
                key={choice}
                type="button"
                onClick={() => setScope(choice)}
                className={`flex-1 rounded-ledger border px-3 py-2 text-sm font-medium transition-colors ${
                  scope === choice ? 'border-stamp bg-stamp-soft text-stamp' : 'border-paper-line text-ink-soft'
                }`}
              >
                {choice === 'BUSINESS' ? 'Whole business' : 'One table'}
              </button>
            ))}
          </div>
          {scope === 'TABLE' && (
            <>
              <Select label="Table" value={tableId} onChange={(event) => setTableId(event.target.value)} required>
                <option value="">Choose a table…</option>
                {ownTables.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </Select>
              <p className="text-xs text-ink-soft">They see only this table and its rows (not the Cash book, other tables or your bank details). Columns that look up or add up other tables show their results.</p>
            </>
          )}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPermission('VIEW')}
              className={`flex-1 rounded-ledger border px-3 py-2 text-sm font-medium transition-colors ${
                permission === 'VIEW' ? 'border-stamp bg-stamp-soft text-stamp' : 'border-paper-line text-ink-soft'
              }`}
            >
              View only
            </button>
            <button
              type="button"
              onClick={() => setPermission('EDIT')}
              className={`flex-1 rounded-ledger border px-3 py-2 text-sm font-medium transition-colors ${
                permission === 'EDIT' ? 'border-stamp bg-stamp-soft text-stamp' : 'border-paper-line text-ink-soft'
              }`}
            >
              Can edit
            </button>
          </div>

          <TextField
            label="Access expires"
            type="date"
            required
            min={tomorrow()}
            value={expiresAt}
            onChange={(event) => setExpiresAt(event.target.value)}
          />

          {error && <p className="text-sm text-rust">{error}</p>}
          <Button type="submit" disabled={createGrant.isPending}>
            {createGrant.isPending ? 'Granting…' : 'Grant access'}
          </Button>
        </form>
      )}

      {isLoading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
      ) : grantList.length === 0 && !showForm ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Nobody else has access yet.</p>
      ) : (
        grantList.map((grant) => (
          <div key={grant.id} className="border-b border-paper-edge px-5 py-3.5 last:border-b-0">
            <div className="mb-1 flex items-center justify-between text-[14.5px] font-medium">
              <span>
                {grant.grantee.name}
                {grant.tableName && <span className="ml-2 rounded-full bg-paper-edge px-2 py-0.5 text-[11.5px] font-medium text-ink-soft">Table: {grant.tableName}</span>}
              </span>
              <span className={`rounded-full px-2.5 py-0.5 text-[11.5px] font-medium ${STATUS_STYLES[grant.status]}`}>
                {grant.status}
              </span>
            </div>
            <div className="flex items-center justify-between text-[12.5px] text-ink-soft">
              <span>
                {grant.permission === 'EDIT' ? 'Can edit' : 'View only'} · expires {formatShortDate(grant.expiresAt)}
                {grant.status === 'active' && ` (${Math.max(daysUntil(grant.expiresAt), 0)}d)`}
              </span>
              {grant.status === 'active' && (
                <button
                  onClick={() => setPendingRevokeId(grant.id)}
                  className="text-ink-soft transition-colors hover:text-rust"
                >
                  Revoke
                </button>
              )}
            </div>
          </div>
        ))
      )}

      {pendingRevokeId && (
        <ConfirmDialog
          title="Revoke this access?"
          body="They'll lose access immediately."
          confirmLabel="Revoke"
          isPending={revokeGrant.isPending}
          onConfirm={confirmRevoke}
          onCancel={() => setPendingRevokeId(null)}
        />
      )}
    </Panel>
  )
}
