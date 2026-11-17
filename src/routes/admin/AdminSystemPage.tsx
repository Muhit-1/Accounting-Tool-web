import type { ReactNode } from 'react'
import { Card, ErrorLine, Loading, PageHeader, Pill } from '../../components/admin/ui'
import { useSystemStatus } from '../../lib/admin'

function uptime(seconds: number): string {
  const d = Math.floor(seconds / 86_400)
  const h = Math.floor((seconds % 86_400) / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  return d > 0 ? `${d} d ${h} h` : h > 0 ? `${h} h ${m} min` : `${m} min`
}

function StatusCard({ label, ok, value, hint }: { label: string; ok: boolean; value: string; hint: string }) {
  return (
    <Card className="px-4 py-3.5">
      <div className="text-[11.5px] font-semibold tracking-wider text-ink-soft uppercase">{label}</div>
      <div className="mt-0.5 flex items-center gap-2 text-xl font-extrabold">
        <span className={`h-2.5 w-2.5 rounded-full ${ok ? 'bg-green' : 'bg-rust'}`} />
        {value}
      </div>
      <div className="text-[12.5px] text-ink-soft2">{hint}</div>
    </Card>
  )
}

function Line({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center gap-2.5 border-b border-paper-edge py-2 text-[13.5px] last:border-b-0">
      <span className="flex-1">{label}</span>
      {children}
    </div>
  )
}

export function AdminSystemPage() {
  const { data: s, isLoading, error } = useSystemStatus()
  if (isLoading) return <Loading />
  if (error || !s) return <ErrorLine error={error} />
  return (
    <div>
      <PageHeader title="System" />
      <div className="mb-3.5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatusCard label="Server" ok value="Running" hint={`version ${s.version} · up ${uptime(s.uptimeSeconds)}`} />
        <StatusCard label="Database" ok={s.db.ok} value={s.db.ok ? 'Answers' : 'Not answering'} hint={`${s.db.latencyMs} ms · ${s.migrationsApplied ?? '?'} updates applied`} />
        <StatusCard label="Files" ok value={s.storage === 'google_drive' ? 'Google Drive' : 'Server disk'} hint={s.storage === 'google_drive' ? 'in each owner’s own Drive' : 'not in Google Drive'} />
        <StatusCard label="Notifications" ok={s.push} value={s.push ? 'On' : 'Off'} hint="Expo push" />
      </div>
      <div className="grid gap-3.5 lg:grid-cols-2">
        <Card className="px-[18px] py-4">
          <h2 className="mb-2 font-display text-[16px] font-bold">What is switched on</h2>
          <Line label="Google sign-in"><Pill tone={s.googleSignIn ? 'green' : 'rust'}>{s.googleSignIn ? 'on' : 'off'}</Pill></Line>
          <Line label="Admin address limit"><Pill>{s.adminIpAllowListOn ? 'on' : 'off'}</Pill></Line>
          <Line label="Environment"><span className="text-ink-soft">{s.environment}</span></Line>
          <Line label="Server software"><span className="text-ink-soft">Node {s.node}</span></Line>
        </Card>
        <Card className="px-[18px] py-4">
          <h2 className="mb-2 font-display text-[16px] font-bold">Housekeeping</h2>
          <Line label="Old activity removed"><span className="text-ink-soft">after 180 days</span></Line>
          <Line label="Old usage rows removed"><span className="text-ink-soft">after about 13 months</span></Line>
          <Line label="Waiting requests closed"><span className="text-ink-soft">after 14 days</span></Line>
        </Card>
      </div>
    </div>
  )
}
