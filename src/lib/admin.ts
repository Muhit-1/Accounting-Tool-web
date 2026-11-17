import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type {
  ActivityEvent,
  AdminOverview,
  AdminPersonList,
  AdminSeries,
  AdminUserDetail,
  AdminUserFilters,
  AuditEvent,
  DeletePreview,
  Page,
  PlatformSettings,
  SystemStatus,
  TeamMember,
} from '../types/admin'

// The admin panel's API (web only; the server refuses these calls from the phone app and from anyone who is not
// staff). Reads are cached briefly; every change invalidates what it touched.

function query(params: Record<string, string | number | undefined | null>): string {
  const q = new URLSearchParams()
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') q.set(key, String(value))
  }
  const text = q.toString()
  return text ? `?${text}` : ''
}

export function useAdminOverview() {
  return useQuery({ queryKey: ['admin', 'overview'], queryFn: () => api.get<AdminOverview>('/admin/stats/overview'), staleTime: 30_000 })
}

export function useAdminSeries(days = 30) {
  return useQuery({ queryKey: ['admin', 'series', days], queryFn: () => api.get<AdminSeries>(`/admin/stats/usage?days=${days}`), staleTime: 60_000 })
}

export function useAdminUsers(filters: AdminUserFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'users', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) =>
      api.get<AdminPersonList>(`/admin/users${query({ ...filters, limit: 25, cursor: pageParam })}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useAdminUser(id: string | undefined) {
  return useQuery({ queryKey: ['admin', 'user', id], queryFn: () => api.get<AdminUserDetail>(`/admin/users/${id}`), enabled: Boolean(id) })
}

// Not awaited: the answer to the click must not wait for every list on the page to load again.
function useAfterChange() {
  const queryClient = useQueryClient()
  return () => void queryClient.invalidateQueries({ queryKey: ['admin'] })
}

export function useDisableUser() {
  const done = useAfterChange()
  return useMutation({ mutationFn: ({ id, reason }: { id: string; reason: string }) => api.post(`/admin/users/${id}/disable`, { reason }), onSuccess: done })
}

export function useEnableUser() {
  const done = useAfterChange()
  return useMutation({ mutationFn: (id: string) => api.post(`/admin/users/${id}/enable`), onSuccess: done })
}

export function useLogoutAll() {
  const done = useAfterChange()
  return useMutation({ mutationFn: (id: string) => api.post<{ sessionsEnded: number }>(`/admin/users/${id}/logout-all`), onSuccess: done })
}

export function useEndSession() {
  const done = useAfterChange()
  return useMutation({ mutationFn: ({ userId, sessionId }: { userId: string; sessionId: string }) => api.delete(`/admin/users/${userId}/sessions/${sessionId}`), onSuccess: done })
}

export function useDeletePreview(id: string | undefined, enabled: boolean) {
  return useQuery({ queryKey: ['admin', 'delete-preview', id], queryFn: () => api.get<DeletePreview>(`/admin/users/${id}/delete-preview`), enabled: enabled && Boolean(id), gcTime: 0 })
}

export function useRemoveUser() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, confirmEmail }: { id: string; confirmEmail: string }) => api.delete<{ deleted: true }>(`/admin/users/${id}`, { confirmEmail }),
    onSuccess: (_result, { id }) => {
      // the person is gone: forget their page instead of asking for it again (it would answer 404)
      queryClient.removeQueries({ queryKey: ['admin', 'user', id] })
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
    },
  })
}

export interface ActivityFilters {
  type?: string
  search?: string
}

export function useAdminActivity(filters: ActivityFilters) {
  return useInfiniteQuery({
    queryKey: ['admin', 'activity', filters],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.get<Page<ActivityEvent>>(`/admin/activity${query({ ...filters, limit: 50, cursor: pageParam })}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useAdminAudit() {
  return useInfiniteQuery({
    queryKey: ['admin', 'audit'],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam }) => api.get<Page<AuditEvent>>(`/admin/audit${query({ limit: 50, cursor: pageParam })}`),
    getNextPageParam: (last) => last.nextCursor ?? undefined,
  })
}

export function useTeam() {
  return useQuery({ queryKey: ['admin', 'team'], queryFn: () => api.get<TeamMember[]>('/admin/team') })
}

export function useCreateAdmin() {
  const done = useAfterChange()
  return useMutation({ mutationFn: (email: string) => api.post<{ id: string; email: string; invited: boolean }>('/admin/team/admins', { email }), onSuccess: done })
}

export function useRemoveAdmin() {
  const done = useAfterChange()
  return useMutation({ mutationFn: (id: string) => api.delete(`/admin/team/admins/${id}`), onSuccess: done })
}

export function useAdminSettings() {
  return useQuery({ queryKey: ['admin', 'settings'], queryFn: () => api.get<PlatformSettings>('/admin/settings') })
}

/** A switch set to null goes back to its default. */
export type SettingsPatch = {
  signupsEnabled?: boolean
  maintenanceMessage?: string | null
  supportEmail?: string | null
  announcement?: { text: string; level: 'info' | 'warning' | 'critical'; until?: string | null } | null
}

export function useUpdateSettings() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (patch: SettingsPatch) => api.patch<PlatformSettings>('/admin/settings', patch),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['admin'] })
      void queryClient.invalidateQueries({ queryKey: ['notice'] })
    },
  })
}

export function useSystemStatus() {
  return useQuery({ queryKey: ['admin', 'system'], queryFn: () => api.get<SystemStatus>('/admin/system'), refetchInterval: 30_000 })
}
