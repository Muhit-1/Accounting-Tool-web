import { describe, expect, it } from 'vitest'
import { CALC_CASES } from './calc-cases'
import {
  appendCalculationToMemo,
  boxLabel,
  CalcError,
  computeAmount,
  describeCalculation,
  parseBox,
  previewAmount,
} from './calc'

// The API tests the same table, so the live preview and the saved amount agree.
describe('computeAmount (shared cases with the API)', () => {
  it.each(CALC_CASES)('$name', ({ type, inputs, expected }) => {
    if (typeof expected === 'string') {
      expect(() => computeAmount(type, inputs)).toThrow(CalcError)
      expect(() => computeAmount(type, inputs)).toThrow(expected)
    } else {
      expect(computeAmount(type, inputs)).toBe(expected)
    }
  })
})

describe('boxes', () => {
  it('names the boxes as the form shows them', () => {
    expect([boxLabel('MULTIPLY', 0), boxLabel('MULTIPLY', 1)]).toEqual(['Quantity', 'Unit price'])
    expect([boxLabel('RATE_MONTHS', 0), boxLabel('RATE_MONTHS', 1)]).toEqual(['Monthly rate', 'Months'])
    expect([boxLabel('SPLIT', 0), boxLabel('SPLIT', 1)]).toEqual(['Total', 'Number of people'])
    expect([boxLabel('PERCENT', 0), boxLabel('PERCENT', 1)]).toEqual(['Percent', 'Of this number'])
    expect([boxLabel('SUM', 0), boxLabel('SUM', 5)]).toEqual(['Number 1', 'Number 6'])
    expect(boxLabel('AVERAGE', 2)).toBe('Number 3')
  })

  it('reads typed text, allowing thousands commas', () => {
    expect(parseBox('1,000')).toBe(1000)
    expect(parseBox(' 2.5 ')).toBe(2.5)
    expect(parseBox('')).toBeNull()
    expect(parseBox('abc')).toBeNull()
    expect(parseBox('1+2')).toBeNull()
    expect(parseBox('Infinity')).toBeNull()
  })
})

describe('previewAmount', () => {
  it('shows the equation and the amount', () => {
    const preview = previewAmount('MULTIPLY', ['1000', '5'])
    expect(preview.amount).toBe(5000)
    expect(preview.line).toBe('1,000 × 5 = 5,000.00')
    expect(preview.calculation).toBe('1,000 × 5')
    expect(preview.error).toBeNull()
  })

  it('describes each type', () => {
    expect(describeCalculation('SUM', [580, 200, 988])).toBe('580 + 200 + 988')
    expect(describeCalculation('RATE_MONTHS', [7500, 5])).toBe('7,500 × 5 months')
    expect(describeCalculation('SPLIT', [9000, 3])).toBe('9,000 ÷ 3')
    expect(describeCalculation('PERCENT', [5, 20000])).toBe('5% of 20,000')
    expect(describeCalculation('AVERAGE', [250, 500, 300])).toBe('average of 250, 500, 300')
  })

  it('an empty box blocks Save, calmly', () => {
    const preview = previewAmount('MULTIPLY', ['1000', ''])
    expect(preview.amount).toBeNull()
    expect(preview.error).toBe('Fill in every box.')
    expect(preview.incomplete).toBe(true)
  })

  it('text in a box blocks Save', () => {
    const preview = previewAmount('SUM', ['1', 'two'])
    expect(preview.amount).toBeNull()
    expect(preview.error).toBe('Every box must be a number.')
    expect(preview.incomplete).toBe(false)
  })

  it('divide by zero blocks Save with a plain message', () => {
    const preview = previewAmount('SPLIT', ['9000', '0'])
    expect(preview.amount).toBeNull()
    expect(preview.error).toBe("Number of people can't be 0.")
  })

  it('a result that is not above 0 blocks Save', () => {
    expect(previewAmount('PERCENT', ['10', '0']).error).toBe('The amount must be more than 0.')
    expect(previewAmount('MULTIPLY', ['-3', '4']).error).toBe('The amount must be more than 0.')
  })

  it('never uses eval or Function (no expression is parsed)', () => {
    expect(previewAmount('SUM', ['1+1', '2']).error).toBe('Every box must be a number.')
    expect(previewAmount('SUM', ['process.exit()', '2']).error).toBe('Every box must be a number.')
  })
})

describe('appendCalculationToMemo', () => {
  it('adds the calculation after the memo', () => {
    expect(appendCalculationToMemo('Stickers for packaging', '1,000 × 5')).toBe('Stickers for packaging · 1,000 × 5')
  })

  it('is just the calculation when the memo is empty', () => {
    expect(appendCalculationToMemo('  ', '1,000 × 5')).toBe('1,000 × 5')
  })

  it('does not add it twice', () => {
    expect(appendCalculationToMemo('Stickers · 1,000 × 5', '1,000 × 5')).toBe('Stickers · 1,000 × 5')
  })

  it('returns null when it would pass the memo length limit', () => {
    expect(appendCalculationToMemo('x'.repeat(995), '1,000 × 5')).toBeNull()
    expect(appendCalculationToMemo('x'.repeat(980), '1,000 × 5')).toHaveLength(980 + 3 + 9)
  })
})
