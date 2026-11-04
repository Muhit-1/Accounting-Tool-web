import type { AccessGrant, AccessGrantStatus } from '../types/api'

// Pure rules of the Share dialog: who is listed, how a sharing is described, what the end-date box takes.

export type GrantRow = AccessGrant & { status: AccessGrantStatus }

/** Stopped sharings are gone from the list; active ones first, then the ones that ran out, newest first. */
export function visibleGrants(list: GrantRow[]): GrantRow[] {
  const order: Record<AccessGrantStatus, number> = { active: 0, expired: 1, revoked: 2 }
  return list.filter((g) => g.status !== 'revoked').sort((a, b) => order[a.status] - order[b.status] || b.createdAt.localeCompare(a.createdAt))
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

/** "Only Costs · until 30 Nov 2026", "Whole business · until 31 Dec 2026", "Ran out on 12 Oct 2026". */
export function grantSummary(g: Pick<GrantRow, 'tableName' | 'expiresAt' | 'status' | 'scope'>): string {
  const d = new Date(g.expiresAt)
  const day = Number.isNaN(d.getTime()) ? '' : `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`
  if (g.status === 'expired') return `Ran out on ${day}`
  const what = g.scope === 'TABLE' ? `Only ${g.tableName ?? 'one table'}` : 'Whole business'
  return `${what} · until ${day}`
}

/** The date the end-date box shows (a plain day): the UTC day of the moment the sharing ends. */
export function dayOf(iso: string): string {
  return iso.slice(0, 10)
}

/** What the API gets for a picked day: the end of that day in the person's own time, as an ISO moment. */
export function endOfDay(day: string): string {
  return new Date(`${day}T23:59:59`).toISOString()
}

/** The first day a sharing may end on (tomorrow), as a plain day. */
export function tomorrowDay(now: Date = new Date()): string {
  const d = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** A day 30 days from now, the usual end date. */
export function defaultEndDay(now: Date = new Date()): string {
  return tomorrowDay(new Date(now.getTime() + 29 * 24 * 60 * 60 * 1000))
}
