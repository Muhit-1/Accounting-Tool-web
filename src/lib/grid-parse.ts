// What a person may type into a grid cell, and how it is shown back.
// Everything here is pure, so the rules are tested without a browser.

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// The API refuses dates before 2000; the year range here keeps typos like "12 May 206" out early.
const MIN_YEAR = 2000
const MAX_YEAR = 2100

function pad(value: number): string {
  return String(value).padStart(2, '0')
}

// Real calendar day only: 31 Feb is refused, not rolled into March.
function toIso(year: number, month: number, day: number): string | null {
  if (!Number.isInteger(year) || !Number.isInteger(month) || !Number.isInteger(day)) return null
  if (year < MIN_YEAR || year > MAX_YEAR || month < 1 || month > 12 || day < 1 || day > 31) return null
  const date = new Date(Date.UTC(year, month - 1, day))
  if (date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day) return null
  return `${year}-${pad(month)}-${pad(day)}`
}

function monthFromName(name: string): number | null {
  const index = MONTH_NAMES.findIndex((short) => name.toLowerCase().startsWith(short))
  // "ma" or "x" are not months; need at least the three letters of the short name.
  return index >= 0 && name.length >= 3 ? index + 1 : null
}

// Accepts "12 May 2026", "12-May-2026", "2026-05-12" and "12/05/2026" (day first).
// Returns 'YYYY-MM-DD', or null when it is not a real date.
export function parseDateInput(text: string): string | null {
  const value = text.trim()
  if (value === '') return null

  let match = value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
  if (match) return toIso(Number(match[1]), Number(match[2]), Number(match[3]))

  match = value.match(/^(\d{1,2})[\s\-/.]+([A-Za-z]{3,9})\.?[\s\-/.,]+(\d{4})$/)
  if (match) {
    const month = monthFromName(match[2])
    return month === null ? null : toIso(Number(match[3]), month, Number(match[1]))
  }

  match = value.match(/^(\d{1,2})[/\-.](\d{1,2})[/\-.](\d{4})$/)
  if (match) return toIso(Number(match[3]), Number(match[2]), Number(match[1]))

  return null
}

// 'YYYY-MM-DD' (or a full ISO timestamp) -> "12 May 2026", by its UTC date like everywhere else.
export function formatDateCell(iso: string | null | undefined): string {
  if (!iso) return ''
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})/)
  if (!match) return ''
  return `${Number(match[3])} ${MONTH_LABELS[Number(match[2]) - 1]} ${match[1]}`
}

// Today as 'YYYY-MM-DD' in the viewer's own time zone (a Dhaka evening is still "today").
export function todayIso(now: Date = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

export type MoneyParse = { kind: 'empty' } | { kind: 'ok'; value: number } | { kind: 'error'; message: string }

const MAX_MONEY = 9_999_999_999

// "1,250" -> 1250, "1 250.5" -> 1250.5. Whole cents only; negatives are refused
// (direction is the column, not a sign).
export function parseMoneyInput(text: string): MoneyParse {
  const cleaned = text.replace(/[,\s]/g, '')
  if (cleaned === '') return { kind: 'empty' }
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return { kind: 'error', message: 'Type a number, like 1,250.' }
  if (cleaned.startsWith('-')) return { kind: 'error', message: "The amount can't be negative." }
  if (/\.\d{3,}/.test(cleaned)) return { kind: 'error', message: 'Use at most 2 decimals.' }
  const value = Number(cleaned)
  if (value > MAX_MONEY) return { kind: 'error', message: 'That number is too big.' }
  return { kind: 'ok', value }
}

const MONEY_FORMAT = new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export function formatMoneyCell(value: number | null | undefined): string {
  return value === null || value === undefined ? '' : MONEY_FORMAT.format(value)
}

// Whole numbers ("Months"): 0 to max, no decimals.
export function parseWholeNumber(text: string, max: number): { kind: 'empty' } | { kind: 'ok'; value: number } | { kind: 'error'; message: string } {
  const cleaned = text.replace(/[,\s]/g, '')
  if (cleaned === '') return { kind: 'empty' }
  if (!/^\d+$/.test(cleaned)) return { kind: 'error', message: `Type a whole number from 0 to ${max}.` }
  const value = Number(cleaned)
  return value > max ? { kind: 'error', message: `Type a whole number from 0 to ${max}.` } : { kind: 'ok', value }
}
