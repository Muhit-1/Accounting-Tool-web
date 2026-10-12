import { useQuery } from '@tanstack/react-query'
import { api } from './api-client'
import type { FundStatement, MonthlyView } from '../types/api'

export interface StatementRange {
  accountId?: string
  from?: string
  to?: string
}

function query(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value))
  }
  const text = search.toString()
  return text ? `?${text}` : ''
}

// Money in / out grouped by category group, for one account (or the whole
// business), optionally between two dates. Missing dates = all dates.
export function useFundStatement(businessId: string | undefined, range: StatementRange) {
  return useQuery({
    queryKey: ['statement', businessId, range],
    queryFn: () => api.get<FundStatement>(`/businesses/${businessId}/fund-statement${query({ ...range })}`),
    enabled: Boolean(businessId),
  })
}

export interface MonthlyRange {
  accountId?: string
  start: string // 'YYYY-MM'
  months: number
}

export function useMonthly(businessId: string | undefined, range: MonthlyRange) {
  return useQuery({
    queryKey: ['monthly', businessId, range],
    queryFn: () => api.get<MonthlyView>(`/businesses/${businessId}/monthly${query({ ...range })}`),
    enabled: Boolean(businessId),
  })
}

const MONTH_NAMES = new Intl.DateTimeFormat('en-GB', { month: 'short', timeZone: 'UTC' })

// 'YYYY-MM' -> 'May 2026' (or 'May' when withYear is false).
export function monthLabel(month: string, withYear = true): string {
  const [year, number] = month.split('-').map(Number)
  const name = MONTH_NAMES.format(new Date(Date.UTC(year, number - 1, 1)))
  return withYear ? `${name} ${year}` : name
}

// The 'YYYY-MM' that is monthsBack - 1 months before this one, so a window of
// monthsBack months ends with the current month.
export function defaultStartMonth(monthsBack: number, now: Date = new Date()): string {
  const index = now.getFullYear() * 12 + now.getMonth() - (monthsBack - 1)
  return `${Math.floor(index / 12)}-${String((index % 12) + 1).padStart(2, '0')}`
}
