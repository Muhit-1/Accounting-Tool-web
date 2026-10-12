// Turning pasted (or file) text into rows for any table. Nothing here knows
// about Cash book or Orders: a table says which columns it takes (targets,
// with the other names people give them) and how to check one row; this file
// does the reading, the header matching and the duplicate counting.

// One column a pasted cell can land in.
export interface ImportTarget {
  id: string
  label: string
  // Other names the same column goes by in other sheets ("What for", "Narration").
  synonyms?: string[]
}

export const MAX_IMPORT_ROWS = 1000

// Excel and Google Sheets copy tab-separated text; a saved CSV uses commas.
// Quoted cells may hold the separator, quotes ("" is one quote) and line breaks.
export function parseDelimited(input: string): string[][] {
  const text = input.replace(/^﻿/, '').replace(/\r\n?/g, '\n').replace(/\n+$/, '')
  if (text.trim() === '') return []
  const delimiter = text.includes('\t') ? '\t' : ','

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"'
          i += 1
        } else {
          quoted = false
        }
      } else {
        cell += char
      }
    } else if (char === '"' && cell === '') {
      quoted = true
    } else if (char === delimiter) {
      row.push(cell)
      cell = ''
    } else if (char === '\n') {
      row.push(cell)
      rows.push(row)
      row = []
      cell = ''
    } else {
      cell += char
    }
  }
  row.push(cell)
  rows.push(row)
  return rows.map((cells) => cells.map((value) => value.trim())).filter((cells) => cells.some((value) => value !== ''))
}

function normalizeHeader(text: string): string {
  return text.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
}

// Which target (if any) each header names. A target is used once; the label
// wins over a synonym when both could apply.
export function matchHeaders(headers: string[], targets: ImportTarget[]): (string | null)[] {
  const used = new Set<string>()
  const result: (string | null)[] = headers.map(() => null)
  const names = headers.map(normalizeHeader)
  const pass = (accepts: (target: ImportTarget, name: string) => boolean) => {
    names.forEach((name, index) => {
      if (result[index] !== null || name === '') return
      const hit = targets.find((target) => !used.has(target.id) && accepts(target, name))
      if (hit) {
        used.add(hit.id)
        result[index] = hit.id
      }
    })
  }
  pass((target, name) => normalizeHeader(target.label) === name)
  pass((target, name) => (target.synonyms ?? []).some((synonym) => normalizeHeader(synonym) === name))
  return result
}

// A first row that names at least two columns is a header row.
export function looksLikeHeader(row: string[], targets: ImportTarget[]): boolean {
  return matchHeaders(row, targets).filter((id) => id !== null).length >= 2
}

export interface PreparedRows {
  headers: string[] | null
  // The target id of each column of `rows` (null = left out).
  mapping: (string | null)[]
  rows: string[][]
}

// Splits off a header row when there is one and works out where each column
// goes: by header name, or — with no header — in the table's own column order.
export function prepareRows(rows: string[][], targets: ImportTarget[]): PreparedRows {
  if (rows.length === 0) return { headers: null, mapping: [], rows: [] }
  const first = rows[0]
  if (looksLikeHeader(first, targets)) {
    return { headers: first, mapping: matchHeaders(first, targets), rows: rows.slice(1) }
  }
  const width = Math.max(...rows.map((cells) => cells.length))
  return { headers: null, mapping: Array.from({ length: width }, (_, index) => targets[index]?.id ?? null), rows }
}

// One row of cells -> its values by target id.
export function rowValues(cells: string[], mapping: (string | null)[]): Record<string, string> {
  const values: Record<string, string> = {}
  mapping.forEach((id, index) => {
    if (id && cells[index] !== undefined) values[id] = cells[index]
  })
  return values
}

export type RowCheck<T> = { status: 'ok'; row: T } | { status: 'error'; message: string } | { status: 'duplicate' }

// Rows that are already in the table are skipped, counted like a shelf: if the
// table holds one copy of a row and the paste has two identical ones, the first
// is "already there" and the second is new. `existing` is consumed.
export function markDuplicates<T>(
  checked: { check: RowCheck<T>; key: string | null }[],
  existing: Map<string, number>,
): RowCheck<T>[] {
  const left = new Map(existing)
  return checked.map(({ check, key }) => {
    if (check.status !== 'ok' || key === null) return check
    const count = left.get(key) ?? 0
    if (count > 0) {
      left.set(key, count - 1)
      return { status: 'duplicate' }
    }
    return check
  })
}

export function countKeys(keys: string[]): Map<string, number> {
  const counts = new Map<string, number>()
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1)
  return counts
}

export interface ImportOptions {
  // Cash book: make a category for names that do not exist yet.
  createCategories: boolean
}

export interface CommitResult {
  batchId: string
  created: number
}

// What a table gives the paste / import screens, so they stay the same for
// every table: which columns it takes, how one row is checked, what already
// exists (for "Already there"), and how rows are saved and taken back.
export interface ImportAdapter<Row> {
  // For sentences: "entries" / "entry", "orders" / "order".
  noun: string
  singular: string
  title: string
  targets: ImportTarget[]
  // Shows the "Create categories that don't exist yet" tick box.
  offersNewCategories?: boolean
  // Checks every row (given as values by target id); `key` is what makes a row "the same" as an existing one.
  check: (list: Record<string, string>[], options: ImportOptions) => { check: RowCheck<Row>; key: string | null }[]
  existing: Map<string, number>
  // One line about the ready rows ("46,966.00 money in, 46,041.00 money out").
  summarize?: (rows: Row[]) => string | null
  // Saves all the rows or none; `batchId` is what Undo removes.
  commit: (rows: Row[], options: ImportOptions) => Promise<CommitResult>
  undo: (batchId: string) => Promise<unknown>
}
