import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'

// What makes the books trustworthy: who did what (activity and history), the Trash, and the lock date.

export interface AuditEvent {
  id: string
  at: string
  actor: string | null
  action: string
  summary: string
  tableId: string | null
  rowId: string | null
  detail: unknown
}

interface AuditPage {
  events: AuditEvent[]
  next: string | null
}

export function useAudit(businessId: string | undefined, scope: { tableId?: string; rowId?: string } = {}, enabled = true) {
  return useInfiniteQuery({
    queryKey: ['audit', businessId, scope.tableId ?? null, scope.rowId ?? null],
    queryFn: ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '30' })
      if (scope.tableId) params.set('tableId', scope.tableId)
      if (scope.rowId) params.set('rowId', scope.rowId)
      if (pageParam) params.set('before', pageParam)
      return api.get<AuditPage>(`/businesses/${businessId}/audit?${params.toString()}`)
    },
    initialPageParam: '',
    getNextPageParam: (last) => last.next ?? undefined,
    enabled: Boolean(businessId) && enabled,
  })
}

export interface Trash {
  days: number
  tables: { id: string; name: string; deletedAt: string }[]
  fields: { id: string; name: string; tableId: string; tableName: string; deletedAt: string }[]
  rows: { id: string; number: number; tableId: string; tableName: string; preview: string; deletedAt: string }[]
}

export function useTrash(businessId: string | undefined) {
  return useQuery({
    queryKey: ['trash', businessId],
    queryFn: () => api.get<Trash>(`/businesses/${businessId}/trash`),
    enabled: Boolean(businessId),
    // an old item is removed for good when the list is read, so never show a stale one
    gcTime: 0,
  })
}

// Bringing something back changes tables, rows, formulas and the Cash book.
export function useRestoreFromTrash(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (item: { kind: 'table'; id: string } | { kind: 'field'; id: string; tableId: string } | { kind: 'row'; id: string; tableId: string }) => {
      const base = `/businesses/${businessId}/tables`
      if (item.kind === 'table') return api.post(`${base}/${item.id}/restore`)
      if (item.kind === 'field') return api.post(`${base}/${item.tableId}/fields/${item.id}/restore`)
      return api.post(`${base}/${item.tableId}/rows/${item.id}/restore`)
    },
    onSuccess: () => {
      for (const key of ['trash', 'tables', 'table-rows', 'table-summary', 'transactions', 'accounts', 'audit']) queryClient.invalidateQueries({ queryKey: [key, businessId] })
    },
  })
}

export function useSetPeriodLock(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (lockedBefore: string | null) => api.patch<{ lockedBefore: string | null }>(`/businesses/${businessId}/period-lock`, { lockedBefore }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['businesses'] })
      queryClient.invalidateQueries({ queryKey: ['audit', businessId] })
    },
  })
}
