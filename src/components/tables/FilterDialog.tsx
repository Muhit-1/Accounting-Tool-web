import { useState } from 'react'
import { FILTER_OPS as OPS } from '../../lib/table-filters'
import type { EngineTable, ViewFilter } from '../../types/engine'
import { Button } from '../Button'
import { Modal } from '../Modal'
import { Select } from '../Select'
import { TextField } from '../TextField'

// One condition on the rows you see: "Status is Delivered". Saved with a view, or used for a moment.
export function FilterDialog({ table, onAdd, onClose }: { table: EngineTable; onAdd: (filter: ViewFilter) => void; onClose: () => void }) {
  const [fieldId, setFieldId] = useState(table.fields[0]?.id ?? '')
  const [op, setOp] = useState<ViewFilter['op']>('eq')
  const [value, setValue] = useState('')
  const field = table.fields.find((f) => f.id === fieldId)
  const needsValue = OPS.find((o) => o.value === op)?.needsValue ?? true
  const choices = field?.type === 'CHOICE' && Array.isArray(field.config.options) ? (field.config.options as string[]) : null

  return (
    <Modal title="Filter rows" onClose={onClose}>
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          onAdd({ fieldId, op, ...(needsValue ? { value } : {}) })
          onClose()
        }}
      >
        <Select label="Column" value={fieldId} onChange={(event) => setFieldId(event.target.value)}>
          {table.fields.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </Select>
        <Select label="Condition" value={op} onChange={(event) => setOp(event.target.value as ViewFilter['op'])}>
          {OPS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
        {needsValue &&
          (choices ? (
            <Select label="Value" value={value} onChange={(event) => setValue(event.target.value)}>
              <option value="">Choose…</option>
              {choices.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          ) : (
            <TextField label="Value" value={value} maxLength={200} autoComplete="off" onChange={(event) => setValue(event.target.value)} />
          ))}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={needsValue && value === ''}>
            Add filter
          </Button>
        </div>
      </form>
    </Modal>
  )
}
