import {
  ArrowRightLeft,
  BookOpen,
  CalendarDays,
  ChevronDown,
  FileText,
  LayoutDashboard,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  Scale,
  Settings,
  Table2,
  Users,
} from 'lucide-react'
import { useState, type ComponentType } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useBusiness, useBusinessSummaries } from '../../lib/businesses'
import { areaOfItem, activeItem, AREAS, compactAmount, initials, type AreaKey, type ItemKey } from '../../lib/side-menu'
import { useTables } from '../../lib/tables'
import { CASHBOOK_KEY, pickTabKey } from '../../lib/workspace-landing'
import { BusinessSwitcher } from './BusinessSwitcher'
import { SetupChecklist } from './SetupChecklist'

// One icon family for the whole menu (Lucide): the same 1.75 stroke everywhere.
type Icon = ComponentType<{ width?: number; height?: number; className?: string; strokeWidth?: number; 'aria-label'?: string }>

const AREA_ICON: Record<AreaKey, Icon> = { books: BookOpen, tables: Table2, reports: LayoutDashboard, business: Settings }

// An item of the list. The open page has a soft mint fill and a bar on the edge of the menu.
function Item({
  to,
  label,
  icon: IconComponent,
  dot,
  value,
  active,
  onNavigate,
  children,
}: {
  to: string
  label: string
  icon?: Icon
  dot?: string | null
  value?: string
  active: boolean
  onNavigate?: () => void
  children?: React.ReactNode
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      aria-current={active ? 'page' : undefined}
      className={`relative flex h-10 items-center gap-2.5 rounded-[10px] px-3 text-[14px] transition-colors ${
        active
          ? 'bg-stamp-soft font-bold text-stamp before:absolute before:top-2 before:-left-2.5 before:bottom-2 before:w-[3px] before:rounded-r-[3px] before:bg-stamp'
          : 'font-medium text-ink hover:bg-white'
      }`}
    >
      {IconComponent && <IconComponent width={17} height={17} strokeWidth={1.75} className={`flex-none ${active ? '' : 'text-ink-soft'}`} />}
      {dot !== undefined && <span className="mx-[3px] h-[9px] w-[9px] flex-none rounded-full" style={{ background: dot ?? 'var(--color-stamp)' }} aria-hidden />}
      <span className="min-w-0 flex-1 truncate">{label}</span>
      {children}
      {value && <span className={`tabular flex-none text-[12px] ${active ? 'text-stamp' : 'text-ink-soft'}`}>{value}</span>}
    </Link>
  )
}

function ListHeading({ children }: { children: string }) {
  return <h3 className="mx-2.5 mb-1.5 text-[11px] font-bold tracking-[0.07em] text-ink-soft uppercase">{children}</h3>
}

interface SideMenuProps {
  businessId: string
  // someone who was given only some tables: a menu of just those
  tableOnly: boolean
  canManage: boolean
  // the list beside the rail is showing (desktop only)
  open: boolean
  setOpen: (open: boolean) => void
  // 'drawer' is the phone's: the four areas as a row of tabs above the list
  layout?: 'rail' | 'drawer'
  onNavigate?: () => void
}

