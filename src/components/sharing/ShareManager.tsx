import { useState, type FormEvent } from 'react'
import { useAccessGrants, useCreateAccessGrant, useRevokeAccessGrant, useUpdateAccessGrant } from '../../lib/access-grants'
import { ApiError } from '../../lib/api-client'
import { useAuth } from '../../lib/auth-context'
import { dayOf, defaultEndDay, endOfDay, grantSummary, tomorrowDay, visibleGrants, type GrantRow } from '../../lib/sharing'
import { useTables } from '../../lib/tables'
import { useToast } from '../../lib/toast-context'
import type { AccessPermission } from '../../types/api'
import { Button } from '../Button'
import { ConfirmDialog } from '../ConfirmDialog'

const initial = (name: string) => (name.trim()[0] ?? '?').toUpperCase()
const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

// Sharing, like in a spreadsheet: add a person, then change Can view / Can edit and the end date right in the list.
// A person can be given the whole business or one table.
export function ShareManager({ businessId, ownerName, ownerEmail }: { businessId: string; ownerName?: string; ownerEmail?: string }) {
  const { user } = useAuth()
  const toast = useToast()
  const { data: grants, isLoading } = useAccessGrants(businessId)
  const { data: tables } = useTables(businessId)
  const create = useCreateAccessGrant(businessId)
  const update = useUpdateAccessGrant(businessId)
  const revoke = useRevokeAccessGrant(businessId)

  const [email, setEmail] = useState('')
  const [scope, setScope] = useState<string>('BUSINESS') // 'BUSINESS' or a table id
  const [permission, setPermission] = useState<AccessPermission>('VIEW')
  const [until, setUntil] = useState(defaultEndDay())
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<GrantRow | null>(null)
  const ownTables = (tables ?? []).filter((t) => t.kind === 'TABLE')
  const list = visibleGrants((grants ?? []) as GrantRow[])

  async function add(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await create.mutateAsync({
        granteeEmail: email.trim(),
        ...(scope === 'BUSINESS' ? { scope: 'BUSINESS' as const } : { scope: 'TABLE' as const, tableId: scope }),
        permission,
        expiresAt: endOfDay(until),
      })
      toast(`Shared with ${email.trim()}.`)
      setEmail('')
    } catch (err) {
      setError(messageOf(err))
    }
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={add} className="flex flex-col gap-3">
        <label className="flex flex-col gap-1.5">
          <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">Add a person by their Google email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="name@example.com"
            className="h-11 rounded-ledger border border-paper-line bg-white px-3.5 text-[14.5px] focus:border-stamp focus:outline-none"
          />
        </label>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">Gets</span>
            <select value={scope} onChange={(event) => setScope(event.target.value)} className="h-10 rounded-ledger border border-paper-line bg-white px-2.5 text-[13.5px]">
              <option value="BUSINESS">The whole business</option>
              {ownTables.map((t) => (
                <option key={t.id} value={t.id}>
                  Only {t.name}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">Can</span>
            <select value={permission} onChange={(event) => setPermission(event.target.value as AccessPermission)} className="h-10 rounded-ledger border border-paper-line bg-white px-2.5 text-[13.5px]">
              <option value="VIEW">View</option>
              <option value="EDIT">Edit</option>
            </select>
          </label>
          <label className="col-span-2 flex flex-col gap-1 sm:col-span-1">
            <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">Until</span>
            <input type="date" required min={tomorrowDay()} value={until} onChange={(event) => setUntil(event.target.value)} className="h-10 rounded-ledger border border-paper-line bg-white px-2.5 text-[13.5px]" />
          </label>
        </div>
        {scope !== 'BUSINESS' && <p className="text-[12.5px] text-ink-soft">They see only this table and its rows. Not the Cash book, other tables or your bank details.</p>}
        {error && (
          <p role="alert" className="text-[13px] text-rust">
            {error}
          </p>
        )}
        <div>
          <Button type="submit" disabled={create.isPending || email.trim() === ''}>
            {create.isPending ? 'Sharing…' : 'Share'}
          </Button>
        </div>
      </form>

      <div>
        <h3 className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">People with access</h3>
        <ul className="flex flex-col">
          <li className="flex items-center gap-3 border-b border-paper-edge py-2.5">
            <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-stamp-soft text-[14px] font-bold text-stamp">{initial(ownerName ?? user?.name ?? '?')}</span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[14px] font-semibold">
                {ownerName ?? user?.name} <span className="font-normal text-ink-soft">(you)</span>
              </span>
              <span className="block truncate text-[12.5px] text-ink-soft">{ownerEmail ?? user?.email}</span>
            </span>
            <span className="text-[13px] text-ink-soft">Owner</span>
          </li>
          {isLoading && <li className="py-3 text-[13px] text-ink-soft">Loading…</li>}
          {!isLoading && list.length === 0 && <li className="py-3 text-[13px] text-ink-soft">Nobody else has access yet.</li>}
          {list.map((g) => (
            <li key={g.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 border-b border-paper-edge py-2.5 last:border-b-0">
              <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-paper text-[14px] font-bold text-ink-soft">{initial(g.grantee.name)}</span>
              <span className="min-w-0 flex-1 basis-40">
                <span className="block truncate text-[14px] font-semibold">{g.grantee.name}</span>
                <span className={`block truncate text-[12.5px] ${g.status === 'expired' ? 'text-rust' : 'text-ink-soft'}`}>
                  {g.grantee.email} · {grantSummary(g)}
                </span>
              </span>
              {g.status === 'active' && (
                <>
                  <select
                    aria-label={`What ${g.grantee.name} can do`}
                    value={g.permission}
                    onChange={(event) => void update.mutateAsync({ id: g.id, permission: event.target.value as AccessPermission }).catch((err) => toast(messageOf(err)))}
                    className="h-9 rounded-ledger border border-paper-line bg-white px-2 text-[13px]"
                  >
                    <option value="VIEW">Can view</option>
                    <option value="EDIT">Can edit</option>
                  </select>
                  <input
                    type="date"
                    aria-label={`When ${g.grantee.name}'s access ends`}
                    min={tomorrowDay()}
                    defaultValue={dayOf(g.expiresAt)}
                    onBlur={(event) => {
                      const day = event.target.value
                      if (day && day !== dayOf(g.expiresAt)) void update.mutateAsync({ id: g.id, expiresAt: endOfDay(day) }).catch((err) => toast(messageOf(err)))
                    }}
                    className="h-9 rounded-ledger border border-paper-line bg-white px-2 text-[13px]"
                  />
                </>
              )}
              <button type="button" onClick={() => setRemoving(g)} className="text-[13px] font-medium text-ink-soft hover:text-rust">
                {g.status === 'active' ? 'Remove' : 'Clear'}
              </button>
            </li>
          ))}
        </ul>
      </div>

      {removing && (
        <ConfirmDialog
          title={`Stop sharing with ${removing.grantee.name}?`}
          body="They lose access at once. You can share again later."
          confirmLabel="Stop sharing"
          onCancel={() => setRemoving(null)}
          onConfirm={() => {
            const target = removing
            setRemoving(null)
            void revoke.mutateAsync(target.id).then(() => toast('Sharing stopped.')).catch((err) => toast(messageOf(err)))
          }}
        />
      )}
    </div>
  )
}
