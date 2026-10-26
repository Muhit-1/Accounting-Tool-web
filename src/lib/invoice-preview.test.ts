import { describe, expect, it } from 'vitest'
import { addDaysIso, paymentRows, previewLines, samePayment, type PaymentDetails } from './invoice-preview'

describe('previewLines', () => {
  it('works out each amount and the subtotal in whole cents', () => {
    const { lines, subtotal } = previewLines([
      { description: 'Embroidery', quantity: '3', rate: '33.33' },
      { description: 'Delivery', quantity: '1', rate: '120' },
    ])
    expect(lines.map((l) => l.amount)).toEqual([99.99, 120])
    expect(subtotal).toBe(219.99)
  })

  it('leaves out lines nobody has started', () => {
    const { lines, subtotal } = previewLines([
      { description: 'Work', quantity: '2', rate: '50' },
      { description: '', quantity: '1', rate: '' },
      { description: '   ', quantity: '5', rate: '0' },
    ])
    expect(lines).toHaveLength(1)
    expect(subtotal).toBe(100)
  })

  it('treats unreadable numbers as nothing instead of failing', () => {
    const { lines, subtotal } = previewLines([{ description: 'x', quantity: 'abc', rate: '10' }])
    expect(lines[0].amount).toBe(0)
    expect(subtotal).toBe(0)
  })

  it('keeps a line that has a rate but no words yet', () => {
    expect(previewLines([{ description: '', quantity: '1', rate: '10' }]).lines).toHaveLength(1)
  })
})

const pay: PaymentDetails = { accountName: 'Shop', accountNumber: '123', routingNumber: '', swiftCode: 'DBBL', branch: '  ' }

describe('paymentRows', () => {
  it('lists only what is filled in, in the order the PDF prints', () => {
    expect(paymentRows(pay)).toEqual([
      { label: 'A/c name', value: 'Shop' },
      { label: 'A/c no', value: '123' },
      { label: 'Swift Code', value: 'DBBL' },
    ])
  })

  it('gives nothing when nothing is filled in', () => {
    expect(paymentRows({ accountName: '', accountNumber: '', routingNumber: '', swiftCode: '', branch: '' })).toEqual([])
  })
})

describe('samePayment', () => {
  it('ignores spaces at the ends', () => {
    expect(samePayment(pay, { ...pay, accountName: ' Shop ' })).toBe(true)
    expect(samePayment(pay, { ...pay, accountNumber: '124' })).toBe(false)
  })
})

describe('addDaysIso', () => {
  it('adds days across month and year ends', () => {
    expect(addDaysIso('2026-10-26', 30)).toBe('2026-11-25')
    expect(addDaysIso('2026-12-20', 15)).toBe('2027-01-04')
    expect(addDaysIso('2028-02-28', 1)).toBe('2028-02-29')
  })

  it('gives an empty text for a day it cannot read', () => {
    expect(addDaysIso('', 30)).toBe('')
    expect(addDaysIso('not a day', 30)).toBe('')
  })
})
