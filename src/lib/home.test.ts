import { describe, expect, it } from 'vitest'
import type { BusinessSummary } from '../types/api'
import { filterSummaries, formatBalance, openedLabel, openPath, previewBars, roleLabel } from './home'

const make = (o: Partial<BusinessSummary>): BusinessSummary => ({
  id: 'b1',
  name: 'Shop',
  currency: 'BDT',
  country: 'BD',
  role: 'OWNER',
  canEdit: true,
  ownerName: null,
  balance: 100,
  tables: [{ id: 't0', name: 'Cash book', color: null, kind: 'LEDGER' }, { id: 't1', name: 'Orders', color: '#2457d6', kind: 'TABLE' }],
  lastOpenedAt: null,
  lastTableId: null,
  createdAt: '2026-10-01T00:00:00Z',
  sharedUntil: null,
  ...o,
})

describe('filterSummaries', () => {
  const list = [
    make({ id: 'a', name: 'Vaaii', lastOpenedAt: '2026-10-29T00:00:00Z' }),
    make({ id: 'b', name: 'ShopnoJhuri', lastOpenedAt: '2026-11-04T00:00:00Z' }),
    make({ id: 'c', name: 'Nila Traders', role: 'EDIT', canEdit: true }),
  ]
  it('orders by last opened, never opened last', () => {
    expect(filterSummaries(list, 'all', 'opened').map((b) => b.id)).toEqual(['b', 'a', 'c'])
  })
  it('orders by name', () => {
    expect(filterSummaries(list, 'all', 'name').map((b) => b.name)).toEqual(['Nila Traders', 'ShopnoJhuri', 'Vaaii'])
  })
  it('keeps yours or the shared ones apart', () => {
    expect(filterSummaries(list, 'mine', 'name').map((b) => b.id)).toEqual(['b', 'a'])
    expect(filterSummaries(list, 'shared', 'name').map((b) => b.id)).toEqual(['c'])
  })
  it('searches by name, ignoring case', () => {
    expect(filterSummaries(list, 'all', 'name', ' SHOP ').map((b) => b.id)).toEqual(['b'])
  })
})

describe('roleLabel', () => {
  it('says nothing for your own, and what the person may do otherwise', () => {
    expect(roleLabel(make({}))).toBe('')
    expect(roleLabel(make({ role: 'EDIT', canEdit: true }))).toBe('Shared · can edit')
    expect(roleLabel(make({ role: 'VIEW', canEdit: false }))).toBe('Shared · can view')
    expect(roleLabel(make({ role: 'TABLE', tables: [{ id: 't', name: 'Costs', color: null, kind: 'TABLE' }] }))).toBe('Shared · one table')
  })
})

describe('openedLabel', () => {
  it('writes a short date or says not yet', () => {
    expect(openedLabel(null)).toBe('Not opened yet')
    expect(openedLabel('2026-11-04T12:00:00Z')).toBe('Opened Nov 4, 2026')
    expect(openedLabel('garbage')).toBe('Not opened yet')
  })
})

describe('openPath', () => {
  it('opens the table that was open last, else the Cash book', () => {
    expect(openPath(make({ lastTableId: 't1' }))).toBe('/businesses/b1/workspace?tab=t1')
    expect(openPath(make({}))).toBe('/businesses/b1/workspace')
    expect(openPath(make({ lastTableId: 'gone' }))).toBe('/businesses/b1/workspace')
  })
  it('opens the one table of a table-only guest', () => {
    const b = make({ role: 'TABLE', tables: [{ id: 't9', name: 'Costs', color: null, kind: 'TABLE' }] })
    expect(openPath(b)).toBe('/businesses/b1/workspace?tab=t9')
  })
})

describe('previewBars', () => {
  it('draws at least four bars in the colours of the tables', () => {
    const bars = previewBars(make({}))
    expect(bars.length).toBeGreaterThanOrEqual(4)
    expect(bars.some((b) => b.color === '#2457d6')).toBe(true)
  })
})

describe('formatBalance', () => {
  it('uses the currency sign and drops empty cents', () => {
    expect(formatBalance(17654, 'BDT')).toBe('৳ 17,654')
    expect(formatBalance(42310.5, 'EUR')).toBe('€ 42,310.50')
    expect(formatBalance(0, 'USD')).toBe('$ 0')
  })
  it('shows a minus sign and the code of an unknown currency', () => {
    expect(formatBalance(-1200, 'BDT')).toBe('−৳ 1,200')
    expect(formatBalance(5, 'XAF')).toBe('XAF 5')
  })
})
