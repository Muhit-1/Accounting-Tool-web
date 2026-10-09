import { useQuery } from '@tanstack/react-query'
import { api } from './api-client'
import type { LegalDocument } from '../types/api'

// The texts change only on a deploy and the API caches them for 5 minutes, so
// there is no point refetching on every focus/mount within that window.
const FIVE_MINUTES_MS = 5 * 60 * 1000

export function useLegalDocument(slug: LegalDocument['slug']) {
  return useQuery({
    queryKey: ['legal', slug],
    queryFn: () => api.get<LegalDocument>(`/legal/${slug}`),
    staleTime: FIVE_MINUTES_MS,
  })
}
