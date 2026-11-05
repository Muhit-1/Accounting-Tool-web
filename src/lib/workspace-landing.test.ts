import { describe, expect, it } from 'vitest'
import { landingTableId, pickTabKey } from './workspace-landing'

const t = (id: string, kind: 'TABLE' | 'LEDGER', rowCount = 0) => ({ id, kind, rowCount })

describe('landingTableId', () => {
  it('a business nobody touched opens on its first own table', () => {
    expect(landingTableId([t('cb', 'LEDGER'), t('s1', 'TABLE')])).toBe('s1')
    expect(landingTableId([t('s1', 'TABLE'), t('cb', 'LEDGER')])).toBe('s1')
  })
  it('a template business (several empty tables) opens on the first of them', () => {
    expect(landingTableId([t('cb', 'LEDGER'), t('orders', 'TABLE'), t('costs', 'TABLE')])).toBe('orders')
  })
  it('once a table has a row, or the Cash book has an entry, the first tab is right', () => {
    expect(landingTableId([t('cb', 'LEDGER'), t('s1', 'TABLE', 1)])).toBeNull()
    expect(landingTableId([t('cb', 'LEDGER', 3), t('s1', 'TABLE')])).toBeNull()
  })
  it('without a table of its own, or without the Cash book (a shared table), there is nothing to redirect', () => {
    expect(landingTableId([t('cb', 'LEDGER')])).toBeNull()
    expect(landingTableId([t('s1', 'TABLE')])).toBeNull()
    expect(landingTableId(undefined)).toBeNull()
    expect(landingTableId([])).toBeNull()
  })
})

describe('pickTabKey', () => {
  const fresh = [t('cb', 'LEDGER'), t('s1', 'TABLE')]
  const used = [t('cb', 'LEDGER', 2), t('s1', 'TABLE', 4)]
  it('the address wins, also for the Cash book of an untouched business', () => {
    expect(pickTabKey(fresh, 'cashbook')).toBe('cashbook')
    expect(pickTabKey(fresh, 's1')).toBe('s1')
    expect(pickTabKey(used, 's1')).toBe('s1')
  })
  it('no address: an untouched business opens its table, a used one its first tab', () => {
    expect(pickTabKey(fresh, null)).toBe('s1')
    expect(pickTabKey(used, null)).toBe('cashbook')
  })
  it('an address for a table that is gone falls back to the same default', () => {
    expect(pickTabKey(fresh, 'gone')).toBe('s1')
    expect(pickTabKey(used, 'gone')).toBe('cashbook')
  })
  it('nothing at all gives nothing', () => {
    expect(pickTabKey([], null)).toBeUndefined()
  })
})
