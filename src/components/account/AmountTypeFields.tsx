import {
  AMOUNT_TYPE_OPTIONS,
  MAX_LIST_BOXES,
  boxLabel,
  formatFixed2,
  isAmountType,
  isListType,
  type AmountType,
  type CalcPreview,
} from '../../lib/calc'
import { TextField } from '../TextField'
import { Select } from '../Select'

function LockIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      width="15"
      height="15"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-label="Locked"
    >
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  )
}

// "Amount type" choice, then either the plain Amount box (fixed) or named
// number boxes with a locked, live "Amount · calculated" tile. The tile is a
// preview only: the server recomputes the amount from the same boxes.
export function AmountTypeFields({
  amountType,
  onAmountTypeChange,
  fixedAmount,
  onFixedAmountChange,
  boxes,
  onBoxesChange,
  preview,
  currency,
}: {
  amountType: AmountType
  onAmountTypeChange: (type: AmountType) => void
  fixedAmount: string
  onFixedAmountChange: (value: string) => void
  boxes: string[]
  onBoxesChange: (boxes: string[]) => void
  // null while the type is fixed.
  preview: CalcPreview | null
  currency: string
}) {
  const isFixed = amountType === 'FIXED'
  const canAdd = isListType(amountType) && boxes.length < MAX_LIST_BOXES
  const canRemove = isListType(amountType) && boxes.length > 2

  function setBox(index: number, value: string) {
    onBoxesChange(boxes.map((box, i) => (i === index ? value : box)))
  }

  return (
    <>
      <Select
        label="Amount type"
        name="amountType"
        value={amountType}
        onChange={(event) => {
          if (isAmountType(event.target.value)) onAmountTypeChange(event.target.value)
        }}
      >
        {AMOUNT_TYPE_OPTIONS.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>

      {isFixed ? (
        <TextField
          label="Amount"
          name="amount"
          type="number"
          step="0.01"
          min="0.01"
          required
          value={fixedAmount}
          onChange={(event) => onFixedAmountChange(event.target.value)}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-ledger border border-paper-line bg-paper p-3.5">
          <div className="grid grid-cols-2 gap-3">
            {boxes.map((box, index) => (
              <TextField
                key={index}
                label={boxLabel(amountType, index)}
                name={`amount-box-${index}`}
                inputMode="decimal"
                autoComplete="off"
                className="tabular min-w-0"
                value={box}
                onChange={(event) => setBox(index, event.target.value)}
              />
            ))}
          </div>

          {(canAdd || canRemove) && (
            <div className="flex gap-4">
              {canAdd && (
                <button
                  type="button"
                  onClick={() => onBoxesChange([...boxes, ''])}
                  className="text-[13px] font-semibold text-stamp underline underline-offset-2"
                >
                  + Add another number
                </button>
              )}
              {canRemove && (
                <button
                  type="button"
                  onClick={() => onBoxesChange(boxes.slice(0, -1))}
                  className="text-[13px] text-ink-soft underline underline-offset-2 hover:text-rust"
                >
                  Remove last
                </button>
              )}
            </div>
          )}

          <div className="flex flex-col gap-1 rounded-ledger border border-stamp/30 bg-stamp-soft px-3.5 py-3">
            <div className="flex items-center justify-between text-xs font-semibold tracking-wider text-stamp uppercase">
              <span>Amount · calculated</span>
              <LockIcon />
            </div>
            <div className="tabular text-[26px] leading-tight font-medium text-ink" aria-live="polite">
              {preview?.amount != null ? `${currency} ${formatFixed2(preview.amount)}` : '—'}
            </div>
            <div
              className={`tabular text-[13px] ${preview && preview.error && !preview.incomplete ? 'text-rust' : 'text-ink-soft'}`}
              role={preview && preview.error && !preview.incomplete ? 'alert' : undefined}
            >
              {preview?.line ?? ''}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// "Add the calculation to the memo", shown under the Memo box for calculated
// amounts only. Off by default; the form appends e.g. "· 1,000 × 5" on save.
export function MemoCalculationOption({
  checked,
  onChange,
  savedMemo,
  fits,
}: {
  checked: boolean
  onChange: (checked: boolean) => void
  // What the memo will read once saved, shown while ticked.
  savedMemo: string | null
  fits: boolean
}) {
  return (
    <div className="flex flex-col gap-1">
      <label className="flex items-center gap-2 text-[13px] text-ink">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          className="h-4 w-4 accent-stamp"
        />
        Add the calculation to the memo
      </label>
      {checked && !fits && <span className="text-xs text-rust">The memo is too long to add it.</span>}
      {checked && fits && savedMemo && <span className="tabular text-[12.5px] text-ink-soft">Saved as: {savedMemo}</span>}
    </div>
  )
}
