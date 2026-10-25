import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './api-client'
import type { EngineRow, EngineRows, EngineSummary, EngineTable, FnRow, FormulaPreview, RuleConfig, RulePreview, RuleSaveResult, TableField, TableViewInfo, TemplateInfo, ViewConfig, ViewFilter } from '../types/engine'

// The table engine: every table, column, row and saved view of a business.

const base = (businessId: string) => `/businesses/${businessId}/tables`

export function useTables(businessId: string | undefined) {
  return useQuery({
    queryKey: ['tables', businessId],
    queryFn: () => api.get<EngineTable[]>(base(businessId as string)),
    enabled: Boolean(businessId),
  })
}

export interface RowsQuery {
  viewId?: string
  filters?: ViewFilter[]
  sort?: string
  dir?: 'asc' | 'desc'
  q?: string
  limit?: number
}

export function useTableRows(businessId: string | undefined, tableId: string | undefined, query: RowsQuery = {}) {
  const params = new URLSearchParams()
  if (query.viewId) params.set('viewId', query.viewId)
  if (query.filters?.length) params.set('filters', JSON.stringify(query.filters))
  if (query.sort) params.set('sort', query.sort)
  if (query.dir) params.set('dir', query.dir)
  if (query.q) params.set('q', query.q)
  params.set('limit', String(query.limit ?? 2000))
  return useQuery({
    queryKey: ['table-rows', businessId, tableId, params.toString()],
    queryFn: () => api.get<EngineRows>(`${base(businessId as string)}/${tableId}/rows?${params.toString()}`),
    enabled: Boolean(businessId) && Boolean(tableId),
    placeholderData: keepPreviousData,
  })
}

export function useTableSummary(businessId: string | undefined, tableId: string | undefined, enabled = true) {
  return useQuery({
    queryKey: ['table-summary', businessId, tableId],
    queryFn: () => api.get<EngineSummary>(`${base(businessId as string)}/${tableId}/summary`),
    enabled: Boolean(businessId) && Boolean(tableId) && enabled,
    placeholderData: keepPreviousData,
  })
}

function useRefresh(businessId: string) {
  const queryClient = useQueryClient()
  return {
    tables: () => queryClient.invalidateQueries({ queryKey: ['tables', businessId] }),
    // any change to a row can change a formula, a rollup, a link name or a function row anywhere
    data: () => {
      queryClient.invalidateQueries({ queryKey: ['table-rows', businessId] })
      queryClient.invalidateQueries({ queryKey: ['table-summary', businessId] })
      queryClient.invalidateQueries({ queryKey: ['tables', businessId] })
      // posted rows change the Cash book
      queryClient.invalidateQueries({ queryKey: ['transactions', businessId] })
      queryClient.invalidateQueries({ queryKey: ['accounts', businessId] })
    },
  }
}

export function useCreateTable(businessId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (input: { name?: string; columns?: number }) => api.post<EngineTable>(base(businessId), input),
    onSuccess: refresh.tables,
  })
}

export function useUpdateTable(businessId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; color?: string | null; fnRows?: FnRow[] }) => api.patch<EngineTable>(`${base(businessId)}/${id}`, input),
    onSuccess: refresh.data,
  })
}

export function useReorderTables(businessId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (ids: string[]) => api.patch<{ ids: string[] }>(`${base(businessId)}/order`, { ids }),
    onSuccess: refresh.tables,
  })
}

export function useDeleteTable(businessId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (id: string) => api.delete(`${base(businessId)}/${id}`),
    onSuccess: refresh.data,
  })
}

export function useRestoreTable(businessId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (id: string) => api.post<EngineTable>(`${base(businessId)}/${id}/restore`),
    onSuccess: refresh.data,
  })
}

export interface FieldInput {
  name: string
  type: string
  config?: Record<string, unknown>
}

export function useCreateField(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (input: FieldInput) => api.post<TableField>(`${base(businessId)}/${tableId}/fields`, input),
    onSuccess: refresh.data,
  })
}

export function useUpdateField(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: ({ id, ...input }: { id: string; name?: string; config?: Record<string, unknown> }) => api.patch<TableField>(`${base(businessId)}/${tableId}/fields/${id}`, input),
    onSuccess: refresh.data,
  })
}

export function useDeleteField(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (id: string) => api.delete(`${base(businessId)}/${tableId}/fields/${id}`),
    onSuccess: refresh.data,
  })
}

export function useRestoreField(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (id: string) => api.post<TableField>(`${base(businessId)}/${tableId}/fields/${id}/restore`),
    onSuccess: refresh.data,
  })
}

