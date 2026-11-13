import type { BusinessSummary } from '../types/api'

// Pure rules of the Home screen: which businesses are listed, in what order, and how each is described.

export type OwnerFilter = 'all' | 'mine' | 'shared'
export type HomeSort = 'opened' | 'name'

export function filterSummaries(list: BusinessSummary[], owner: OwnerFilter, sort: HomeSort, query = ''): BusinessSummary[] {
  const needle = query.trim().toLowerCase()
  const out = list.filter((b) => {
    if (owner === 'mine' && b.role !== 'OWNER') return false
    if (owner === 'shared' && b.role === 'OWNER') return false
    if (needle && !b.name.toLowerCase().includes(needle)) return false
    return true
  })
  if (sort === 'name') return [...out].sort((a, b) => a.name.localeCompare(b.name))
  // last opened first; never opened ones follow, newest made first
  return [...out].sort((a, b) => (b.lastOpenedAt ?? '').localeCompare(a.lastOpenedAt ?? '') || b.createdAt.localeCompare(a.createdAt))
}

/** What the card says about who owns it and what the person may do. Empty for your own businesses. */
export function roleLabel(b: Pick<BusinessSummary, 'role' | 'canEdit' | 'tables'>): string {
  if (b.role === 'OWNER') return ''
  if (b.role === 'TABLE') return b.tables.length === 1 ? 'Shared · one table' : `Shared · ${b.tables.length} tables`
  return b.canEdit ? 'Shared · can edit' : 'Shared · can view'
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Opened Nov 4, 2026", or "Not opened yet". */
export function openedLabel(iso: string | null): string {
  if (!iso) return 'Not opened yet'
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return 'Not opened yet'
  return `Opened ${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`
}

/** Where the card opens: the table the person had open (if they may still see it), else the Cash book. */
export function openPath(b: Pick<BusinessSummary, 'id' | 'lastTableId' | 'tables' | 'role'>): string {
  const base = `/businesses/${b.id}/workspace`
  const last = b.lastTableId && b.tables.find((t) => t.id === b.lastTableId)
  if (last && last.kind === 'TABLE') return `${base}?tab=${last.id}`
  // a person who was given one table never sees the Cash book: open their table
  if (b.role === 'TABLE' && b.tables[0]) return `${base}?tab=${b.tables[0].id}`
  return base
}

/** Little bars that look like the sheet's rows, one set per table colour (decorative, from the real tables). */
export function previewBars(b: Pick<BusinessSummary, 'tables'>, max = 6): { width: number; color: string }[] {
  const widths = [100, 72, 88, 60, 80, 66]
  const colors = b.tables.length > 0 ? b.tables.map((t) => t.color ?? '#2457d6') : ['#2457d6']
  return Array.from({ length: Math.min(max, Math.max(colors.length * 2, 4)) }, (_, i) => ({ width: widths[i % widths.length], color: colors[i % colors.length] }))
}

/** The tables a card shows as chips: the Cash book first, then your tables in their order, at most `max`, and how many are left out. */
export function tableChips(tables: BusinessSummary['tables'], max = 3): { shown: BusinessSummary['tables']; more: number } {
  const ordered = [...tables].sort((a, b) => Number(b.kind === 'LEDGER') - Number(a.kind === 'LEDGER'))
  return { shown: ordered.slice(0, max), more: Math.max(0, ordered.length - max) }
}

const SYMBOLS: Record<string, string> = { BDT: '৳', EUR: '€', USD: '$', CNY: '¥' }

/** A balance for a card: "৳ 17,654" (cents only when there are some), the currency code for an unknown currency. */
export function formatBalance(amount: number, currency: string): string {
  const symbol = SYMBOLS[currency] ?? currency
  const hasCents = Math.round(amount * 100) % 100 !== 0
  const text = Math.abs(amount).toLocaleString('en-IN', { minimumFractionDigits: hasCents ? 2 : 0, maximumFractionDigits: 2 })
  return `${amount < 0 ? '−' : ''}${symbol} ${text}`
}
