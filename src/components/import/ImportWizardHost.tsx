import { useMemo } from 'react'
import { CASHBOOK_TABLE, moneyOfValues, summarizeCashbookRows, type CashbookImportRow } from '../../lib/cashbook-import'
import { useCategories } from '../../lib/categories'
import { sumMoney } from '../../lib/grid-rows'
import { COSTS_TABLE, costCashbookTotals, type CostImportRow } from '../../lib/costs-import'
import { useCosts } from '../../lib/costs'
import { usePartners } from '../../lib/partners'
import { ORDERS_TABLE, orderCashbookTotals, type OrderImportRow } from '../../lib/orders-import'
import { useOrders } from '../../lib/orders'
import { runnerOf } from '../../lib/paste-import'
import { useTransactions } from '../../lib/transactions'
import { useCashbookAdapter } from '../workspace/use-cashbook-adapter'
import { useOrdersAdapter } from '../orders/use-orders-adapter'
import { useCostsAdapter } from '../costs/use-costs-adapter'
import { Modal } from '../Modal'
import { ImportWizard } from './ImportWizard'

const TABLES = [CASHBOOK_TABLE, ORDERS_TABLE, COSTS_TABLE]

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
  const { data: orderList } = useOrders(businessId)
  const { data: costList } = useCosts(businessId)
  const { data: partners } = usePartners(businessId)
  const cashbook = useCashbookAdapter(businessId, accountId, categories ?? [], transactions ?? [])
  const orders = useOrdersAdapter(businessId, accountId, orderList?.orders ?? [])
  const costs = useCostsAdapter(businessId, costList?.costs ?? [], partners ?? [])
  const runners = useMemo(
    () => ({
      cashbook: runnerOf<CashbookImportRow>(cashbook, summarizeCashbookRows, moneyOfValues),
      orders: runnerOf<OrderImportRow>(orders, orderCashbookTotals),
      costs: runnerOf<CostImportRow>(costs, costCashbookTotals),
    }),
    [cashbook, orders, costs],
  )

  const cashbookNow = useMemo(
    () => ({
      moneyIn: sumMoney((transactions ?? []).filter((tx) => tx.type === 'INCOME').map((tx) => tx.amount)),
      moneyOut: sumMoney((transactions ?? []).filter((tx) => tx.type === 'EXPENSE').map((tx) => tx.amount)),
    }),
    [transactions],
  )

  if (!categories || !transactions || !orderList || !costList || !partners) {
    return (
      <Modal title="Import" onClose={onClose}>
        <p className="text-sm text-ink-soft">Loading…</p>
      </Modal>
    )
  }
  return <ImportWizard tables={TABLES} runners={runners} initialTableKey={initialTableKey} cashbookNow={cashbookNow} onClose={onClose} />
}
