import { describe, expect, it } from 'vitest'
import { BOX_H, BOX_W, type MapNode } from './connections'
import { clampZoom, fitView, parseLayout, withLayout, zoomAt, Z_MAX, Z_MIN } from './connections-view'

const node = (id: string, x: number, y: number): MapNode => ({ id, name: id, color: '#000', ledger: false, rows: 0, columns: 0, x, y })

describe('clampZoom', () => {
  it('keeps the zoom in range and survives rubbish', () => {
    expect(clampZoom(9)).toBe(Z_MAX)
    expect(clampZoom(0.01)).toBe(Z_MIN)
    expect(clampZoom(NaN)).toBe(1)
    expect(clampZoom(1.3)).toBe(1.3)
  })
})

describe('zoomAt', () => {
  it('keeps the point under the pointer where it was', () => {
    const view = { x: 40, y: 20, z: 1 }
    const next = zoomAt(view, 1.5, 300, 200)
    // the map point that was under (300, 200) is still under it
    const before = { mx: (300 - view.x) / view.z, my: (200 - view.y) / view.z }
    expect((300 - next.x) / next.z).toBeCloseTo(before.mx)
    expect((200 - next.y) / next.z).toBeCloseTo(before.my)
    expect(next.z).toBe(1.5)
  })

  it('stops at the limits', () => {
    let view = { x: 0, y: 0, z: 1 }
    for (let i = 0; i < 40; i++) view = zoomAt(view, 1.2, 100, 100)
    expect(view.z).toBe(Z_MAX)
    for (let i = 0; i < 80; i++) view = zoomAt(view, 1 / 1.2, 100, 100)
    expect(view.z).toBe(Z_MIN)
  })
})

describe('fitView', () => {
  it('shows every box inside the canvas', () => {
    const nodes = [node('a', 0, 0), node('b', 1000, 600)]
    const v = fitView(nodes, 800, 500)
    for (const n of nodes) {
      expect(n.x * v.z + v.x).toBeGreaterThanOrEqual(0)
      expect((n.x + BOX_W) * v.z + v.x).toBeLessThanOrEqual(800)
      expect(n.y * v.z + v.y).toBeGreaterThanOrEqual(0)
      expect((n.y + BOX_H) * v.z + v.y).toBeLessThanOrEqual(500)
    }
  })

  it('does not blow up a tiny map, and copes with nothing to show', () => {
    expect(fitView([node('a', 10, 10)], 800, 500).z).toBeLessThanOrEqual(1.4)
    expect(fitView([], 800, 500)).toEqual({ x: 0, y: 0, z: 1 })
    expect(fitView([node('a', 0, 0)], 0, 0)).toEqual({ x: 0, y: 0, z: 1 })
  })
})

describe('layout memory', () => {
  it('reads back saved positions and ignores anything odd', () => {
    expect(parseLayout('{"a":{"x":10,"y":20},"b":{"x":"no","y":1},"c":null}')).toEqual({ a: { x: 10, y: 20 } })
    expect(parseLayout('not json')).toEqual({})
    expect(parseLayout('[1,2]')).toEqual({})
    expect(parseLayout(null)).toEqual({})
  })

  it('puts the boxes the person moved where they left them, and leaves the rest', () => {
    const moved = withLayout([node('a', 0, 0), node('b', 5, 5)], { a: { x: 100, y: 200 }, gone: { x: 1, y: 1 } })
    expect(moved.map((n) => [n.id, n.x, n.y])).toEqual([['a', 100, 200], ['b', 5, 5]])
  })
})
