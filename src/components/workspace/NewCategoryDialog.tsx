import { useState, type FormEvent } from 'react'
import { useCreateCategory } from '../../lib/categories'
import { categoryGroupNames } from '../../lib/category-groups'
import { ApiError } from '../../lib/api-client'
import { useToast } from '../../lib/toast-context'
import type { Category, CategoryType } from '../../types/api'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { TextField } from '../TextField'
import { Select } from '../Select'

const MAX_NAME = 120
const MAX_GROUP = 60

// "＋ New category…" from the Category cell: name, group, type — and the new
// category goes straight into the cell that asked for it.
export function NewCategoryDialog({
  businessId,
  categories,
  initialType,
  onCreated,
  onClose,
}: {
  businessId: string
  categories: Category[]
  initialType: CategoryType
  onCreated: (category: Category) => void
  onClose: () => void
}) {
  const toast = useToast()
  const create = useCreateCategory(businessId)
  const [name, setName] = useState('')
  const [group, setGroup] = useState('')
  const [type, setType] = useState<CategoryType>(initialType)
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    const clean = name.trim()
    if (clean === '') {
      setError('Type a name for the category.')
      return
    }
    if (categories.some((category) => category.name.toLowerCase() === clean.toLowerCase())) {
      setError('That category already exists.')
      return
    }
    try {
      const created = await create.mutateAsync({ name: clean, type, groupName: group.trim() || null })
      toast(`Category “${created.name}” added.`)
      onCreated(created)
      onClose()
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <Modal title="New category" onClose={onClose}>
      <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <TextField
          label="Name"
          name="category-name"
          value={name}
          maxLength={MAX_NAME}
          placeholder="e.g. Courier fees"
          autoComplete="off"
          onChange={(event) => {
            setName(event.target.value)
            setError(null)
          }}
        />
        <div className="grid grid-cols-2 gap-3">
          <TextField
            label="Group"
            name="category-group"
            list="new-category-groups"
            value={group}
            maxLength={MAX_GROUP}
            placeholder="e.g. Overhead"
            autoComplete="off"
            onChange={(event) => setGroup(event.target.value)}
          />
          <datalist id="new-category-groups">
            {categoryGroupNames(categories).map((groupName) => (
              <option key={groupName} value={groupName} />
            ))}
          </datalist>
          <Select label="Type" name="category-type" value={type} onChange={(event) => setType(event.target.value as CategoryType)}>
            <option value="EXPENSE">Money out</option>
            <option value="INCOME">Money in</option>
          </Select>
        </div>
        <p className="text-[13px] text-ink-soft">Groups bundle categories in the Statement.</p>
        {error && (
          <p className="text-sm text-rust" role="alert">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-3">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? 'Adding…' : 'Add category'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
