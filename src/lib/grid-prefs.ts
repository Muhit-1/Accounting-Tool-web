// Per-viewer table preferences: renamed columns, hidden columns, renamed and
// hidden tables. Kept in this browser's localStorage only, per user per
// business (so two people on one computer, or two businesses, never share
// them) — they are conveniences, never data, and the page works without them.

export interface GridPrefs {
  // column id -> the name this viewer gave it
  labels: Record<string, string>
  hidden: string[]
}

export interface TablePrefs {
  // table key -> the name this viewer gave it
  names: Record<string, string>
  hidden: string[]
}

type ReadableStorage = Pick<Storage, 'getItem'>
type WritableStorage = Pick<Storage, 'setItem'>

export const EMPTY_GRID_PREFS: GridPrefs = { labels: {}, hidden: [] }
export const EMPTY_TABLE_PREFS: TablePrefs = { names: {}, hidden: [] }

export function gridPrefsKey(userId: string, businessId: string, tableKey: string): string {
  return `grid-prefs:v1:${userId}:${businessId}:${tableKey}`
}

export function tablePrefsKey(userId: string, businessId: string): string {
  return `table-prefs:v1:${userId}:${businessId}`
}

function isStringRecord(value: unknown): value is Record<string, string> {
  return (
    value !== null &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    Object.values(value as object).every((entry) => typeof entry === 'string')
  )
}

function isStringList(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string')
}

function readJson(storage: ReadableStorage, key: string): unknown {
  try {
    const raw = storage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    // Blocked or corrupt storage: behave as if nothing was saved.
    return null
  }
}

export function loadGridPrefs(storage: ReadableStorage, key: string): GridPrefs {
  const stored = readJson(storage, key) as Partial<GridPrefs> | null
  return {
    labels: stored && isStringRecord(stored.labels) ? stored.labels : {},
    hidden: stored && isStringList(stored.hidden) ? stored.hidden : [],
  }
}

export function loadTablePrefs(storage: ReadableStorage, key: string): TablePrefs {
  const stored = readJson(storage, key) as Partial<TablePrefs> | null
  return {
    names: stored && isStringRecord(stored.names) ? stored.names : {},
    hidden: stored && isStringList(stored.hidden) ? stored.hidden : [],
  }
}

export function savePrefs(storage: WritableStorage, key: string, prefs: GridPrefs | TablePrefs): void {
  try {
    storage.setItem(key, JSON.stringify(prefs))
  } catch {
    // ignore — per-viewer convenience only
  }
}

export const MAX_LABEL_LENGTH = 40

// An empty name (or the original one) removes the rename.
export function withLabel(prefs: GridPrefs, columnId: string, label: string, original: string): GridPrefs {
  const next = { ...prefs.labels }
  const clean = label.trim().slice(0, MAX_LABEL_LENGTH)
  if (clean === '' || clean === original) delete next[columnId]
  else next[columnId] = clean
  return { ...prefs, labels: next }
}

export function withHiddenColumn(prefs: GridPrefs, columnId: string): GridPrefs {
  return prefs.hidden.includes(columnId) ? prefs : { ...prefs, hidden: [...prefs.hidden, columnId] }
}

export function withShownColumn(prefs: GridPrefs, columnId: string | 'all'): GridPrefs {
  return { ...prefs, hidden: columnId === 'all' ? [] : prefs.hidden.filter((id) => id !== columnId) }
}

export function withTableName(prefs: TablePrefs, tableKey: string, name: string, original: string): TablePrefs {
  const next = { ...prefs.names }
  const clean = name.trim().slice(0, MAX_LABEL_LENGTH)
  if (clean === '' || clean === original) delete next[tableKey]
  else next[tableKey] = clean
  return { ...prefs, names: next }
}

export function withHiddenTable(prefs: TablePrefs, tableKey: string): TablePrefs {
  return prefs.hidden.includes(tableKey) ? prefs : { ...prefs, hidden: [...prefs.hidden, tableKey] }
}

export function withShownTable(prefs: TablePrefs, tableKey: string): TablePrefs {
  return { ...prefs, hidden: prefs.hidden.filter((key) => key !== tableKey) }
}
