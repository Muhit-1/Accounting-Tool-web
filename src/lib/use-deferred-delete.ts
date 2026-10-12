import { useCallback, useEffect, useRef, useState } from 'react'
import { useToast } from './toast-context'

const UNDO_MS = 7000

// "Delete" that can be taken back: the rows disappear at once, a toast offers
// Undo, and only when it runs out (or the page is left) is the real delete
// sent. Undo therefore loses nothing — no receipt files, no order links.
export function useDeferredDelete<R>(
  rowId: (row: R) => string,
  runDelete: (rows: R[]) => Promise<unknown>,
  describe: (count: number) => string,
) {
  const toast = useToast()
  const [hiddenIds, setHiddenIds] = useState<ReadonlySet<string>>(new Set())
  const pending = useRef(new Map<number, { rows: R[]; timer: number }>())
  const nextKey = useRef(1)
  const latest = useRef({ rowId, runDelete })
  useEffect(() => {
    latest.current = { rowId, runDelete }
  })

  const unhide = useCallback((rows: R[]) => {
    const ids = new Set(rows.map(latest.current.rowId))
    setHiddenIds((current) => new Set([...current].filter((id) => !ids.has(id))))
  }, [])

  const flush = useCallback(
    async (key: number) => {
      const entry = pending.current.get(key)
      if (!entry) return
      window.clearTimeout(entry.timer)
      pending.current.delete(key)
      try {
        await latest.current.runDelete(entry.rows)
      } catch {
        toast('Could not delete. The rows are back.')
      } finally {
        // The list refetched without them (or the delete failed): either way show the truth.
        unhide(entry.rows)
      }
    },
    [toast, unhide],
  )

  const schedule = useCallback(
    (rows: R[]) => {
      if (rows.length === 0) return
      const key = nextKey.current++
      setHiddenIds((current) => new Set([...current, ...rows.map(latest.current.rowId)]))
      const timer = window.setTimeout(() => void flush(key), UNDO_MS)
      pending.current.set(key, { rows, timer })
      toast(describe(rows.length), {
        undo: () => {
          const entry = pending.current.get(key)
          if (!entry) return
          window.clearTimeout(entry.timer)
          pending.current.delete(key)
          unhide(entry.rows)
        },
      })
    },
    [describe, flush, toast, unhide],
  )

  // Leaving the page: do what was asked now, rather than silently dropping it.
  useEffect(() => {
    const entries = pending.current
    return () => {
      for (const key of [...entries.keys()]) void flush(key)
    }
  }, [flush])

  return { hiddenIds, schedule }
}
