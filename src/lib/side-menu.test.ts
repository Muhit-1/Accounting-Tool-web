import { describe, expect, it } from 'vitest'
import { activeItem, areaOfItem, AREAS, compactAmount, initials, type ActiveInput } from './side-menu'

const base = '/businesses/b1'
const input = (o: Partial<ActiveInput>): ActiveInput => ({ pathname: base, base, tab: null, landing: null, tableIds: ['t1', 't2'], ...o })

describe('areas', () => {
  it('has four areas and the first is Books', () => {
    expect(AREAS.map((a) => a.label)).toEqual(['Books', 'Tables', 'Reports', 'Business'])
  })
})

describe('activeItem', () => {
  it('lights the Cash book for its address, for the old accounts address, and when nothing else opens', () => {
    expect(activeItem(input({ pathname: `${base}/workspace`, tab: 'cashbook' }))).toBe('cashbook')
    expect(activeItem(input({ pathname: `${base}/accounts/a1` }))).toBe('cashbook')
    expect(activeItem(input({ pathname: `${base}/workspace` }))).toBe('cashbook')
  })

  it('lights a table by ?tab, or the landing table when there is no ?tab', () => {
    expect(activeItem(input({ pathname: `${base}/workspace`, tab: 't2' }))).toBe('table:t2')
    expect(activeItem(input({ pathname: `${base}/workspace`, landing: 't1' }))).toBe('table:t1')
  })

  it('lights nothing for a tab that is not one of the own tables', () => {
    expect(activeItem(input({ pathname: `${base}/workspace`, tab: 'unknown' }))).toBeNull()
  })

  it('maps the other pages', () => {
    expect(activeItem(input({ pathname: `${base}/invoices/new` }))).toBe('invoices')
    expect(activeItem(input({ pathname: base }))).toBe('overview')
    expect(activeItem(input({ pathname: `${base}/statement` }))).toBe('statement')
    expect(activeItem(input({ pathname: `${base}/reports` }))).toBe('statement')
    expect(activeItem(input({ pathname: `${base}/monthly` }))).toBe('monthly')
    expect(activeItem(input({ pathname: `${base}/connections` }))).toBe('connections')
    expect(activeItem(input({ pathname: `${base}/sharing` }))).toBe('sharing')
    expect(activeItem(input({ pathname: `${base}/settings` }))).toBe('settings')
    expect(activeItem(input({ pathname: '/support' }))).toBeNull()
  })
})

describe('areaOfItem', () => {
  it('puts every item in its area, and an unknown page in the first', () => {
    expect(areaOfItem('cashbook')).toBe('books')
    expect(areaOfItem('invoices')).toBe('books')
    expect(areaOfItem('table:t1')).toBe('tables')
    expect(areaOfItem('overview')).toBe('reports')
    expect(areaOfItem('statement')).toBe('reports')
    expect(areaOfItem('monthly')).toBe('reports')
    expect(areaOfItem('connections')).toBe('business')
    expect(areaOfItem('sharing')).toBe('business')
    expect(areaOfItem('settings')).toBe('business')
    expect(areaOfItem(null)).toBe('books')
  })
})

describe('compactAmount', () => {
  it('shows whole units, thousands separators and a real minus', () => {
    expect(compactAmount(39150)).toBe('39,150')
    expect(compactAmount(-2150.4)).toBe('−2,150')
    expect(compactAmount(0)).toBe('0')
    expect(compactAmount(-0.2)).toBe('0')
  })
})

describe('initials', () => {
  it('takes two letters of a business or person', () => {
    expect(initials('Linen Shop')).toBe('LS')
    expect(initials('Vaaii')).toBe('VA')
    expect(initials('  Trail  Gear Co ')).toBe('TG')
  })
})
