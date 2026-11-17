import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { Avatar, BarChart, Card, ErrorLine, Kpi, Loading, Note, PageHeader, RolePill, StatusPill, TicketStatusPill, Pill } from '../../components/admin/ui'
import { DeleteDialog, DisableDialog, EnableDialog, LogoutDialog, type TargetPerson } from '../../components/admin/UserDialogs'
import { useAuth } from '../../lib/auth-context'
import { useAdminUser, useEndSession } from '../../lib/admin'
import { activityDetail, activityLabel, formatCount, formatDuration, ticketRef, timeAgo, whyNotAllowed } from '../../lib/admin-format'
import { useToast } from '../../lib/toast-context'
import type { UserRole } from '../../types/admin'

type Dialog = 'disable' | 'enable' | 'logout' | 'delete' | null

export function AdminUserPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { user: me } = useAuth()
  const toast = useToast()
  const { data, isLoading, error } = useAdminUser(id)
  const endSession = useEndSession()
  const [dialog, setDialog] = useState<Dialog>(null)
  // the chart's thirty days end today; read once so the page does not shift while it is open
  const [now] = useState(() => Date.now())

  if (isLoading) return <Loading />
  if (error || !data) return <ErrorLine error={error ?? new Error('Person not found.')} />

  const { user: u, counts } = data
  const viewer = (me?.role ?? 'USER') as UserRole
  const blocked = whyNotAllowed(viewer, u.role)
  const target: TargetPerson = { id: u.id, name: u.name, email: u.email, disabled: u.status === 'disabled' }
  const byDay = new Map<string, number>()
  for (const row of data.usage) byDay.set(row.day, (byDay.get(row.day) ?? 0) + Math.round(row.activeSeconds / 60))
  const days = Array.from({ length: 30 }, (_, i) => new Date(now - (29 - i) * 86_400_000).toISOString().slice(0, 10))
  const minutes = days.map((d) => byDay.get(d) ?? 0)
  const seconds30 = data.usage.reduce((sum, r) => sum + r.activeSeconds, 0)

  const action = (label: string, which: Dialog, danger = false) => (
    <button
      type="button"
      disabled={Boolean(blocked)}
      title={blocked ?? undefined}
      onClick={() => setDialog(which)}
      className={`rounded-ledger border px-3.5 py-2 text-[13.5px] font-semibold whitespace-nowrap disabled:cursor-not-allowed disabled:opacity-45 ${danger ? 'border-rust-soft bg-white text-rust hover:bg-err' : 'border-paper-line bg-white hover:bg-paper'}`}
    >
      {label}
    </button>
  )

  return (
    <div>
      <PageHeader title={<><Link to="/admin/users" className="text-[15px] font-semibold text-ink-soft">People</Link> <span className="text-ink-soft">/</span> {u.name}</>} />
      {u.status === 'disabled' && (
        <div className="mb-3.5">
          <Note tone="bad">
            <b>Deactivated</b>{u.disabledAt ? ` ${timeAgo(u.disabledAt)}` : ''}{u.disabledBy ? ` by ${u.disabledBy}` : ''}. Reason: {u.disabledReason ?? '—'}. Their data is kept. They cannot sign in, and their phones get no notifications.
          </Note>
        </div>
      )}
      {u.status === 'invited' && (
        <div className="mb-3.5">
          <Note><b>Invited.</b> This address becomes an {u.role === 'SUPER_ADMIN' ? 'super admin' : 'admin'} when the person signs in with Google for the first time.</Note>
        </div>
      )}

      <Card className="mb-3.5 px-[18px] py-4">
        <div className="flex flex-wrap items-center gap-3.5">
          <Avatar name={u.name} size={56} />
          <div className="min-w-0">
            <h2 className="font-display text-xl font-extrabold">{u.name}</h2>
            <div className="text-ink-soft">{u.email}</div>
            <div className="mt-1.5 flex flex-wrap items-center gap-2">
              <RolePill role={u.role} />
              <StatusPill status={u.status} />
              <span className="text-[12.5px] text-ink-soft">Joined {timeAgo(u.createdAt)} · last seen {timeAgo(u.lastSeenAt)}</span>
            </div>
          </div>
          <div className="flex-1" />
          <div className="flex flex-wrap gap-2">
            {u.status === 'disabled' ? action('Activate', 'enable') : action('Deactivate', 'disable')}
            {action('Sign out everywhere', 'logout')}
            {action('Delete…', 'delete', true)}
          </div>
        </div>
        {blocked && <div className="mt-3"><Note tone="warn">{blocked}</Note></div>}
      </Card>

      <div className="mb-3.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="Businesses" value={counts.businesses} />
        <Kpi label="Tables" value={counts.tables} />
        <Kpi label="Entries · invoices" value={`${formatCount(counts.entries)} · ${counts.invoices}`} />
        <Kpi label="Active time (30 d)" value={formatDuration(seconds30)} hint="estimate from their requests" />
      </div>

      <div className="mb-3.5 grid gap-3.5 lg:grid-cols-2">
        <Card className="px-[18px] py-4">
          <div className="mb-2 flex items-center"><h2 className="font-display text-[16px] font-bold">Active minutes per day</h2><span className="ml-auto text-[12.5px] text-ink-soft">web and app</span></div>
          <BarChart tone="green" unit="min" values={minutes} labels={days} />
        </Card>
        <Card className="px-[18px] py-4">
          <h2 className="font-display text-[16px] font-bold">Tables opened</h2>
          <p className="mb-1.5 text-[12.5px] text-ink-soft">Names only. What is inside a table is never shown here.</p>
          {data.tablesOpened.length === 0 && <p className="py-3 text-sm text-ink-soft">None yet.</p>}
          {data.tablesOpened.slice(0, 8).map((t) => (
            <div key={t.tableId} className="flex items-center gap-2.5 border-b border-paper-edge py-2 text-[13.5px] last:border-b-0">
              <span className="min-w-0 flex-1 truncate"><b>{t.table}</b> <span className="text-ink-soft">· {t.business}</span></span>
              <span className="tabular">{t.openCount}×</span>
              <span className="w-[84px] flex-none text-right text-[12.5px] text-ink-soft">{timeAgo(t.lastOpenedAt)}</span>
            </div>
          ))}
        </Card>
      </div>

      <div className="mb-3.5 grid gap-3.5 lg:grid-cols-2">
        <Card className="px-[18px] py-4">
          <h2 className="mb-1.5 font-display text-[16px] font-bold">Businesses</h2>
          {data.businesses.length === 0 && <p className="py-3 text-sm text-ink-soft">No business.</p>}
          {data.businesses.map((b) => (
            <div key={b.id} className="flex items-center gap-2.5 border-b border-paper-edge py-2 text-[13.5px] last:border-b-0">
              <span className="flex-1 font-bold">{b.name}</span>
              <span className="text-ink-soft">{b.currency} · {b.tables} tables</span>
            </div>
          ))}
        </Card>
        <Card className="px-[18px] py-4">
          <h2 className="mb-1.5 font-display text-[16px] font-bold">Devices signed in</h2>
          {data.sessions.length === 0 && <p className="py-3 text-sm text-ink-soft">None.</p>}
          {data.sessions.map((s) => (
            <div key={s.id} className="flex items-center gap-2.5 border-b border-paper-edge py-2 text-[13.5px] last:border-b-0">
              <span className="min-w-0 flex-1">
                <b>{s.deviceName || 'Phone'}</b> <span className="text-ink-soft">· {s.platform ?? 'app'}</span>
                <span className="block text-[12.5px] text-ink-soft">signed in {timeAgo(s.createdAt)}{s.lastUsedAt ? ` · used ${timeAgo(s.lastUsedAt)}` : ''}</span>
              </span>
              <button
                type="button"
                disabled={Boolean(blocked) || endSession.isPending}
                title={blocked ?? undefined}
                onClick={() => endSession.mutate({ userId: u.id, sessionId: s.id }, { onSuccess: () => toast('Device signed out.') })}
                className="rounded-ledger border border-paper-line px-2.5 py-1 text-[12.5px] font-semibold hover:bg-paper disabled:cursor-not-allowed disabled:opacity-45"
              >
                End
              </button>
            </div>
          ))}
        </Card>
      </div>

      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card className="px-[18px] py-4">
          <h2 className="mb-1.5 font-display text-[16px] font-bold">Recent activity</h2>
          {data.activity.length === 0 && <p className="py-3 text-sm text-ink-soft">Nothing yet.</p>}
          {data.activity.slice(0, 8).map((a) => (
            <div key={a.id} className="flex items-center gap-2.5 border-b border-paper-edge py-2 text-[13.5px] last:border-b-0">
              <Pill tone={a.type === 'auth.login_failed' ? 'rust' : 'grey'}>{activityLabel(a.type)}</Pill>
              <span className="min-w-0 flex-1 truncate text-ink-soft">{activityDetail(a)}</span>
              <span className="flex-none text-[12.5px] text-ink-soft">{timeAgo(a.createdAt)}</span>
            </div>
          ))}
        </Card>
        <Card className="px-[18px] py-4">
          <h2 className="mb-1.5 font-display text-[16px] font-bold">Support requests</h2>
          {data.tickets.length === 0 && <p className="py-3 text-sm text-ink-soft">None.</p>}
          {data.tickets.map((t) => (
            <Link key={t.id} to={`/admin/support/${t.id}`} className="flex items-center gap-2.5 border-b border-paper-edge py-2 text-[13.5px] last:border-b-0">
              <b className="tabular">{ticketRef(t.number)}</b>
              <span className="min-w-0 flex-1 truncate">{t.subject}</span>
              <TicketStatusPill status={t.status} />
            </Link>
          ))}
        </Card>
      </div>

      {dialog === 'disable' && <DisableDialog person={target} onClose={() => setDialog(null)} />}
      {dialog === 'enable' && <EnableDialog person={target} onClose={() => setDialog(null)} />}
      {dialog === 'logout' && <LogoutDialog person={target} onClose={() => setDialog(null)} />}
      {dialog === 'delete' && <DeleteDialog person={target} onClose={() => setDialog(null)} onDeleted={() => navigate('/admin/users', { replace: true })} />}
    </div>
  )
}
