import { BOX_H, BOX_W, type MapNode } from './connections'

// The Connections map is a canvas you can look at the way you look at a map: drag a box to move it, drag the
// background to pan, scroll or press + / − to zoom. The rules for that are plain arithmetic, kept here so they are
// tested without a browser.

export interface MapView {
  x: number
  y: number
  z: number
}

export const Z_MIN = 0.35
export const Z_MAX = 2.2
export const Z_STEP = 1.2

export const clampZoom = (z: number) => Math.min(Z_MAX, Math.max(Z_MIN, Number.isFinite(z) ? z : 1))

/** Zoom by `factor` around the point (cx, cy) of the canvas, so the spot under the pointer stays where it is. */
export function zoomAt(view: MapView, factor: number, cx: number, cy: number): MapView {
  const z = clampZoom(view.z * factor)
  const k = z / view.z
  return { x: cx - (cx - view.x) * k, y: cy - (cy - view.y) * k, z }
}

/** The view that shows every box, centred, with some room around them. */
export function fitView(nodes: { x: number; y: number }[], width: number, height: number, pad = 48): MapView {
  if (nodes.length === 0 || width <= 0 || height <= 0) return { x: 0, y: 0, z: 1 }
  const minX = Math.min(...nodes.map((n) => n.x)) - pad
  const maxX = Math.max(...nodes.map((n) => n.x + BOX_W)) + pad
  const minY = Math.min(...nodes.map((n) => n.y)) - pad
  const maxY = Math.max(...nodes.map((n) => n.y + BOX_H)) + pad
  const z = clampZoom(Math.min(1.4, width / (maxX - minX), height / (maxY - minY)))
  return { z, x: (width - (maxX - minX) * z) / 2 - minX * z, y: (height - (maxY - minY) * z) / 2 - minY * z }
}

export type SavedLayout = Record<string, { x: number; y: number }>

/** Where a person left the boxes, read back from what the browser saved (anything odd is ignored). */
export function parseLayout(raw: string | null): SavedLayout {
  if (!raw) return {}
  try {
    const value = JSON.parse(raw) as unknown
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return {}
    const out: SavedLayout = {}
    for (const [id, pos] of Object.entries(value)) {
      const p = pos as { x?: unknown; y?: unknown }
      if (typeof p?.x === 'number' && typeof p?.y === 'number' && Number.isFinite(p.x) && Number.isFinite(p.y)) out[id] = { x: p.x, y: p.y }
    }
    return out
  } catch {
    return {}
  }
}

/** The map's own layout, with the boxes the person moved put where they left them. */
export function withLayout(nodes: MapNode[], saved: SavedLayout): MapNode[] {
  return nodes.map((n) => (saved[n.id] ? { ...n, x: saved[n.id].x, y: saved[n.id].y } : n))
}
