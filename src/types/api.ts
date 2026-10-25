import type { AmountType } from '../lib/calc'

export interface User {
  id: string
  email: string
  name: string
}

export interface AuthResponse {
  accessToken: string
  user: User
}

export interface Business {
  id: string
  ownerId: string
  name: string
  currency: string
  logoUrl: string | null
  address: string | null
  contactEmail: string | null
  website: string | null
  bankAccountName: string | null
  bankAccountNumber: string | null
  bankRoutingNumber: string | null
  bankSwiftCode: string | null
  bankBranch: string | null
  defaultTerms: string | null
  // Two-letter country code; null = made before it existed, treated as Bangladesh.
  country: string | null
  // Books closed before this day (YYYY-MM-DD…); nothing dated earlier can change. Null = open.
  lockedBefore: string | null
  driveFolderId: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateBusinessInput {
  name: string
  currency?: string
}

export type CategoryType = 'INCOME' | 'EXPENSE'

export interface Category {
  id: string
  businessId: string
  name: string
  type: CategoryType
  // Heading the category is listed under; null = shown under "Other".
  groupName: string | null
  // Filed under by the system itself ("Orders (auto)", ...): locked, "Posted automatically".
  isSystem: boolean
  createdAt: string
}

export interface Account {
  id: string
  businessId: string
  name: string
  createdAt: string
  updatedAt: string
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface Transaction {
  id: string
  accountId: string
  date: string
  memo: string | null
  counterparty: string | null
  receiptFileName: string | null
  // https link to a screenshot/receipt, opened in a new tab.
  proofUrl: string | null
  // Set for an entry posted by a table's Posts-to-Cash-book rule; it can only change through that row.
  ruleId?: string | null
  rowId?: string | null
  source?: { tableId: string; tableName: string } | null
  // Set for an entry posted by an invoice; it can only change through the invoice.
  invoiceId: string | null
  // null = a fixed amount (every entry made before amount types existed).
  amountType: AmountType | null
  // The named boxes of a calculated amount, in order; null for fixed amounts.
  amountInputs: number[] | null
  amount: number
  type: CategoryType | null
  category: Category | null
  createdAt: string
  runningBalance?: number
}

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'OVERDUE' | 'CANCELLED'

export interface Client {
  id: string
  businessId: string
  name: string
  address: string
  email: string | null
}

export interface InvoiceItem {
  id: string
  invoiceId: string
  position: number
  description: string
  quantity: number
  rate: number
  amount: number
}

export interface Invoice {
  id: string
  businessId: string
  clientId: string
  number: string
  issueDate: string
  terms: string
  dueDate: string
  subTotal: number
  total: number
  status: InvoiceStatus
  // When the invoice became Paid (the date its Cash book entry carries).
  paidAt: string | null
  fileReference: string | null
  createdAt: string
  updatedAt: string
  client: Client
  items?: InvoiceItem[]
}

export type AccessScope = 'BUSINESS' | 'TABLE'
export type AccessPermission = 'VIEW' | 'EDIT'
export type AccessGrantStatus = 'active' | 'expired' | 'revoked'

export interface AccessGrant {
  id: string
  businessId: string
  granteeId: string
  scope: AccessScope
  tableId: string | null
  tableName: string | null
  permission: AccessPermission
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  grantee: { id: string; email: string; name: string }
  status: AccessGrantStatus
}

export interface CategoryBreakdown {
  categoryId: string | null
  categoryName: string
  total: number
}

export interface BusinessDashboard {
  businessId: string
  businessName: string
  totalIncome: number
  totalExpense: number
  balance: number
  byCategory: CategoryBreakdown[]
}

export interface CombinedDashboardEntry {
  businessId: string
  businessName: string
  currency: string
  totalIncome: number
  totalExpense: number
  balance: number
}

// Totals for one currency. Amounts in different currencies are never added together.
export interface CurrencyTotals {
  currency: string
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface CombinedDashboard {
  businesses: CombinedDashboardEntry[]
  // A plain sum — only meaningful when mixedCurrencies is false. Prefer byCurrency.
  combined: { totalIncome: number; totalExpense: number; balance: number }
  byCurrency: CurrencyTotals[]
  mixedCurrencies: boolean
}

// Public legal documents (GET /legal/:slug) — structured plain text, never HTML.
export interface LegalSection {
  heading: string
  paragraphs?: string[]
  bullets?: string[]
}

export interface LegalDocument {
  slug: 'privacy' | 'terms'
  title: string
  version: string
  effectiveDate: string
  language: 'en'
  sections: LegalSection[]
}

// GET /businesses/:id/fund-statement
export interface StatementCategory {
  categoryId: string | null
  name: string
  total: number
  entries: number
}

export interface StatementGroup {
  name: string
  total: number
  entries: number
  categories: StatementCategory[]
}

export interface StatementSide {
  groups: StatementGroup[]
  total: number
  entries: number
}

export interface FundStatement {
  currency: string
  accountId: string | null
  from: string | null
  to: string | null
  moneyIn: StatementSide
  moneyOut: StatementSide
  balance: number
}

// GET /businesses/:id/monthly
export interface MonthlyRow {
  month: string // 'YYYY-MM'
  moneyIn: number
  moneyOut: number
  net: number
  closingBalance: number
}

export interface MonthlyFigures {
  moneyIn: number
  moneyOut: number
  net: number
}

export interface MonthlyView {
  currency: string
  accountId: string | null
  start: string
  months: number
  openingBalance: number
  rows: MonthlyRow[]
  totals: MonthlyFigures
  // Entries dated before the first or after the last month shown (0 for a full-range view).
  outsideRange: MonthlyFigures
}

// /businesses/:id/posting-config — what the Invoices page sends to the Cash book.
export interface PostingConfig {
  invoices: { on: boolean; when: InvoiceStatus[] }
}

export interface PostingChange {
  posted: number
  removed: number
}

export interface PostingSaveResult {
  config: PostingConfig
  changes: { invoices: PostingChange }
}
