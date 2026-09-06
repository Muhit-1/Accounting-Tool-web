import { useMutation } from '@tanstack/react-query'
import { api } from './api-client'

export interface InvoiceScanResult {
  amount: number | null
  date: string | null
  counterparty: string | null
}

export function useScanInvoice(businessId: string, ledgerId: string) {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.postForm<InvoiceScanResult>(`/businesses/${businessId}/ledgers/${ledgerId}/scan`, formData)
    },
  })
}
