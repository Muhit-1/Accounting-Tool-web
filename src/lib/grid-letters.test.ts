import { describe, expect, it } from 'vitest'
import { columnLetter, fillerRowCount } from './grid-letters'

describe('columnLetter', () => {
  it('counts like a spreadsheet', () => {
    expect(columnLetter(0)).toBe('A')
    expect(columnLetter(1)).toBe('B')
    expect(columnLetter(25)).toBe('Z')
    expect(columnLetter(26)).toBe('AA')
    expect(columnLetter(27)).toBe('AB')
    expect(columnLetter(51)).toBe('AZ')
    expect(columnLetter(52)).toBe('BA')
    expect(columnLetter(701)).toBe('ZZ')
    expect(columnLetter(702)).toBe('AAA')
  })

  it('never fails on odd input', () => {
    expect(columnLetter(-3)).toBe('A')
    expect(columnLetter(2.9)).toBe('C')
  })
})

describe('fillerRowCount', () => {
  it('fills up to the minimum, counting the add-row', () => {
    expect(fillerRowCount(24, 0, true)).toBe(23)
    expect(fillerRowCount(24, 10, true)).toBe(13)
    expect(fillerRowCount(24, 10, false)).toBe(14)
  })

  it('adds nothing once there are enough rows', () => {
    expect(fillerRowCount(24, 23, true)).toBe(0)
    expect(fillerRowCount(24, 500, true)).toBe(0)
    expect(fillerRowCount(0, 0, true)).toBe(0)
  })
})
