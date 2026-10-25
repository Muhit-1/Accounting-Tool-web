import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { formatMoneyCell } from '../../lib/grid-parse'
import { TYPE_HINT, TYPE_LABEL } from '../../lib/table-grid'
import { previewFormula, useCreateField, useUpdateField } from '../../lib/tables'
import { useToast } from '../../lib/toast-context'
import type { EngineTable, FieldType, FormulaPreview, TableField } from '../../types/engine'
import { Button } from '../Button'
import { Modal } from '../Modal'
import { Select } from '../Select'
import { TextField } from '../TextField'

const TYPES: FieldType[] = ['TEXT', 'NUMBER', 'MONEY', 'DATE', 'CHOICE', 'TICK', 'LINK', 'LOOKUP', 'ROLLUP', 'FORMULA', 'AUTO']
const FUNCTIONS = ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'ROUND', 'IF', 'AND', 'OR', 'IFERROR', 'SUMIF', 'COUNTIF', 'CONCAT', 'TODAY']
const SOURCE_TYPES: FieldType[] = ['MONEY', 'NUMBER', 'FORMULA', 'ROLLUP', 'LOOKUP']

const str = (v: unknown) => (typeof v === 'string' ? v : '')

// Add a column, or change one. One place for every type, because a column's settings are what make it a
// plain list, a link to another table, a worked-out number or a formula.
export function ColumnDialog({
  businessId,
  table,
  tables,
  field,
  onClose,
}: {
  businessId: string
  table: EngineTable
  tables: EngineTable[]
  field?: TableField
  onClose: () => void
}) {
  const toast = useToast()
  const create = useCreateField(businessId, table.id)
  const update = useUpdateField(businessId, table.id)
  const editing = Boolean(field)
  const cfg = useMemo(() => field?.config ?? {}, [field])

  const [name, setName] = useState(field?.name ?? '')
  const [type, setType] = useState<FieldType>(field?.type ?? 'TEXT')
  const [options, setOptions] = useState(Array.isArray(cfg.options) ? (cfg.options as string[]).join(', ') : '')
  const [prefix, setPrefix] = useState(str(cfg.prefix))
  const [targetTableId, setTargetTableId] = useState(str(cfg.targetTableId))
  const [multiple, setMultiple] = useState(cfg.multiple === true)
  const [linkFieldId, setLinkFieldId] = useState(str(cfg.linkFieldId))
  const [lookupFieldId, setLookupFieldId] = useState(type === 'LOOKUP' ? str(cfg.fieldId) : '')
  const [viaFieldId, setViaFieldId] = useState(str(cfg.viaFieldId))
  const [rollupFieldId, setRollupFieldId] = useState(type === 'ROLLUP' ? str(cfg.fieldId) : '')
  const [how, setHow] = useState(str(cfg.how) || 'sum')
  const [formula, setFormula] = useState(str(cfg.formula))
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<FormulaPreview | null>(null)
  const formulaBox = useRef<HTMLTextAreaElement>(null)

  const linkTargets = tables.filter((t) => t.kind === 'TABLE')
  const linkFields = table.fields.filter((f) => f.type === 'LINK')
  const lookupLink = linkFields.find((f) => f.id === linkFieldId) ?? linkFields[0]
  const lookupTarget = tables.find((t) => t.id === lookupLink?.config.targetTableId)
  // columns of other tables that link to this one: what a rollup can add up
  const incoming = tables.flatMap((t) => t.fields.filter((f) => f.type === 'LINK' && f.config.targetTableId === table.id).map((f) => ({ table: t, field: f })))
  const rollupVia = incoming.find((i) => i.field.id === viaFieldId) ?? incoming[0]

  // The live result of a formula: asked of the server, which is the one that works things out.
  useEffect(() => {
    if (type !== 'FORMULA' || !formula.trim()) return
    let stale = false
    const timer = window.setTimeout(() => {
      previewFormula(businessId, table.id, { formula, fieldId: field?.id })
        .then((result) => {
          if (!stale) setPreview(result)
        })
        .catch(() => {
          if (!stale) setPreview({ ok: false, error: 'Could not check the formula right now.' })
        })
    }, 280)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [type, formula, businessId, table.id, field?.id])

  function insert(text: string) {
    const el = formulaBox.current
    if (!el) {
      setFormula((f) => f + text)
      return
    }
    const start = el.selectionStart
    const end = el.selectionEnd
    const next = formula.slice(0, start) + text + formula.slice(end)
    setFormula(next)
    window.setTimeout(() => {
      el.focus()
      el.setSelectionRange(start + text.length, start + text.length)
    }, 0)
  }

  function config(): Record<string, unknown> {
    switch (type) {
      case 'CHOICE':
        return { options: options.split(',').map((o) => o.trim()).filter(Boolean) }
      case 'AUTO':
        return { prefix }
      case 'LINK':
        return { targetTableId, multiple }
      case 'LOOKUP':
        return { linkFieldId: lookupLink?.id, fieldId: lookupFieldId || lookupTarget?.fields[0]?.id }
      case 'ROLLUP': {
        const source = rollupVia?.table
        return { sourceTableId: source?.id, viaFieldId: rollupVia?.field.id, fieldId: rollupFieldId || source?.fields.find((f) => SOURCE_TYPES.includes(f.type))?.id, how }
      }
      case 'FORMULA':
        return { formula }
      default:
        return {}
    }
  }

  async function save() {
    setError(null)
    try {
      if (field) {
        await update.mutateAsync({ id: field.id, name: name !== field.name ? name : undefined, config: ['TEXT', 'NUMBER', 'MONEY', 'DATE', 'TICK'].includes(field.type) ? undefined : config() })
        toast('Column saved.')
      } else {
        await create.mutateAsync({ name, type, config: config() })
        toast('Column added.')
      }
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const busy = create.isPending || update.isPending

  return (
    <Modal title={editing ? 'Edit column' : 'Add a column'} onClose={onClose} wide>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <TextField label="Column name" value={name} maxLength={60} autoComplete="off" onChange={(event) => setName(event.target.value)} placeholder="e.g. Total" />

        {!editing && (
          <div role="group" aria-label="Type" className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {TYPES.map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={type === t}
                onClick={() => setType(t)}
                className={`flex flex-col gap-0.5 rounded-ledger border px-3 py-2 text-left ${type === t ? 'border-stamp bg-stamp-soft' : 'border-paper-line bg-white hover:border-stamp'}`}
              >
                <span className="text-[13.5px] font-semibold">{TYPE_LABEL[t]}</span>
                <span className="text-xs text-ink-soft">{TYPE_HINT[t]}</span>
              </button>
            ))}
          </div>
        )}

        {type === 'CHOICE' && (
          <TextField label="Choices (separated by commas)" value={options} onChange={(event) => setOptions(event.target.value)} placeholder="New, Confirmed, Shipped, Delivered" />
        )}
        {type === 'AUTO' && <TextField label="Starts with" value={prefix} maxLength={10} onChange={(event) => setPrefix(event.target.value)} placeholder="ORD-" />}
        {type === 'LINK' && (
          <div className="flex flex-col gap-3">
            <Select label="Link to which table?" value={targetTableId} disabled={editing} onChange={(event) => setTargetTableId(event.target.value)}>
              <option value="">Choose a table…</option>
              {linkTargets.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={multiple} onChange={(event) => setMultiple(event.target.checked)} className="h-4 w-4 accent-stamp" />
              A cell can link to several rows
            </label>
            {linkTargets.length === 0 && <p className="text-sm text-ink-soft">Make another table first, then link to it.</p>}
          </div>
        )}
        {type === 'LOOKUP' &&
          (linkFields.length === 0 ? (
            <p className="text-sm text-rust">Add a “Link to table” column first, then show a column of the linked row.</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Through which link column?" value={lookupLink?.id ?? ''} onChange={(event) => { setLinkFieldId(event.target.value); setLookupFieldId('') }}>
                {linkFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} → {tables.find((t) => t.id === f.config.targetTableId)?.name}
                  </option>
                ))}
              </Select>
              <Select label="Show which column?" value={lookupFieldId || lookupTarget?.fields[0]?.id || ''} onChange={(event) => setLookupFieldId(event.target.value)}>
                {lookupTarget?.fields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
            </div>
          ))}
        {type === 'ROLLUP' &&
          (incoming.length === 0 ? (
            <p className="text-sm text-rust">No table links to “{table.name}” yet. In the other table, add a “Link to table” column that points here, then come back.</p>
          ) : (
            <div className="flex flex-col gap-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Select label="Add up rows that link here from" value={rollupVia?.field.id ?? ''} onChange={(event) => { setViaFieldId(event.target.value); setRollupFieldId('') }}>
                  {incoming.map((i) => (
                    <option key={i.field.id} value={i.field.id}>
                      {i.table.name} · {i.field.name}
                    </option>
                  ))}
                </Select>
                <Select label="Column to add up" value={rollupFieldId || rollupVia?.table.fields.find((f) => SOURCE_TYPES.includes(f.type))?.id || ''} onChange={(event) => setRollupFieldId(event.target.value)}>
                  {rollupVia?.table.fields.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.name}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="max-w-60">
                <Select label="How" value={how} onChange={(event) => setHow(event.target.value)}>
                  <option value="sum">Sum</option>
                  <option value="count">Count of rows</option>
                  <option value="avg">Average</option>
                  <option value="min">Smallest</option>
                  <option value="max">Largest</option>
                </Select>
              </div>
            </div>
          ))}
        {type === 'FORMULA' && (
          <div className="flex flex-col gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wider text-ink-soft uppercase">Formula</span>
              <textarea
                ref={formulaBox}
                value={formula}
                spellCheck={false}
                rows={3}
                maxLength={2000}
                onChange={(event) => setFormula(event.target.value)}
                placeholder="{Subtotal} + {Delivery} - {Discount}"
                className="rounded-ledger border border-paper-line bg-white px-3.5 py-2.5 font-mono text-[13.5px] text-ink focus:border-stamp focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-1.5" aria-label="Columns">
              {table.fields
                .filter((f) => f.id !== field?.id)
                .map((f) => (
                  <button key={f.id} type="button" onClick={() => insert(`{${f.name}}`)} className="rounded-full border border-paper-line bg-paper-edge px-2.5 py-0.5 text-[12.5px] hover:border-stamp hover:text-stamp">
                    {f.name}
                  </button>
                ))}
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label="Functions">
              {FUNCTIONS.map((fn) => (
                <button key={fn} type="button" onClick={() => insert(`${fn}(`)} className="rounded-[6px] border border-paper-line bg-paper-edge px-2 py-0.5 font-mono text-xs hover:border-stamp hover:text-stamp">
                  {fn}
                </button>
              ))}
            </div>
            <div className="rounded-ledger border border-paper-line bg-paper-edge px-3.5 py-2.5 text-[13px]" aria-live="polite">
              {!formula.trim() ? (
                <span className="text-ink-soft">
                  Click columns and functions, or type. Example: <span className="font-mono">{'{Subtotal} + {Delivery} - {Discount}'}</span>
                </span>
              ) : !preview ? (
                <span className="text-ink-soft">Checking…</span>
              ) : preview.ok ? (
                <>
                  <span className="block text-ink-soft">{preview.sample === null ? 'The formula is valid. Add a row to see a result.' : `Result on row ${preview.sample}`}</span>
                  {preview.sample !== null && <span className="tabular block font-mono text-[15px]">{preview.value === null ? '(empty)' : typeof preview.value === 'number' ? formatMoneyCell(preview.value) : String(preview.value)}</span>}
                  <span className="block text-ink-soft">Reads as: {preview.explain}</span>
                </>
              ) : (
                <span className="text-rust">{preview.error}</span>
              )}
            </div>
          </div>
        )}

        {error && (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy || name.trim() === ''}>
            {editing ? 'Save' : 'Add column'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
