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
