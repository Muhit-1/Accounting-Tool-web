// The "Amount type" choice on the entry form: the live preview of what the
// server will save. The server recomputes every non-FIXED amount from the same
// boxes (accounting-api/src/common/calc.ts) — same maths, same rounding, same
// messages, tested against one shared table of cases — so what you see here is
// what gets stored. No formula text is ever parsed: a fixed set of types, each
// with fixed arithmetic.
export const AMOUNT_TYPES = ['FIXED', 'SUM', 'MULTIPLY', 'RATE_MONTHS', 'SPLIT', 'PERCENT', 'AVERAGE'] as const
export type AmountType = (typeof AMOUNT_TYPES)[number]

export const MAX_AMOUNT_INPUTS = 10
// The form offers up to 6 boxes for the list types; the server accepts up to 10.
export const MAX_LIST_BOXES = 6
export const MAX_INPUT_ABS = 1_000_000_000
export const MAX_AMOUNT = 9_999_999_999

export const AMOUNT_TYPE_OPTIONS: { value: AmountType; label: string }[] = [
  { value: 'FIXED', label: 'Fixed amount' },
  { value: 'SUM', label: 'Add several numbers' },
  { value: 'MULTIPLY', label: 'Quantity × Unit price' },
  { value: 'RATE_MONTHS', label: 'Monthly rate × Months' },
  { value: 'SPLIT', label: 'Total ÷ Number of people' },
  { value: 'PERCENT', label: 'Percent of a number' },
  { value: 'AVERAGE', label: 'Average of several numbers' },
]

const TWO_BOX_LABELS: Partial<Record<AmountType, [string, string]>> = {
  MULTIPLY: ['Quantity', 'Unit price'],
  RATE_MONTHS: ['Monthly rate', 'Months'],
  SPLIT: ['Total', 'Number of people'],
  PERCENT: ['Percent', 'Of this number'],
}

export class CalcError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CalcError'
  }
}

export function isAmountType(value: unknown): value is AmountType {
  return typeof value === 'string' && (AMOUNT_TYPES as readonly string[]).includes(value)
}

export function isListType(type: AmountType): boolean {
  return type === 'SUM' || type === 'AVERAGE'
}

// How many boxes a type starts with.
export function initialBoxCount(type: AmountType): number {
  return type === 'FIXED' ? 1 : 2
}

export function boxLabel(type: AmountType, index: number): string {
  if (isListType(type)) return `Number ${index + 1}`
  return TWO_BOX_LABELS[type]?.[index] ?? `Number ${index + 1}`
}

// Whole-cent rounding, half up — see the note on roundToCents in the API's calc.ts.
function roundToCents(value: number): number {
  if (!Number.isFinite(value)) return value
  const clean = String(Number(value.toPrecision(12)))
  if (clean.includes('e')) return Math.round(value * 100) / 100
  return Math.round(Number(`${clean}e2`)) / 100
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function assertInputs(type: AmountType, inputs: unknown): number[] {
  if (!Array.isArray(inputs) || inputs.length === 0) {
    throw new CalcError('Fill in the boxes to calculate the amount.')
  }
  if (inputs.length > MAX_AMOUNT_INPUTS) {
    throw new CalcError(`Use at most ${MAX_AMOUNT_INPUTS} numbers.`)
  }
  for (const value of inputs) {
    if (typeof value !== 'number' || !Number.isFinite(value)) {
      throw new CalcError('Every box must be a number.')
    }
    if (Math.abs(value) > MAX_INPUT_ABS) {
      throw new CalcError('One of the numbers is too big.')
    }
  }
  const count = inputs.length
  if (type === 'FIXED' && count !== 1) {
    throw new CalcError('A fixed amount has one number.')
  }
  if (isListType(type) && count < 2) {
    throw new CalcError('Enter at least two numbers.')
  }
  if (!isListType(type) && type !== 'FIXED' && count !== 2) {
    throw new CalcError('Fill in both boxes.')
  }
  return inputs as number[]
}

// Throws CalcError, with a plain-words message, for anything that cannot be saved.
export function computeAmount(type: string, inputs: unknown): number {
  if (!isAmountType(type)) {
    throw new CalcError('Unknown amount type.')
  }
  const values = assertInputs(type, inputs)
  const [a, b] = values

  let raw: number
  switch (type) {
    case 'FIXED':
      raw = a
      break
    case 'SUM':
      raw = sum(values)
      break
    case 'AVERAGE':
      raw = sum(values) / values.length
      break
    case 'MULTIPLY':
    case 'RATE_MONTHS':
      raw = a * b
      break
    case 'SPLIT':
      if (b === 0) {
        throw new CalcError("Number of people can't be 0.")
      }
      raw = a / b
      break
    case 'PERCENT':
      raw = (a * b) / 100
      break
  }

  const result = roundToCents(raw)
  if (!Number.isFinite(result) || result <= 0) {
    throw new CalcError('The amount must be more than 0.')
  }
  if (result > MAX_AMOUNT) {
    throw new CalcError('The amount is too big.')
  }
  return result
}

// "1,000" -> 1000. Empty or not a number -> null.
export function parseBox(text: string): number | null {
  const cleaned = text.replace(/,/g, '').trim()
  if (cleaned === '') return null
  const value = Number(cleaned)
  return Number.isFinite(value) ? value : null
}

const PLAIN = new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 })
const FIXED_2 = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatPlain(value: number): string {
  return PLAIN.format(value)
}

