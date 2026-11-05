// Columns with nothing in them, so a table does not show a row of blank columns it may never use. Pure.
//
// A column counts as empty when no loaded row has a value in it. These never count: a column that is worked out
// (formula, link, look-up, roll-up, auto number), a locked or pill column, and a tick box (an unticked box is a
// choice waiting to be made, not an empty cell). Nothing is hidden until the table has a few rows, so a new table
// shows every column it has.

export const MIN_ROWS_TO_HIDE = 3

interface ColumnLike<R> {
  id: string
  type: string
  locked?: boolean
  value: (row: R) => unknown
}

const NEVER_EMPTY = new Set(['calc', 'pill', 'tick'])

const isBlank = (v: unknown) => v === null || v === undefined || (typeof v === 'string' && v.trim() === '')

// `keep` names columns that must stay (the ones a Cash book rule reads: a date nobody filled in is exactly what a person
// needs to see).
export function emptyColumnIds<R>(columns: ColumnLike<R>[], rows: R[], keep: readonly string[] = []): string[] {
  if (rows.length < MIN_ROWS_TO_HIDE) return []
  return columns.filter((c) => !c.locked && !NEVER_EMPTY.has(c.type) && !keep.includes(c.id) && rows.every((row) => isBlank(c.value(row)))).map((c) => c.id)
}
