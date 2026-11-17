// Rules and demo data for the public home page (routes/LandingPage). Pure on
// purpose, so they are tested without a DOM. The demo figures are made up: no
// real business name or balance is shown to visitors.

import type { CSSProperties } from 'react'

export const LANDING_PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'cash', label: 'Cash book' },
  { id: 'tables', label: 'Tables' },
  { id: 'invoices', label: 'Invoices' },
  { id: 'sharing', label: 'Sharing' },
  { id: 'start', label: 'Start' },
] as const

export type LandingPageId = (typeof LANDING_PAGES)[number]['id']

// Items inside a panel slide in one after another: --n is the place in the queue.
export const stagger = (n: number): CSSProperties => ({ '--n': n }) as CSSProperties

export function clampPage(index: number, count: number = LANDING_PAGES.length): number {
  if (!Number.isFinite(index)) return 0
  return Math.max(0, Math.min(count - 1, Math.trunc(index)))
}

// "#cash" -> 1. Anything unknown (including a made-up hash) opens the first page.
export function pageFromHash(hash: string): number {
  const id = hash.replace(/^#/, '')
  const index = LANDING_PAGES.findIndex((p) => p.id === id)
  return index < 0 ? 0 : index
}

// A mouse wheel or trackpad moves one page per gesture. Three things must not
// move it: a gesture that is still easing out after the last move (inertia
// keeps sending events for a while), a vertical scroll inside a page that is
// taller than the window and has more to show, and a tiny movement.
export interface WheelInput {
  deltaX: number
  deltaY: number
  scrollTop: number
  clientHeight: number
  scrollHeight: number
  now: number
  // The moment the last page change finishes animating.
  navEnd: number
  // The last time a wheel event arrived while a gesture was being ignored.
  lastBlocked: number
}

export function wheelAction(input: WheelInput): { dir: -1 | 0 | 1; blocked: boolean } {
  const { deltaX, deltaY, scrollTop, clientHeight, scrollHeight, now, navEnd, lastBlocked } = input
  if (now < navEnd || now - lastBlocked < 170) return { dir: 0, blocked: true }
  const sideways = Math.abs(deltaX) > Math.abs(deltaY)
  const delta = sideways ? deltaX : deltaY
  if (Math.abs(delta) < 14) return { dir: 0, blocked: false }
  if (!sideways && scrollHeight > clientHeight + 2) {
    const moreBelow = scrollTop + clientHeight < scrollHeight - 2
    const moreAbove = scrollTop > 0
    if ((delta > 0 && moreBelow) || (delta < 0 && moreAbove)) return { dir: 0, blocked: false }
  }
  return { dir: delta > 0 ? 1 : -1, blocked: false }
}

// A swipe has to be long enough and clearly more sideways than up or down.
export function swipeDirection(dx: number, dy: number): -1 | 0 | 1 {
  if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.4) return 0
  return dx < 0 ? 1 : -1
}

// "Tables" page demo: Total = Qty × Price, kept to whole numbers in a safe range.
export function demoTotal(qty: number, price: number): number {
  const q = Math.max(0, Math.min(999, Math.trunc(Number.isFinite(qty) ? qty : 0)))
  const p = Math.max(0, Math.min(99999, Math.trunc(Number.isFinite(price) ? price : 0)))
  return q * p
}

export function formatWhole(amount: number): string {
  return Math.abs(Math.round(amount)).toLocaleString('en-US')
}

export interface DemoEntry {
  date: string
  memo: string
  moneyIn: number
  moneyOut: number
  // Filled in by another table (shown with a "linked" tag and a brown balance cell).
  linked: boolean
}

export interface DemoBusiness {
  id: string
  name: string
  currency: 'BDT' | 'USD' | 'EUR'
  opening: number
  entries: DemoEntry[]
}

const e = (date: string, memo: string, moneyIn: number, moneyOut: number, linked = false): DemoEntry => ({
  date,
  memo,
  moneyIn,
  moneyOut,
  linked,
})

export const DEMO_BUSINESSES: DemoBusiness[] = [
  {
    id: 'shop',
    name: 'Linen Shop',
    currency: 'BDT',
    opening: 48200,
    entries: [
      e('03 Nov', 'Rent, shop', 0, 18000),
      e('04 Nov', 'Order ORD-0041', 4800, 0, true),
      e('05 Nov', 'Packaging', 0, 2150),
      e('06 Nov', 'Order ORD-0042', 6300, 0, true),
    ],
  },
  {
    id: 'gear',
    name: 'Trail Gear',
    currency: 'USD',
    opening: 12300,
    entries: [
      e('01 Nov', 'Sample batch', 0, 3200),
      e('02 Nov', 'Invoice 0014', 2040, 0, true),
      e('07 Nov', 'Freight', 0, 640),
      e('09 Nov', 'Invoice 0015', 1980, 0, true),
    ],
  },
  {
    id: 'studio',
    name: 'Design Studio',
    currency: 'EUR',
    opening: 3300,
    entries: [
      e('02 Nov', 'Studio rent', 0, 900),
      e('05 Nov', 'Print job', 1250, 0),
      e('08 Nov', 'Fonts licence', 0, 120),
      e('10 Nov', 'Workshop fee', 390, 0),
    ],
  },
]

export interface LedgerRow extends DemoEntry {
  balance: number
}

// The balance column is always worked out from the entries above it, the same
// rule the real Cash book follows, so the demo can never show a total that
// does not add up.
export function buildLedger(opening: number, entries: DemoEntry[]): LedgerRow[] {
  let balance = opening
  return entries.map((entry) => {
    balance += entry.moneyIn - entry.moneyOut
    return { ...entry, balance }
  })
}

// Home page: a new line "arrives" in the Cash book every few seconds.
export const HERO_START_BALANCE = 39150

const HERO_FEED = [
  { memo: 'Order ORD-0043', tag: 'from Orders', amount: 3200 },
  { memo: 'Courier fee', tag: '', amount: -380 },
  { memo: 'Order ORD-0044', tag: 'from Orders', amount: 5100 },
  { memo: 'Fabric restock', tag: '', amount: -4200 },
]

export interface HeroEntry {
  memo: string
  tag: string
  amount: number
  balance: number
}

// The nth line to arrive (0 = the first) and the balance right after it.
export function heroEntryAt(n: number): HeroEntry {
  let balance = HERO_START_BALANCE
  for (let i = 0; i <= n; i++) balance += HERO_FEED[i % HERO_FEED.length].amount
  const line = HERO_FEED[n % HERO_FEED.length]
  return { ...line, balance }
}
