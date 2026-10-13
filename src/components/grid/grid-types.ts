import type { ReactNode } from 'react'

// A table is described by its columns; the grid draws, edits, sorts, filters
// and totals whatever it is given. Cash book, Orders, Costs and Invoices are
// all just schemas — and so will the tables people make themselves.
export type ColumnType = 'text' | 'number' | 'money' | 'date' | 'choice' | 'tick' | 'person' | 'calc' | 'pill'

export interface GridChoice {
  value: string
  label: string
  // Shown as a heading over the options that share it.
  group?: string | null
}

export interface GridColumn<R> {
  id: string
  label: string
  type: ColumnType
  // A CSS grid track, e.g. '126px' or 'minmax(250px,1fr)'.
  width: string
  // Worked out by the app (a balance, a total): shows a lock and cannot be typed in.
  locked?: boolean
  // Needed for the totals or the row's identity: cannot be hidden.
  required?: boolean
  tone?: 'in' | 'out'
  // Adds up in the footer and in the selection bar.
  sum?: boolean
  // The value behind the cell: sorted, searched and summed by this.
  value: (row: R) => string | number | boolean | null
  // What the cell shows when it differs from the raw value (formatted money, a date).
  text?: (row: R) => string
  // The list for choice / person cells. `row` is null for the add-row.
  choices?: (row: R | null) => GridChoice[]
  // Last entry of the list, e.g. "＋ New category…". Picking it calls onCommit with NEW_CHOICE.
  newChoice?: string
  // Shown in the empty add-row cell.
  placeholder?: string
  // An ƒ button opens the Amount type popover (money columns).
  fx?: boolean
  // Added to the header menu, e.g. "Manage categories…".
  menu?: { label: string; hint?: string; onSelect: () => void }[]
  // A worked-out cell that is also a way in (the order number opens the order).
  onActivate?: (row: R) => void
  // A link opened from the cell (a proof link).
  href?: (row: R) => string | null
  // This cell cannot be typed in for this row (a calculated amount).
  readOnly?: (row: R) => boolean
  // For a 'pill' column: the colour of the badge ('in' green, 'out' red).
  pillTone?: (row: R) => 'in' | 'out' | 'muted'
  // For a 'choice' column: a colour for the chosen text (a status).
  choiceClass?: (value: string) => string
  // Shown in the add-row for a worked-out column.
  draftNote?: string
  // The footer cell: a fixed text or worked out from the rows in view.
  footer?: (rows: R[]) => string
}

// What onCommit receives for the "＋ New …" entry of a choice list.
export const NEW_CHOICE = '__new'

export interface BulkAction<R> {
  id: string
  label: string
  choices: GridChoice[]
  run: (rows: R[], value: string) => Promise<void> | void
}

export interface AddRowState {
  // What has been typed so far, by column id.
  values: Record<string, string>
  onChange: (columnId: string, text: string) => void
  // Enter or the + button: the table checks the row and adds it.
  onSubmit: () => void
  // The column to flag red after a refused row, with its message in a toast.
  badColumn?: string | null
  // The cell that gets the cursor first (and after a row was added).
  focusColumn: string
  // The "＋ New …" entry of a choice list was picked in the add-row.
  onNewChoice?: (columnId: string) => void
  noun: string
  // Columns that cannot be typed in right now (an amount locked by a calculation).
  disabledColumns?: string[]
  isSubmitting?: boolean
}

export interface RowLock {
  label: string
  onOpen?: () => void
}

export interface FxHooks<R> {
  // The calculation chip under an amount ("1,000 × 5"); row is null for the add-row.
  chip: (row: R | null, columnId: string) => string | null | undefined
  open: (target: { row: R | null; columnId: string; anchor: DOMRect }) => void
}

export interface GridFilter<R> {
  label: string
  choices: GridChoice[]
  match: (row: R, value: string) => boolean
}

export interface GridProps<R> {
  // Where this viewer's column names / hidden columns are kept (see lib/grid-prefs).
  prefsKey: string
  columns: GridColumn<R>[]
  rows: R[]
  rowId: (row: R) => string
  // Locked (gold) rows: posted by another table, edited at the source.
  rowLock?: (row: R) => RowLock | null
  // The column that carries the link chip on a locked row.
  lockChipColumn?: string
  // Returns a plain-words problem to show in the cell, or nothing when saved.
  onCommit: (row: R, columnId: string, text: string) => Promise<string | null | undefined | void>
  addRow?: AddRowState
  fx?: FxHooks<R>
  // Delete the ticked rows (the caller offers Undo).
  onDeleteRows?: (rows: R[]) => void
  bulkActions?: BulkAction<R>[]
  filter?: GridFilter<R>
  // A line above the first row ("Balance brought forward"): text per column id.
  // Gets the rows in view and whether the viewer chose a sort order.
  leadRow?: (rows: R[], sorted: boolean) => Record<string, string> | null
  // Pasting several lines into any cell hands the text to the caller.
  onPasteText?: (text: string) => void
  toolbarLeft?: ReactNode
  toolbarRight?: ReactNode
  // The table's name; adds an Export button (.xlsx / .csv of the rows and columns in view).
  exportName?: string
  // Shown when the table has no rows at all.
  emptyTitle: string
  emptyHint: string
  // Name of one row kind in sentences ("entry", "order").
  noun: string
  // Row ids hidden for a moment (deleted, waiting for Undo to run out).
  hiddenIds?: ReadonlySet<string>
}
