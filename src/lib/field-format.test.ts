import { describe, expect, it } from 'vitest'
import { formatConfig, formatDateWith, formatNumber, hasFormat, readFormat } from './field-format'

const field = (format: unknown) => ({ config: { format } as Record<string, unknown> })

describe('readFormat', () => {
  it('keeps valid settings and ignores the rest', () => {
    expect(readFormat(field({ decimals: 1, align: 'right', thousands: false, dateFormat: 'dmy', junk: 1 }))).toEqual({ decimals: 1, align: 'right', thousands: false, dateFormat: 'dmy' })
    expect(readFormat(field({ decimals: 99, align: 'middle' }))).toEqual({})
  })
  it('copes with an old config where format is something else', () => {
    expect(readFormat(field('number'))).toEqual({})
    expect(readFormat({ config: {} })).toEqual({})
    expect(hasFormat(field({ decimals: 0 }))).toBe(true)
    expect(hasFormat(field(null))).toBe(false)
  })
})

describe('formatNumber', () => {
  it('uses the type’s decimals unless the column says otherwise', () => {
    expect(formatNumber(1234.5, {}, 2)).toBe('1,234.50')
    expect(formatNumber(1234.5, { decimals: 0 }, 2)).toBe('1,235')
    expect(formatNumber(1234.5, { decimals: 3 }, 2)).toBe('1,234.500')
  })
  it('can leave the commas out', () => {
    expect(formatNumber(1234567, { thousands: false }, 0)).toBe('1234567')
  })
  it('keeps the minus sign, but not on a rounded zero', () => {
    expect(formatNumber(-12.5, {}, 2)).toBe('-12.50')
    expect(formatNumber(-0.001, { decimals: 1 }, 2)).toBe('0.0')
  })
})

describe('formatDateWith', () => {
  it('writes the four styles', () => {
    expect(formatDateWith('2026-10-05', 'iso')).toBe('2026-10-05')
    expect(formatDateWith('2026-10-05', 'dmy')).toBe('05/10/2026')
    expect(formatDateWith('2026-10-05', 'mdy')).toBe('10/05/2026')
    expect(formatDateWith('2026-10-05', 'long')).toBe('5 Oct 2026')
  })
  it('returns a non-date as it is', () => {
    expect(formatDateWith('soon', 'dmy')).toBe('soon')
  })
})

describe('formatConfig', () => {
  it('leaves an empty format out and keeps what is set', () => {
    expect(formatConfig({})).toEqual({})
    expect(formatConfig({ decimals: 1, align: undefined })).toEqual({ format: { decimals: 1 } })
  })
})
