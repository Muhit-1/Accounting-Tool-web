import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import { formatMoneyCell } from './grid-parse'
import { sumMoney } from './grid-rows'
import { invalidateTransactionQueries } from './transactions'
import type { Invoice, InvoiceStatus, PostingConfig, PostingSaveResult } from '../types/api'

// Mirrors accounting-api/src/posting/posting-config.ts (the API validates and enforces it); keep both
// in step. What the Invoices page sends to the Cash book. Other tables post through their own rules.

// A draft invoice is not issued yet and a cancelled one is withdrawn.
export const POSTABLE_INVOICE_STATUSES: InvoiceStatus[] = ['SENT', 'OVERDUE', 'PAID']

export const DEFAULT_POSTING_CONFIG: PostingConfig = {
  invoices: { on: false, when: ['PAID'] },
}

export function invoicePosts(config: PostingConfig, status: InvoiceStatus): boolean {
  return config.invoices.on && config.invoices.when.includes(status)
}

export interface PostingPreview {
  // Rows that would post, of the rows the table has.
  posting: number
  of: number
  // What they add up to.
  total: number
  // Rows that would post but have nothing to post (a total of 0): the server refuses these.
  empty: number
}

export function previewInvoices(invoices: Pick<Invoice, 'status' | 'total'>[], when: InvoiceStatus[]): PostingPreview {
  const rows = invoices.filter((invoice) => when.includes(invoice.status))
  return {
    posting: rows.length,
    of: invoices.length,
    total: sumMoney(rows.map((invoice) => invoice.total)),
    empty: rows.filter((invoice) => !(invoice.total > 0)).length,
  }
}

// "3 of 4 rows would post, total 5,500.00"
export function previewText(preview: PostingPreview): string {
  return `${preview.posting} of ${preview.of} ${preview.of === 1 ? 'row' : 'rows'} would post, total ${formatMoneyCell(preview.total)}`
}

// A short line for the toast after saving.
export function savedText(result: PostingSaveResult): string {
  const { posted, removed } = result.changes.invoices
  if (posted === 0 && removed === 0) return 'Saved.'
  const parts: string[] = []
  if (posted > 0) parts.push(`${posted} added to the Cash book`)
  if (removed > 0) parts.push(`${removed} removed`)
  return `Saved. ${parts.join(', ')}.`
}

export function usePostingConfig(businessId: string | undefined) {
  return useQuery({
    queryKey: ['posting-config', businessId],
    queryFn: () => api.get<PostingConfig>(`/businesses/${businessId}/posting-config`),
    enabled: Boolean(businessId),
  })
}

export function useSavePostingConfig(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (config: PostingConfig) => api.patch<PostingSaveResult>(`/businesses/${businessId}/posting-config`, config),
    onSuccess: (result) => {
      queryClient.setQueryData(['posting-config', businessId], result.config)
      // The Cash book and every report change with it, and so do the rows' own links.
      invalidateTransactionQueries(queryClient, businessId)
      for (const key of ['invoices', 'reports']) queryClient.invalidateQueries({ queryKey: [key, businessId] })
    },
  })
}
