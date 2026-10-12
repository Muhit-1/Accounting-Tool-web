// Numbers for the rows the user has ticked in the entries table. Nothing is
// saved. Whole-cent maths (integers), like the API's money helpers, so a sum
// of 0.1 + 0.2 is 0.3 and the average never shows float noise.
export interface SelectableRow {
  type: 'INCOME' | 'EXPENSE' | null
  amount: number
}

// 'in' / 'out': every ticked row is the same kind, so the plain amounts are
// shown (as the table shows them, without the sign). 'mixed': both kinds are
// ticked, so amounts are signed (money in +, money out −) and Sum is a net.
export type SelectionKind = 'in' | 'out' | 'mixed'

export interface SelectionSummary {
  count: number
  kind: SelectionKind | null
  sum: number | null
  average: number | null
  min: number | null
  max: number | null
}

const EMPTY: SelectionSummary = { count: 0, kind: null, sum: null, average: null, min: null, max: null }

function toCents(value: number): number {
  return Math.round(value * 100)
}

// Half away from zero, so a negative average rounds like a positive one.
function roundHalfAway(value: number): number {
  return Math.sign(value) * Math.round(Math.abs(value))
}

export function summarizeSelection(rows: SelectableRow[]): SelectionSummary {
  if (rows.length === 0) return EMPTY

  // Like the table: anything that is not money in counts as money out.
  const ins = rows.filter((row) => row.type === 'INCOME').length
  const kind: SelectionKind = ins === rows.length ? 'in' : ins === 0 ? 'out' : 'mixed'

  const cents = rows.map((row) => {
    const amount = toCents(row.amount)
    if (kind !== 'mixed') return amount
    return row.type === 'INCOME' ? amount : -amount
  })
  const total = cents.reduce((sum, value) => sum + value, 0)

  return {
    count: rows.length,
    kind,
    sum: total / 100,
    average: roundHalfAway(total / rows.length) / 100,
    min: Math.min(...cents) / 100,
    max: Math.max(...cents) / 100,
  }
}
