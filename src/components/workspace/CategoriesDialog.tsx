import type { Category } from '../../types/api'
import { Modal } from '../Modal'
import { Button } from '../Button'
import { CategoryManager } from '../account/CategoryManager'

// The Categories button and the "Manage categories…" item both land here.
export function CategoriesDialog({
  businessId,
  categories,
  onClose,
}: {
  businessId: string
  categories: Category[]
  onClose: () => void
}) {
  return (
    <Modal title="Categories" wide onClose={onClose}>
      <p className="text-[13.5px] text-ink-soft">Groups are used in the Statement. Gold ones are posted by other tables.</p>
      <div className="max-h-[56vh] overflow-auto">
        <CategoryManager businessId={businessId} categories={categories} />
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  )
}
