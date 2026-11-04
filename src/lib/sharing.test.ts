import { describe, expect, it } from 'vitest'
import type { GrantRow } from './sharing'
import { dayOf, defaultEndDay, endOfDay, grantSummary, tomorrowDay, visibleGrants } from './sharing'

const grant = (o: Partial<GrantRow>): GrantRow =>
  ({ id: 'g', businessId: 'b', granteeId: 'u', scope: 'BUSINESS', tableId: null, tableName: null, permission: 'VIEW', expiresAt: '2026-12-31T23:59:59.000Z', revokedAt: null, createdAt: '2026-10-01T00:00:00Z', grantee: { id: 'u', email: 'a@b.c', name: 'A' }, status: 'active', ...o }) as GrantRow

describe('visibleGrants', () => {
  it('hides stopped sharings and lists active ones first', () => {
    const list = [
      grant({ id: 'old', status: 'expired', createdAt: '2026-09-01T00:00:00Z' }),
      grant({ id: 'gone', status: 'revoked' }),
      grant({ id: 'a', createdAt: '2026-10-01T00:00:00Z' }),
      grant({ id: 'b', createdAt: '2026-10-05T00:00:00Z' }),
    ]
    expect(visibleGrants(list).map((g) => g.id)).toEqual(['b', 'a', 'old'])
  })
})

describe('grantSummary', () => {
  it('says what is shared and until when', () => {
    expect(grantSummary(grant({}))).toBe('Whole business · until 31 Dec 2026')
    expect(grantSummary(grant({ scope: 'TABLE', tableName: 'Costs', expiresAt: '2026-11-30T23:59:59.000Z' }))).toBe('Only Costs · until 30 Nov 2026')
  })
  it('says when a sharing ran out', () => {
    expect(grantSummary(grant({ status: 'expired', expiresAt: '2026-10-12T10:00:00.000Z' }))).toBe('Ran out on 12 Oct 2026')
  })
})

describe('dates', () => {
  it('takes the day part of a moment', () => {
    expect(dayOf('2026-12-31T23:59:59.000Z')).toBe('2026-12-31')
  })
  it('turns a picked day into the end of that day', () => {
    const iso = endOfDay('2026-12-31')
    expect(new Date(iso).getTime()).toBeGreaterThan(new Date('2026-12-31T00:00:00').getTime())
    expect(new Date(iso).getFullYear()).toBe(2026)
  })
  it('starts at tomorrow and offers a month by default', () => {
    const now = new Date(2026, 10, 4, 12, 0, 0)
    expect(tomorrowDay(now)).toBe('2026-11-05')
    expect(defaultEndDay(now)).toBe('2026-12-04')
  })
})
