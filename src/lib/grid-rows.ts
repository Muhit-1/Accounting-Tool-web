// Sorting, searching and summing the rows of a grid — pure, so it is tested
// without a browser.

export type SortDir = 1 | -1
export type SortValue = string | number | boolean | null | undefined

function isBlank(value: SortValue): boolean {
  return value === null || value === undefined || value === ''
}

// Numbers by size, true after false, text by natural order ("2" before "10").
export function compareValues(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b
  if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b)
  return String(a).localeCompare(String(b), undefined, { numeric: true, sensitivity: 'base' })
}

// Blank cells go last whichever way it is sorted. The sort is stable, so rows
// with equal values keep the order they came in.
export function sortRows<R>(rows: R[], value: (row: R) => SortValue, dir: SortDir): R[] {
  return rows
    .map((row, index) => ({ row, index, key: value(row) }))
    .sort((a, b) => {
      const aBlank = isBlank(a.key)
      const bBlank = isBlank(b.key)
      if (aBlank || bBlank) return aBlank === bBlank ? a.index - b.index : aBlank ? 1 : -1
      return compareValues(a.key, b.key) * dir || a.index - b.index
    })
    .map((entry) => entry.row)
}

export function searchRows<R>(rows: R[], query: string, text: (row: R) => string): R[] {
  const needle = query.trim().toLowerCase()
  return needle === '' ? rows : rows.filter((row) => text(row).toLowerCase().includes(needle))
}

// Whole-cent sum, so 0.1 + 0.2 shows 0.30 and a long column never drifts.
export function sumMoney(values: (number | null | undefined)[]): number {
  let cents = 0
  for (const value of values) {
    if (typeof value === 'number' && Number.isFinite(value)) cents += Math.round(value * 100)
  }
  return cents / 100
}
