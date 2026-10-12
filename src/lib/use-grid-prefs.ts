import { useCallback, useState } from 'react'
import {
  loadGridPrefs,
  loadTablePrefs,
  savePrefs,
  withHiddenColumn,
  withHiddenTable,
  withLabel,
  withShownColumn,
  withShownTable,
  withTableName,
  type GridPrefs,
  type TablePrefs,
} from './grid-prefs'

function storage(): Storage | null {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

// This viewer's column names and hidden columns for one table. They live in
// this browser only (see lib/grid-prefs.ts) and the grid works without them.
export function useGridPrefs(key: string) {
  const [state, setState] = useState(() => ({ key, prefs: load(key) }))
  // A different table or business: read its preferences (derived state, not an effect).
  if (state.key !== key) setState({ key, prefs: load(key) })

  const update = useCallback(
    (change: (current: GridPrefs) => GridPrefs) => {
      setState((current) => {
        const next = change(current.prefs)
        const store = storage()
        if (store) savePrefs(store, current.key, next)
        return { key: current.key, prefs: next }
      })
    },
    [],
  )

  return {
    prefs: state.prefs,
    rename: (columnId: string, label: string, original: string) => update((p) => withLabel(p, columnId, label, original)),
    hide: (columnId: string) => update((p) => withHiddenColumn(p, columnId)),
    show: (columnId: string | 'all') => update((p) => withShownColumn(p, columnId)),
  }
}

function load(key: string): GridPrefs {
  const store = storage()
  return store ? loadGridPrefs(store, key) : { labels: {}, hidden: [] }
}

function loadTables(key: string): TablePrefs {
  const store = storage()
  return store ? loadTablePrefs(store, key) : { names: {}, hidden: [] }
}

// This viewer's table names and hidden tables (the tab bar), same rules.
export function useTablePrefs(key: string) {
  const [state, setState] = useState(() => ({ key, prefs: loadTables(key) }))
  if (state.key !== key) setState({ key, prefs: loadTables(key) })

  const update = useCallback((change: (current: TablePrefs) => TablePrefs) => {
    setState((current) => {
      const next = change(current.prefs)
      const store = storage()
      if (store) savePrefs(store, current.key, next)
      return { key: current.key, prefs: next }
    })
  }, [])

  return {
    prefs: state.prefs,
    rename: (tableKey: string, name: string, original: string) => update((p) => withTableName(p, tableKey, name, original)),
    hide: (tableKey: string) => update((p) => withHiddenTable(p, tableKey)),
    show: (tableKey: string) => update((p) => withShownTable(p, tableKey)),
  }
}
