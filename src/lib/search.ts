import { useQuery } from '@tanstack/react-query'
import { api } from './api-client'
import type { SearchResult } from '../types/api'

// Find in all tables of one business. The API wants two letters at least; the caller waits for a pause in typing.
export function useBusinessSearch(businessId: string | undefined, q: string) {
  const text = q.trim()
  return useQuery({
    queryKey: ['search', businessId, text],
    queryFn: () => api.get<SearchResult>(`/businesses/${businessId}/search?q=${encodeURIComponent(text)}`),
    enabled: Boolean(businessId) && text.length >= 2,
    staleTime: 15_000,
  })
}
