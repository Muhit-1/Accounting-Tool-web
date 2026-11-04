import type { ComponentType, SVGProps } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { IconChartBar, IconDoc, IconMenu, IconTable } from '../icons'

type Icon = ComponentType<SVGProps<SVGSVGElement>>

// On a phone the outline is a drawer; the four things people reach for most are one thumb away at the bottom.
export function BottomNav({ businessId, tableOnly, onMore }: { businessId: string; tableOnly: boolean; onMore: () => void }) {
  const { pathname } = useLocation()
  const base = `/businesses/${businessId}`
  const items: { label: string; icon: Icon; to?: string; on: boolean }[] = [
    { label: 'Books', icon: IconTable, to: `${base}/workspace`, on: pathname.startsWith(`${base}/workspace`) || pathname.startsWith(`${base}/accounts`) },
    ...(tableOnly
      ? []
      : [
          { label: 'Invoices', icon: IconDoc, to: `${base}/invoices`, on: pathname.startsWith(`${base}/invoices`) },
          { label: 'Reports', icon: IconChartBar, to: `${base}/statement`, on: pathname.startsWith(`${base}/statement`) || pathname.startsWith(`${base}/monthly`) || pathname.startsWith(`${base}/reports`) || pathname === base },
        ]),
    { label: 'More', icon: IconMenu, on: false },
  ]
  return (
    <nav aria-label="Main" className="flex h-16 flex-none border-t border-paper-line bg-white pb-1 md:hidden">
      {items.map(({ label, icon: IconComponent, to, on }) => {
        const body = (
          <>
            <span className={`flex h-[30px] w-[60px] items-center justify-center rounded-full ${on ? 'bg-stamp-soft text-stamp' : 'text-ink-soft'}`}>
              <IconComponent width={22} height={22} />
            </span>
            <span className={`text-[11px] ${on ? 'font-semibold text-stamp' : 'font-medium text-ink-soft'}`}>{label}</span>
          </>
        )
        return to ? (
          <Link key={label} to={to} aria-current={on ? 'page' : undefined} className="flex flex-1 flex-col items-center justify-center gap-0.5">
            {body}
          </Link>
        ) : (
          <button key={label} type="button" onClick={onMore} className="flex flex-1 flex-col items-center justify-center gap-0.5">
            {body}
          </button>
        )
      })}
    </nav>
  )
}
