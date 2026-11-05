// Which tab a business opens on when the address names none. Pure, so every rule is a test.
//
// A business nobody has touched yet (an empty Cash book and only empty tables) opens on its first table of its own, so
// a new owner lands in something to type in and not in a ledger. Everyone else opens on the first tab, as always.

import type { EngineTable } from '../types/engine'

export const CASHBOOK_KEY = 'cashbook'

type TableLike = Pick<EngineTable, 'id' | 'kind' | 'rowCount'>

/** The id of the table to open, or null when the first tab (usually the Cash book) is right. */
export function landingTableId(tables: TableLike[] | undefined): string | null {
  if (!tables) return null
  const ledger = tables.find((t) => t.kind === 'LEDGER')
  // Someone who was given only some tables has no Cash book: their first table already is the first tab.
  if (!ledger) return null
  const own = tables.filter((t) => t.kind === 'TABLE')
  if (own.length === 0) return null
  if (ledger.rowCount > 0 || own.some((t) => t.rowCount > 0)) return null
  return own[0].id
}

/** The tab key to show: the one the address asks for (if it exists), else the landing table, else the first tab. */
export function pickTabKey(tables: TableLike[], requested: string | null): string | undefined {
  const keyOf = (t: TableLike) => (t.kind === 'LEDGER' ? CASHBOOK_KEY : t.id)
  const keys = tables.map(keyOf)
  if (requested && keys.includes(requested)) return requested
  return landingTableId(tables) ?? keys[0]
}
