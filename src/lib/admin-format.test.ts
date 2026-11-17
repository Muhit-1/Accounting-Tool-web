import { describe, expect, it } from 'vitest'
import {
  activityDetail,
  activityLabel,
  barHeights,
  canManage,
  cleanSearch,
  formatCount,
  formatDuration,
  isStaff,
  ticketRef,
  timeAgo,
  waitingFor,
  whyNotAllowed,
} from './admin-format'
import type { UserRole } from '../types/admin'

describe('who may act on whom (the same rule as the API)', () => {
  const cases: [UserRole, UserRole, boolean][] = [
    ['USER', 'USER', false],
    ['USER', 'ADMIN', false],
    ['USER', 'SUPER_ADMIN', false],
    ['ADMIN', 'USER', true],
    ['ADMIN', 'ADMIN', false],
    ['ADMIN', 'SUPER_ADMIN', false],
    ['SUPER_ADMIN', 'USER', true],
    ['SUPER_ADMIN', 'ADMIN', true],
    ['SUPER_ADMIN', 'SUPER_ADMIN', false],
  ]
  it.each(cases)('%s acting on %s: %s', (actor, target, allowed) => {
    expect(canManage(actor, target)).toBe(allowed)
    expect(whyNotAllowed(actor, target) === null).toBe(allowed)
  })

  it('says why, in words for the button', () => {
    expect(whyNotAllowed('SUPER_ADMIN', 'SUPER_ADMIN')).toMatch(/server terminal/)
    expect(whyNotAllowed('ADMIN', 'ADMIN')).toMatch(/Only a super admin/)
  })

  it('knows who is staff', () => {
    expect([isStaff('USER'), isStaff('ADMIN'), isStaff('SUPER_ADMIN'), isStaff(undefined), isStaff(null)]).toEqual([false, true, true, false, false])
  })
})

describe('formatDuration', () => {
  it('shows minutes under an hour, and hours with minutes above', () => {
    expect(formatDuration(1200)).toBe('20 min')
    expect(formatDuration(51400)).toBe('14 h 17 min')
    expect(formatDuration(3600)).toBe('1 h 0 min')
  })
  it('shows a dash for nothing and 1 min for a few seconds', () => {
    expect(formatDuration(0)).toBe('—')
    expect(formatDuration(10)).toBe('1 min')
  })
})

describe('timeAgo and waitingFor', () => {
  const now = new Date('2026-11-17T12:00:00Z')
  it('reads a moment as words', () => {
    expect(timeAgo('2026-11-17T11:59:40Z', now)).toBe('just now')
    expect(timeAgo('2026-11-17T11:55:00Z', now)).toBe('5 min ago')
    expect(timeAgo('2026-11-17T09:00:00Z', now)).toBe('3 h ago')
    expect(timeAgo('2026-11-16T09:00:00Z', now)).toBe('Yesterday')
    expect(timeAgo('2026-11-13T09:00:00Z', now)).toBe('4 days ago')
    expect(timeAgo('2026-09-01T09:00:00Z', now)).toBe('01 Sept 2026')
    expect(timeAgo(null, now)).toBe('Never')
  })
  it('says how long a request has waited', () => {
    expect(waitingFor('2026-11-17T11:25:00Z', now)).toBe('35 min')
    expect(waitingFor('2026-11-17T09:00:00Z', now)).toBe('3 h')
    expect(waitingFor('2026-11-13T09:00:00Z', now)).toBe('4 d')
  })
})

describe('small helpers', () => {
  it('writes a ticket number', () => expect(ticketRef(12)).toBe('T-0012'))
  it('scales bars to the biggest value, with a stub for an empty day', () => {
    expect(barHeights([0, 5, 10])).toEqual([2, 50, 100])
    expect(barHeights([0, 0])).toEqual([2, 2])
  })
  it('formats counts', () => expect(formatCount(9310)).toBe('9,310'))
  it('trims and shortens a search text', () => expect(cleanSearch('  ' + 'x'.repeat(150))).toHaveLength(100))
})

describe('activity wording', () => {
  it('has a label for each kind, and falls back to the kind itself', () => {
    expect(activityLabel('auth.login_failed')).toBe('Refused sign-in')
    expect(activityLabel('something.new')).toBe('something.new')
  })
  it('turns the small detail into a sentence, never raw JSON', () => {
    expect(activityDetail({ type: 'auth.login_failed', detail: { reason: 'account_disabled' } })).toBe('Refused: account deactivated')
    expect(activityDetail({ type: 'ticket.create', detail: { number: 7, category: 'BUG' } })).toBe('T-0007 · BUG')
    expect(activityDetail({ type: 'share.create', detail: { scope: 'TABLE', permission: 'VIEW' } })).toBe('One table · can view')
    expect(activityDetail({ type: 'auth.login', detail: null })).toBe('')
  })
})
