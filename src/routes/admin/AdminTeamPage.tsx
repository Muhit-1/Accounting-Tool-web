import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Avatar, Card, DataTable, ErrorLine, Loading, Note, PageHeader, RolePill, StatusPill } from '../../components/admin/ui'
import { Button } from '../../components/Button'
import { Modal } from '../../components/Modal'
import { TextField } from '../../components/TextField'
import { useCreateAdmin, useRemoveAdmin, useTeam } from '../../lib/admin'
import { timeAgo, whyNotAllowed } from '../../lib/admin-format'
import { useAuth } from '../../lib/auth-context'
import { useToast } from '../../lib/toast-context'
import type { TeamMember, UserRole } from '../../types/admin'

const SUPER_ONLY = whyNotAllowed('ADMIN', 'ADMIN') ?? ''

export function AdminTeamPage() {
  const { user } = useAuth()
  const { data, isLoading, error } = useTeam()
  const [adding, setAdding] = useState(false)
  const [removing, setRemoving] = useState<TeamMember | null>(null)
  const isSuper = (user?.role as UserRole | undefined) === 'SUPER_ADMIN'

  if (isLoading) return <Loading />
  if (error || !data) return <ErrorLine error={error} />

  return (
    <div>
      <PageHeader title="Team">
        <Button type="button" disabled={!isSuper} title={isSuper ? undefined : SUPER_ONLY} onClick={() => setAdding(true)}>+ Add admin</Button>
      </PageHeader>
      {!isSuper && <div className="mb-3.5"><Note tone="warn">You are an admin. You can see the team. Only a super admin can add or remove admins.</Note></div>}
      <p className="mb-3 text-sm text-ink-soft">Admins can do everything in this panel except change other admins. Super admins are made from the server terminal only.</p>
      <DataTable fill={false} head={<><th>Person</th><th>Role</th><th>Status</th><th className="hidden md:table-cell">Last seen</th><th /></>}>
        {data.map((m) => (
          <tr key={m.id}>
            <td>
              <div className="flex items-center gap-2.5">
                <Avatar name={m.name} />
                <div className="min-w-0">
                  <Link to={`/admin/users/${m.id}`} className="block truncate font-bold hover:underline">{m.name}</Link>
                  <div className="truncate text-[12.5px] text-ink-soft">{m.email}</div>
                </div>
              </div>
            </td>
            <td><RolePill role={m.role} /></td>
            <td><StatusPill status={m.status} /></td>
            <td className="hidden md:table-cell">{timeAgo(m.lastSeenAt)}</td>
            <td className="text-right">
              {m.role === 'SUPER_ADMIN' ? (
                <span className="text-[12.5px] text-ink-soft">Terminal only</span>
              ) : (
                <button
                  type="button"
                  disabled={!isSuper}
                  title={isSuper ? undefined : SUPER_ONLY}
                  onClick={() => setRemoving(m)}
                  className="rounded-ledger border border-rust-soft bg-white px-2.5 py-1 text-[12.5px] font-semibold text-rust hover:bg-err disabled:cursor-not-allowed disabled:opacity-45"
                >
                  Remove admin
                </button>
              )}
            </td>
          </tr>
        ))}
      </DataTable>
      <Card className="mt-3.5 px-[18px] py-4">
        <h2 className="mb-1.5 font-display text-[16px] font-bold">Making a super admin</h2>
        <p className="text-[12.5px] text-ink-soft2">On the server terminal (Coolify, API container):</p>
        <pre className="tabular mt-2 overflow-auto rounded-ledger bg-ink px-3.5 py-3 text-[12.5px] text-white/90">node dist/cli/superadmin.js promote --email you@example.com</pre>
      </Card>
      {adding && <AddAdminDialog onClose={() => setAdding(false)} />}
      {removing && <RemoveAdminDialog member={removing} onClose={() => setRemoving(null)} />}
    </div>
  )
}

function AddAdminDialog({ onClose }: { onClose: () => void }) {
  const create = useCreateAdmin()
  const toast = useToast()
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  return (
    <Modal title="Add an admin" onClose={onClose}>
      <p className="text-sm text-ink-soft2">They can do everything here except change other admins. If this address has not signed in yet, they become an admin when they first sign in with Google.</p>
      <TextField label="Email" type="email" value={email} maxLength={254} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" />
      {error && <p role="alert" className="text-sm text-rust">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button
          type="button"
          disabled={!valid || create.isPending}
          onClick={() =>
            create.mutate(email.trim(), {
              onSuccess: (r) => { toast(r.invited ? 'Invited. They become admin when they sign in with Google.' : 'Admin added.'); onClose() },
              onError: (e) => setError(e instanceof Error ? e.message : 'Could not add.'),
            })
          }
        >
          Add admin
        </Button>
      </div>
    </Modal>
  )
}

function RemoveAdminDialog({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const remove = useRemoveAdmin()
  const toast = useToast()
  const [error, setError] = useState<string | null>(null)
  return (
    <Modal title={`Remove ${member.name} as admin?`} onClose={onClose}>
      <p className="text-sm text-ink-soft2">They keep their account and books, and lose the admin panel. Requests assigned to them go back to the inbox.</p>
      {error && <p role="alert" className="text-sm text-rust">{error}</p>}
      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
        <Button type="button" variant="danger" disabled={remove.isPending} onClick={() => remove.mutate(member.id, { onSuccess: () => { toast('Admin role removed.'); onClose() }, onError: (e) => setError(e instanceof Error ? e.message : 'Could not remove.') })}>
          Remove admin
        </Button>
      </div>
    </Modal>
  )
}
