import { useState, type FormEvent } from 'react'
import { Modal } from './Modal'
import { Button } from './Button'
import { TextField } from './TextField'

// One text box in a small dialog: rename a column, name a table.
export function PromptDialog({
  title,
  label,
  initial,
  submitLabel = 'Save',
  maxLength = 40,
  // Returns a problem to show under the box, or nothing when the value is fine.
  validate,
  onSubmit,
  onClose,
}: {
  title: string
  label: string
  initial: string
  submitLabel?: string
  maxLength?: number
  validate?: (value: string) => string | null
  onSubmit: (value: string) => void
  onClose: () => void
}) {
  const [value, setValue] = useState(initial)
  const [error, setError] = useState<string | null>(null)

  function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const problem = validate?.(value.trim()) ?? null
    if (problem) {
      setError(problem)
      return
    }
    onSubmit(value.trim())
    onClose()
  }

  return (
    <Modal title={title} onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          label={label}
          name="prompt"
          value={value}
          maxLength={maxLength}
          autoComplete="off"
          onChange={(event) => {
            setValue(event.target.value)
            setError(null)
          }}
          onFocus={(event) => event.currentTarget.select()}
          error={error ?? undefined}
        />
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit">{submitLabel}</Button>
        </div>
      </form>
    </Modal>
  )
}
