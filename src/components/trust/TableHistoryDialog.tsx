import { Button } from '../Button'
import { Modal } from '../Modal'
import { ActivityList } from './ActivityList'

// Who changed what in one table, newest first.
export function TableHistoryDialog({ businessId, tableId, tableName, onClose }: { businessId: string; tableId: string; tableName: string; onClose: () => void }) {
  return (
    <Modal title={`History of ${tableName}`} onClose={onClose} wide>
      <div className="-mx-6 max-h-[60vh] overflow-y-auto border-y border-paper-line">
        <ActivityList businessId={businessId} tableId={tableId} emptyText="Nothing has changed in this table yet." />
      </div>
      <div className="mt-4 flex justify-end">
        <Button variant="ghost" onClick={onClose}>
          Close
        </Button>
      </div>
    </Modal>
  )
}
