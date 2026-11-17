import { useState } from 'react'
import { Banner } from '../../components/Banner'
import { Button } from '../../components/Button'
import { Card, ErrorLine, inputClass, Loading, Note, PageHeader } from '../../components/admin/ui'
import { useAdminSettings, useUpdateSettings, type SettingsPatch } from '../../lib/admin'
import { useToast } from '../../lib/toast-context'
import type { AnnouncementLevel, PlatformSettings } from '../../types/admin'

export function AdminSettingsPage() {
  const { data, isLoading, error } = useAdminSettings()
  if (isLoading) return <Loading />
  if (error || !data) return <ErrorLine error={error} />
  return <SettingsForms settings={data} />
}

function useSave() {
  const update = useUpdateSettings()
  const toast = useToast()
  return {
    pending: update.isPending,
    save: (patch: SettingsPatch) => update.mutate(patch, { onSuccess: () => toast('Saved.'), onError: (e) => toast(e instanceof Error ? e.message : 'Could not save.') }),
  }
}

function SettingsForms({ settings }: { settings: PlatformSettings }) {
  return (
    <div>
      <PageHeader title="Settings" />
      <div className="grid items-start gap-3.5 lg:grid-cols-2">
        <SignupsCard settings={settings} />
        <MaintenanceCard settings={settings} />
        <BannerCard settings={settings} />
        <SupportEmailCard settings={settings} />
      </div>
      <p className="mt-3.5 text-[12.5px] text-ink-soft">Every change here is written to “What staff did”.</p>
    </div>
  )
}

function SignupsCard({ settings }: { settings: PlatformSettings }) {
  const { save, pending } = useSave()
  return (
    <Card className="px-[18px] py-4">
      <h2 className="mb-3 font-display text-[16px] font-bold">Sign-ups</h2>
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <b>Let new people sign up</b>
          <div className="text-[12.5px] text-ink-soft">Anyone with a Google account. When off, only people already here, or invited as admins, can sign in.</div>
        </div>
        <Switch on={settings.signupsEnabled} label="Let new people sign up" disabled={pending} onChange={(on) => save({ signupsEnabled: on })} />
      </div>
      {!settings.signupsEnabled && <div className="mt-2.5"><Note tone="warn">New people see: “New accounts are not being accepted right now.”</Note></div>}
    </Card>
  )
}

function MaintenanceCard({ settings }: { settings: PlatformSettings }) {
  const { save, pending } = useSave()
  const [text, setText] = useState(settings.maintenanceMessage ?? '')
  return (
    <Card className="px-[18px] py-4">
      <h2 className="mb-3 font-display text-[16px] font-bold">Maintenance message</h2>
      <label className="mb-1 block text-[12.5px] font-semibold text-ink-soft2" htmlFor="maint">Shown to everyone in the app and web (leave empty for none)</label>
      <input id="maint" type="text" className={`${inputClass} w-full`} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} placeholder="We are updating the server. Back at 10:00 Dhaka time." />
      <div className="mt-3 flex justify-end">
        <Button type="button" disabled={pending || text.trim() === (settings.maintenanceMessage ?? '')} onClick={() => save({ maintenanceMessage: text.trim() || null })}>Save</Button>
      </div>
    </Card>
  )
}

const LEVELS: AnnouncementLevel[] = ['info', 'warning', 'critical']

function BannerCard({ settings }: { settings: PlatformSettings }) {
  const { save, pending } = useSave()
  const a = settings.announcement
  const [on, setOn] = useState(Boolean(a))
  const [text, setText] = useState(a?.text ?? '')
  const [level, setLevel] = useState<AnnouncementLevel>(a?.level ?? 'info')
  const [until, setUntil] = useState(a?.until ? a.until.slice(0, 10) : '')
  const dirty = on !== Boolean(a) || (on && (text.trim() !== (a?.text ?? '') || level !== (a?.level ?? 'info') || until !== (a?.until ? a.until.slice(0, 10) : '')))
  return (
    <Card className="px-[18px] py-4">
      <h2 className="mb-3 font-display text-[16px] font-bold">Announcement banner</h2>
      <div className="mb-3 flex items-center gap-3"><b className="flex-1">Show a banner</b><Switch on={on} label="Show a banner" onChange={setOn} /></div>
      <label className="mb-1 block text-[12.5px] font-semibold text-ink-soft2" htmlFor="ann-text">Text</label>
      <input id="ann-text" type="text" className={`${inputClass} w-full`} value={text} maxLength={200} onChange={(e) => setText(e.target.value)} />
      <div className="mt-3 text-[12.5px] font-semibold text-ink-soft2">Kind</div>
      <div className="mt-1 flex gap-1.5">
        {LEVELS.map((l) => (
          <button key={l} type="button" onClick={() => setLevel(l)} className={`rounded-full border px-3.5 py-1 text-[13px] font-semibold ${level === l ? 'border-stamp bg-stamp text-white' : 'border-paper-line bg-white'}`}>
            {l[0].toUpperCase() + l.slice(1)}
          </button>
        ))}
      </div>
      <label className="mt-3 mb-1 block text-[12.5px] font-semibold text-ink-soft2" htmlFor="ann-until">Hide after (optional)</label>
      <input id="ann-until" type="date" className={inputClass} value={until} onChange={(e) => setUntil(e.target.value)} />
      <div className="mt-4 mb-1.5 text-[11.5px] font-semibold tracking-wider text-ink-soft uppercase">What people see</div>
      <div className="overflow-hidden rounded-ledger border border-paper-edge">{on && text.trim() ? <Banner level={level} text={text.trim()} /> : <p className="px-3 py-4 text-center text-sm text-ink-soft">No banner.</p>}</div>
      <div className="mt-3 flex justify-end">
        <Button
          type="button"
          disabled={pending || !dirty || (on && !text.trim())}
          onClick={() => save({ announcement: on ? { text: text.trim(), level, until: until ? new Date(`${until}T23:59:59Z`).toISOString() : null } : null })}
        >
          Save
        </Button>
      </div>
    </Card>
  )
}

function SupportEmailCard({ settings }: { settings: PlatformSettings }) {
  const { save, pending } = useSave()
  const [email, setEmail] = useState(settings.supportEmail ?? '')
  const valid = email.trim() === '' || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())
  return (
    <Card className="px-[18px] py-4">
      <h2 className="mb-3 font-display text-[16px] font-bold">Support address</h2>
      <label className="mb-1 block text-[12.5px] font-semibold text-ink-soft2" htmlFor="support-email">Shown to people who cannot sign in (a deactivated account)</label>
      <input id="support-email" type="email" className={`${inputClass} w-full`} value={email} maxLength={120} onChange={(e) => setEmail(e.target.value)} />
      <div className="mt-3 flex justify-end">
        <Button type="button" disabled={pending || !valid || email.trim() === (settings.supportEmail ?? '')} onClick={() => save({ supportEmail: email.trim() || null })}>Save</Button>
      </div>
    </Card>
  )
}

function Switch({ on, label, onChange, disabled }: { on: boolean; label: string; onChange: (on: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!on)}
      className={`relative h-[22px] w-10 flex-none rounded-full transition-colors disabled:opacity-60 ${on ? 'bg-green' : 'bg-paper-line'}`}
    >
      <span className={`absolute top-0.5 h-[18px] w-[18px] rounded-full bg-white transition-all ${on ? 'left-5' : 'left-0.5'}`} />
    </button>
  )
}