export function formatFixed2(value: number): string {
  return FIXED_2.format(value)
}

// The calculation in words and symbols, e.g. "1,000 × 5". Display only.
export function describeCalculation(type: AmountType, inputs: number[]): string {
  const n = inputs.map(formatPlain)
  switch (type) {
    case 'FIXED':
      return n[0] ?? ''
    case 'SUM':
      return n.join(' + ')
    case 'AVERAGE':
      return `average of ${n.join(', ')}`
    case 'MULTIPLY':
      return `${n[0]} × ${n[1]}`
    case 'RATE_MONTHS':
      return `${n[0]} × ${n[1]} months`
    case 'SPLIT':
      return `${n[0]} ÷ ${n[1]}`
    case 'PERCENT':
      return `${n[0]}% of ${n[1]}`
  }
}

export interface CalcPreview {
  amount: number | null
  // "1,000 × 5" (no result), for the memo; '' until the boxes are valid.
  calculation: string
  // "1,000 × 5 = 5,000.00" while valid, otherwise the plain message to show.
  line: string
  error: string | null
  // True when the only problem is that a box is still empty (shown calmly, not in red).
  incomplete: boolean
}

// What the form shows for the current boxes. `boxes` is the raw text typed.
export function previewAmount(type: AmountType, boxes: string[]): CalcPreview {
  if (boxes.some((text) => text.trim() === '')) {
    const message = 'Fill in every box.'
    return { amount: null, calculation: '', line: message, error: message, incomplete: true }
  }
  const parsed = boxes.map(parseBox)
  if (parsed.some((value) => value === null)) {
    const message = 'Every box must be a number.'
    return { amount: null, calculation: '', line: message, error: message, incomplete: false }
  }
  const values = parsed as number[]
  try {
    const amount = computeAmount(type, values)
    const calculation = describeCalculation(type, values)
    return { amount, calculation, line: `${calculation} = ${formatFixed2(amount)}`, error: null, incomplete: false }
  } catch (err) {
    if (err instanceof CalcError) {
      return { amount: null, calculation: '', line: err.message, error: err.message, incomplete: false }
    }
    throw err
  }
}

export const MAX_MEMO_LENGTH = 1000

// Adds " · 1,000 × 5" to a memo. Returns null when it would not fit the
// memo's length limit, so the form can say so instead of cutting it off.
export function appendCalculationToMemo(memo: string, calculation: string, max = MAX_MEMO_LENGTH): string | null {
  const base = memo.trim()
  if (calculation === '' || base.endsWith(calculation)) return base
  const joined = base === '' ? calculation : `${base} · ${calculation}`
  return joined.length <= max ? joined : null
}
