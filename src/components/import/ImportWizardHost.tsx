import { useMemo } from 'react'
import { CASHBOOK_TABLE, moneyOfValues, summarizeCashbookRows, type CashbookImportRow } from '../../lib/cashbook-import'
import { useCategories } from '../../lib/categories'
import { runnerOf } from '../../lib/paste-import'
import { useTransactions } from '../../lib/transactions'
import { useCashbookAdapter } from '../workspace/use-cashbook-adapter'
import { Modal } from '../Modal'
import { ImportWizard } from './ImportWizard'

const TABLES = [CASHBOOK_TABLE]

// Gathers what the import needs (the tables' current rows, categories) and
// opens the wizard once it has it. More tables join the list as they get
// their own adapter (Orders, Costs).
export function ImportWizardHost({
  businessId,
  accountId,
  initialTableKey,
  onClose,
}: {
  businessId: string
  accountId: string
  initialTableKey?: string
  onClose: () => void
}) {
  const { data: categories } = useCategories(businessId)
  const { data: transactions } = useTransactions(businessId, accountId)
  const cashbook = useCashbookAdapter(businessId, accountId, categories ?? [], transactions ?? [])
  const runners = useMemo(
    () => ({ cashbook: runnerOf<CashbookImportRow>(cashbook, summarizeCashbookRows, moneyOfValues) }),
    [cashbook],
  )

  if (!categories || !transactions) {
    return (
      <Modal title="Import" onClose={onClose}>
        <p className="text-sm text-ink-soft">Loading…</p>
      </Modal>
    )
  }
  return <ImportWizard tables={TABLES} runners={runners} initialTableKey={initialTableKey} onClose={onClose} />
}
