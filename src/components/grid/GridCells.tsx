import { useRef, useState, type ClipboardEvent, type KeyboardEvent, type ReactNode } from 'react'
import type { GridChoice } from './grid-types'
import { NEW_CHOICE } from './grid-types'

// A cell is a real input: click and type. Enter or ↓ goes down, ↑ goes up, Tab
// goes right (the browser does that by itself), Esc puts the old value back.
// A wrong value turns the cell red, says why, and the old value stays.

const CELL =
  'block w-full min-w-0 bg-transparent px-3 py-2.5 text-[13.5px] text-ink hover:bg-stamp/[0.06] focus:bg-white focus:outline-2 focus:-outline-offset-2 focus:outline-stamp disabled:cursor-not-allowed disabled:bg-transparent disabled:opacity-100 placeholder:text-ink-soft/50'
const INVALID = ' !bg-[var(--color-err)] outline-2 -outline-offset-2 outline-rust'

export interface CellAddress {
  column: string
  // Position in the grid, for moving with Enter / arrow keys. The add-row is one past the last row.
  row: number
  // The cell belongs to the add-row at the bottom.
  draft?: boolean
}

// Moves the cursor to the same column in another row.
function moveFocus(from: HTMLElement, delta: number, address: CellAddress): boolean {
  const root = from.closest('[data-grid-root]')
  if (!root) return false
  const selector = `[data-grid-cell][data-col="${CSS.escape(address.column)}"][data-row="${address.row + delta}"]`
  const next = root.querySelector<HTMLElement>(`${selector}:not([disabled])`)
  if (!next) return false
  next.focus()
  if (next instanceof HTMLInputElement) next.select()
  return true
}

function handleArrowKeys(event: KeyboardEvent<HTMLElement>, address: CellAddress, onEnterInDraft?: () => void) {
  if (event.key === 'Enter' && onEnterInDraft) {
    event.preventDefault()
    onEnterInDraft()
    return true
  }
  if (event.key === 'Enter' || event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    const delta = event.key === 'ArrowUp' ? -1 : 1
    event.preventDefault()
    // Moving focus blurs this cell, which saves it; at the edge, blur on purpose.
    if (!moveFocus(event.currentTarget, delta, address)) event.currentTarget.blur()
    return true
  }
  return false
}

export function TextCell({
  address,
  display,
  align,
  tone,
  disabled,
  ariaLabel,
  placeholder,
  bad,
  message,
  normalize,
  onCommit,
  onDraftChange,
  onDraftSubmit,
  onPasteText,
  before,
  after,
  extraClass,
}: {
  address: CellAddress
  // What the cell shows when nobody is typing.
  display: string
  align?: 'right'
  tone?: 'in' | 'out'
  disabled?: boolean
  ariaLabel: string
  placeholder?: string
  bad?: boolean
  message?: string
  // The text a saved value will read as (so "1250" turns into "1,250.00" at once).
  normalize?: (typed: string) => string
  // Saves a typed value; a returned message means "refused".
  onCommit?: (text: string) => Promise<string | null | undefined | void>
  // The add-row works on the text as it is typed instead of saving.
  onDraftChange?: (text: string) => void
  onDraftSubmit?: () => void
  onPasteText?: (text: string) => void
  before?: ReactNode
  after?: ReactNode
  extraClass?: string
}) {
  const isDraft = onDraftChange !== undefined
  // null = show `display`; a string = what is being typed (or just saved).
  const [typed, setTyped] = useState<string | null>(null)
  const cancelled = useRef(false)

  // New data arrived from the server: show it.
  const [seenDisplay, setSeenDisplay] = useState(display)
  if (seenDisplay !== display) {
    setSeenDisplay(display)
    setTyped(null)
  }

  const shown = isDraft ? display : (typed ?? display)

  async function finish() {
    if (isDraft || typed === null) return
    if (cancelled.current) {
      cancelled.current = false
      setTyped(null)
      return
    }
    if (typed === display) {
      setTyped(null)
      return
    }
    const sent = typed
    const problem = await onCommit?.(sent)
    setTyped(problem ? null : (normalize?.(sent) ?? sent))
  }

  function handlePaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData('text')
    if (onPasteText && /[\t\n]/.test(text.trim())) {
      event.preventDefault()
      onPasteText(text)
    }
  }

  return (
    <div className="group relative flex min-w-0 flex-1 items-center">
      {before}
      <input
        data-grid-cell
        data-col={address.column}
        data-row={address.row}
        data-draft={address.draft || undefined}
        value={shown}
        disabled={disabled}
        placeholder={placeholder}
        aria-label={ariaLabel}
        aria-invalid={bad || undefined}
        title={bad ? message : undefined}
        autoComplete="off"
        inputMode={align === 'right' ? 'decimal' : undefined}
        className={`${CELL} ${align === 'right' ? 'tabular text-right' : ''} ${tone === 'in' ? '!text-green' : tone === 'out' ? '!text-rust' : ''} ${bad ? INVALID : ''} ${extraClass ?? ''}`}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => (isDraft ? onDraftChange(event.target.value) : setTyped(event.target.value))}
        onBlur={() => void finish()}
        onPaste={handlePaste}
        onKeyDown={(event) => {
          if (event.key === 'Escape') {
            cancelled.current = true
            setTyped(null)
            event.currentTarget.blur()
            return
          }
          handleArrowKeys(event, address, isDraft ? onDraftSubmit : undefined)
        }}
      />
      {after}
    </div>
  )
}

