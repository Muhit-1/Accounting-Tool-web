import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { Category, CategoryType } from '../types/api'

export interface CategoryInput {
  name: string
  type: CategoryType
  // Empty / null clears the group.
  groupName?: string | null
}

export function useCategories(businessId: string | undefined) {
  return useQuery({
    queryKey: ['categories', businessId],
    queryFn: () => api.get<Category[]>(`/businesses/${businessId}/categories`),
    enabled: Boolean(businessId),
  })
}

export function useCreateCategory(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: CategoryInput) => api.post<Category>(`/businesses/${businessId}/categories`, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['categories', businessId] }),
  })
}

export function useUpdateCategory(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, ...input }: Partial<CategoryInput> & { id: string }) =>
      api.patch<Category>(`/businesses/${businessId}/categories/${id}`, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', businessId] })
      // Entries show their category name, and the statement groups by it.
      queryClient.invalidateQueries({ queryKey: ['transactions', businessId] })
      queryClient.invalidateQueries({ queryKey: ['statement', businessId] })
    },
  })
}

export function useDeleteCategory(businessId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/businesses/${businessId}/categories/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories', businessId] })
      queryClient.invalidateQueries({ queryKey: ['transactions', businessId] })
      queryClient.invalidateQueries({ queryKey: ['dashboard', businessId] })
      queryClient.invalidateQueries({ queryKey: ['statement', businessId] })
    },
  })
}
