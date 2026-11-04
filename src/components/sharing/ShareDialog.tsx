import { Modal } from '../Modal'
import { Button } from '../Button'
import { ShareManager } from './ShareManager'

// "Share “Business”" from the top bar: the people list and the add form in one dialog.
export function ShareDialog({ businessId, businessName, onClose }: { businessId: string; businessName: string; onClose: () => void }) {
  return (
    <Modal title={`Share “${businessName}”`} onClose={onClose}>
      <ShareManager businessId={businessId} />
      <div className="flex justify-end">
        <Button type="button" onClick={onClose}>
          Done
        </Button>
      </div>
    </Modal>
  )
}
