import { useEffect, useRef, useState } from 'react'
import { buildRowSave, formFields, initialFormValues } from '../../lib/row-form'
import type { EngineRow, EngineTable } from '../../types/engine'

const BOX = 'h-11 w-full rounded-ledger border bg-white px-3 text-[16px] text-ink focus:border-stamp focus:outline-none'

// A phone has no sheet: this is the form for one row, a box per column you can type in, in a sheet that slides up.
// Worked-out columns (formulas, look-ups, auto numbers) are not here: they fill in by themselves.
export function RowForm({
  table,
  row,
  linkOptions,
  onSave,
  onDelete,
  onClose,
}: {
  table: EngineTable
  row?: EngineRow
  linkOptions: Record<string, { value: string; label: string }[]>
  // Gets what changed; answers a problem in plain words, or nothing when it is saved.
  onSave: (values: Record<string, unknown>) => Promise<string | null>
  onDelete?: () => void
  onClose: () => void
}) {
  const fields = formFields(table.fields)
  const [texts, setTexts] = useState(() => initialFormValues(table.fields, row))
  const [bad, setBad] = useState<{ column: string; message: string } | null>(null)
  const [saving, setSaving] = useState(false)
  const panel = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const before = document.activeElement as HTMLElement | null
    panel.current?.querySelector<HTMLElement>('input:not([type=checkbox]), select')?.focus()
    return () => before?.focus?.()
  }, [])

  function set(id: string, text: string) {
    setTexts((cur) => ({ ...cur, [id]: text }))
    setBad((cur) => (cur?.column === id ? null : cur))
  }

  async function save() {
    const built = buildRowSave(table.fields, texts, row)
    if (!built.ok) {
      setBad({ column: built.column, message: built.message })
      return
    }
    if (Object.keys(built.values).length === 0) {
      onClose()
      return
    }
    setSaving(true)
    const problem = await onSave(built.values)
    setSaving(false)
    if (problem) setBad({ column: '', message: problem })
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/35 md:items-center md:p-6"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div ref={panel} role="dialog" aria-modal="true" aria-label={row ? `Edit row ${row.number}` : `New row in ${table.name}`} className="flex max-h-[92vh] w-full max-w-md flex-col rounded-t-[18px] bg-white shadow-xl md:rounded-[14px]">
        <div className="flex flex-none items-center justify-between border-b border-paper-edge px-4 py-3">
          <h2 className="font-display text-[17px] font-bold">{row ? `Row ${row.number}` : `New row in ${table.name}`}</h2>
          <button type="button" onClick={onClose} aria-label="Close" className="flex h-10 w-10 items-center justify-center rounded-full text-ink-soft2 hover:bg-paper">
            ✕
          </button>
        </div>

        <form
          className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
          onSubmit={(event) => {
            event.preventDefault()
            void save()
          }}
        >
          <div className="flex flex-col gap-3.5">
            {fields.map((f) => {
              const invalid = bad?.column === f.id
              const border = invalid ? 'border-rust' : 'border-paper-line'
              const value = texts[f.id] ?? ''
              let control
              if (f.type === 'TICK') {
                control = (
                  <span className="flex h-11 items-center gap-3 rounded-ledger border border-paper-line px-3">
                    <input type="checkbox" checked={value === 'true'} onChange={(e) => set(f.id, e.target.checked ? 'true' : 'false')} className="h-5 w-5 accent-stamp" />
                    <span className="text-[15px]">{value === 'true' ? 'Yes' : 'No'}</span>
                  </span>
                )
              } else if (f.type === 'CHOICE' || f.type === 'LINK') {
                const options = f.type === 'CHOICE' ? (Array.isArray(f.config.options) ? (f.config.options as string[]) : []).map((o) => ({ value: o, label: o })) : (linkOptions[f.id] ?? [])
                control = (
                  <select value={value} onChange={(e) => set(f.id, e.target.value)} className={`${BOX} ${border}`}>
                    <option value="">—</option>
                    {options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                )
              } else if (f.type === 'DATE') {
                control = <input type="date" value={value} onChange={(e) => set(f.id, e.target.value)} className={`${BOX} ${border}`} />
              } else {
                const number = f.type === 'NUMBER' || f.type === 'MONEY'
                control = <input type="text" inputMode={number ? 'decimal' : 'text'} value={value} onChange={(e) => set(f.id, e.target.value)} className={`${BOX} ${border} ${number ? 'tabular' : ''}`} />
              }
              return (
                <label key={f.id} className="block">
                  <span className="mb-1 block text-[13px] font-medium text-ink-soft2">{f.name}</span>
                  {control}
                  {invalid && (
                    <span role="alert" className="mt-1 block text-[13px] text-rust">
                      {bad?.message}
                    </span>
                  )}
                </label>
              )
            })}
          </div>
          {bad && bad.column === '' && (
            <p role="alert" className="mt-3 rounded-ledger bg-[var(--color-err)] px-3 py-2 text-[13.5px] text-rust">
              {bad.message}
            </p>
          )}
        </form>

        <div className="flex flex-none items-center gap-2 border-t border-paper-edge px-4 py-3">
          {onDelete && (
            <button type="button" onClick={onDelete} className="h-11 rounded-ledger px-3 text-[14px] font-semibold text-rust hover:bg-[var(--color-err)]">
              Delete
            </button>
          )}
          <span className="flex-1" />
          <button type="button" onClick={onClose} className="h-11 rounded-ledger bg-paper px-4 text-[14px] font-semibold hover:bg-paper-edge">
            Cancel
          </button>
          <button type="button" disabled={saving} onClick={() => void save()} className="h-11 rounded-ledger bg-stamp px-5 text-[14px] font-semibold text-white hover:bg-stamp/90 disabled:opacity-60">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}
