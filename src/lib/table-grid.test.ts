import { describe, expect, it } from 'vitest'
import { buildDraftValues, cellText, columnWidth, parseNumberInput, planCellEdit } from './table-grid'
import type { EngineRow, TableField } from '../types/engine'

const f = (type: TableField['type'], config: Record<string, unknown> = {}, id = 'f1'): TableField => ({ id, name: 'Col', type, config, position: 0, locked: false })
const row = (values: Record<string, unknown>, cells: EngineRow['cells'] = {}): EngineRow => ({ id: 'r', number: 1, version: 1, values, cells })

describe('parseNumberInput', () => {
  it('reads commas and negatives', () => {
    expect(parseNumberInput('1,250.5', false)).toEqual({ kind: 'ok', value: 1250.5 })
    expect(parseNumberInput('-3', false)).toEqual({ kind: 'ok', value: -3 })
    expect(parseNumberInput('  ', false)).toEqual({ kind: 'empty' })
  })
  it('refuses words, huge numbers and more than 2 decimals of money', () => {
    expect(parseNumberInput('abc', false)).toMatchObject({ kind: 'error' })
    expect(parseNumberInput('1e9', false)).toMatchObject({ kind: 'error' })
    expect(parseNumberInput('1.005', true)).toMatchObject({ kind: 'error', message: 'Money has at most 2 decimals.' })
    expect(parseNumberInput('1.005', false)).toEqual({ kind: 'ok', value: 1.005 })
  })
})

describe('planCellEdit', () => {
  it('turns typed text into the value the column holds', () => {
    expect(planCellEdit(f('TEXT'), 'hello')).toEqual({ kind: 'ok', value: 'hello' })
    expect(planCellEdit(f('TEXT'), '')).toEqual({ kind: 'ok', value: null })
    expect(planCellEdit(f('MONEY'), '1,250')).toEqual({ kind: 'ok', value: 1250 })
    expect(planCellEdit(f('NUMBER'), '2.5')).toEqual({ kind: 'ok', value: 2.5 })
    expect(planCellEdit(f('DATE'), '12 Oct 2026')).toEqual({ kind: 'ok', value: '2026-10-12' })
    expect(planCellEdit(f('DATE'), '')).toEqual({ kind: 'ok', value: null })
    expect(planCellEdit(f('TICK'), 'true')).toEqual({ kind: 'ok', value: true })
    expect(planCellEdit(f('LINK'), 'row1')).toEqual({ kind: 'ok', value: ['row1'] })
    expect(planCellEdit(f('LINK'), '')).toEqual({ kind: 'ok', value: [] })
  })
  it('says what is wrong in plain words', () => {
    expect(planCellEdit(f('NUMBER'), 'x')).toEqual({ kind: 'error', message: 'Type a number, like 1,250.' })
    expect(planCellEdit(f('DATE'), 'soon')).toEqual({ kind: 'error', message: 'Use a date like 12 Oct 2026.' })
    expect(planCellEdit(f('FORMULA'), '5')).toEqual({ kind: 'error', message: 'This column is worked out for you.' })
  })
  it('a choice must be one of its words (capitals may differ)', () => {
    const c = f('CHOICE', { options: ['New', 'Delivered'] })
    expect(planCellEdit(c, 'delivered')).toEqual({ kind: 'ok', value: 'Delivered' })
    expect(planCellEdit(c, 'Lost')).toEqual({ kind: 'error', message: 'Choose one of the choices.' })
  })
})

describe('buildDraftValues (the add-row)', () => {
  const fields = [f('TEXT', {}, 'a'), f('MONEY', {}, 'b'), f('FORMULA', {}, 'c'), f('DATE', {}, 'd')]
  it('keeps what was typed and skips worked-out columns', () => {
    expect(buildDraftValues(fields, { a: 'Pens', b: '12.5', c: '99' })).toEqual({ ok: true, values: { a: 'Pens', b: 12.5 } })
  })
  it('names the column that is wrong', () => {
    expect(buildDraftValues(fields, { a: 'Pens', d: 'never' })).toEqual({ ok: false, column: 'd', message: 'Col: Use a date like 12 Oct 2026.' })
  })
  it('an empty row is not added', () => {
    expect(buildDraftValues(fields, {})).toMatchObject({ ok: false, message: 'Type something in the row first.' })
  })
})

describe('cellText', () => {
  it('shows money with cents, dates in words, ticks as Yes', () => {
    expect(cellText(f('MONEY'), row({ f1: 1250 }))).toBe('1,250.00')
    expect(cellText(f('DATE'), row({ f1: '2026-10-12' }))).toBe('12 Oct 2026')
    expect(cellText(f('TICK'), row({ f1: true }))).toBe('Yes')
    expect(cellText(f('TEXT'), row({}))).toBe('')
  })
  it('shows worked-out values and their errors', () => {
    expect(cellText(f('FORMULA'), row({}, { f1: { v: 49000 } }))).toBe('49,000.00')
    expect(cellText(f('FORMULA'), row({}, { f1: { v: 'Due' } }))).toBe('Due')
    expect(cellText(f('FORMULA'), row({}, { f1: { v: null, e: 'Can’t divide by 0.' } }))).toBe('Can’t divide by 0.')
    expect(cellText(f('ROLLUP', { how: 'count' }), row({}, { f1: { v: 6 } }))).toBe('6')
    expect(cellText(f('LINK'), row({ f1: ['x'] }, { f1: { v: 'Shahidul Alam', ids: ['x'] } }))).toBe('Shahidul Alam')
  })
})

describe('columnWidth', () => {
  it('gives text the room and tick boxes little', () => {
    expect(columnWidth(f('TEXT'))).toContain('minmax')
    expect(columnWidth(f('TICK'))).toBe('84px')
  })
})
