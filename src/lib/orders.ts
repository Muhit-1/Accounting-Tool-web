import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import { invalidateTransactionQueries } from './transactions'
import type { Order, OrderList } from '../types/api'
import type { OrderPostingRule, OrderStatus } from './order-status'

export interface OrderInput {
  accountId: string
  orderDate: string
  customerName: string
  customerPhone?: string | null
  customerEmail?: string | null
  customerAddress?: string | null
  items?: string | null
  subtotal: number
  deliveryCharge?: number
  discount?: number
  paymentMethod?: string | null
  postingRule?: OrderPostingRule
  deliveryDate?: string | null
  notes?: string | null
  // Only when an order is made (a delivered one can be entered); later moves go through the status endpoint.
  status?: OrderStatus
}

export function useOrders(businessId: string | undefined) {
  return useQuery({
    queryKey: ['orders', businessId],
    queryFn: () => api.get<OrderList>(`/businesses/${businessId}/orders`),
    enabled: Boolean(businessId),
  })
}

// A delivered order owns a fund entry, so every order change can move the
// account balance, the statement and the monthly view too.
function useAfterOrderChange(businessId: string) {
  const queryClient = useQueryClient()
  return () => {
    queryClient.invalidateQueries({ queryKey: ['orders', businessId] })
    queryClient.invalidateQueries({ queryKey: ['legacy-status', businessId] })
    queryClient.invalidateQueries({ queryKey: ['categories', businessId] })
    invalidateTransactionQueries(queryClient, businessId)
  }
}

export function useCreateOrder(businessId: string) {
  const afterChange = useAfterOrderChange(businessId)
  return useMutation({
    mutationFn: (input: OrderInput) => api.post<Order>(`/businesses/${businessId}/orders`, input),
    onSuccess: afterChange,
  })
}

export function useUpdateOrder(businessId: string) {
  const afterChange = useAfterOrderChange(businessId)
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<OrderInput> & { id: string }) =>
      api.patch<Order>(`/businesses/${businessId}/orders/${id}`, input),
    onSuccess: afterChange,
  })
}

export function useUpdateOrderStatus(businessId: string) {
  const afterChange = useAfterOrderChange(businessId)
  return useMutation({
    mutationFn: ({ id, status, deliveryDate }: { id: string; status: OrderStatus; deliveryDate?: string | null }) =>
      api.patch<Order>(`/businesses/${businessId}/orders/${id}/status`, { status, deliveryDate }),
    onSuccess: afterChange,
  })
}

export function useDeleteOrder(businessId: string) {
  const afterChange = useAfterOrderChange(businessId)
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/orders/${id}`),
    onSuccess: afterChange,
  })
}

export type BulkOrderRow = Omit<OrderInput, 'accountId'>

export interface BulkOrdersResult {
  importBatchId: string
  created: number
  // How many of them were delivered and posted to the fund, and the money they moved.
  posted: number
  totalIn: number
  totalOut: number
}

// Adds many orders at once, all or nothing (POST .../orders/bulk).
export function useBulkCreateOrders(businessId: string) {
  const afterChange = useAfterOrderChange(businessId)
  return useMutation({
    mutationFn: (input: { accountId: string; rows: BulkOrderRow[]; importBatchId?: string }) =>
      api.post<BulkOrdersResult>(`/businesses/${businessId}/orders/bulk`, input),
    onSuccess: afterChange,
  })
}

// "Undo" for a paste or import: removes that batch's orders and the fund entries they posted.
export function useUndoOrderBatch(businessId: string) {
  const afterChange = useAfterOrderChange(businessId)
  return useMutation({
    mutationFn: (importBatchId: string) => api.delete<{ deleted: number }>(`/businesses/${businessId}/orders/batch/${importBatchId}`),
    onSuccess: afterChange,
  })
}
