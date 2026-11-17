import type {
  ActivityEvent,
  PersonStatus,
  TicketCategory,
  TicketPriority,
  TicketStatus,
  UserRole,
} from '../types/admin'

// Pure helpers for the admin panel and the support pages: wording, who may act on whom, and small formatters.

const RANK: Record<UserRole, number> = { USER: 0, ADMIN: 1, SUPER_ADMIN: 2 }

export const ROLE_LABEL: Record<UserRole, string> = { USER: 'Person', ADMIN: 'Admin', SUPER_ADMIN: 'Super admin' }
export const STATUS_LABEL: Record<PersonStatus, string> = { active: 'Active', disabled: 'Deactivated', invited: 'Invited' }

export const isStaff = (role: UserRole | undefined | null): boolean => role === 'ADMIN' || role === 'SUPER_ADMIN'

/** The same rule as the API (common/roles.ts): the actor must rank above the target, and nobody can act on a super admin. */
export function canManage(actor: UserRole, target: UserRole): boolean {
  return target !== 'SUPER_ADMIN' && RANK[actor] > RANK[target]
}

/** The words shown on a disabled button; null when the action is allowed. */
export function whyNotAllowed(actor: UserRole, target: UserRole): string | null {
  if (target === 'SUPER_ADMIN') return 'A super admin can only be changed from the server terminal.'
  if (!canManage(actor, target)) return 'Only a super admin can do this to an admin.'
  return null
}

export const TICKET_STATUS_LABEL: Record<TicketStatus, string> = {
  OPEN: 'Open',
  IN_PROGRESS: 'In progress',
  WAITING_USER: 'Waiting for person',
  RESOLVED: 'Resolved',
  CLOSED: 'Closed',
}
export const TICKET_PRIORITY_LABEL: Record<TicketPriority, string> = { LOW: 'Low', NORMAL: 'Normal', HIGH: 'High', URGENT: 'Urgent' }
export const TICKET_CATEGORY_LABEL: Record<TicketCategory, string> = {
  BUG: 'Bug',
  ACCOUNT: 'Account',
  QUESTION: 'Question',
  FEATURE: 'Idea',
  OTHER: 'Other',
}
/** What the person picks from when they write a request. */
export const MY_CATEGORY_LABEL: Record<TicketCategory, string> = {
  QUESTION: 'Question',
  BUG: 'Something is wrong',
  ACCOUNT: 'My account',
  FEATURE: 'Idea',
  OTHER: 'Other',
}

/** "T-0012" */
export const ticketRef = (number: number): string => `T-${String(number).padStart(4, '0')}`

/** "14 h 17 min", "20 min", or a dash for none. */
export function formatDuration(seconds: number): string {
  if (!seconds || seconds < 30) return seconds > 0 ? '1 min' : '—'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  return `${Math.floor(minutes / 60)} h ${minutes % 60} min`
}

/** "just now", "5 min ago", "3 h ago", "Yesterday", "4 days ago", or the date for anything older than 30 days. */
export function timeAgo(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'Never'
  const ms = now.getTime() - new Date(iso).getTime()
  if (ms < 60_000) return 'just now'
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} h ago`
  const days = Math.floor(hours / 24)
  if (days === 1) return 'Yesterday'
  if (days <= 30) return `${days} days ago`
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(iso))
}

/** How long a request has waited: "35 min", "3 h", "4 d". */
export function waitingFor(iso: string, now: Date = new Date()): string {
  const minutes = Math.max(0, Math.floor((now.getTime() - new Date(iso).getTime()) / 60_000))
  if (minutes < 60) return `${minutes} min`
  if (minutes < 60 * 24) return `${Math.floor(minutes / 60)} h`
  return `${Math.floor(minutes / 1440)} d`
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }).format(new Date(iso))
}

/** Bar heights in percent for a small chart (at least 2 so an empty day is still a visible stub). */
export function barHeights(values: number[]): number[] {
  const max = Math.max(...values, 1)
  return values.map((v) => Math.max(2, Math.round((v / max) * 100)))
}

/** "1,240" */
export const formatCount = (n: number): string => new Intl.NumberFormat('en-US').format(n)

export const ACTIVITY_LABEL: Record<string, string> = {
  'auth.login': 'Signed in',
  'auth.signup': 'New person',
  'auth.login_failed': 'Refused sign-in',
  'business.create': 'Business created',
  'business.delete': 'Business deleted',
  'share.create': 'Shared',
  'share.revoke': 'Sharing stopped',
  'account.export': 'Data download',
  'account.delete': 'Account deleted',
  'ticket.create': 'Support request',
}

export const AUDIT_LABEL: Record<string, string> = {
  'user.disable': 'Deactivated a person',
  'user.enable': 'Activated a person',
  'user.logout_all': 'Signed a person out everywhere',
  'user.session_revoke': 'Ended a device',
  'user.delete': 'Deleted a person',
  'admin.create': 'Added an admin',
  'admin.remove': 'Removed an admin',
  'superadmin.promote': 'Made a super admin (terminal)',
  'superadmin.demote': 'Removed a super admin (terminal)',
  'ticket.reply': 'Answered a request',
  'ticket.update': 'Changed a request',
  'canned.create': 'Added a ready reply',
  'canned.delete': 'Deleted a ready reply',
  'settings.update': 'Changed settings',
}

export const activityLabel = (type: string): string => ACTIVITY_LABEL[type] ?? type

/** A short plain sentence for the detail of an activity row (never raw JSON). */
export function activityDetail(event: Pick<ActivityEvent, 'type' | 'detail'>): string {
  const d = event.detail ?? {}
  if (event.type === 'auth.login_failed') return d.reason === 'account_disabled' ? 'Refused: account deactivated' : d.reason === 'signup_closed' ? 'Refused: sign-ups are closed' : 'Refused'
  if (event.type === 'ticket.create') return `${typeof d.number === 'number' ? ticketRef(d.number) : 'Request'}${d.category ? ` · ${String(d.category)}` : ''}`
  if (event.type === 'share.create') return `${d.scope === 'TABLE' ? 'One table' : 'Whole business'} · ${d.permission === 'EDIT' ? 'can edit' : 'can view'}`
  if (event.type === 'account.delete') return d.by === 'staff' ? 'Removed by staff' : 'Deleted by the person'
  return ''
}

/** Search texts people may type into a filter box are trimmed and kept short before they are sent. */
export const cleanSearch = (text: string): string => text.trim().slice(0, 100)
