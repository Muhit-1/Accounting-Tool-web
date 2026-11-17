// Shapes of the admin panel and support API (accounting-api/src/admin, src/support). Staff see counts and names of
// containers only: no money and no entry text is in any of these.

export type UserRole = 'USER' | 'ADMIN' | 'SUPER_ADMIN'
export type PersonStatus = 'active' | 'disabled' | 'invited'
export type Platform = 'web' | 'app'

export interface TopPerson {
  id: string
  name: string
  email: string
}

export interface AdminOverview {
  generatedAt: string
  people: {
    total: number
    newToday: number
    new7: number
    new30: number
    activeNow: number
    dau: number
    wau: number
    mau: number
    disabled: number
    invited: number
    byRole: Record<string, number>
    bySignupPlatform: Record<string, number>
  }
  content: { businesses: number; tables: number; rows: number; entries: number; invoices: number; activeShares: number }
  usage: {
    avgActiveMinutesPerPersonDay: number
    topByTime30d: (TopPerson & { activeSeconds: number })[]
    topByTableOpens: (TopPerson & { opens: number })[]
  }
  support: {
    open: number
    urgent: number
    unassigned: number
    byStatus: Record<string, number>
    oldestOpen: { number: number; since: string } | null
    avgFirstResponseMinutes30d: number | null
  }
}

export interface AdminSeries {
  signups: { day: string; count: number }[]
  activity: { day: string; people: number; activeMinutes: number; tableOpens: number }[]
}

export interface AdminPersonRow {
  id: string
  email: string
  name: string
  role: UserRole
  status: PersonStatus
  createdAt: string
  lastLoginAt: string | null
  lastSeenAt: string | null
  signupPlatform: string | null
  businesses: number
  tables: number
  activeSeconds30d: number
}

export interface AdminPersonList {
  items: AdminPersonRow[]
  nextCursor: string | null
}

export interface AdminUserFilters {
  search?: string
  role?: UserRole | ''
  status?: PersonStatus | ''
  platform?: Platform | ''
  seen?: '1' | '7' | '30' | 'never' | ''
  sort?: 'newest' | 'seen' | 'name'
}

export interface AdminUserDetail {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    status: PersonStatus
    createdAt: string
    lastLoginAt: string | null
    lastSeenAt: string | null
    signupPlatform: string | null
    disabledAt: string | null
    disabledReason: string | null
    disabledBy: string | null
  }
  counts: { businesses: number; tables: number; entries: number; invoices: number }
  businesses: { id: string; name: string; currency: string; createdAt: string; tables: number }[]
  usage: { day: string; platform: string; activeSeconds: number; requests: number; tableOpens: number }[]
  tablesOpened: { tableId: string; table: string; businessId: string; business: string; openCount: number; lastOpenedAt: string }[]
  sessions: { id: string; deviceName: string | null; platform: string | null; createdAt: string; lastUsedAt: string | null }[]
  activity: { id: string; type: string; platform: string | null; createdAt: string; detail: Record<string, string | number | boolean> | null }[]
  tickets: { id: string; number: number; subject: string; status: TicketStatus; createdAt: string }[]
}

export interface DeletePreview {
  email: string
  name: string
  disabled: boolean
  businesses: number
  tables: number
  entries: number
  invoices: number
  peopleWithAccess: number
  accessGivenToPerson: number
}

export interface ActivityEvent {
  id: string
  type: string
  userId: string | null
  userEmail: string | null
  userName: string | null
  businessId: string | null
  platform: string | null
  ipTrunc: string | null
  userAgent: string | null
  detail: Record<string, string | number | boolean> | null
  createdAt: string
}

export interface AuditEvent {
  id: string
  actorId: string | null
  actorEmail: string
  actorRole: string
  via: 'web' | 'cli'
  action: string
  targetUserId: string | null
  targetEmail: string | null
  reason: string | null
  detail: Record<string, string | number | boolean> | null
  createdAt: string
}

export interface Page<T> {
  items: T[]
  nextCursor: string | null
}

export interface TeamMember {
  id: string
  email: string
  name: string
  role: UserRole
  status: PersonStatus
  lastSeenAt: string | null
  createdAt: string
}

export type AnnouncementLevel = 'info' | 'warning' | 'critical'

export interface PlatformSettings {
  signupsEnabled: boolean
  maintenanceMessage: string | null
  announcement: { text: string; level: AnnouncementLevel; until: string | null } | null
  supportEmail: string | null
}

export interface SystemStatus {
  version: string
  environment: string
  node: string
  uptimeSeconds: number
  db: { ok: boolean; latencyMs: number }
  migrationsApplied: number | null
  storage: 'google_drive' | 'local_disk'
  push: boolean
  googleSignIn: boolean
  adminIpAllowListOn: boolean
}

// ---- support ----

export type TicketStatus = 'OPEN' | 'IN_PROGRESS' | 'WAITING_USER' | 'RESOLVED' | 'CLOSED'
export type TicketPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT'
export type TicketCategory = 'BUG' | 'ACCOUNT' | 'QUESTION' | 'FEATURE' | 'OTHER'

/** What the person sees of their own request. */
export interface MyTicket {
  id: string
  number: number
  subject: string
  category: TicketCategory
  status: TicketStatus
  priority: TicketPriority
  lastMessageAt: string
  lastMessageBy: 'USER' | 'STAFF'
  userUnread: boolean
  rating: number | null
  createdAt: string
  closedAt: string | null
}

export interface MyTicketDetail extends MyTicket {
  messages: { id: string; authorName: string; authorKind: 'USER' | 'STAFF' | 'SYSTEM'; body: string; createdAt: string }[]
}

/** The staff view of a request. */
export interface StaffTicket {
  id: string
  number: number
  userId: string | null
  userEmail: string
  userName: string
  subject: string
  category: TicketCategory
  status: TicketStatus
  priority: TicketPriority
  assignedToId: string | null
  assignedToName: string | null
  platform: string | null
  appVersion: string | null
  requestId: string | null
  firstResponseAt: string | null
  lastMessageAt: string
  lastMessageBy: 'USER' | 'STAFF'
  userUnread: boolean
  staffUnread: boolean
  rating: number | null
  createdAt: string
  closedAt: string | null
}

export interface StaffTicketDetail extends StaffTicket {
  messages: { id: string; authorId: string | null; authorName: string; authorKind: 'USER' | 'STAFF' | 'SYSTEM'; body: string; internal: boolean; createdAt: string }[]
}

export interface StaffTicketFilters {
  status?: TicketStatus | 'ACTIVE' | ''
  priority?: TicketPriority | ''
  category?: TicketCategory | ''
  assigned?: string
  search?: string
}

export interface CannedReply {
  id: string
  title: string
  body: string
}

export interface Notice {
  announcement: { text: string; level: AnnouncementLevel } | null
  maintenance: string | null
  supportEmail: string | null
}
