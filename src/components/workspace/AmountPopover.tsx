import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import {
  AMOUNT_TYPE_OPTIONS,
  MAX_LIST_BOXES,
  boxLabel,
  formatFixed2,
  initialBoxCount,
  isAmountType,
  isListType,
  parseBox,
  previewAmount,
  type AmountType,
} from '../../lib/calc'
import { Button } from '../Button'

const CALCULATED_TYPES = AMOUNT_TYPE_OPTIONS.filter((option) => option.value !== 'FIXED')

export interface AmountChoice {
  type: AmountType
  inputs: number[]
  amount: number
}

// The ƒ button's "Amount type" box: pick a kind, fill the named boxes, see the
// amount, "Use amount". The cell then shows a chip and is locked; the server
// works the amount out again from the same boxes, so this is only a preview.
export function AmountPopover({
  anchor,
  side,
  initial,
  canClear,
  currency,
  onUse,
  onClear,
  onClose,
}: {
  anchor: DOMRect
  side: 'in' | 'out'
  initial?: { type: AmountType; inputs: number[] } | null
  canClear: boolean
  currency: string
  onUse: (choice: AmountChoice) => void
  onClear: () => void
  onClose: () => void
}) {
  const box = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ left: anchor.left, top: anchor.bottom + 6 })
  const [type, setType] = useState<AmountType>(initial && initial.type !== 'FIXED' ? initial.type : 'MULTIPLY')
  // One list of boxes per type, so switching type and back keeps what was typed.
  const [boxesByType, setBoxesByType] = useState<Partial<Record<AmountType, string[]>>>(() =>
    initial && initial.type !== 'FIXED' ? { [initial.type]: initial.inputs.map(String) } : {},
  )
  const boxes = boxesByType[type] ?? Array.from({ length: initialBoxCount(type) }, () => '')
  const preview = previewAmount(type, boxes)

  useLayoutEffect(() => {
    const element = box.current
    if (!element) return
    const margin = 8
    const left = Math.min(Math.max(margin, anchor.left), window.innerWidth - element.offsetWidth - margin)
    let top = anchor.bottom + 6
    if (top + element.offsetHeight > window.innerHeight - margin) top = Math.max(margin, anchor.top - element.offsetHeight - 6)
    setPosition({ left, top })
  }, [anchor, type, boxes.length])

  useEffect(() => {
    box.current?.querySelector<HTMLInputElement>('input')?.focus()
    function onPointer(event: MouseEvent) {
      if (!box.current?.contains(event.target as Node)) onClose()
    }
    document.addEventListener('mousedown', onPointer)
    return () => document.removeEventListener('mousedown', onPointer)
  }, [onClose])

  function setBoxes(next: string[]) {
    setBoxesByType((current) => ({ ...current, [type]: next }))
  }

  function use() {
    if (preview.amount === null) return
    onUse({ type, inputs: boxes.map((text) => parseBox(text) as number), amount: preview.amount })
  }

  const invalid = preview.error !== null && !preview.incomplete && boxes.some((text) => text.trim() !== '')

  return (
    <div
      ref={box}
      role="dialog"
      aria-label="Amount type"
      style={{ left: position.left, top: position.top }}
      className="fixed z-[60] flex w-[310px] max-w-[calc(100vw-24px)] flex-col gap-3 rounded-ledger border border-paper-line bg-white p-3.5 shadow-lg"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation()
          onClose()
        }
        if (event.key === 'Enter' && event.target instanceof HTMLInputElement) {
          event.preventDefault()
          use()
        }
      }}
    >
      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wider text-ink-soft uppercase">Amount type</span>
        <select
          value={type}
          onChange={(event) => isAmountType(event.target.value) && setType(event.target.value)}
          className="rounded-ledger border border-paper-line bg-white px-3 py-2 text-[14px]"
        >
          {CALCULATED_TYPES.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>

      {boxes.map((text, index) => (
        <label key={index} className="flex flex-col gap-1.5">
          <span className="text-xs font-medium tracking-wider text-ink-soft uppercase">{boxLabel(type, index)}</span>
          <input
            value={text}
            inputMode="decimal"
            autoComplete="off"
            onChange={(event) => setBoxes(boxes.map((box, i) => (i === index ? event.target.value : box)))}
            className="tabular rounded-ledger border border-paper-line bg-white px-3 py-2 text-right text-[14px] focus:border-stamp focus:outline-none"
          />
        </label>
      ))}

      {isListType(type) && boxes.length < MAX_LIST_BOXES && (
        <button
          type="button"
          onClick={() => setBoxes([...boxes, ''])}
          className="self-start text-[13px] font-semibold text-stamp underline underline-offset-2"
        >
          + Add another number
        </button>
      )}

      <div className="rounded-ledger border border-stamp/30 bg-stamp-soft px-3 py-2">
        <div className="text-[11.5px] font-semibold tracking-wider text-stamp uppercase">
          Amount · money {side}
        </div>
        <div className="tabular text-[22px] leading-tight font-medium">
          {preview.amount !== null ? `${currency} ${formatFixed2(preview.amount)}` : '—'}
        </div>
        <div className={`tabular text-[12.5px] ${invalid ? 'text-rust' : 'text-ink-soft'}`} role={invalid ? 'alert' : undefined}>
          {preview.line}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        {canClear && (
          <button type="button" onClick={onClear} className="mr-auto text-[13px] font-semibold text-stamp underline underline-offset-2">
            Clear calculation
          </button>
        )}
        <Button type="button" variant="ghost" className="!px-3 !py-1.5" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" className="!px-3 !py-1.5" disabled={preview.amount === null} onClick={use}>
          Use amount
        </Button>
      </div>
    </div>
  )
}
