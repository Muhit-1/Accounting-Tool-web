import { useState, type FormEvent } from 'react'
import { useCreateTransaction, useUpdateTransaction, useUploadReceipt, type TransactionInput } from '../../lib/transactions'
import { ApiError } from '../../lib/api-client'
import { groupCategories } from '../../lib/category-groups'
import {
  AMOUNT_TYPES,
  appendCalculationToMemo,
  initialBoxCount,
  parseBox,
  previewAmount,
  type AmountType,
} from '../../lib/calc'
import { proofUrlError } from '../../lib/proof-url'
import type { Category, CategoryType, Transaction } from '../../types/api'
import { TextField } from '../TextField'
import { Select } from '../Select'
import { Button } from '../Button'
import { AmountTypeFields, MemoCalculationOption } from './AmountTypeFields'

// One list of boxes per type, so switching type and back keeps what was typed.
function initialBoxes(transaction?: Transaction): Record<AmountType, string[]> {
  const boxes = {} as Record<AmountType, string[]>
  for (const type of AMOUNT_TYPES) {
    boxes[type] = Array.from({ length: initialBoxCount(type) }, () => '')
  }
  if (transaction?.amountType && transaction.amountInputs) {
    boxes[transaction.amountType] = transaction.amountInputs.map(String)
  }
  return boxes
}

