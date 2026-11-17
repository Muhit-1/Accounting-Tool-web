import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { CannedReply, MyTicket, MyTicketDetail, Notice, Page, StaffTicket, StaffTicketDetail, StaffTicketFilters, TicketCategory, TicketPriority, TicketStatus } from '../types/admin'

// ---- the person's own requests (/support) ----

export function useMyTickets() {
  return useQuery({ queryKey: ['support', 'mine'], queryFn: () => api.get<MyTicket[]>('/support/tickets') })
}

export function useMyTicket(id: string | undefined) {
  return useQuery({ queryKey: ['support', 'mine', id], queryFn: () => api.get<MyTicketDetail>(`/support/tickets/${id}`), enabled: Boolean(id) })
}

/** The dot beside "Help and support": answers the person has not read. Checked now and then, never in a hurry. */
export function useSupportUnread(enabled = true) {
  return useQuery({
    queryKey: ['support', 'unread'],
    queryFn: () => api.get<{ count: number }>('/support/unread'),
    enabled,
    staleTime: 60_000,
    refetchInterval: 120_000,
  })
}

function useAfterMyChange() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: ['support'] })
}

export interface NewTicketInput {
  subject: string
  category: TicketCategory
  message: string
  requestId?: string
}

export function useCreateTicket() {
  const done = useAfterMyChange()
  return useMutation({ mutationFn: (input: NewTicketInput) => api.post<MyTicket>('/support/tickets', input), onSuccess: done })
}

export function useReplyMine(id: string) {
  const done = useAfterMyChange()
  return useMutation({ mutationFn: (body: string) => api.post(`/support/tickets/${id}/messages`, { body }), onSuccess: done })
}

export function useCloseMine(id: string) {
  const done = useAfterMyChange()
  return useMutation({ mutationFn: () => api.post(`/support/tickets/${id}/close`), onSuccess: done })
}

export function useRateMine(id: string) {
  const done = useAfterMyChange()
  return useMutation({ mutationFn: (rating: number) => api.post(`/support/tickets/${id}/rating`, { rating }), onSuccess: done })
}

// ---- the banner everyone may see (public) ----

export function useNotice() {
  return useQuery({ queryKey: ['notice'], queryFn: () => api.get<Notice>('/meta'), staleTime: 5 * 60_000, retry: false })
}

// ---- the staff inbox (/admin/support) ----

function query(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value))
  }
  const text = q.toString()
  return text ? `?${text}` : ''
}

export function useStaffTickets(filters: StaffTicketFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'tickets', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.get<Page<StaffTicket>>(`/admin/support/tickets${query({ ...filters, limit: 25, cursor: pageParam })}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useStaffTicket(id: string | undefined) {
  return useQuery({ queryKey: ['admin', 'ticket', id], queryFn: () => api.get<StaffTicketDetail>(`/admin/support/tickets/${id}`), enabled: Boolean(id) })
}

export function useStaffUnread() {
  return useQuery({ queryKey: ['admin', 'tickets-unread'], queryFn: () => api.get<{ count: number }>('/admin/support/unread'), staleTime: 30_000, refetchInterval: 60_000 })
}

function useAfterStaffChange() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: ['admin'] })
}

export function useStaffReply(id: string) {
  const done = useAfterStaffChange()
  return useMutation({ mutationFn: (input: { body: string; internal: boolean }) => api.post(`/admin/support/tickets/${id}/messages`, input), onSuccess: done })
}

export function useUpdateTicket(id: string) {
  const done = useAfterStaffChange()
  return useMutation({
    mutationFn: (input: { status?: TicketStatus; priority?: TicketPriority; assignedToId?: string | null }) => api.patch(`/admin/support/tickets/${id}`, input),
    onSuccess: done,
  })
}

export function useCanned() {
  return useQuery({ queryKey: ['admin', 'canned'], queryFn: () => api.get<CannedReply[]>('/admin/support/canned') })
}

export function useCreateCanned() {
  const done = useAfterStaffChange()
  return useMutation({ mutationFn: (input: { title: string; body: string }) => api.post<CannedReply>('/admin/support/canned', input), onSuccess: done })
}

export function useDeleteCanned() {
  const done = useAfterStaffChange()
  return useMutation({ mutationFn: (id: string) => api.delete(`/admin/support/canned/${id}`), onSuccess: done })
}
