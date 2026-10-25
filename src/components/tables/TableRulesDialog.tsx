import { useEffect, useMemo, useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { formatMoneyCell } from '../../lib/grid-parse'
import { FILTER_OPS } from '../../lib/table-filters'
import { previewRule, useDeleteRule, useSaveRule } from '../../lib/tables'
import { useToast } from '../../lib/toast-context'
import type { EngineTable, RulePreview, RuleConfig, TableRule, ViewFilter } from '../../types/engine'
import { Button } from '../Button'
import { Modal } from '../Modal'
import { Select } from '../Select'
import { TextField } from '../TextField'

const AMOUNT_TYPES = ['MONEY', 'NUMBER', 'FORMULA', 'ROLLUP', 'LOOKUP']
const DATE_TYPES = ['DATE', 'FORMULA', 'LOOKUP']
const COND_OPS = FILTER_OPS.filter((o) => ['eq', 'ne', 'gt', 'lt', 'empty', 'notempty'].includes(o.value))

interface Draft {
  id?: string
  enabled: boolean
  config: RuleConfig
}

function blank(table: EngineTable): Draft {
  const amount = table.fields.find((f) => AMOUNT_TYPES.includes(f.type))
  return { enabled: true, config: { amountFieldId: amount?.id ?? '', dateFieldId: null, direction: 'IN', conditions: [], category: '', description: '' } }
}

// "Posts to Cash book": which rows of this table become locked rows in the Cash book, for how much,
// when, and under which words. A live preview says what would happen before anything is saved.
export function TableRulesDialog({ businessId, table, onClose }: { businessId: string; table: EngineTable; onClose: () => void }) {
  const toast = useToast()
  const save = useSaveRule(businessId, table.id)
  const remove = useDeleteRule(businessId, table.id)
  const initial = table.rules[0] as TableRule | undefined
  const [drafts, setDrafts] = useState<Draft[]>(() => (table.rules.length ? table.rules.map((r) => ({ id: r.id, enabled: r.enabled, config: r.config })) : [blank(table)]))
  const [index, setIndex] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [preview, setPreview] = useState<RulePreview | null>(null)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const draft = drafts[index]
  const config = draft.config

  const amountFields = useMemo(() => table.fields.filter((f) => AMOUNT_TYPES.includes(f.type)), [table.fields])
  const dateFields = useMemo(() => table.fields.filter((f) => DATE_TYPES.includes(f.type)), [table.fields])

  const update = (patch: Partial<RuleConfig>) => setDrafts((cur) => cur.map((d, i) => (i === index ? { ...d, config: { ...d.config, ...patch } } : d)))
  const setConditions = (conditions: ViewFilter[]) => update({ conditions })

  useEffect(() => {
    if (!draft.enabled || !config.amountFieldId) return
    let stale = false
    const timer = window.setTimeout(() => {
      previewRule(businessId, table.id, config)
        .then((r) => {
          if (stale) return
          setPreview(r)
          setPreviewError(null)
        })
        .catch((err) => {
          if (stale) return
          setPreview(null)
          setPreviewError(err instanceof ApiError ? err.message : 'Could not check the rule right now.')
        })
    }, 250)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [businessId, table.id, config, draft.enabled])

  function valuesFor(fieldId: string): string[] {
    const f = table.fields.find((x) => x.id === fieldId)
    if (f?.type === 'CHOICE' && Array.isArray(f.config.options)) return f.config.options as string[]
    return []
  }

  async function submit() {
    setError(null)
    try {
      const result = await save.mutateAsync({ id: draft.id, config: draft.config, enabled: draft.enabled })
      const { posted, updated, removed } = result.changes
      toast(draft.enabled ? `Saved. ${posted} added to the Cash book${updated ? `, ${updated} updated` : ''}${removed ? `, ${removed} removed` : ''}.` : 'Saved. This table no longer posts to the Cash book.')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function removeRule() {
    if (!draft.id) {
      setDrafts((cur) => (cur.length > 1 ? cur.filter((_, i) => i !== index) : [blank(table)]))
      setIndex(0)
      return
    }
    try {
      await remove.mutateAsync(draft.id)
      toast('Rule removed. Its rows left the Cash book.')
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const noAmount = amountFields.length === 0

  return (
    <Modal title={`${table.name} → Cash book`} onClose={onClose} wide>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        {drafts.length > 1 || initial ? (
          <div className="flex flex-wrap items-center gap-2" role="tablist" aria-label="Rules">
            {drafts.map((d, i) => (
              <button key={d.id ?? `new-${i}`} type="button" role="tab" aria-selected={i === index} onClick={() => setIndex(i)} className={`rounded-full border px-3 py-1 text-[12.5px] font-semibold ${i === index ? 'border-stamp bg-stamp-soft' : 'border-paper-line bg-white hover:border-stamp'}`}>
                Rule {i + 1}
                {!d.enabled && ' (off)'}
              </button>
            ))}
            {drafts.length < 5 && (
              <button type="button" onClick={() => { setDrafts((cur) => [...cur, blank(table)]); setIndex(drafts.length) }} className="text-[12.5px] font-semibold text-stamp hover:underline">
                ＋ Another rule
              </button>
            )}
          </div>
        ) : null}

        <label className="flex items-center gap-2.5 text-[14px] font-semibold">
          <input
            type="checkbox"
            checked={draft.enabled}
            onChange={(event) => setDrafts((cur) => cur.map((d, i) => (i === index ? { ...d, enabled: event.target.checked } : d)))}
            className="h-4 w-4 accent-stamp"
          />
          Send rows of this table to the Cash book
        </label>

        {noAmount ? (
          <p className="text-sm text-rust">This table has no Money or Number column yet. Add one (or a formula that works out the amount), then come back.</p>
        ) : (
          <div className={`flex flex-col gap-4 ${draft.enabled ? '' : 'pointer-events-none opacity-50'}`}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="Amount column" value={config.amountFieldId} onChange={(event) => update({ amountFieldId: event.target.value })}>
                {amountFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              <Select label="Date column" value={config.dateFieldId ?? ''} onChange={(event) => update({ dateFieldId: event.target.value || null })}>
                <option value="">Today’s date (when the row is saved)</option>
                {dateFields.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name}
                  </option>
                ))}
              </Select>
              <Select label="Money" value={config.direction} onChange={(event) => update({ direction: event.target.value as 'IN' | 'OUT' })}>
                <option value="IN">Money in</option>
                <option value="OUT">Money out</option>
              </Select>
              <TextField label="Description" value={config.description} maxLength={120} placeholder="Order {Order no.} · {Customer}" onChange={(event) => update({ description: event.target.value })} />
            </div>

            <div className="flex flex-col gap-2">
              <span className="text-xs font-medium tracking-wider text-ink-soft uppercase">Only when</span>
              {config.conditions.length === 0 && <span className="text-[13px] text-ink-soft">Every row posts.</span>}
              {config.conditions.map((c, i) => {
                const choices = valuesFor(c.fieldId)
                const needs = FILTER_OPS.find((o) => o.value === c.op)?.needsValue ?? true
                return (
                  <div key={i} className="flex flex-wrap items-center gap-2">
                    <select aria-label="Column" value={c.fieldId} onChange={(event) => setConditions(config.conditions.map((x, k) => (k === i ? { ...x, fieldId: event.target.value, value: '' } : x)))} className="rounded-ledger border border-paper-line bg-white px-2.5 py-2 text-[14px]">
                      {table.fields.map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.name}
                        </option>
                      ))}
                    </select>
                    <select aria-label="Condition" value={c.op} onChange={(event) => setConditions(config.conditions.map((x, k) => (k === i ? { ...x, op: event.target.value as ViewFilter['op'] } : x)))} className="rounded-ledger border border-paper-line bg-white px-2.5 py-2 text-[14px]">
                      {COND_OPS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                    {needs &&
                      (choices.length ? (
                        <select aria-label="Value" value={String(c.value ?? '')} onChange={(event) => setConditions(config.conditions.map((x, k) => (k === i ? { ...x, value: event.target.value } : x)))} className="rounded-ledger border border-paper-line bg-white px-2.5 py-2 text-[14px]">
                          <option value="">Choose…</option>
                          {choices.map((v) => (
                            <option key={v} value={v}>
                              {v}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <input aria-label="Value" value={String(c.value ?? '')} maxLength={100} onChange={(event) => setConditions(config.conditions.map((x, k) => (k === i ? { ...x, value: event.target.value } : x)))} className="rounded-ledger border border-paper-line bg-white px-2.5 py-2 text-[14px]" />
                      ))}
                    <button type="button" aria-label="Remove this condition" onClick={() => setConditions(config.conditions.filter((_, k) => k !== i))} className="font-bold text-ink-soft hover:text-rust">
                      ✕
                    </button>
                  </div>
                )
              })}
              {config.conditions.length < 5 && (
                <button
                  type="button"
                  className="self-start text-[13px] font-semibold text-stamp hover:underline"
                  onClick={() => setConditions([...config.conditions, { fieldId: table.fields[0]?.id ?? '', op: 'eq', value: '' }])}
                >
                  ＋ Add a condition
                </button>
              )}
            </div>
          </div>
        )}

        <div className="rounded-ledger border border-paper-line bg-paper-edge px-3.5 py-2.5 text-[13px]" aria-live="polite">
          {!draft.enabled ? (
            <span>Nothing from this table is added to the Cash book. Rows already posted leave it; your rows here stay.</span>
          ) : previewError ? (
            <span className="text-rust">{previewError}</span>
          ) : preview ? (
            <>
              <span className="block font-semibold">
                {preview.posting} of {preview.of} {preview.of === 1 ? 'row' : 'rows'} would post, total {formatMoneyCell(preview.total)}
              </span>
              {preview.blocked > 0 && <span className="block text-rust">{preview.blocked} matching {preview.blocked === 1 ? 'row has' : 'rows have'} no usable date or a formula error, so {preview.blocked === 1 ? 'it' : 'they'} won’t post.</span>}
              <span className="block text-ink-soft">Posted rows show gold and locked in the Cash book. Change the row here and it follows.</span>
            </>
          ) : (
            <span className="text-ink-soft">Checking…</span>
          )}
        </div>

        {error && (
          <p role="alert" className="text-sm text-rust">
            {error}
          </p>
        )}
        <div className="flex flex-wrap justify-between gap-3">
          <button type="button" onClick={() => void removeRule()} className="text-sm text-ink-soft hover:text-rust">
            Remove this rule
          </button>
          <div className="flex gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={save.isPending || (noAmount && draft.enabled)}>
              Save
            </Button>
          </div>
        </div>
      </form>
    </Modal>
  )
}
