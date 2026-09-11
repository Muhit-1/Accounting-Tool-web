import { useState } from 'react'

export type ViewMode = 'grid' | 'list'

// Reusable across any listing page (accounts, invoices, ...) — remembers the
// viewer's last choice per page via `storageKey` so switching views sticks
// across visits without needing a backend preference.
export function useViewMode(storageKey: string, defaultMode: ViewMode = 'grid') {
  const [mode, setMode] = useState<ViewMode>(() => {
    try {
      const stored = localStorage.getItem(`view-mode:${storageKey}`)
      return stored === 'grid' || stored === 'list' ? stored : defaultMode
    } catch {
      return defaultMode
    }
  })

  function set(next: ViewMode) {
    setMode(next)
    try {
      localStorage.setItem(`view-mode:${storageKey}`, next)
    } catch {
      // ignore — per-viewer convenience only
    }
  }

  return [mode, set] as const
}
