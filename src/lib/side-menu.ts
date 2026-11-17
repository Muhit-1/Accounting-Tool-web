import { CASHBOOK_KEY } from './workspace-landing'

// The rules of the left menu of a business (components/shell/SideMenu): which area a page belongs to and which item
// is lit. Pure, so they are tests. The menu is a slim rail of four areas, and the list of the chosen area beside it.

export type AreaKey = 'books' | 'tables' | 'reports' | 'business'

// "Books" is the first area: the Cash book and the invoices, the two places a business keeps its money.
export const AREAS: { key: AreaKey; label: string }[] = [
  { key: 'books', label: 'Books' },
  { key: 'tables', label: 'Tables' },
  { key: 'reports', label: 'Reports' },
  { key: 'business', label: 'Business' },
]

export type ItemKey = 'cashbook' | 'invoices' | 'overview' | 'statement' | 'monthly' | 'connections' | 'sharing' | 'settings' | `table:${string}`

export interface ActiveInput {
  pathname: string
  // `/businesses/<id>`
  base: string
  // the ?tab= of the address, or null
  tab: string | null
  // the table that opens when there is no ?tab (lib/workspace-landing), or null
  landing: string | null
  // the ids of the business's own tables
  tableIds: string[]
}

/** The item of the menu a page belongs to, or null for a page the menu has no item for. */
export function activeItem({ pathname, base, tab, landing, tableIds }: ActiveInput): ItemKey | null {
  const inWorkspace = pathname.startsWith(`${base}/workspace`) || pathname.startsWith(`${base}/accounts`)
  if (inWorkspace) {
    if (pathname.startsWith(`${base}/accounts`)) return 'cashbook'
    if (tab === CASHBOOK_KEY || (tab === null && landing === null)) return 'cashbook'
    const id = tab ?? landing
    if (id !== null && tableIds.includes(id)) return `table:${id}`
    return null
  }
  if (pathname.startsWith(`${base}/invoices`)) return 'invoices'
  if (pathname.startsWith(`${base}/statement`) || pathname.startsWith(`${base}/reports`)) return 'statement'
  if (pathname.startsWith(`${base}/monthly`)) return 'monthly'
  if (pathname.startsWith(`${base}/connections`)) return 'connections'
  if (pathname.startsWith(`${base}/sharing`)) return 'sharing'
  if (pathname.startsWith(`${base}/settings`)) return 'settings'
  if (pathname === base || pathname === `${base}/`) return 'overview'
  return null
}

/** The area of an item; a page with no item opens the first area. */
export function areaOfItem(item: ItemKey | null): AreaKey {
  if (item === null || item === 'cashbook' || item === 'invoices') return 'books'
  if (item.startsWith('table:')) return 'tables'
  if (item === 'overview' || item === 'statement' || item === 'monthly') return 'reports'
  return 'business'
}

/** A balance for a narrow place: whole units with thousands separators and a real minus sign. */
export function compactAmount(amount: number): string {
  const text = Math.abs(Math.round(amount)).toLocaleString('en-US')
  return amount < 0 && Math.round(amount) !== 0 ? `−${text}` : text
}

/** The badge letters of a business or a person: "Linen Shop" -> LS, "Vaaii" -> VA. */
export function initials(name: string): string {
  const parts = name.trim().split(/\s+/)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}
