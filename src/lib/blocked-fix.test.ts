import { describe, expect, it } from 'vitest'
import { blockedReason, buildDateFix, pickDateSource } from './blocked-fix'
import type { BlockedRow, EngineRow, EngineTable, RuleConfig } from '../types/engine'

const field = (id: string, type: string, position: number) => ({ id, name: id, type, config: {}, position, locked: false })
const table = (fields: ReturnType<typeof field>[]) => ({ fields }) as unknown as EngineTable
const rule = (dateFieldId: string | null): RuleConfig => ({ amountFieldId: 'amt', dateFieldId, direction: 'IN', conditions: [], category: '', description: '' })
const row = (id: string, values: Record<string, unknown>, version = 1) => ({ id, number: 1, version, values, cells: {} }) as EngineRow
const blocked = (rowId: string, reason: 'date' | 'error' = 'date'): BlockedRow => ({ rowId, number: 1, label: rowId, reason, amount: 10 })

describe('pickDateSource', () => {
  const t = table([field('on', 'DATE', 5), field('odate', 'DATE', 1), field('amt', 'MONEY', 2)])
  it('is the first other date column', () => {
    expect(pickDateSource(t, rule('on'))?.id).toBe('odate')
  })
  it('is nothing when the rule has no date column, or there is no other date column', () => {
    expect(pickDateSource(t, rule(null))).toBeNull()
    expect(pickDateSource(table([field('on', 'DATE', 1)]), rule('on'))).toBeNull()
  })
})

describe('buildDateFix', () => {
  it('copies the source date into the target for every blocked-by-date row', () => {
    const rows = [row('a', { odate: '2026-10-12' }, 3), row('b', { odate: '2026-10-18' })]
    const fix = buildDateFix([blocked('a'), blocked('b')], rows, 'on', 'odate')
    expect(fix.updates).toEqual([
      { id: 'a', values: { on: '2026-10-12' }, version: 3 },
      { id: 'b', values: { on: '2026-10-18' }, version: 1 },
    ])
    expect(fix.missing).toBe(0)
  })
  it('counts rows that have no source date (or are not loaded) and leaves them alone', () => {
    const fix = buildDateFix([blocked('a'), blocked('b'), blocked('gone')], [row('a', { odate: '2026-10-12' }), row('b', {})], 'on', 'odate')
    expect(fix.updates.map((u) => u.id)).toEqual(['a'])
    expect(fix.missing).toBe(2)
  })
  it('ignores rows blocked by an error, not a date', () => {
    const fix = buildDateFix([blocked('a', 'error')], [row('a', { odate: '2026-10-12' })], 'on', 'odate')
    expect(fix).toEqual({ updates: [], missing: 0 })
  })
  it('does not copy anything that is not a day', () => {
    expect(buildDateFix([blocked('a')], [row('a', { odate: '12 Oct' })], 'on', 'odate').missing).toBe(1)
  })
})

describe('blockedReason', () => {
  it('says what is wrong in plain words', () => {
    expect(blockedReason([])).toBe('')
    expect(blockedReason([blocked('a')])).toBe('no usable date')
    expect(blockedReason([blocked('a', 'error')])).toBe('a formula error')
    expect(blockedReason([blocked('a'), blocked('b', 'error')])).toBe('no usable date or a formula error')
  })
})
