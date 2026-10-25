import { useEffect, useState } from 'react'
import { previewFormula } from '../../lib/tables'
import { formatMoneyCell } from '../../lib/grid-parse'
import type { EngineTable, FnKind, FnSpec, FormulaPreview, TableField } from '../../types/engine'
import { Button } from '../Button'
import { Modal } from '../Modal'
import { Select } from '../Select'

const CHOICES: { value: FnKind | 'none'; label: string }[] = [
  { value: 'none', label: 'Nothing' },
  { value: 'sum', label: 'Sum' },
  { value: 'avg', label: 'Average' },
  { value: 'count', label: 'Count' },
  { value: 'min', label: 'Smallest' },
  { value: 'max', label: 'Largest' },
  { value: 'last', label: 'Last value' },
  { value: 'formula', label: 'Custom formula…' },
]

// What one cell of a function row shows: a plain Sum/Average/…, or a formula over the whole column,
// like SUMIF({Status}, "Delivered", {Total}).
export function FnDialog({
  businessId,
  table,
  field,
  rowLabel,
  current,
  onSave,
  onClose,
}: {
  businessId: string
  table: EngineTable
  field: TableField
  rowLabel: string
  current?: FnSpec
  onSave: (spec: FnSpec | null) => void
  onClose: () => void
}) {
  const [fn, setFn] = useState<FnKind | 'none'>(current?.fn ?? 'sum')
  const [formula, setFormula] = useState(current?.formula ?? '')
  const [preview, setPreview] = useState<FormulaPreview | null>(null)

  useEffect(() => {
    if (fn !== 'formula' || !formula.trim()) return
    let stale = false
    const timer = window.setTimeout(() => {
      previewFormula(businessId, table.id, { formula, mode: 'column' })
        .then((r) => !stale && setPreview(r))
        .catch(() => !stale && setPreview({ ok: false, error: 'Could not check the formula right now.' }))
    }, 280)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [fn, formula, businessId, table.id])

  return (
    <Modal title={`${rowLabel} · ${field.name}`} onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          onSave(fn === 'none' ? null : fn === 'formula' ? { fn, formula } : { fn })
          onClose()
        }}
      >
        <Select label="What should this cell show?" value={fn} onChange={(event) => setFn(event.target.value as FnKind | 'none')}>
          {CHOICES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </Select>
        {fn === 'formula' && (
          <>
            <label className="flex flex-col gap-1.5">
              <span className="text-xs font-medium tracking-wider text-ink-soft uppercase">Formula over the whole column</span>
              <textarea
                value={formula}
                rows={3}
                spellCheck={false}
                maxLength={2000}
                onChange={(event) => setFormula(event.target.value)}
                placeholder={'SUMIF({Status}, "Delivered", {Total})'}
                className="rounded-ledger border border-paper-line bg-white px-3.5 py-2.5 font-mono text-[13.5px] focus:border-stamp focus:outline-none"
              />
            </label>
            <div className="flex flex-wrap gap-1.5">
              {table.fields.map((f) => (
                <button key={f.id} type="button" onClick={() => setFormula((v) => `${v}{${f.name}}`)} className="rounded-full border border-paper-line bg-paper-edge px-2.5 py-0.5 text-[12.5px] hover:border-stamp hover:text-stamp">
                  {f.name}
                </button>
              ))}
            </div>
            <div className="rounded-ledger border border-paper-line bg-paper-edge px-3.5 py-2.5 text-[13px]" aria-live="polite">
              {!formula.trim() ? (
                <span className="text-ink-soft">Type a formula, for example SUM({'{Total}'}).</span>
              ) : !preview ? (
                <span className="text-ink-soft">Checking…</span>
              ) : preview.ok ? (
                <span className="tabular font-mono text-[15px]">{preview.value === null ? '(empty)' : typeof preview.value === 'number' ? formatMoneyCell(preview.value) : String(preview.value)}</span>
              ) : (
                <span className="text-rust">{preview.error}</span>
              )}
            </div>
          </>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={fn === 'formula' && !formula.trim()}>
            Save
          </Button>
        </div>
      </form>
    </Modal>
  )
}
