import { useEffect, useMemo, useRef, useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { DATE_STYLES, formatConfig, readFormat } from '../../lib/field-format'
import { formatMoneyCell } from '../../lib/grid-parse'
import { TYPE_HINT, TYPE_LABEL } from '../../lib/table-grid'
import { previewFormula, previewTypeChange, useCreateField, useUpdateField } from '../../lib/tables'
import { useToast } from '../../lib/toast-context'
import type { EngineTable, FieldFormat, FieldType, FormulaPreview, TableField, TypeChangePreview } from '../../types/engine'
import { Button } from '../Button'
import { Select } from '../Select'
import { SidePanel } from '../SidePanel'
import { TextField } from '../TextField'

// Typed by you: the person types the values. Worked out: the whole column is worked out from other columns or tables.
const TYPED: FieldType[] = ['TEXT', 'NUMBER', 'MONEY', 'DATE', 'CHOICE', 'TICK']
const WORKED: FieldType[] = ['FORMULA', 'LINK', 'LOOKUP', 'ROLLUP', 'AUTO']
const FUNCTIONS = ['SUM', 'AVERAGE', 'MIN', 'MAX', 'COUNT', 'ROUND', 'IF', 'AND', 'OR', 'IFERROR', 'SUMIF', 'COUNTIF', 'CONCAT', 'TODAY']
const SOURCE_TYPES: FieldType[] = ['MONEY', 'NUMBER', 'FORMULA', 'ROLLUP', 'LOOKUP']
const NUMERIC: FieldType[] = ['NUMBER', 'MONEY', 'FORMULA', 'LOOKUP', 'ROLLUP']

const str = (v: unknown) => (typeof v === 'string' ? v : '')
const isTyped = (t: FieldType) => TYPED.includes(t)

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

// Add a column, or change one, in a panel beside the sheet. A column is either typed by you, or worked out for the
// whole column (a formula, a link, a look-up, a roll-up, an auto number). Never one cell: no single-cell formulas.
export function ColumnPanel({
  businessId,
  table,
  tables,
  field,
  initialType,
  onClose,
}: {
  businessId: string
  table: EngineTable
  tables: EngineTable[]
  field?: TableField
  initialType?: FieldType
  onClose: () => void
}) {
  const toast = useToast()
  const create = useCreateField(businessId, table.id)
  const update = useUpdateField(businessId, table.id)
  const editing = Boolean(field)
  const cfg = useMemo(() => field?.config ?? {}, [field])

  const [name, setName] = useState(field?.name ?? '')
  const [type, setType] = useState<FieldType>(field?.type ?? initialType ?? 'TEXT')
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
  const [format, setFormat] = useState<FieldFormat>(() => (field ? readFormat(field) : {}))
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<FormulaPreview | null>(null)
  const formulaBox = useRef<HTMLTextAreaElement>(null)

  // changing the type of an existing typed column
  const [newType, setNewType] = useState<FieldType | ''>('')
  const [typePreview, setTypePreview] = useState<TypeChangePreview | null>(null)
  const [typeError, setTypeError] = useState<string | null>(null)
  const [allowLoss, setAllowLoss] = useState(false)

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

  // What would happen to the values if the type changed: nothing is changed until the button is pressed.
  useEffect(() => {
    if (!field || newType === '') return
    let stale = false
    const timer = window.setTimeout(() => {
      previewTypeChange(businessId, table.id, field.id, { type: newType })
        .then((result) => {
          if (stale) return
          setTypePreview(result)
          setTypeError(null)
        })
        .catch((err) => {
          if (stale) return
          setTypePreview(null)
          setTypeError(messageOf(err))
        })
    }, 200)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [field, newType, businessId, table.id])

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

  // The settings that go to the server: the type's own, plus how the column is shown.
  const fullConfig = () => ({ ...config(), ...formatConfig(format) })

  async function save() {
    setError(null)
    try {
      if (field) {
        // a typed column has no settings of its own: only its format is sent (and only when it changed)
        const formatChanged = JSON.stringify(readFormat(field)) !== JSON.stringify(format)
        const body = isTyped(field.type) && field.type !== 'CHOICE' ? (formatChanged ? { format: format as unknown } : undefined) : fullConfig()
        await update.mutateAsync({ id: field.id, name: name !== field.name ? name : undefined, config: body ? (body as Record<string, unknown>) : undefined })
        toast('Column saved.')
      } else {
        await create.mutateAsync({ name, type, config: fullConfig() })
        toast('Column added.')
      }
      onClose()
    } catch (err) {
      setError(messageOf(err))
    }
  }

  async function changeType() {
    if (!field || newType === '') return
    setTypeError(null)
    try {
      await update.mutateAsync({ id: field.id, type: newType, allowLoss: allowLoss || undefined })
      toast(`Column is now ${TYPE_LABEL[newType].toLowerCase()}.`)
      onClose()
    } catch (err) {
      setTypeError(messageOf(err))
    }
  }

  const busy = create.isPending || update.isPending
  const canFormat = NUMERIC.includes(type) || type === 'DATE' || type === 'TEXT' || type === 'AUTO' || type === 'CHOICE'

  const typeButton = (t: FieldType, hint = true) => (
    <button
      key={t}
      type="button"
      aria-pressed={type === t}
      onClick={() => setType(t)}
      className={`flex flex-col gap-0.5 rounded-ledger border px-3 py-2 text-left ${type === t ? 'border-stamp bg-stamp-soft' : 'border-paper-line bg-white hover:border-stamp'}`}
    >
      <span className={`text-[13.5px] ${type === t ? 'font-semibold text-stamp' : 'font-medium'}`}>{TYPE_LABEL[t]}</span>
      {hint && <span className="text-[12px] text-ink-soft">{TYPE_HINT[t]}</span>}
    </button>
  )

  return (
    <SidePanel
      title={editing ? 'Edit column' : 'New column'}
      onClose={onClose}
      width={440}
      footer={
        <>
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" disabled={busy || name.trim() === ''} onClick={() => void save()}>
            {editing ? 'Save' : 'Add column'}
          </Button>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(event) => {
          event.preventDefault()
          void save()
        }}
      >
        <TextField label="Column name" value={name} maxLength={60} autoComplete="off" onChange={(event) => setName(event.target.value)} placeholder="e.g. Total" />

        {!editing && (
          <>
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">Typed by you</span>
              <div role="group" aria-label="Typed by you" className="grid grid-cols-3 gap-2">
                {TYPED.map((t) => typeButton(t, false))}
              </div>
            </div>
            <div>
              <span className="mb-1.5 block text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">Worked out for the whole column</span>
              <div role="group" aria-label="Worked out" className="grid grid-cols-2 gap-2">
                {WORKED.map((t) => typeButton(t))}
              </div>
            </div>
          </>
        )}

        {type === 'CHOICE' && <TextField label="Choices (separated by commas)" value={options} onChange={(event) => setOptions(event.target.value)} placeholder="New, Confirmed, Shipped, Delivered" />}
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
            <div className="flex flex-col gap-3">
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
              <Select label="How" value={how} onChange={(event) => setHow(event.target.value)}>
                <option value="sum">Sum</option>
                <option value="count">Count of rows</option>
                <option value="avg">Average</option>
                <option value="min">Smallest</option>
                <option value="max">Largest</option>
              </Select>
            </div>
          ))}
        {type === 'FORMULA' && (
          <div className="flex flex-col gap-2.5">
            <label className="flex flex-col gap-1.5">
              <span className="text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">Formula for the whole column</span>
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
            <p className="text-[12.5px] text-ink-soft">One formula, the same for every row. Click a column to put its name in.</p>
            <div className="flex flex-wrap gap-1.5" aria-label="Columns">
              {table.fields
                .filter((f) => f.id !== field?.id)
                .map((f) => (
                  <button key={f.id} type="button" onClick={() => insert(`{${f.name}}`)} className="rounded-full border border-paper-line bg-white px-2.5 py-0.5 text-[12.5px] font-medium hover:border-stamp hover:text-stamp">
                    {f.name}
                  </button>
                ))}
            </div>
            <div className="flex flex-wrap gap-1.5" aria-label="Functions">
              {FUNCTIONS.map((fn) => (
                <button key={fn} type="button" onClick={() => insert(`${fn}(`)} className="rounded-[6px] border border-paper-line bg-paper px-2 py-0.5 font-mono text-xs hover:border-stamp hover:text-stamp">
                  {fn}
                </button>
              ))}
            </div>
            <div className={`rounded-ledger px-3.5 py-2.5 text-[13px] ${preview && !preview.ok ? 'bg-err' : 'bg-green-soft/70'}`} aria-live="polite">
              {!formula.trim() ? (
                <span className="text-ink-soft">
                  Example: <span className="font-mono">{'{Subtotal} + {Delivery} - {Discount}'}</span>
                </span>
              ) : !preview ? (
                <span className="text-ink-soft">Checking…</span>
              ) : preview.ok ? (
                <>
                  <span className="block text-ink-soft">{preview.sample === null ? 'The formula is valid. Add a row to see a result.' : `Check on row ${preview.sample}`}</span>
                  {preview.sample !== null && <span className="tabular block font-mono text-[15px] font-semibold">{preview.value === null ? '(empty)' : typeof preview.value === 'number' ? formatMoneyCell(preview.value) : String(preview.value)}</span>}
                  <span className="block text-ink-soft">Reads as: {preview.explain}</span>
                </>
              ) : (
                <span className="text-rust">{preview.error}</span>
              )}
            </div>
          </div>
        )}

        {canFormat && (
          <fieldset className="flex flex-col gap-3 border-t border-paper-edge pt-4">
            <legend className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">How it looks</legend>
            {NUMERIC.includes(type) && (
              <>
                <Select label="Decimals" value={format.decimals === undefined ? '' : String(format.decimals)} onChange={(event) => setFormat((f) => ({ ...f, decimals: event.target.value === '' ? undefined : Number(event.target.value) }))}>
                  <option value="">Usual for this kind of column</option>
                  {[0, 1, 2, 3, 4].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </Select>
                <label className="flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={format.thousands !== false} onChange={(event) => setFormat((f) => ({ ...f, thousands: event.target.checked ? undefined : false }))} className="h-4 w-4 accent-stamp" />
                  Commas between thousands
                </label>
              </>
            )}
            {type === 'DATE' && (
              <Select label="Date style" value={format.dateFormat ?? ''} onChange={(event) => setFormat((f) => ({ ...f, dateFormat: (event.target.value || undefined) as FieldFormat['dateFormat'] }))}>
                <option value="">25 Oct 2026 (usual)</option>
                {DATE_STYLES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.example}
                  </option>
                ))}
              </Select>
            )}
            <div role="group" aria-label="Alignment" className="flex items-center gap-2 text-sm">
              <span className="text-ink-soft">Align</span>
              {(
                [
                  [undefined, 'Usual'],
                  ['left', 'Left'],
                  ['right', 'Right'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={format.align === value || (value === undefined && !format.align)}
                  onClick={() => setFormat((f) => ({ ...f, align: value }))}
                  className={`rounded-full border px-3 py-1 text-[12.5px] font-medium ${format.align === value || (value === undefined && !format.align) ? 'border-stamp bg-stamp-soft text-stamp' : 'border-paper-line hover:border-stamp'}`}
                >
                  {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}

        {field && isTyped(field.type) && (
          <fieldset className="flex flex-col gap-3 border-t border-paper-edge pt-4">
            <legend className="mb-1 text-[11px] font-semibold tracking-[0.06em] text-ink-soft uppercase">Change the type</legend>
            <Select label={`Now ${TYPE_LABEL[field.type].toLowerCase()}. Make it…`} value={newType} onChange={(event) => { setNewType(event.target.value as FieldType | ''); setTypePreview(null); setTypeError(null); setAllowLoss(false) }}>
              <option value="">Keep it as it is</option>
              {TYPED.filter((t) => t !== field.type).map((t) => (
                <option key={t} value={t}>
                  {TYPE_LABEL[t]}
                </option>
              ))}
            </Select>
            {newType !== '' && (
              <div className="rounded-ledger bg-paper px-3.5 py-2.5 text-[13px]" aria-live="polite">
                {typeError ? (
                  <span className="text-rust">{typeError}</span>
                ) : !typePreview ? (
                  <span className="text-ink-soft">Checking what would happen…</span>
                ) : (
                  <>
                    <span className="block">
                      {typePreview.total === 0 ? 'The column is empty, so nothing changes.' : `${typePreview.converts} of ${typePreview.total} values convert.`}
                      {typePreview.empty > 0 && typePreview.total > 0 ? ` ${typePreview.empty} empty cells stay empty.` : ''}
                    </span>
                    {typePreview.options && <span className="block text-ink-soft">Choices found: {typePreview.options.join(', ') || 'none'}.</span>}
                    {typePreview.lost > 0 && (
                      <>
                        <span className="mt-1 block text-rust">
                          {typePreview.lost} cannot convert, for example {typePreview.samples.map((s) => `“${s.value}” (row ${s.rowNumber}: ${s.reason})`).slice(0, 3).join('; ')}.
                        </span>
                        <label className="mt-2 flex items-center gap-2">
                          <input type="checkbox" checked={allowLoss} onChange={(event) => setAllowLoss(event.target.checked)} className="h-4 w-4 accent-stamp" />
                          Convert anyway and leave those cells empty
                        </label>
                      </>
                    )}
                    <Button type="button" className="mt-3" disabled={busy || (typePreview.lost > 0 && !allowLoss)} onClick={() => void changeType()}>
                      Change to {TYPE_LABEL[newType].toLowerCase()}
                    </Button>
                  </>
                )}
              </div>
            )}
          </fieldset>
        )}

        {error && (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        )}
      </form>
    </SidePanel>
  )
}
