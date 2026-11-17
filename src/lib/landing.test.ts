import { describe, expect, it } from 'vitest'
import {
  buildLedger,
  clampPage,
  DEMO_BUSINESSES,
  demoTotal,
  formatWhole,
  heroEntryAt,
  HERO_START_BALANCE,
  LANDING_PAGES,
  pageFromHash,
  swipeDirection,
  wheelAction,
  type WheelInput,
} from './landing'

describe('pages', () => {
  it('clamps to the first and last page', () => {
    expect(clampPage(-3)).toBe(0)
    expect(clampPage(99)).toBe(LANDING_PAGES.length - 1)
    expect(clampPage(2.9)).toBe(2)
    expect(clampPage(Number.NaN)).toBe(0)
  })

  it('reads the page from the hash and falls back to the first', () => {
    expect(pageFromHash('#cash')).toBe(1)
    expect(pageFromHash('start')).toBe(LANDING_PAGES.length - 1)
    expect(pageFromHash('#nope')).toBe(0)
    expect(pageFromHash('')).toBe(0)
  })
})

describe('wheelAction', () => {
  const base: WheelInput = {
    deltaX: 0,
    deltaY: 100,
    scrollTop: 0,
    clientHeight: 600,
    scrollHeight: 600,
    now: 5000,
    navEnd: 0,
    lastBlocked: 0,
  }

  it('moves forward and back on a wheel gesture', () => {
    expect(wheelAction(base)).toEqual({ dir: 1, blocked: false })
    expect(wheelAction({ ...base, deltaY: -100 })).toEqual({ dir: -1, blocked: false })
  })

  it('uses sideways movement when it is the larger one', () => {
    expect(wheelAction({ ...base, deltaX: 80, deltaY: 10 }).dir).toBe(1)
    expect(wheelAction({ ...base, deltaX: -80, deltaY: 10 }).dir).toBe(-1)
  })

  it('ignores tiny movements', () => {
    expect(wheelAction({ ...base, deltaY: 6 })).toEqual({ dir: 0, blocked: false })
  })

  it('ignores a gesture during the page animation and while inertia is still arriving', () => {
    expect(wheelAction({ ...base, navEnd: 5400 })).toEqual({ dir: 0, blocked: true })
    expect(wheelAction({ ...base, lastBlocked: 4900 })).toEqual({ dir: 0, blocked: true })
    expect(wheelAction({ ...base, lastBlocked: 4800 }).dir).toBe(1)
  })

  it('lets a tall page scroll first, then moves on at its end', () => {
    const tall = { ...base, scrollHeight: 1400 }
    expect(wheelAction(tall).dir).toBe(0)
    expect(wheelAction({ ...tall, scrollTop: 400 }).dir).toBe(0)
    expect(wheelAction({ ...tall, scrollTop: 800 }).dir).toBe(1)
    expect(wheelAction({ ...tall, scrollTop: 300, deltaY: -100 }).dir).toBe(0)
    expect(wheelAction({ ...tall, scrollTop: 0, deltaY: -100 }).dir).toBe(-1)
  })
})

describe('swipeDirection', () => {
  it('needs a long, mostly sideways swipe', () => {
    expect(swipeDirection(-120, 10)).toBe(1)
    expect(swipeDirection(120, -10)).toBe(-1)
    expect(swipeDirection(-40, 0)).toBe(0)
    expect(swipeDirection(-100, 90)).toBe(0)
  })
})

describe('demo helpers', () => {
  it('works out Total = Qty × Price in whole numbers', () => {
    expect(demoTotal(3, 1800)).toBe(5400)
    expect(demoTotal(-2, 100)).toBe(0)
    expect(demoTotal(5000, 100000)).toBe(999 * 99999)
    expect(demoTotal(Number.NaN, 10)).toBe(0)
  })

  it('formats whole amounts with thousands separators and no sign', () => {
    expect(formatWhole(39150)).toBe('39,150')
    expect(formatWhole(-2150)).toBe('2,150')
  })

  it('builds a running balance that adds up for every demo business', () => {
    for (const b of DEMO_BUSINESSES) {
      const rows = buildLedger(b.opening, b.entries)
      let expected = b.opening
      for (const [i, r] of rows.entries()) {
        expected += b.entries[i].moneyIn - b.entries[i].moneyOut
        expect(r.balance).toBe(expected)
      }
    }
    expect(buildLedger(48200, DEMO_BUSINESSES[0].entries).at(-1)?.balance).toBe(39150)
  })

  it('has one currency per business and no line that is both in and out', () => {
    expect(new Set(DEMO_BUSINESSES.map((b) => b.currency)).size).toBe(DEMO_BUSINESSES.length)
    for (const b of DEMO_BUSINESSES) for (const x of b.entries) expect(x.moneyIn === 0 || x.moneyOut === 0).toBe(true)
  })

  it('walks the hero feed and keeps the running balance', () => {
    expect(heroEntryAt(0).balance).toBe(HERO_START_BALANCE + 3200)
    expect(heroEntryAt(1).balance).toBe(HERO_START_BALANCE + 3200 - 380)
    expect(heroEntryAt(4).memo).toBe(heroEntryAt(0).memo)
    expect(heroEntryAt(3).balance).toBe(HERO_START_BALANCE + 3720)
  })
})
