import { useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api-client'
import { useCreatePartner, useDeletePartner, usePartners, useRenamePartner } from '../../lib/partners'
import { useToast } from '../../lib/toast-context'
import type { Partner } from '../../types/api'
import { Button } from '../Button'
import { IconTrash } from '../icons'
import { Panel } from '../Panel'
import { TextField } from '../TextField'

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

function PartnerRow({ businessId, partner }: { businessId: string; partner: Partner }) {
  const toast = useToast()
  const rename = useRenamePartner(businessId)
  const remove = useDeletePartner(businessId)
  const [name, setName] = useState(partner.name)

  async function save() {
    const clean = name.trim()
    if (clean === partner.name) return
    if (clean === '') {
      setName(partner.name)
      toast('A partner needs a name.')
      return
    }
    try {
      await rename.mutateAsync({ id: partner.id, name: clean })
      toast(partner.costCount > 0 ? 'Partner renamed on all costs.' : 'Saved.')
    } catch (err) {
      setName(partner.name)
      toast(messageOf(err))
    }
  }

  async function handleDelete() {
    try {
      await remove.mutateAsync(partner.id)
    } catch (err) {
      toast(messageOf(err))
    }
  }

  return (
    <li className="flex items-center gap-3 border-b border-paper-edge px-5 py-2.5 last:border-b-0">
      <input
        value={name}
        maxLength={60}
        aria-label="Partner name"
        onChange={(event) => setName(event.target.value)}
        onBlur={() => void save()}
        onKeyDown={(event) => event.key === 'Enter' && event.currentTarget.blur()}
        className="min-w-0 flex-1 rounded-ledger border border-transparent bg-transparent px-2 py-1.5 text-[14.5px] hover:border-paper-line focus:border-stamp focus:bg-white focus:outline-none"
      />
      {partner.costCount > 0 && <span className="flex-none text-xs text-ink-soft">{partner.costCount} {partner.costCount === 1 ? 'cost' : 'costs'}</span>}
      <button
        type="button"
        aria-label={`Remove ${partner.name}`}
        onClick={() => void handleDelete()}
        className="flex h-7 w-7 flex-none items-center justify-center rounded-[6px] text-ink-soft hover:bg-rust-soft hover:text-rust"
      >
        <IconTrash width={15} height={15} />
      </button>
    </li>
  )
}

// The people you can pick in "Paid by". A partner a cost still names cannot be removed.
export function PartnersPanel({ businessId }: { businessId: string }) {
  const toast = useToast()
  const { data: partners, isLoading } = usePartners(businessId)
  const create = useCreatePartner(businessId)
  const [name, setName] = useState('')

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    const clean = name.trim()
    if (clean === '') return
    try {
      await create.mutateAsync(clean)
      setName('')
    } catch (err) {
      toast(messageOf(err))
    }
  }

  return (
    <Panel title="Partners">
      <p className="px-5 pt-4 text-[13px] text-ink-soft">People you can pick in “Paid by”.</p>
      {isLoading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
      ) : (
        <ul>
          {(partners ?? []).map((partner) => (
            <PartnerRow key={`${partner.id}-${partner.name}`} businessId={businessId} partner={partner} />
          ))}
        </ul>
      )}
      <form className="flex items-end gap-3 px-5 py-4" onSubmit={handleAdd}>
        <div className="min-w-0 flex-1">
          <TextField label="Add a partner" name="partner" value={name} maxLength={60} autoComplete="off" onChange={(event) => setName(event.target.value)} />
        </div>
        <Button type="submit" disabled={create.isPending || name.trim() === ''}>
          Add
        </Button>
      </form>
    </Panel>
  )
}
