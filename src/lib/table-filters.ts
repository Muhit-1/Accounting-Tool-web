import type { EngineTable, ViewFilter } from '../types/engine'

export const FILTER_OPS: { value: ViewFilter['op']; label: string; needsValue: boolean }[] = [
  { value: 'eq', label: 'is', needsValue: true },
  { value: 'ne', label: 'is not', needsValue: true },
  { value: 'contains', label: 'contains', needsValue: true },
  { value: 'gt', label: 'is more than', needsValue: true },
  { value: 'gte', label: 'is at least', needsValue: true },
  { value: 'lt', label: 'is less than', needsValue: true },
  { value: 'lte', label: 'is at most', needsValue: true },
  { value: 'empty', label: 'is empty', needsValue: false },
  { value: 'notempty', label: 'is not empty', needsValue: false },
]

// "Status is Delivered", for the chips above a table.
export function filterSentence(table: EngineTable, f: ViewFilter): string {
  const field = table.fields.find((x) => x.id === f.fieldId)
  const op = FILTER_OPS.find((o) => o.value === f.op)
  return `${field?.name ?? 'A deleted column'} ${op?.label ?? f.op}${op?.needsValue ? ` ${Array.isArray(f.value) ? f.value.join(', ') : String(f.value ?? '')}` : ''}`
}
