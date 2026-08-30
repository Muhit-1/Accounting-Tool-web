import { useState, type FormEvent } from 'react'
import { useCreateTransaction, useUpdateTransaction, type TransactionInput } from '../../lib/transactions'
import { ApiError } from '../../lib/api-client'
import type { Category, CategoryType, Transaction } from '../../types/api'
import { TextField } from '../TextField'
import { Select } from '../Select'
import { Button } from '../Button'

export function TransactionForm({
  businessId,
  ledgerId,
  categories,
  transaction,
  onClose,
}: {
  businessId: string
  ledgerId: string
  categories: Category[]
  transaction?: Transaction
  onClose: () => void
}) {
  const isEdit = Boolean(transaction)
  const createTransaction = useCreateTransaction(businessId)
  const updateTransaction = useUpdateTransaction(businessId)

  const [type, setType] = useState<CategoryType>(transaction?.type ?? 'INCOME')
  const [amount, setAmount] = useState(transaction ? String(transaction.amount) : '')
  const [date, setDate] = useState(transaction ? transaction.date.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [categoryId, setCategoryId] = useState(transaction?.category?.id ?? '')
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
      ledgerId,
      date,
      amount: Number(amount),
      type,
      categoryId: categoryId || undefined,
      memo: memo || undefined,
    }
    try {
      if (isEdit && transaction) {
        await updateTransaction.mutateAsync({ id: transaction.id, ...input })
      } else {
        await createTransaction.mutateAsync(input)
      }
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  const isPending = createTransaction.isPending || updateTransaction.isPending

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-ledger border border-paper-line bg-paper p-7 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 font-display text-xl font-semibold">{isEdit ? 'Edit entry' : 'New entry'}</h2>
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
