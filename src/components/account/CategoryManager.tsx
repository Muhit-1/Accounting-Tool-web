import { useState, type FormEvent } from 'react'
import { useCreateCategory, useDeleteCategory, useUpdateCategory } from '../../lib/categories'
import { categoryGroupNames } from '../../lib/category-groups'
import { ApiError } from '../../lib/api-client'
import type { Category, CategoryType } from '../../types/api'
import { TextField } from '../TextField'
import { Button } from '../Button'
import { Panel } from '../Panel'
import { ConfirmDialog } from '../ConfirmDialog'

const MAX_GROUP_LENGTH = 60

export function CategoryManager({ businessId, categories }: { businessId: string; categories: Category[] }) {
  const createCategory = useCreateCategory(businessId)
  const updateCategory = useUpdateCategory(businessId)
  const deleteCategory = useDeleteCategory(businessId)
  const [showForm, setShowForm] = useState(false)
  // Set while an existing category is being changed; null = adding a new one.
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [type, setType] = useState<CategoryType>('EXPENSE')
  const [groupName, setGroupName] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null)

  const groupSuggestions = categoryGroupNames(categories)
  const isPending = createCategory.isPending || updateCategory.isPending

  function resetForm() {
    setShowForm(false)
    setEditingId(null)
    setName('')
    setGroupName('')
    setError(null)
  }

  function startAdd() {
    if (showForm && !editingId) {
      resetForm()
      return
    }
    setEditingId(null)
    setName('')
    setGroupName('')
    setError(null)
    setShowForm(true)
  }

  function startEdit(category: Category) {
    setEditingId(category.id)
    setName(category.name)
    setType(category.type)
    setGroupName(category.groupName ?? '')
    setError(null)
    setShowForm(true)
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    // An empty group is sent as null so editing can also remove a group.
    const group = groupName.trim() || null
    try {
      if (editingId) {
        // The type stays as it was: entries filed under it already depend on it.
        await updateCategory.mutateAsync({ id: editingId, name, groupName: group })
      } else {
        await createCategory.mutateAsync({ name, type, groupName: group })
      }
      resetForm()
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
        <button onClick={startAdd} className="border-b border-current text-[13px] text-stamp">
          {showForm && !editingId ? 'Cancel' : '+ Add'}
        </button>
      }
    >
      {showForm && (
        <form className="flex flex-col gap-3 border-b border-paper-line px-5 py-4" onSubmit={handleSubmit}>
          <TextField
            label="Name"
            required
            autoFocus
            placeholder="e.g. Marketing"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Group (optional)"
            name="groupName"
            list="category-group-suggestions"
            autoComplete="off"
            maxLength={MAX_GROUP_LENGTH}
            placeholder="e.g. Overhead"
            value={groupName}
            onChange={(event) => setGroupName(event.target.value)}
          />
          <datalist id="category-group-suggestions">
            {groupSuggestions.map((group) => (
              <option key={group} value={group} />
            ))}
          </datalist>
          {!editingId && (
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
          )}
          {error && (
            <p className="text-sm text-rust" role="alert">
              {error}
            </p>
          )}
          <div className="flex gap-2">
            <Button type="submit" disabled={isPending} className="flex-1">
              {editingId ? (isPending ? 'Saving…' : 'Save category') : isPending ? 'Adding…' : 'Add category'}
            </Button>
            {editingId && (
              <Button type="button" variant="ghost" onClick={resetForm}>
                Cancel
              </Button>
            )}
          </div>
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
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[14.5px]">{category.name}</span>
              <span
                className={`rounded-[4px] border px-2 py-0.5 text-[11.5px] font-semibold tracking-wide uppercase ${
                  category.type === 'INCOME' ? 'border-green text-green' : 'border-rust text-rust'
                }`}
              >
                {category.type === 'INCOME' ? 'Income' : 'Expense'}
              </span>
              {category.groupName && <span className="text-xs text-ink-soft">{category.groupName}</span>}
            </div>
            <div className="flex flex-none items-center gap-3">
              <button
                onClick={() => startEdit(category)}
                className="text-xs text-stamp hover:underline"
                aria-label={`Edit ${category.name}`}
              >
                Edit
              </button>
              <button
                onClick={() => setPendingDeleteId(category.id)}
                className="text-xs text-ink-soft transition-colors hover:text-rust"
              >
                Delete
              </button>
            </div>
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