export function TransactionForm({
  businessId,
  accountId,
  categories,
  currency = 'BDT',
  transaction,
  initialAmount,
  initialDate,
  initialCounterparty,
  pendingReceiptFile,
  onClose,
}: {
  businessId: string
  accountId: string
  categories: Category[]
  currency?: string
  transaction?: Transaction
  // Prefill for a fresh entry seeded from an uploaded invoice/receipt
  // (ScanInvoiceModal) — ignored once `transaction` is set (edit mode).
  initialAmount?: number | null
  initialDate?: string | null
  initialCounterparty?: string | null
  // The file itself, attached to the new entry once it's actually saved so
  // the user can open it again later (see TransactionTable's "View invoice").
  pendingReceiptFile?: File
  onClose: () => void
}) {
  const isEdit = Boolean(transaction)
  const createTransaction = useCreateTransaction(businessId)
  const updateTransaction = useUpdateTransaction(businessId)
  const uploadReceipt = useUploadReceipt(businessId)

  const [type, setType] = useState<CategoryType>(transaction?.type ?? 'INCOME')
  // Entries made before amount types existed have none: they are fixed amounts.
  const [amountType, setAmountType] = useState<AmountType>(transaction?.amountType ?? 'FIXED')
  // A calculated entry opened in edit mode keeps its current amount here, so
  // switching it to Fixed unlocks the Amount box with that number in it.
  const [fixedAmount, setFixedAmount] = useState(
    transaction ? String(transaction.amount) : (initialAmount?.toString() ?? ''),
  )
  const [boxesByType, setBoxesByType] = useState(() => initialBoxes(transaction))
  const [addToMemo, setAddToMemo] = useState(false)
  const [date, setDate] = useState(
    transaction ? transaction.date.slice(0, 10) : (initialDate ?? new Date().toISOString().slice(0, 10)),
  )
  const [categoryId, setCategoryId] = useState(transaction?.category?.id ?? '')
  const [counterparty, setCounterparty] = useState(
    transaction ? (transaction.counterparty ?? '') : (initialCounterparty ?? ''),
  )
  const [memo, setMemo] = useState(transaction?.memo ?? '')
  const [proofUrl, setProofUrl] = useState(transaction?.proofUrl ?? '')
  const [error, setError] = useState<string | null>(null)

  const filteredCategories = categories.filter((c) => c.type === type)
  const categoryGroups = groupCategories(filteredCategories)

  const isCalculated = amountType !== 'FIXED'
  const boxes = boxesByType[amountType]
  const preview = isCalculated ? previewAmount(amountType, boxes) : null
  const proofError = proofUrlError(proofUrl)

  // What the memo will say on save, when the calculation is to be added.
  const memoWithCalculation =
    isCalculated && addToMemo && preview?.calculation ? appendCalculationToMemo(memo, preview.calculation) : null
  const memoFits = !(isCalculated && addToMemo && preview?.calculation) || memoWithCalculation !== null

  function handleTypeChange(next: CategoryType) {
    setType(next)
    if (categoryId && !categories.some((c) => c.id === categoryId && c.type === next)) {
      setCategoryId('')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (isCalculated && (!preview || preview.amount === null)) return
    if (proofError) return

    const input: TransactionInput = {
      accountId,
      date,
      type,
      categoryId: categoryId || undefined,
      counterparty: counterparty || undefined,
      memo: (memoWithCalculation ?? memo) || undefined,
      proofUrl: proofUrl.trim() || (isEdit ? null : undefined),
    }
    if (isCalculated) {
      // The server works the amount out from the boxes; the tile above is only a preview.
      input.amountType = amountType
      input.amountInputs = boxes.map((box) => parseBox(box) as number)
    } else {
      input.amount = Number(fixedAmount)
      // Tells the server to drop the old boxes of an entry that was calculated.
      if (transaction?.amountType) input.amountType = 'FIXED'
    }

    try {
      if (isEdit && transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, ...input })
      } else {
        const created = await createTransaction.mutateAsync(input)
        if (pendingReceiptFile) {
          // Best-effort: the entry itself is already saved at this point,
          // so a failure here shouldn't block the user — they just won't
          // be able to reopen the source file for this one entry.
          await uploadReceipt.mutateAsync({ transactionId: created.id, file: pendingReceiptFile }).catch(() => undefined)
        }
      }
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const isPending = createTransaction.isPending || updateTransaction.isPending || uploadReceipt.isPending
  const canSave = !isPending && !proofError && (!isCalculated || preview?.amount != null)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/20" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center px-4 py-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEdit ? 'Edit entry' : 'New entry'}
          className="w-full max-w-md rounded-ledger border border-paper-line bg-white p-7 shadow-lg"
          onClick={(e) => e.stopPropagation()}
        >
          <h2 className="mb-5 font-display text-xl font-bold">{isEdit ? 'Edit entry' : 'New entry'}</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => handleTypeChange('INCOME')}
                className={`flex-1 rounded-ledger border px-3 py-2 text-sm font-medium transition-colors ${
                  type === 'INCOME' ? 'border-green bg-green-soft text-green' : 'border-paper-line text-ink-soft'
                }`}
              >
                Money in
              </button>
              <button
                type="button"
                onClick={() => handleTypeChange('EXPENSE')}
                className={`flex-1 rounded-ledger border px-3 py-2 text-sm font-medium transition-colors ${
                  type === 'EXPENSE' ? 'border-rust bg-rust-soft text-rust' : 'border-paper-line text-ink-soft'
                }`}
              >
                Money out
              </button>
            </div>

            <TextField
              label={type === 'INCOME' ? 'From' : 'To'}
              placeholder={type === 'INCOME' ? 'Who paid you' : 'Who you paid'}
              value={counterparty}
              onChange={(event) => setCounterparty(event.target.value)}
            />

            <AmountTypeFields
              amountType={amountType}
              onAmountTypeChange={setAmountType}
              fixedAmount={fixedAmount}
              onFixedAmountChange={setFixedAmount}
              boxes={boxes}
              onBoxesChange={(next) => setBoxesByType((current) => ({ ...current, [amountType]: next }))}
              preview={preview}
              currency={currency}
            />

            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Date"
                type="date"
                required
                className="min-w-0"
                value={date}
                onChange={(event) => setDate(event.target.value)}
              />
              <Select
                label="Category"
                className="min-w-0"
                value={categoryId}
                onChange={(event) => setCategoryId(event.target.value)}
              >
                <option value="">No category</option>
                {categoryGroups.map((group) =>
                  group.label === null ? (
                    group.items.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))
                  ) : (
                    <optgroup key={group.label} label={group.label}>
                      {group.items.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </optgroup>
                  ),
                )}
              </Select>
            </div>

            <div className="flex flex-col gap-2">
              <TextField
                label="Memo"
                placeholder="Optional note"
                maxLength={1000}
                value={memo}
                onChange={(event) => setMemo(event.target.value)}
              />
              {isCalculated && (
                <MemoCalculationOption
                  checked={addToMemo}
                  onChange={setAddToMemo}
                  savedMemo={memoWithCalculation}
                  fits={memoFits}
                />
              )}
            </div>

            <TextField
              label="Proof link (optional)"
              name="proofUrl"
              type="text"
              inputMode="url"
              autoComplete="off"
              placeholder="https://… payment screenshot or receipt"
              value={proofUrl}
              error={proofError ?? undefined}
              aria-invalid={proofError ? true : undefined}
              onChange={(event) => setProofUrl(event.target.value)}
            />

            {error && (
              <p className="text-sm text-rust" role="alert">
                {error}
              </p>
            )}
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={!canSave}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add entry'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
