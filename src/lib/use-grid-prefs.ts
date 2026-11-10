import { useCallback, useState } from 'react'
import {
  loadGridPrefs,
  savePrefs,
  withHiddenColumn,
  withLabel,
  withLetters,
  withShowEmpty,
  withShownColumn,
  type GridPrefs,
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
    setLetters: (on: boolean) => update((p) => withLetters(p, on)),
    setShowEmpty: (on: boolean) => update((p) => withShowEmpty(p, on)),
  }
}

function load(key: string): GridPrefs {
  const store = storage()
  return store ? loadGridPrefs(store, key) : { labels: {}, hidden: [] }
}
