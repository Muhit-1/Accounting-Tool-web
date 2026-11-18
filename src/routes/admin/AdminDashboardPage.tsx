import { Link } from 'react-router-dom'
import { activityDetail, activityLabel, formatCount, formatDuration, ticketRef, timeAgo, waitingFor } from '../../lib/admin-format'
import { useAdminActivity, useAdminOverview, useAdminSeries, useSystemStatus } from '../../lib/admin'
import { Avatar, BarChart, Card, ErrorLine, Kpi, Loading, PageHeader, Pill } from '../../components/admin/ui'

export function AdminDashboardPage() {
  const { data: o, isLoading, error } = useAdminOverview()
  const { data: series } = useAdminSeries(30)
  const { data: feed } = useAdminActivity({})
  const { data: system } = useSystemStatus()

  if (isLoading) return <Loading />
  if (error || !o) return <ErrorLine error={error} />
  const latest = feed?.pages[0]?.items.slice(0, 5) ?? []
  const web = o.people.bySignupPlatform.web ?? 0
  const app = o.people.bySignupPlatform.app ?? 0
  const known = Math.max(web + app, 1)

  return (
    <div className="stagger">
      <PageHeader title="Dashboard" />
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="People" value={formatCount(o.people.total)} hint={`+${o.people.new7} this week · +${o.people.new30} in 30 days`} />
        <Kpi label="Active now" value={o.people.activeNow} hint="last 5 minutes" />
        <Kpi label="Active this week" value={formatCount(o.people.wau)} hint={`${formatCount(o.people.dau)} today · ${formatCount(o.people.mau)} this month`} />
        <Kpi label="Support" value={`${o.support.open} open`} hint={`${o.support.urgent} urgent · ${o.support.unassigned} not taken`} />
      </div>
      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi label="Businesses" value={formatCount(o.content.businesses)} hint={`${formatCount(o.content.tables)} tables`} />
        <Kpi label="Entries" value={formatCount(o.content.entries)} hint={`${formatCount(o.content.invoices)} invoices`} />
        <Kpi label="Shared with others" value={formatCount(o.content.activeShares)} hint="active shares" />
        <Kpi label="Deactivated" value={o.people.disabled} hint={`${o.people.invited} invited, not signed in yet`} />
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-2">
        <Card lift className="px-5 py-5">
          <div className="mb-2 flex items-center">
            <h2 className="font-display text-[16px] font-bold">New people per day</h2>
            <span className="ml-auto text-[12.5px] text-ink-soft">last 30 days</span>
          </div>
          {series ? <BarChart values={series.signups.map((s) => s.count)} labels={series.signups.map((s) => s.day)} /> : <Loading />}
        </Card>
        <Card lift className="px-5 py-5">
          <div className="mb-2 flex items-center">
            <h2 className="font-display text-[16px] font-bold">Active minutes per day</h2>
            <span className="ml-auto text-[12.5px] text-ink-soft">estimate · all people</span>
          </div>
          {series ? <BarChart tone="green" unit="min" values={series.activity.map((s) => s.activeMinutes)} labels={series.activity.map((s) => s.day)} /> : <Loading />}
        </Card>
      </div>

      <div className="mb-4 grid gap-4 lg:grid-cols-3">
        <Card lift className="px-5 py-5">
          <h2 className="mb-1.5 font-display text-[16px] font-bold">Most active (30 days)</h2>
          {o.usage.topByTime30d.length === 0 && <p className="py-3 text-sm text-ink-soft">Nothing measured yet.</p>}
          {o.usage.topByTime30d.slice(0, 5).map((p) => (
            <PersonLine key={p.id} id={p.id} name={p.name} value={formatDuration(p.activeSeconds)} />
          ))}
        </Card>
        <Card lift className="px-5 py-5">
          <h2 className="mb-1.5 font-display text-[16px] font-bold">Tables opened (all time)</h2>
          {o.usage.topByTableOpens.length === 0 && <p className="py-3 text-sm text-ink-soft">Nothing counted yet.</p>}
          {o.usage.topByTableOpens.slice(0, 5).map((p) => (
            <PersonLine key={p.id} id={p.id} name={p.name} value={formatCount(p.opens)} />
          ))}
        </Card>
        <Card lift className="px-5 py-5">
          <h2 className="mb-2.5 font-display text-[16px] font-bold">Where people sign up</h2>
          <div className="flex h-2.5 overflow-hidden rounded-full bg-paper-edge" role="img" aria-label={`Web ${web}, phone app ${app}`}>
            <i className="block bg-stamp" style={{ width: `${(web / known) * 100}%` }} />
            <i className="block bg-green" style={{ width: `${(app / known) * 100}%` }} />
          </div>
          <div className="mt-2 flex flex-wrap gap-4 text-[12px] text-ink-soft2">
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-stamp align-[-1px]" />Web {web}</span>
            <span><i className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px] bg-green align-[-1px]" />Phone app {app}</span>
          </div>
          <h2 className="mt-5 mb-2 font-display text-[16px] font-bold">Support</h2>
          <dl className="grid grid-cols-[96px_1fr] gap-x-2.5 gap-y-1.5 text-[13px]">
            <dt className="text-ink-soft">Oldest open</dt>
            <dd>{o.support.oldestOpen ? `${ticketRef(o.support.oldestOpen.number)} · ${waitingFor(o.support.oldestOpen.since)}` : 'None'}</dd>
            <dt className="text-ink-soft">First answer</dt>
            <dd>{o.support.avgFirstResponseMinutes30d === null ? '—' : `${o.support.avgFirstResponseMinutes30d} min on average`}</dd>
            <dt className="text-ink-soft">Not taken</dt>
            <dd>{o.support.unassigned} requests</dd>
          </dl>
          <Link to="/admin/support" className="mt-3 inline-block rounded-ledger border border-paper-line px-3 py-1.5 text-[12.5px] font-semibold hover:bg-paper">Open inbox →</Link>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card lift className="px-5 py-5">
          <div className="mb-1 flex items-center">
            <h2 className="font-display text-[16px] font-bold">Latest activity</h2>
            <Link to="/admin/activity" className="ml-auto text-[12.5px] text-ink-soft">All</Link>
          </div>
          {latest.length === 0 && <p className="py-3 text-sm text-ink-soft">Nothing yet.</p>}
          {latest.map((e) => (
            <div key={e.id} className="flex items-center gap-2.5 border-b border-paper-edge py-2 text-[13.5px] last:border-b-0">
              <span className="w-[116px] flex-none"><Pill tone={e.type === 'auth.login_failed' ? 'rust' : e.type === 'auth.signup' ? 'green' : e.type === 'ticket.create' ? 'blue' : 'grey'}>{activityLabel(e.type)}</Pill></span>
              <span className="min-w-0 flex-1 truncate"><b>{e.userName ?? e.userEmail ?? 'Someone'}</b> <span className="text-ink-soft">{activityDetail(e)}</span></span>
              <span className="flex-none text-[12.5px] text-ink-soft">{timeAgo(e.createdAt)}</span>
            </div>
          ))}
        </Card>
        <Card lift className="px-5 py-5">
          <div className="mb-1 flex items-center">
            <h2 className="font-display text-[16px] font-bold">Health</h2>
            <Link to="/admin/system" className="ml-auto text-[12.5px] text-ink-soft">Details</Link>
          </div>
          <HealthLine ok={system?.db.ok ?? null} label="Server and database" value={system ? `${system.db.latencyMs} ms` : '…'} />
          <HealthLine ok={system ? true : null} label="Files" value={system ? (system.storage === 'google_drive' ? 'Google Drive' : 'Server disk') : '…'} />
          <HealthLine ok={system ? system.migrationsApplied !== null : null} label="Updates (migrations)" value={system?.migrationsApplied == null ? '…' : `${system.migrationsApplied} applied`} />
        </Card>
      </div>
    </div>
  )
}

function PersonLine({ id, name, value }: { id: string; name: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-paper-edge py-2 text-[13.5px] last:border-b-0">
      <Avatar name={name} />
      <Link to={`/admin/users/${id}`} className="min-w-0 flex-1 truncate font-bold hover:underline">{name}</Link>
      <span className="tabular">{value}</span>
    </div>
  )
}

function HealthLine({ ok, label, value }: { ok: boolean | null; label: string; value: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-paper-edge py-2 text-[13.5px] last:border-b-0">
      <span className={`h-2 w-2 flex-none rounded-full ${ok === null ? 'bg-paper-line' : ok ? 'bg-green' : 'bg-rust'}`} />
      <span className="flex-1">{label}</span>
      <span className="text-ink-soft">{value}</span>
    </div>
  )
}
