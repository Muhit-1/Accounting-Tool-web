import { describe, expect, it } from 'vitest'
import { DEFAULT_ZOOM, nearestZoom, stepZoom, zoomLabel, ZOOM_STEPS } from './sheet-zoom'

describe('nearestZoom', () => {
  it('snaps to a step and survives rubbish', () => {
    expect(nearestZoom(1.02)).toBe(1)
    expect(nearestZoom(0.1)).toBe(ZOOM_STEPS[0])
    expect(nearestZoom(9)).toBe(2)
    expect(nearestZoom(NaN)).toBe(DEFAULT_ZOOM)
    expect(nearestZoom('x')).toBe(DEFAULT_ZOOM)
  })
})

describe('stepZoom', () => {
  it('goes one step at a time and stops at the ends', () => {
    expect(stepZoom(1, 1)).toBe(1.1)
    expect(stepZoom(1, -1)).toBe(0.9)
    expect(stepZoom(0.5, -1)).toBe(0.5)
    expect(stepZoom(2, 1)).toBe(2)
  })
  it('can walk through every step', () => {
    let z = 0.5
    const seen = [z]
    for (let i = 0; i < 20; i++) {
      z = stepZoom(z, 1)
      if (seen[seen.length - 1] !== z) seen.push(z)
    }
    expect(seen).toEqual([...ZOOM_STEPS])
  })
})

describe('zoomLabel', () => {
  it('writes a percent', () => {
    expect(zoomLabel(1)).toBe('100%')
    expect(zoomLabel(0.67)).toBe('67%')
  })
})