export function ChoiceCell({
  address,
  value,
  choices,
  newChoice,
  placeholder,
  disabled,
  ariaLabel,
  bad,
  message,
  emphasis,
  onPick,
}: {
  address: CellAddress
  value: string
  choices: GridChoice[]
  newChoice?: string
  placeholder?: string
  disabled?: boolean
  ariaLabel: string
  bad?: boolean
  message?: string
  // Extra classes for the chosen text (a status colour).
  emphasis?: string
  // Saves (or, for the add-row, remembers) the pick; a message means "refused".
  onPick: (value: string) => Promise<string | null | undefined | void> | void
}) {
  // What was just picked, until the server's answer arrives.
  const [pending, setPending] = useState<string | null>(null)
  const [seenValue, setSeenValue] = useState(value)
  if (seenValue !== value) {
    setSeenValue(value)
    setPending(null)
  }

  const groups = new Map<string | null, GridChoice[]>()
  for (const choice of choices) {
    const key = choice.group ?? null
    groups.set(key, [...(groups.get(key) ?? []), choice])
  }
  const option = (choice: GridChoice) => (
    <option key={choice.value} value={choice.value}>
      {choice.label}
    </option>
  )

  return (
    <select
      data-grid-cell
      data-col={address.column}
      data-row={address.row}
      data-draft={address.draft || undefined}
      value={pending ?? value}
      disabled={disabled}
      aria-label={ariaLabel}
      aria-invalid={bad || undefined}
      title={bad ? message : undefined}
      className={`${CELL} cursor-pointer font-medium ${emphasis ?? ''} ${bad ? INVALID : ''}`}
      onChange={async (event) => {
        const next = event.target.value
        setPending(next)
        const problem = await onPick(next)
        // Back to the saved value when refused, or when it was only a request for a new entry.
        if (problem || next === NEW_CHOICE) setPending(null)
      }}
      onKeyDown={(event) => {
        if (event.key === 'Enter') {
          event.preventDefault()
          if (!moveFocus(event.currentTarget, 1, address)) event.currentTarget.blur()
        }
      }}
    >
      {placeholder !== undefined && <option value="">{placeholder}</option>}
      {[...groups.entries()].map(([group, list]) =>
        group === null ? (
          list.map(option)
        ) : (
          <optgroup key={group} label={group}>
            {list.map(option)}
          </optgroup>
        ),
      )}
      {newChoice && <option value={NEW_CHOICE}>{newChoice}</option>}
    </select>
  )
}

export function TickCell({
  value,
  disabled,
  ariaLabel,
  onToggle,
}: {
  value: boolean
  disabled?: boolean
  ariaLabel: string
  onToggle: (next: boolean) => Promise<string | null | undefined | void> | void
}) {
  const [pending, setPending] = useState<boolean | null>(null)
  const [seenValue, setSeenValue] = useState(value)
  if (seenValue !== value) {
    setSeenValue(value)
    setPending(null)
  }
  return (
    <div className="flex w-full justify-center">
      <input
        type="checkbox"
        checked={pending ?? value}
        disabled={disabled}
        aria-label={ariaLabel}
        className="h-4 w-4 accent-stamp"
        onChange={async (event) => {
          setPending(event.target.checked)
          const problem = await onToggle(event.target.checked)
          if (problem) setPending(null)
        }}
      />
    </div>
  )
}

// A worked-out value: shown, never typed.
export function ReadCell({
  children,
  align,
  muted,
}: {
  children: ReactNode
  align?: 'right'
  muted?: boolean
}) {
  return (
    <div className={`block w-full min-w-0 px-3 py-2.5 text-[13.5px] ${align === 'right' ? 'tabular text-right' : ''} ${muted ? 'text-ink-soft italic' : 'text-ink'}`}>
      {children}
    </div>
  )
}
