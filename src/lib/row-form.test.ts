import { describe, expect, it } from 'vitest'
import { buildRowSave, formFields, initialFormValues } from './row-form'
import type { EngineRow, TableField } from '../types/engine'

const f = (id: string, type: TableField['type'], config: Record<string, unknown> = {}): TableField => ({ id, name: id.toUpperCase(), type, config, position: 0, locked: false })
const fields = [f('name', 'TEXT'), f('amt', 'MONEY'), f('day', 'DATE'), f('st', 'CHOICE', { options: ['New', 'Done'] }), f('paid', 'TICK'), f('who', 'LINK', { targetTableId: 't2' }), f('tot', 'FORMULA'), f('no', 'AUTO')]
const row = (values: Record<string, unknown>): EngineRow => ({ id: 'r1', number: 1, version: 3, values, cells: {} })

describe('formFields', () => {
  it('leaves out the columns that are worked out', () => {
    expect(formFields(fields).map((x) => x.id)).toEqual(['name', 'amt', 'day', 'st', 'paid', 'who'])
  })
})

describe('initialFormValues', () => {
  it('is empty for a new row, with the tick box off', () => {
    expect(initialFormValues(fields)).toEqual({ name: '', amt: '', day: '', st: '', paid: 'false', who: '' })
  })
  it('reads a row: dates as days, ticks as true or false, a link as the linked id', () => {
    const r = row({ name: 'Tea', amt: 120, day: '2026-11-06', st: 'Done', paid: true, who: ['p1'] })
    expect(initialFormValues(fields, r)).toEqual({ name: 'Tea', amt: '120', day: '2026-11-06', st: 'Done', paid: 'true', who: 'p1' })
  })
})

describe('buildRowSave, a new row', () => {
  it('sends every filled box and skips the empty ones and an unticked box', () => {
    const r = buildRowSave(fields, { name: 'Tea', amt: '1,200.50', day: '2026-11-06', st: '', paid: 'false', who: '' })
    expect(r).toEqual({ ok: true, values: { name: 'Tea', amt: 1200.5, day: '2026-11-06' } })
  })
  it('sends a ticked box and a link', () => {
    expect(buildRowSave(fields, { name: 'x', paid: 'true', who: 'p1' })).toEqual({ ok: true, values: { name: 'x', paid: true, who: ['p1'] } })
  })
  it('asks for something when every box is empty', () => {
    expect(buildRowSave(fields, { paid: 'false' })).toEqual({ ok: false, column: 'name', message: 'Fill in at least one box first.' })
  })
  it('names a wrong box in plain words', () => {
    expect(buildRowSave(fields, { name: 'x', amt: 'abc' })).toMatchObject({ ok: false, column: 'amt', message: 'AMT: Type a number, like 1,250.' })
    expect(buildRowSave(fields, { name: 'x', st: 'Maybe' })).toMatchObject({ ok: false, column: 'st' })
  })
})

describe('buildRowSave, a row that exists', () => {
  const r = row({ name: 'Tea', amt: 120, day: '2026-11-06', st: 'New', paid: false, who: ['p1'] })
  const same = initialFormValues(fields, r)
  it('sends nothing when nothing changed', () => {
    expect(buildRowSave(fields, same, r)).toEqual({ ok: true, values: {} })
  })
  it('sends only what changed', () => {
    expect(buildRowSave(fields, { ...same, amt: '150', st: 'Done', paid: 'true' }, r)).toEqual({ ok: true, values: { amt: 150, st: 'Done', paid: true } })
  })
  it('can empty a box, and change or clear a link', () => {
    expect(buildRowSave(fields, { ...same, name: '', who: '' }, r)).toEqual({ ok: true, values: { name: null, who: [] } })
  })
  it('a row with no value at all and an untouched form changes nothing', () => {
    const empty = row({})
    expect(buildRowSave(fields, initialFormValues(fields, empty), empty)).toEqual({ ok: true, values: {} })
  })
  it('names a wrong box', () => {
    expect(buildRowSave(fields, { ...same, day: '31 Foo 2026' }, r)).toMatchObject({ ok: false, column: 'day' })
  })
})