export function useCreateRow(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (values: Record<string, unknown>) => api.post<EngineRow>(`${base(businessId)}/${tableId}/rows`, { values }),
    onSuccess: refresh.data,
  })
}

export function useUpdateRow(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: ({ id, values, version }: { id: string; values: Record<string, unknown>; version?: number }) =>
      api.patch<EngineRow>(`${base(businessId)}/${tableId}/rows/${id}`, { values, version }),
    onSuccess: refresh.data,
  })
}

export function useDeleteRow(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (id: string) => api.delete(`${base(businessId)}/${tableId}/rows/${id}`),
    onSuccess: refresh.data,
  })
}

export function useBulkRows(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (input: { rows: Record<string, unknown>[]; importBatchId?: string }) => api.post<{ importBatchId: string; created: number }>(`${base(businessId)}/${tableId}/rows/bulk`, input),
    onSuccess: refresh.data,
  })
}

export function useUndoRowBatch(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (importBatchId: string) => api.delete<{ deleted: number }>(`${base(businessId)}/${tableId}/rows/batch/${importBatchId}`),
    onSuccess: refresh.data,
  })
}

export function useSaveView(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (input: { id?: string; name?: string; shared?: boolean; config?: ViewConfig }) =>
      input.id
        ? api.patch<TableViewInfo>(`${base(businessId)}/${tableId}/views/${input.id}`, { name: input.name, config: input.config })
        : api.post<TableViewInfo>(`${base(businessId)}/${tableId}/views`, { name: input.name, shared: input.shared, config: input.config }),
    onSuccess: refresh.tables,
  })
}

export function useDeleteView(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (id: string) => api.delete(`${base(businessId)}/${tableId}/views/${id}`),
    onSuccess: refresh.tables,
  })
}

export function previewFormula(businessId: string, tableId: string, input: { formula: string; fieldId?: string; rowId?: string; mode?: 'row' | 'column' }) {
  return api.post<FormulaPreview>(`${base(businessId)}/${tableId}/formula-preview`, input)
}

export function useTemplates(businessId: string | undefined) {
  return useQuery({
    queryKey: ['table-templates', businessId],
    queryFn: () => api.get<TemplateInfo[]>(`${base(businessId as string)}/templates`),
    enabled: Boolean(businessId),
    staleTime: 10 * 60_000,
  })
}

export function useApplyTemplate(businessId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (key: string) => api.post<EngineTable[]>(`${base(businessId)}/from-template`, { key }),
    onSuccess: refresh.data,
  })
}

export function useSaveRule(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (input: { id?: string; config?: RuleConfig; enabled?: boolean }) =>
      input.id
        ? api.patch<RuleSaveResult>(`${base(businessId)}/${tableId}/rules/${input.id}`, { config: input.config, enabled: input.enabled })
        : api.post<RuleSaveResult>(`${base(businessId)}/${tableId}/rules`, { config: input.config, enabled: input.enabled }),
    onSuccess: refresh.data,
  })
}

export function useDeleteRule(businessId: string, tableId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (id: string) => api.delete<{ id: string; removed: number }>(`${base(businessId)}/${tableId}/rules/${id}`),
    onSuccess: refresh.data,
  })
}

export function previewRule(businessId: string, tableId: string, config: RuleConfig) {
  return api.post<RulePreview>(`${base(businessId)}/${tableId}/rules/preview`, { config })
}

export interface ImportReport {
  dryRun: boolean
  importBatchId: string
  tables: { id: string; name: string; renamedFrom?: string; rows: number; columns: number }[]
  formulas: { checked: number; matched: number; differ: number; samples: { table: string; column: string; row: number; expected: unknown; got: unknown }[] }
  links: { linked: number; unlinked: number; samples: { table: string; column: string; row: number; value: string }[] }
  dropped: { count: number; samples: { table: string; column: string; row: number; message: string }[] }
  rules: { table: string; posting: number; of: number; total: number }[]
  posted: number
}

// A sheet turned into tables. `dryRun` builds everything on the server and rolls it back, for the review screen.
export function importSheet(businessId: string, plan: unknown, dryRun: boolean) {
  return api.post<ImportReport>(`/businesses/${businessId}/import`, { ...(plan as object), dryRun })
}

export function useUndoImport(businessId: string) {
  const refresh = useRefresh(businessId)
  return useMutation({
    mutationFn: (batchId: string) => api.delete<{ deleted: number }>(`/businesses/${businessId}/import/${batchId}`),
    onSuccess: refresh.data,
  })
}

export function useRefreshAfterImport(businessId: string) {
  return useRefresh(businessId).data
}
