import { ArrowRightLeft, BookOpen, CalendarDays, FileText, LayoutDashboard, Network, Plus, Scale, Settings, Table2, Users } from 'lucide-react'
import type { ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useTables } from '../../lib/tables'
import { CASHBOOK_KEY, landingTableId } from '../../lib/workspace-landing'
import { SetupChecklist } from './SetupChecklist'

// One icon family for the whole outline (Lucide): same 1.75 stroke, same 17 px, so the column reads as one set.
type Icon = ComponentType<{ width?: number; height?: number; className?: string; strokeWidth?: number; 'aria-label'?: string }>

function Item({ to, label, icon: IconComponent, active, dot, onNavigate, children }: { to: string; label: string; icon?: Icon; active: boolean; dot?: string | null; onNavigate?: () => void; children?: React.ReactNode }) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`flex items-center gap-2.5 rounded-ledger px-2.5 py-[7px] text-[13px] transition-colors ${
        active ? 'bg-stamp-soft font-semibold text-stamp' : 'font-medium text-ink hover:bg-paper'
      }`}
    >
      {IconComponent && <IconComponent width={17} height={17} strokeWidth={1.75} className={`flex-none ${active ? '' : 'text-ink-soft'}`} />}
      {dot !== undefined && <span className="mx-[3px] h-2.5 w-2.5 flex-none rounded-full" style={{ background: dot ?? 'var(--color-stamp)' }} aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {children}
    </Link>
  )
}

function Heading({ children }: { children: string }) {
  return <div className="mt-4 mb-1 px-2.5 text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase first:mt-1">{children}</div>
}

// The left outline of a business: what a spreadsheet has no place for (money, reports, connections, sharing),
// plus a short list of the business's tables. The tables themselves are tabs at the bottom of the sheet.
export function Outline({ businessId, tableOnly, canManage, onNavigate }: { businessId: string; tableOnly: boolean; canManage: boolean; onNavigate?: () => void }) {
  const location = useLocation()
  const { data: tables } = useTables(businessId)
  const base = `/businesses/${businessId}`
  const path = location.pathname
  const tab = new URLSearchParams(location.search).get('tab')
  const inWorkspace = path.startsWith(`${base}/workspace`) || path.startsWith(`${base}/accounts`)
  const own = (tables ?? []).filter((t) => t.kind === 'TABLE')
  // With no ?tab, a business nobody has touched opens its first table (lib/workspace-landing.ts), so that is the one lit.
  const landing = tab === null && !path.startsWith(`${base}/accounts`) ? landingTableId(tables) : null
  const cashActive = path.startsWith(`${base}/accounts`) || (inWorkspace && (tab === CASHBOOK_KEY || (tab === null && landing === null)))

  const tableItems = own.map((t) => (
    <Item key={t.id} to={`${base}/workspace?tab=${t.id}`} label={t.name} dot={t.color} active={inWorkspace && (tab === t.id || (tab === null && landing === t.id))} onNavigate={onNavigate}>
      {t.rules.some((r) => r.enabled) && <ArrowRightLeft width={13} height={13} strokeWidth={2} className="flex-none text-brass" aria-label="Posts to the Cash book" />}
    </Item>
  ))

  if (tableOnly) {
    return (
      <nav aria-label="This business" className="flex flex-col gap-px p-2.5">
        <Heading>Shared with you</Heading>
        {tableItems.length > 0 ? tableItems : <Item to={`${base}/workspace`} label="Shared tables" icon={Table2} active={inWorkspace} onNavigate={onNavigate} />}
      </nav>
    )
  }

  return (
    <nav aria-label="This business" className="flex flex-col gap-px p-2.5 pb-6">
      <Heading>Money</Heading>
      <Item to={`${base}/workspace?tab=${CASHBOOK_KEY}`} label="Cash book" icon={BookOpen} active={cashActive} onNavigate={onNavigate} />
      <Item to={`${base}/invoices`} label="Invoices" icon={FileText} active={path.startsWith(`${base}/invoices`)} onNavigate={onNavigate} />

      <Heading>Your tables</Heading>
      {tableItems}
      {canManage && (
        <Link
          to={`${base}/workspace?do=templates`}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-ledger px-2.5 py-[7px] text-[13px] font-medium text-stamp hover:bg-stamp-soft"
        >
          <Plus width={17} height={17} strokeWidth={2} />
          New table
        </Link>
      )}

      <Heading>Reports</Heading>
      <Item to={base} label="Overview" icon={LayoutDashboard} active={path === base} onNavigate={onNavigate} />
      <Item to={`${base}/statement`} label="Fund statement" icon={Scale} active={path.startsWith(`${base}/statement`) || path.startsWith(`${base}/reports`)} onNavigate={onNavigate} />
      <Item to={`${base}/monthly`} label="Monthly view" icon={CalendarDays} active={path.startsWith(`${base}/monthly`)} onNavigate={onNavigate} />

      <Heading>This business</Heading>
      <Item to={`${base}/connections`} label="Connections" icon={Network} active={path.startsWith(`${base}/connections`)} onNavigate={onNavigate} />
      {canManage && <Item to={`${base}/sharing`} label="Sharing" icon={Users} active={path.startsWith(`${base}/sharing`)} onNavigate={onNavigate} />}
      {canManage && <Item to={`${base}/settings`} label="Settings" icon={Settings} active={path.startsWith(`${base}/settings`)} onNavigate={onNavigate} />}
      {canManage && <SetupChecklist businessId={businessId} />}
    </nav>
  )
}
