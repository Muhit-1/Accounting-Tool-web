import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { ApiError } from '../../lib/api-client'
import { useAccounts } from '../../lib/accounts'
import { useAuth } from '../../lib/auth-context'
import { useBusiness } from '../../lib/businesses'
import { formatAmount, formatMoney } from '../../lib/format'
import { formatDateCell, formatMoneyCell, todayIso } from '../../lib/grid-parse'
import { gridPrefsKey } from '../../lib/grid-prefs'
import { ORDER_STATUSES, ORDER_STATUS_LABEL, POSTING_RULE_LABEL, fundEffect, type OrderStatus } from '../../lib/order-status'
import { PAYMENT_METHODS, buildNewOrder, planOrderEdit, type NewOrderDraft } from '../../lib/orders-grid'
import { useCreateOrder, useDeleteOrder, useOrders, useUpdateOrder, useUpdateOrderStatus } from '../../lib/orders'
import { useToast } from '../../lib/toast-context'
import { useDeferredDelete } from '../../lib/use-deferred-delete'
import type { Order } from '../../types/api'
import { Button } from '../Button'
import { Grid } from '../grid/Grid'
import { PasteModal } from '../grid/PasteModal'
import type { BulkAction, GridColumn, GridFilter } from '../grid/grid-types'
import { StatTile } from '../StatTile'
import { OrderDetailPanel } from './OrderDetailPanel'
import { OrderForm } from './OrderForm'
import { OrderStatusBadge } from './OrderStatusBadge'
import { useOrdersAdapter } from './use-orders-adapter'

const EMPTY: Order[] = []
const rowId = (order: Order) => order.id
const describeDeleted = (count: number) => (count === 1 ? 'Order deleted.' : `${count} orders deleted.`)

const STATUS_COLOR: Record<OrderStatus, string> = {
  NEW: 'text-stamp',
  CONFIRMED: 'text-brass',
  SHIPPED: 'text-[#6b3fb0]',
  DELIVERED: 'text-green',
  CANCELLED: 'text-rust',
  RETURNED: 'text-rust',
}

const FUND_CHOICES = (Object.keys(POSTING_RULE_LABEL) as (keyof typeof POSTING_RULE_LABEL)[]).map((value) => ({ value, label: POSTING_RULE_LABEL[value] }))
const STATUS_CHOICES = ORDER_STATUSES.map((value) => ({ value, label: ORDER_STATUS_LABEL[value] }))

const freshDraft = (): Record<string, string> => ({ orderDate: formatDateCell(todayIso()) })

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