// The left menu of a business: a slim rail of four areas (Books, Tables, Reports, Business) and the list of the chosen
// area beside it. The business is the badge at the top of the rail (click it to switch). The sheet is the page, so the
// list can be hidden with the button at the foot of the rail. Rules are in lib/side-menu.ts.
export function SideMenu({ businessId, tableOnly, canManage, open, setOpen, layout = 'rail', onNavigate }: SideMenuProps) {
  const location = useLocation()
  const { data: business } = useBusiness(businessId)
  const { data: summaries } = useBusinessSummaries()
  const { data: tables } = useTables(businessId)
  const summary = summaries?.find((b) => b.id === businessId)
  const name = business?.name ?? summary?.name ?? ''
  const currency = business?.currency ?? summary?.currency
  const balance = summary?.balance ?? null

  const base = `/businesses/${businessId}`
  const own = (tables ?? []).filter((t) => t.kind === 'TABLE')
  const tab = new URLSearchParams(location.search).get('tab')
  // With no ?tab, a business nobody has touched opens its first table (lib/workspace-landing), so that one is lit.
  // The page itself shows pickTabKey's choice (the first tab once a business has been touched, and a new business lists
  // Sheet1 before the Cash book), so the menu must light the same one.
  const opened = tab === null && tables && !location.pathname.startsWith(`${base}/accounts`) ? pickTabKey(tables, null) : undefined
  const landing = opened && opened !== CASHBOOK_KEY ? opened : null
  const active: ItemKey | null = activeItem({ pathname: location.pathname, base, tab, landing, tableIds: own.map((t) => t.id) })
  const pageArea = tableOnly ? 'tables' : areaOfItem(active)

  // An area chosen by hand lasts for the page it was chosen on; moving to another page follows the page again.
  const [picked, setPicked] = useState<{ area: AreaKey; page: string } | null>(null)
  const pageKey = `${location.pathname}${location.search}`
  const shown: AreaKey = tableOnly ? 'tables' : picked && picked.page === pageKey ? picked.area : pageArea
  const areas = tableOnly ? AREAS.filter((a) => a.key === 'tables') : AREAS

  function choose(area: AreaKey) {
    setPicked({ area, page: pageKey })
    if (!open) setOpen(true)
  }

  const tableItems = own.map((t) => (
    <Item key={t.id} to={`${base}/workspace?tab=${t.id}`} label={t.name} dot={t.color} value={String(t.rowCount)} active={active === `table:${t.id}`} onNavigate={onNavigate}>
      {t.rules.some((r) => r.enabled) && <ArrowRightLeft width={14} height={14} strokeWidth={2} className="flex-none text-brass" aria-label="Posts to the Cash book" />}
    </Item>
  ))

  const items = (
    <div className="flex flex-col gap-px">
      {shown === 'books' && (
        <>
          <Item to={`${base}/workspace?tab=cashbook`} label="Cash book" icon={BookOpen} value={balance === null ? undefined : compactAmount(balance)} active={active === 'cashbook'} onNavigate={onNavigate} />
          <Item to={`${base}/invoices`} label="Invoices" icon={FileText} active={active === 'invoices'} onNavigate={onNavigate} />
        </>
      )}
      {shown === 'tables' && (
        <>
          {tableItems.length > 0 || !tableOnly ? tableItems : <Item to={`${base}/workspace`} label="Shared tables" icon={Table2} active={active !== null} onNavigate={onNavigate} />}
          {canManage && (
            <Link to={`${base}/workspace?do=templates`} onClick={onNavigate} className="flex h-10 items-center gap-2.5 rounded-[10px] px-3 text-[14px] font-semibold text-stamp hover:bg-white">
              <Plus width={17} height={17} strokeWidth={2} />
              New table
            </Link>
          )}
          {own.some((t) => t.rules.some((r) => r.enabled)) && (
            <p className="mx-3 mt-3 flex items-center gap-1.5 text-[12.5px] text-ink-soft">
              <ArrowRightLeft width={14} height={14} strokeWidth={2} className="flex-none text-brass" aria-hidden />
              posts to the Cash book
            </p>
          )}
        </>
      )}
      {shown === 'reports' && (
        <>
          <Item to={base} label="Overview" icon={LayoutDashboard} active={active === 'overview'} onNavigate={onNavigate} />
          <Item to={`${base}/statement`} label="Fund statement" icon={Scale} active={active === 'statement'} onNavigate={onNavigate} />
          <Item to={`${base}/monthly`} label="Monthly view" icon={CalendarDays} active={active === 'monthly'} onNavigate={onNavigate} />
        </>
      )}
      {shown === 'business' && (
        <>
          <Item to={`${base}/connections`} label="Connections" icon={Network} active={active === 'connections'} onNavigate={onNavigate} />
          {canManage && <Item to={`${base}/sharing`} label="Sharing" icon={Users} active={active === 'sharing'} onNavigate={onNavigate} />}
          {canManage && <Item to={`${base}/settings`} label="Settings" icon={Settings} active={active === 'settings'} onNavigate={onNavigate} />}
        </>
      )}
    </div>
  )

  const areaTitle = tableOnly ? 'Shared with you' : (AREAS.find((a) => a.key === shown)?.label ?? '')

  const list = (
    <nav aria-label={`${name || 'This business'}: ${areaTitle}`} className="px-2.5 pt-3 pb-3">
      <div className="mx-2.5 mb-3.5 flex items-center gap-2">
        <span className="min-w-0 truncate text-[15.5px] font-extrabold tracking-[-0.01em] text-ink">{name || '…'}</span>
        {currency && <span className="tabular flex-none rounded-[5px] border border-paper-line px-1.5 text-[11px] text-ink-soft">{currency}</span>}
      </div>
      <ListHeading>{areaTitle}</ListHeading>
      {items}
      {canManage && !tableOnly && <SetupChecklist businessId={businessId} />}
    </nav>
  )

  if (layout === 'drawer') {
    return (
      <div className="flex min-h-full flex-col bg-sheet">
        <div role="tablist" aria-label="Areas" className="grid grid-cols-4 gap-1 border-b border-paper-line bg-white p-2">
          {areas.map((a) => {
            const IconComponent = AREA_ICON[a.key]
            const on = a.key === shown
            return (
              <button
                key={a.key}
                type="button"
                role="tab"
                aria-selected={on}
                onClick={() => choose(a.key)}
                className={`flex flex-col items-center gap-0.5 rounded-[10px] py-2 text-[11px] font-semibold ${on ? 'bg-stamp-soft text-stamp' : 'text-ink-soft'}`}
              >
                <IconComponent width={20} height={20} strokeWidth={1.75} />
                {a.label}
              </button>
            )
          })}
        </div>
        {list}
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1">
      <div className="relative z-20 flex w-[76px] flex-none flex-col items-center gap-1 border-r border-paper-line bg-white py-2.5">
        <BusinessSwitcher
          businessId={businessId}
          canManage={canManage}
          className="relative mb-2 border-b border-paper-edge pb-3"
          trigger={({ open: menuOpen, toggle }) => (
            <button
              type="button"
              onClick={toggle}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label={`${name || 'Business'}. Switch business`}
              title={`${name} · switch business`}
              className="group flex w-[60px] flex-col items-center gap-1 rounded-[10px] py-1"
            >
              <span className="relative flex h-10 w-10 items-center justify-center rounded-[12px] bg-ink text-[13px] font-extrabold text-white group-hover:ring-4 group-hover:ring-stamp-soft">
                {initials(name || '?')}
                <span className="absolute -right-1.5 -bottom-1.5 flex h-4 w-4 items-center justify-center rounded-full border border-paper-line bg-white text-ink">
                  <ChevronDown width={10} height={10} strokeWidth={2.75} />
                </span>
              </span>
              <span className="line-clamp-2 max-w-[60px] text-center text-[10.5px] leading-[1.15] font-bold break-words text-ink">{name}</span>
            </button>
          )}
        />
        {areas.map((a) => {
          const IconComponent = AREA_ICON[a.key]
          // With the list hidden, the rail still shows which area the page you are on belongs to.
          const on = a.key === (open ? shown : pageArea)
          return (
            <button
              key={a.key}
              type="button"
              onClick={() => choose(a.key)}
              aria-pressed={on}
              className={`relative flex w-[60px] flex-col items-center gap-[3px] rounded-[12px] pt-2 pb-1.5 text-[11px] font-semibold transition-colors ${
                on
                  ? 'bg-stamp-soft text-stamp before:absolute before:top-2.5 before:-left-2 before:bottom-2.5 before:w-[3px] before:rounded-r-[3px] before:bg-stamp'
                  : 'text-ink-soft hover:bg-paper hover:text-ink'
              }`}
            >
              <IconComponent width={20} height={20} strokeWidth={1.75} />
              {a.label}
            </button>
          )
        })}
        <span className="flex-1" />
        <button
          type="button"
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          aria-label={open ? 'Hide the list' : 'Show the list'}
          className="flex w-[60px] flex-col items-center gap-[3px] rounded-[12px] pt-2 pb-1.5 text-[11px] font-semibold text-ink-soft hover:bg-paper hover:text-ink"
        >
          {open ? <PanelLeftClose width={20} height={20} strokeWidth={1.75} /> : <PanelLeftOpen width={20} height={20} strokeWidth={1.75} />}
          {open ? 'Hide' : 'Show'}
        </button>
      </div>
      {open && <div className="scrollbar-thin min-h-0 w-[244px] flex-none overflow-y-auto border-r border-paper-line bg-sheet">{list}</div>}
    </div>
  )
}
