import { describe, expect, it } from 'vitest'
import { formatDateCell, formatMoneyCell, futureDateError, parseDateInput, parseMoneyInput, parseWholeNumber, todayIso } from './grid-parse'

describe('parseDateInput', () => {
  it.each([
    ['12 May 2026', '2026-05-12'],
    ['12 may 2026', '2026-05-12'],
    ['1 Oct 2026', '2026-10-01'],
    ['12-May-2026', '2026-05-12'],
    ['12 May, 2026', '2026-05-12'],
    ['12 September 2026', '2026-09-12'],
    ['2026-05-12', '2026-05-12'],
    ['2026-5-2', '2026-05-02'],
    ['12/05/2026', '2026-05-12'],
    ['1/2/2026', '2026-02-01'],
    ['  12 May 2026  ', '2026-05-12'],
  ])('reads %s', (text, iso) => {
    expect(parseDateInput(text)).toBe(iso)
  })

  it('reads 12/05/2026 as day first, not month first', () => {
    expect(parseDateInput('12/05/2026')).toBe('2026-05-12')
    expect(parseDateInput('05/12/2026')).toBe('2026-12-05')
  })

  it.each(['', 'soon', '31 Feb 2026', '31/04/2026', '2026-13-01', '0 May 2026', '12 Foo 2026', '12 May 26', '12 May 1999', '12 May 2101', '2026-02-30', '12 Ma 2026'])(
    'refuses %j',
    (text) => {
      expect(parseDateInput(text)).toBeNull()
    },
  )

  it('accepts 29 Feb only in a leap year', () => {
    expect(parseDateInput('29 Feb 2028')).toBe('2028-02-29')
    expect(parseDateInput('29 Feb 2026')).toBeNull()
  })
})

describe('formatDateCell', () => {
  it('shows the UTC calendar date of a timestamp', () => {
    expect(formatDateCell('2026-05-12')).toBe('12 May 2026')
    expect(formatDateCell('2026-05-11T00:00:00.000Z')).toBe('11 May 2026')
    expect(formatDateCell('2026-12-01T23:59:59.000Z')).toBe('1 Dec 2026')
  })
  it('is empty for nothing', () => {
    expect(formatDateCell(null)).toBe('')
    expect(formatDateCell(undefined)).toBe('')
    expect(formatDateCell('')).toBe('')
  })
})

describe('todayIso', () => {
  it('uses the local calendar day', () => {
    expect(todayIso(new Date(2026, 9, 13, 23, 30))).toBe('2026-10-13')
    expect(todayIso(new Date(2026, 0, 5, 0, 5))).toBe('2026-01-05')
  })
})

describe('futureDateError', () => {
  const now = new Date(2026, 9, 13, 10, 0)
  it('allows today and tomorrow (the server may be behind), refuses later', () => {
    expect(futureDateError('2026-10-13', now)).toBeNull()
    expect(futureDateError('2026-10-14', now)).toBeNull()
    expect(futureDateError('2026-10-15', now)).toBe("Entries can't be dated in the future.")
  })
  it('allows any past date', () => {
    expect(futureDateError('2000-01-01', now)).toBeNull()
  })
})

describe('parseMoneyInput', () => {
  it.each([
    ['1,250', 1250],
    ['1250', 1250],
    ['1,250.5', 1250.5],
    ['0.5', 0.5],
    ['46,966.00', 46966],
    ['1 250', 1250],
    ['0', 0],
  ])('reads %s', (text, value) => {
    expect(parseMoneyInput(text)).toEqual({ kind: 'ok', value })
  })

  it('treats blank as empty', () => {
    expect(parseMoneyInput('')).toEqual({ kind: 'empty' })
    expect(parseMoneyInput('  ')).toEqual({ kind: 'empty' })
  })

  it.each(['abc', '12abc', '1.2.3', '12,50x', '--5'])('refuses %j as not a number', (text) => {
    expect(parseMoneyInput(text)).toMatchObject({ kind: 'error', message: 'Type a number, like 1,250.' })
  })

  it('refuses negatives, 3 decimals and huge numbers with their own messages', () => {
    expect(parseMoneyInput('-5')).toMatchObject({ kind: 'error', message: "The amount can't be negative." })
    expect(parseMoneyInput('1.234')).toMatchObject({ kind: 'error', message: 'Use at most 2 decimals.' })
    expect(parseMoneyInput('10,000,000,000')).toMatchObject({ kind: 'error', message: 'That number is too big.' })
  })
})

describe('formatMoneyCell', () => {
  it('shows two decimals and thousands separators', () => {
    expect(formatMoneyCell(1250)).toBe('1,250.00')
    expect(formatMoneyCell(0.5)).toBe('0.50')
    expect(formatMoneyCell(46966)).toBe('46,966.00')
  })
  it('is empty for nothing but not for zero', () => {
    expect(formatMoneyCell(null)).toBe('')
    expect(formatMoneyCell(undefined)).toBe('')
    expect(formatMoneyCell(0)).toBe('0.00')
  })
})

describe('parseWholeNumber', () => {
  it('reads whole numbers up to the limit', () => {
    expect(parseWholeNumber('7', 600)).toEqual({ kind: 'ok', value: 7 })
    expect(parseWholeNumber('', 600)).toEqual({ kind: 'empty' })
    expect(parseWholeNumber('601', 600)).toMatchObject({ kind: 'error' })
    expect(parseWholeNumber('1.5', 600)).toMatchObject({ kind: 'error' })
    expect(parseWholeNumber('-1', 600)).toMatchObject({ kind: 'error' })
  })
})
