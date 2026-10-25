// Shapes of the table engine API (/businesses/:id/tables) — mirrors accounting-api/src/tables.

export type FieldType = 'TEXT' | 'NUMBER' | 'MONEY' | 'DATE' | 'CHOICE' | 'TICK' | 'AUTO' | 'LINK' | 'LOOKUP' | 'ROLLUP' | 'FORMULA'
export type TableKind = 'TABLE' | 'LEDGER' | 'DOCUMENT'

export interface TableField {
  id: string
  name: string
  type: FieldType
  // CHOICE { options }, AUTO { prefix }, LINK { targetTableId, multiple }, LOOKUP { linkFieldId, fieldId },
  // ROLLUP { sourceTableId, viaFieldId, fieldId, how }, FORMULA { formula }
  config: Record<string, unknown>
  position: number
  locked: boolean
}

export type FnKind = 'sum' | 'avg' | 'count' | 'min' | 'max' | 'last' | 'formula'
export interface FnSpec {
  fn: FnKind
  formula?: string
}
export interface FnRow {
  id: string
  label: string
  cells: Record<string, FnSpec>
}

export interface ViewFilter {
  fieldId: string
  op: 'eq' | 'ne' | 'contains' | 'gt' | 'gte' | 'lt' | 'lte' | 'empty' | 'notempty' | 'in' | 'nin'
  value?: string | number | boolean | null | (string | number | boolean | null)[]
}
export interface ViewConfig {
  filters: ViewFilter[]
  sort: { fieldId: string; dir: 'asc' | 'desc' } | null
  hidden: string[]
  order: string[]
  widths: Record<string, number>
}
export interface TableViewInfo {
  id: string
  name: string
  shared: boolean
  config: ViewConfig
  position: number
}

export interface EngineTable {
  id: string
  name: string
  kind: TableKind
  color: string | null
  position: number
  templateKey: string | null
  rowCount: number
  fnRows: FnRow[]
  fields: TableField[]
  views: TableViewInfo[]
  // "Posts to Cash book" rules
  rules: TableRule[]
}

export interface EngineCell {
  v: string | number | boolean | null
  e?: string
  ids?: string[]
}
export interface EngineRow {
  id: string
  number: number
  version: number
  // raw values by column id; link columns hold the ids of the linked rows
  values: Record<string, unknown>
  // worked-out columns (formula, lookup, rollup, auto number) and the names shown for links
  cells: Record<string, EngineCell>
}
export interface EngineRows {
  total: number
  offset: number
  rows: EngineRow[]
}
export interface EngineSummary {
  rows: { id: string; label: string; cells: Record<string, { v: string | number | boolean | null; e?: string }> }[]
}
export type FormulaPreview =
  | { ok: true; value: string | number | boolean | null; explain: string; sample: number | null }
  | { ok: false; error: string; explain?: string }

export interface RuleConfig {
  amountFieldId: string
  dateFieldId: string | null
  direction: 'IN' | 'OUT'
  conditions: ViewFilter[]
  category: string
  description: string
}
export interface TableRule {
  id: string
  enabled: boolean
  config: RuleConfig
}
export interface RulePreview {
  posting: number
  of: number
  total: number
  blocked: number
}
export interface RuleSaveResult {
  rule: { id: string; tableId: string; enabled: boolean; config: RuleConfig }
  changes: { posted: number; updated: number; removed: number }
}
export interface TemplateInfo {
  key: string
  name: string
  description: string
  tables: string[]
}
