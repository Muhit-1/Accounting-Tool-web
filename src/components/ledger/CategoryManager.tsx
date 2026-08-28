import { useState, type FormEvent } from 'react'
import { useCreateCategory, useDeleteCategory } from '../../lib/categories'
import { ApiError } from '../../lib/api-client'
import type { Category, CategoryType } from '../../types/api'
import { TextField } from '../TextField'
import { Button } from '../Button'
import { Panel } from '../Panel'
import { ConfirmDialog } from '../ConfirmDialog'

export function CategoryManager({ businessId, categories }: { businessId: string; categories: Category[] }) {
  const createCategory = useCreateCategory(businessId)
  const deleteCategory = useDeleteCategory(businessId)
  const [showForm, setShowForm] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('EXPENSE')
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  async function handleAdd(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      await createCategory.mutateAsync({ name, type })
      setName('')
      setShowForm(false)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function confirmDelete() {
    if (!pendingDeleteId) return
    await deleteCategory.mutateAsync(pendingDeleteId)
    setPendingDeleteId(null)
  }

  return (
    <Panel
      title="Categories"
      action={
        <button
          onClick={() => setShowForm((s) => !s)}
          className="border-b border-current text-[13px] text-stamp"
        >
          {showForm ? 'Cancel' : '+ Add'}
        </button>
      }
    >
      {showForm && (
        <form className="flex flex-col gap-3 border-b border-paper-line px-5 py-4" onSubmit={handleAdd}>
          <TextField
            label="Name"
            required
            autoFocus
            placeholder="e.g. Marketing"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setType('INCOME')}
              className={`flex-1 rounded-ledger border px-3 py-2 text-sm font-medium transition-colors ${
                type === 'INCOME' ? 'border-green bg-green-soft text-green' : 'border-paper-line text-ink-soft'
              }`}
            >
              Income
            </button>
            <button
              type="button"
              onClick={() => setType('EXPENSE')}
              className={`flex-1 rounded-ledger border px-3 py-2 text-sm font-medium transition-colors ${
                type === 'EXPENSE' ? 'border-rust bg-rust-soft text-rust' : 'border-paper-line text-ink-soft'
              }`}
            >
              Expense
            </button>
          </div>
          {error && <p className="text-sm text-rust">{error}</p>}
          <Button type="submit" disabled={createCategory.isPending}>
            {createCategory.isPending ? 'Adding…' : 'Add category'}
          </Button>
        </form>
      )}

      {categories.length === 0 && !showForm ? (
        <p className="px-5 py-6 text-sm text-ink-soft">No categories yet.</p>
      ) : (
        categories.map((category) => (
          <div
            key={category.id}
            className="flex items-center justify-between border-b border-paper-edge px-5 py-2.5 last:border-b-0"
          >
            <div className="flex items-center gap-2">
              <span className="text-[14.5px]">{category.name}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] ${
                  category.type === 'INCOME' ? 'bg-green-soft text-green' : 'bg-rust-soft text-rust'
                }`}
              >
                {category.type === 'INCOME' ? 'Income' : 'Expense'}
              </span>
            </div>
            <button
              onClick={() => setPendingDeleteId(category.id)}
              className="text-xs text-ink-soft transition-colors hover:text-rust"
            >
              Delete
            </button>
          </div>
        ))
      )}

      {pendingDeleteId && (
        <ConfirmDialog
          title="Delete this category?"
          body="Transactions using it will become uncategorized, not deleted."
          isPending={deleteCategory.isPending}
          onConfirm={confirmDelete}
          onCancel={() => setPendingDeleteId(null)}
        />
      )}
    </Panel>
  )
}