// The Orders table as a sheet. The server numbers every order and works out
// its total; a delivered order posts its money to the Cash book.
export function OrdersTab({
  businessId,
  accountId,
  tableName,
  onImport,
}: {
  businessId: string
  // The fund account new orders post into.
  accountId: string
  tableName: string
  onImport: () => void
}) {
  const { user } = useAuth()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: business } = useBusiness(businessId)
  const { data: accounts } = useAccounts(businessId)
  const { data, isLoading, error } = useOrders(businessId)
  const orders = data?.orders ?? EMPTY
  const createOrder = useCreateOrder(businessId)
  const updateOrder = useUpdateOrder(businessId)
  const updateStatus = useUpdateOrderStatus(businessId)
  const deleteOrder = useDeleteOrder(businessId)

  // The open order lives in the address (?open=<id>) so a link from a Cash book entry can land on it.
  const openId = searchParams.get('open')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Order | undefined>(undefined)
  const [draft, setDraft] = useState<{ values: Record<string, string>; bad: string | null }>({ values: freshDraft(), bad: null })
  const [adding, setAdding] = useState(false)
  const [paste, setPaste] = useState<string | null>(null)
  const adapter = useOrdersAdapter(businessId, accountId, orders)

  const currency = business?.currency ?? 'BDT'
  const selected = orders.find((order) => order.id === openId)

  const select = useCallback(
    (id: string | null) => {
      // The tab stays in the address next to the open order.
      setSearchParams(
        (current) => {
          const next = new URLSearchParams(current)
          if (id) next.set('open', id)
          else next.delete('open')
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const deleteRows = useCallback((rows: Order[]) => Promise.all(rows.map((order) => deleteOrder.mutateAsync(order.id))), [deleteOrder])
  const { hiddenIds, schedule } = useDeferredDelete(rowId, deleteRows, describeDeleted)

  const updateAsync = updateOrder.mutateAsync
  const statusAsync = updateStatus.mutateAsync
  const commit = useCallback(
    async (order: Order, columnId: string, text: string): Promise<string | null> => {
      const plan = planOrderEdit(order, columnId, text, todayIso())
      if (plan.kind === 'noop') return null
      if (plan.kind === 'error') return plan.message
      try {
        if (plan.kind === 'status') {
          await statusAsync({ id: order.id, status: plan.status, deliveryDate: plan.deliveryDate })
          if (plan.status === 'DELIVERED') toast(`${order.displayNumber} is delivered — posted to the Cash book.`)
          else if (order.status === 'DELIVERED') toast(`${order.displayNumber} left Delivered — removed from the Cash book.`)
        } else {
          await updateAsync({ id: order.id, ...plan.patch })
        }
        return null
      } catch (err) {
        return messageOf(err)
      }
    },
    [statusAsync, updateAsync, toast],
  )

  const changeDraft = useCallback((columnId: string, text: string) => {
    setDraft((current) => ({ values: { ...current.values, [columnId]: text }, bad: current.bad === columnId ? null : current.bad }))
  }, [])

  async function submitDraft() {
    if (adding) return
    const values = draft.values
    const form: NewOrderDraft = {
      orderDate: values.orderDate ?? '',
      customer: values.customer ?? '',
      phone: values.phone ?? '',
      items: values.items ?? '',
      subtotal: values.subtotal ?? '',
      delivery: values.delivery ?? '',
      discount: values.discount ?? '',
      payment: values.payment ?? '',
      status: values.status ?? '',
      fund: values.fund ?? '',
      deliveredOn: values.deliveredOn ?? '',
      notes: values.notes ?? '',
    }
    const result = buildNewOrder(form, todayIso())
    if (!result.ok) {
      toast(result.message)
      setDraft((current) => ({ ...current, bad: result.column }))
      return
    }
    setAdding(true)
    try {
      const created = await createOrder.mutateAsync({ accountId, ...result.input })
      setDraft({ values: freshDraft(), bad: null })
      toast(`${created.displayNumber} added.${created.status === 'DELIVERED' ? ' Posted to the Cash book.' : ''}`)
      window.setTimeout(() => document.querySelector<HTMLElement>('[data-grid-cell][data-draft][data-col="customer"]')?.focus(), 0)
    } catch (err) {
      toast(messageOf(err))
    } finally {
      setAdding(false)
    }
  }

  const payments = useMemo(() => {
    const seen = new Set(PAYMENT_METHODS)
    for (const order of orders) if (order.paymentMethod) seen.add(order.paymentMethod)
    return [...seen].map((value) => ({ value, label: value }))
  }, [orders])

  const columns = useMemo<GridColumn<Order>[]>(
    () => [
      {
        id: 'n',
        label: 'Order',
        type: 'calc',
        width: '96px',
        required: true,
        locked: true,
        value: (order) => order.number,
        text: (order) => order.displayNumber,
        onActivate: (order) => select(order.id),
        draftNote: 'new',
      },
      { id: 'orderDate', label: 'Order date', type: 'date', width: '118px', required: true, value: (o) => o.orderDate.slice(0, 10), text: (o) => formatDateCell(o.orderDate) },
      { id: 'customer', label: 'Customer', type: 'text', width: '160px', required: true, value: (o) => o.customerName },
      { id: 'phone', label: 'Phone', type: 'text', width: '130px', value: (o) => o.customerPhone ?? '' },
      { id: 'items', label: 'Items', type: 'text', width: 'minmax(180px,1fr)', value: (o) => o.items ?? '' },
      { id: 'subtotal', label: 'Subtotal', type: 'money', width: '112px', sum: true, value: (o) => o.subtotal, text: (o) => formatMoneyCell(o.subtotal), placeholder: '0.00' },
      { id: 'delivery', label: 'Delivery', type: 'money', width: '100px', sum: true, value: (o) => o.deliveryCharge, text: (o) => formatMoneyCell(o.deliveryCharge), placeholder: '0.00' },
      { id: 'discount', label: 'Discount', type: 'money', width: '100px', sum: true, value: (o) => o.discount, text: (o) => formatMoneyCell(o.discount), placeholder: '0.00' },
      {
        id: 'total',
        label: 'Total',
        type: 'calc',
        width: '116px',
        required: true,
        locked: true,
        sum: true,
        value: (o) => o.total,
        text: (o) => formatMoneyCell(o.total),
        draftNote: 'auto',
      },
      { id: 'payment', label: 'Payment', type: 'choice', width: '150px', value: (o) => o.paymentMethod ?? '', choices: () => payments, placeholder: '' },
      {
        id: 'status',
        label: 'Status',
        type: 'choice',
        width: '120px',
        required: true,
        value: (o) => o.status,
        text: (o) => ORDER_STATUS_LABEL[o.status],
        choices: () => STATUS_CHOICES,
        choiceClass: (value) => `font-semibold ${STATUS_COLOR[value as OrderStatus] ?? ''}`,
        placeholder: 'New',
      },
      { id: 'fund', label: 'Fund treatment', type: 'choice', width: '150px', value: (o) => o.postingRule, text: (o) => POSTING_RULE_LABEL[o.postingRule], choices: () => FUND_CHOICES, placeholder: 'Money in' },
      { id: 'deliveredOn', label: 'Delivered on', type: 'date', width: '118px', value: (o) => o.deliveryDate?.slice(0, 10) ?? '', text: (o) => formatDateCell(o.deliveryDate) },
      { id: 'notes', label: 'Notes', type: 'text', width: '150px', value: (o) => o.notes ?? '' },
    ],
    [payments, select],
  )

  const filter = useMemo<GridFilter<Order>>(
    () => ({ label: 'All statuses', choices: STATUS_CHOICES, match: (order, value) => order.status === value }),
    [],
  )

  const bulkActions = useMemo<BulkAction<Order>[]>(
    () => [
      {
        id: 'status',
        label: 'Set status',
        choices: STATUS_CHOICES,
        run: async (rows, status) => {
          let changed = 0
          let skipped = 0
          for (const order of rows) {
            const problem = await commit(order, 'status', status)
            if (problem) skipped += 1
            else changed += 1
          }
          toast(`${changed} ${changed === 1 ? 'order' : 'orders'} updated${skipped ? `, ${skipped} skipped (that move is not allowed)` : ''}.`)
        },
      },
    ],
    [commit, toast],
  )

  const deleteSelected = useCallback(
    (rows: Order[]) => {
      const deletable = rows.filter((order) => order.status !== 'DELIVERED')
      if (deletable.length < rows.length) toast('A delivered order can’t be deleted. Move it back to Shipped (or Returned) first.')
      schedule(deletable)
    },
    [schedule, toast],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setEditing(undefined)
            setShowForm(true)
          }}
        >
          + New order
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <StatTile label="Orders" value={data?.summary.orders ?? 0} />
        <StatTile label="In progress" value={data?.summary.inProgress ?? 0} />
        <StatTile label="Delivered" value={data?.summary.delivered ?? 0} />
        <StatTile label="Delivered value" value={formatAmount(data?.summary.deliveredValue ?? 0)} />
        <StatTile label="Discounts on delivered" value={formatAmount(data?.summary.discountsOnDelivered ?? 0)} />
      </div>

      {error ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-rust" role="alert">
          Could not load the orders.
        </p>
      ) : isLoading ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Grid<Order>
              prefsKey={gridPrefsKey(user?.id ?? 'anonymous', businessId, 'orders')}
              columns={columns}
              rows={orders}
              rowId={rowId}
              onCommit={commit}
              addRow={{
                values: draft.values,
                onChange: changeDraft,
                onSubmit: () => void submitDraft(),
                badColumn: draft.bad,
                focusColumn: 'customer',
                noun: 'order',
                isSubmitting: adding,
              }}
              onDeleteRows={deleteSelected}
              bulkActions={bulkActions}
              filter={filter}
              onPasteText={setPaste}
              hiddenIds={hiddenIds}
              exportName={tableName}
              noun="order"
              emptyTitle="No orders yet"
              emptyHint="Fill the empty row below and press Enter — or paste from Excel, or import a file."
              toolbarRight={
                <>
                  <button
                    type="button"
                    onClick={() => setPaste('')}
                    className="rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-stamp-soft"
                  >
                    Paste from Excel
                  </button>
                  <button
                    type="button"
                    onClick={onImport}
                    className="rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-stamp-soft"
                  >
                    Import
                  </button>
                </>
              }
            />
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {orders.length === 0 && <li className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">No orders yet — add your first one above.</li>}
            {orders.map((order) => {
              const effect = fundEffect(order.status, order.postingRule)
              return (
                <li key={order.id}>
                  <button
                    type="button"
                    onClick={() => select(order.id === openId ? null : order.id)}
                    className="flex w-full items-start justify-between gap-3 rounded-ledger border border-paper-line bg-white px-4 py-3 text-left"
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">{order.displayNumber}</span>
                      <span className="block truncate text-[13px] text-ink-soft">{order.customerName}</span>
                      <span className={`block text-xs ${effect.tone === 'in' ? 'text-green' : effect.tone === 'out' ? 'text-rust' : 'text-ink-soft'}`}>{effect.text}</span>
                    </span>
                    <span className="flex-none text-right">
                      <span className="tabular block">{formatMoney(order.total, currency)}</span>
                      <OrderStatusBadge status={order.status} />
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </>
      )}

      {selected && (
        <OrderDetailPanel
          key={selected.id}
          businessId={businessId}
          order={selected}
          accountName={accounts?.find((account) => account.id === selected.accountId)?.name ?? 'Cash book'}
          currency={currency}
          onEdit={() => {
            setEditing(selected)
            setShowForm(true)
          }}
          onDeleted={() => select(null)}
        />
      )}

      {paste !== null && <PasteModal adapter={adapter} initialText={paste} onClose={() => setPaste(null)} />}

      {showForm && (
        <OrderForm
          businessId={businessId}
          accounts={accounts ?? []}
          currency={currency}
          order={editing}
          onSaved={(saved) => {
            setShowForm(false)
            setEditing(undefined)
            select(saved.id)
          }}
          onClose={() => {
            setShowForm(false)
            setEditing(undefined)
          }}
        />
      )}
    </div>
  )
}
