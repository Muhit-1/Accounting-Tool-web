import { useState, type FormEvent } from 'react'
import { useCreateTransaction, useUpdateTransaction, useUploadReceipt, type TransactionInput } from '../../lib/transactions'
import { ApiError } from '../../lib/api-client'
import type { Category, CategoryType, Transaction } from '../../types/api'
import { TextField } from '../TextField'
import { Select } from '../Select'
import { Button } from '../Button'

export function TransactionForm({
  businessId,
  accountId,
  categories,
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
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : (initialAmount?.toString() ?? ''))
  const [date, setDate] = useState(
    transaction ? transaction.date.slice(0, 10) : (initialDate ?? new Date().toISOString().slice(0, 10)),
  )
  const [categoryId, setCategoryId] = useState(transaction?.category?.id ?? '')
  const [counterparty, setCounterparty] = useState(
    transaction ? (transaction.counterparty ?? '') : (initialCounterparty ?? ''),
  )
  const [memo, setMemo] = useState(transaction?.memo ?? '')
  const [error, setError] = useState<string | null>(null)

  const filteredCategories = categories.filter((c) => c.type === type)

  function handleTypeChange(next: CategoryType) {
    setType(next)
    if (categoryId && !categories.some((c) => c.id === categoryId && c.type === next)) {
      setCategoryId('')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    const input: TransactionInput = {
      accountId,
      date,
      amount: Number(amount),
      type,
      categoryId: categoryId || undefined,
      counterparty: counterparty || undefined,
      memo: memo || undefined,
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-ledger border border-paper-line bg-white p-7 shadow-lg"
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
          <TextField
            label="Amount"
            type="number"
            step="0.01"
            min="0.01"
            required
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
          />
          <TextField
            label="Date"
            type="date"
            required
            value={date}
            onChange={(event) => setDate(event.target.value)}
          />
          <Select label="Category" value={categoryId} onChange={(event) => setCategoryId(event.target.value)}>
            <option value="">No category</option>
            {filteredCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </Select>
          <TextField
            label="Memo"
            placeholder="Optional note"
            value={memo}
            onChange={(event) => setMemo(event.target.value)}
          />

          {error && <p className="text-sm text-rust">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add entry'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
