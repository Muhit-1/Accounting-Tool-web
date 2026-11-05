// Zoom for a sheet, like in a spreadsheet: smaller to see more rows and columns, bigger to read. The choice is kept
// in this browser. Pure, so every rule is a test.

export const ZOOM_STEPS = [0.5, 0.67, 0.8, 0.9, 1, 1.1, 1.25, 1.5, 1.75, 2] as const
export const DEFAULT_ZOOM = 1
const KEY = 'exin_sheet_zoom'

/** The step nearest to `z` (anything odd becomes 100%). */
export function nearestZoom(z: unknown): number {
  if (typeof z !== 'number' || !Number.isFinite(z)) return DEFAULT_ZOOM
  return ZOOM_STEPS.reduce((best, s) => (Math.abs(s - z) < Math.abs(best - z) ? s : best), ZOOM_STEPS[0] as number)
}

/** One step bigger (dir 1) or smaller (dir -1); stays at the ends. */
export function stepZoom(z: number, dir: 1 | -1): number {
  const i = ZOOM_STEPS.indexOf(nearestZoom(z) as (typeof ZOOM_STEPS)[number])
  return ZOOM_STEPS[Math.min(ZOOM_STEPS.length - 1, Math.max(0, i + dir))]
}

export const zoomLabel = (z: number) => `${Math.round(z * 100)}%`

export function loadZoom(): number {
  try {
    const raw = window.localStorage.getItem(KEY)
    return raw === null ? DEFAULT_ZOOM : nearestZoom(Number(raw))
  } catch {
    return DEFAULT_ZOOM
  }
}

export function saveZoom(z: number): void {
  try {
    window.localStorage.setItem(KEY, String(z))
  } catch {
    // a private window: the zoom just is not remembered
  }
}
