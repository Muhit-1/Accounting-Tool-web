import { useMutation } from '@tanstack/react-query'
import { api } from './api-client'

export interface InvoiceScanResult {
  amount: number | null
  date: string | null
  counterparty: string | null
}

export function useScanInvoice(businessId: string, accountId: string) {
  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      return api.postForm<InvoiceScanResult>(`/businesses/${businessId}/accounts/${accountId}/scan`, formData)
    },
  })
}
