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

export interface CombinedDashboard {
  businesses: CombinedDashboardEntry[]
  combined: { totalIncome: number; totalExpense: number; balance: number }
}
