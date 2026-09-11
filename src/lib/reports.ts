import { useQuery } from '@tanstack/react-query'
import { api } from './api-client'
import type { CategoryType } from '../types/api'

export interface ReportCategoryRow {
  categoryId: string | null
  categoryName: string
  type: CategoryType
  total: number
}

export interface ReportTotals {
  totalIncome: number
  totalExpense: number
  balance: number
}

export interface ReportTransaction {
  id: string
  date: string
  memo: string | null
  counterparty: string | null
  amount: number
  type: CategoryType
  categoryName: string | null
}

export interface CombinedReportTransaction extends ReportTransaction {
  businessId: string
  businessName: string
  currency: string
}

export interface BusinessReport {
  business: { id: string; name: string; currency: string }
  account: { id: string; name: string } | null
  period: { from: string; to: string }
  totals: ReportTotals
  byCategory: ReportCategoryRow[]
  transactions: ReportTransaction[]
}

export interface CombinedReport {
  period: { from: string; to: string }
  businesses: { business: { id: string; name: string; currency: string }; totals: ReportTotals; byCategory: ReportCategoryRow[] }[]
  combinedTotals: ReportTotals
  transactions: CombinedReportTransaction[]
}

export interface ReportRange {
  from: string
  to: string
  accountId?: string
}

function toQueryString({ from, to, accountId }: ReportRange): string {
  const params = new URLSearchParams({ from, to })
  if (accountId) params.set('accountId', accountId)
  return params.toString()
}

export function useReport(businessId: string | undefined, range: ReportRange) {
  return useQuery({
    queryKey: ['reports', businessId, range],
    queryFn: () => api.get<BusinessReport>(`/businesses/${businessId}/reports?${toQueryString(range)}`),
    enabled: Boolean(businessId),
  })
}

export function useCombinedReport(range: ReportRange) {
  return useQuery({
    queryKey: ['reports', 'combined', range],
    queryFn: () => api.get<CombinedReport>(`/reports?${toQueryString(range)}`),
  })
}

export async function downloadReportPdf(businessId: string | undefined, range: ReportRange, filename: string) {
  const path = businessId ? `/businesses/${businessId}/reports/pdf` : '/reports/pdf'
  const blob = await api.getBlob(`${path}?${toQueryString(range)}`)
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

function csvEscape(value: string): string {
  if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

// Built client-side from the same JSON already fetched for the on-screen
// report — no extra request needed.
export function downloadReportCsv(
  transactions: (ReportTransaction | CombinedReportTransaction)[],
  filename: string,
) {
  const hasBusinessColumn = transactions.some((tx) => 'businessName' in tx)
  const header = ['Date', 'Type', ...(hasBusinessColumn ? ['Business'] : []), 'Entry', 'Category', 'From/To', 'Amount']
  const rows = transactions.map((tx) => [
    tx.date.slice(0, 10),
    tx.type,
    ...(hasBusinessColumn ? [(tx as CombinedReportTransaction).businessName] : []),
    tx.memo ?? '',
    tx.categoryName ?? '',
    tx.counterparty ?? '',
    String(tx.amount),
  ])
  const csv = [header, ...rows].map((row) => row.map((cell) => csvEscape(String(cell))).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
