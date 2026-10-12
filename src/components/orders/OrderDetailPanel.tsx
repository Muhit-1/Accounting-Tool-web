import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../lib/api-client'
import { formatAmount, formatDate } from '../../lib/format'
import {
  ORDER_STATUS_LABEL,
  POSTING_RULE_LABEL,
  STATUS_STEPS,
  forwardStep,
  isOrderDeletable,
  isOrderFinal,
  nextStatuses,
  type OrderStatus,
} from '../../lib/order-status'
import { useDeleteOrder, useUpdateOrderStatus } from '../../lib/orders'
import type { Order } from '../../types/api'
import { Button } from '../Button'
import { ConfirmDialog } from '../ConfirmDialog'
import { TextField } from '../TextField'
import { OrderStatusBadge } from './OrderStatusBadge'

const FORWARD_LABEL: Partial<Record<OrderStatus, string>> = {
  CONFIRMED: 'Confirm order',
  SHIPPED: 'Mark shipped',
  DELIVERED: 'Mark delivered',
}

const today = () => new Date().toISOString().slice(0, 10)

function TotalsRow({ label, value, minus }: { label: string; value: number; minus?: boolean }) {
  return (
    <div className="flex justify-between border-b border-paper-line px-3.5 py-2">
      <span className="text-ink-soft">{label}</span>
      <span className="tabular">
        {minus && value > 0 ? '–' : ''}
        {formatAmount(value)}
      </span>
    </div>
  )
}

// The selected order: where it is, what it adds up to, and what its status
// does to the fund. Moving it to Delivered posts the order to the fund account;
// moving it back removes that entry again (the server does both in one step).
export function OrderDetailPanel({
  businessId,
  order,
  accountName,
  currency,
  onEdit,
  onDeleted,
}: {
  businessId: string
  order: Order
  accountName: string
  currency: string
  onEdit: () => void
  onDeleted: () => void
}) {
  const updateStatus = useUpdateOrderStatus(businessId)
  const deleteOrder = useDeleteOrder(businessId)
  const [deliveryDate, setDeliveryDate] = useState(order.deliveryDate ? order.deliveryDate.slice(0, 10) : today())
  const [confirming, setConfirming] = useState<null | { status: OrderStatus; title: string; body: string; label: string }>(null)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const forward = forwardStep(order.status)
  const choices = nextStatuses(order.status)
  const closed = isOrderFinal(order.status)
  const sign = order.postingRule === 'MONEY_IN' ? '+' : '–'
  const entryDate = order.deliveryDate ?? order.orderDate

  async function move(status: OrderStatus) {
    setError(null)
    try {
      await updateStatus.mutateAsync({ id: order.id, status, deliveryDate: status === 'DELIVERED' ? deliveryDate : undefined })
      setConfirming(null)
    } catch (err) {
      setConfirming(null)
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function remove() {
    setError(null)
    try {
      await deleteOrder.mutateAsync(order.id)
      setConfirmingDelete(false)
      onDeleted()
    } catch (err) {
      setConfirmingDelete(false)
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <aside
      className="flex min-w-0 flex-col gap-4 rounded-ledger border border-paper-line bg-white p-5"
      aria-label={`Order ${order.displayNumber}`}
    >
      <div>
        <div className="text-xs tracking-wider text-ink-soft uppercase">Order {order.displayNumber}</div>
        <div className="font-display text-[18px] font-bold">{order.customerName}</div>
        {order.customerPhone && <div className="tabular text-[13px] text-ink-soft">{order.customerPhone}</div>}
        {order.customerEmail && <div className="text-[13px] text-ink-soft">{order.customerEmail}</div>}
        {order.customerAddress && <div className="mt-1 text-[13px] whitespace-pre-line text-ink-soft">{order.customerAddress}</div>}
      </div>

      {order.items && <div className="text-[13.5px] whitespace-pre-line">{order.items}</div>}

      {closed ? (
        <div>
          <OrderStatusBadge status={order.status} />
        </div>
      ) : (
        <ol className="m-0 flex list-none gap-1.5 p-0 text-[12px] font-semibold" aria-label="Status">
          {STATUS_STEPS.map((step) => {
            const reached = STATUS_STEPS.indexOf(step) <= STATUS_STEPS.indexOf(order.status)
            const current = step === order.status
            return (
              <li
                key={step}
                aria-current={current ? 'step' : undefined}
                className={`flex-1 rounded-[6px] px-1 py-1.5 text-center ${
                  current ? 'bg-stamp text-white' : reached ? 'bg-stamp-soft text-stamp' : 'bg-paper text-ink-soft'
                }`}
              >
                {ORDER_STATUS_LABEL[step]}
              </li>
            )
          })}
        </ol>
      )}

      <div className="overflow-hidden rounded-ledger border border-paper-line text-[13.5px]">
        <TotalsRow label="Items subtotal" value={order.subtotal} />
        <TotalsRow label="Delivery charge" value={order.deliveryCharge} />
        <TotalsRow label="Discount" value={order.discount} minus />
        <div className="flex items-center justify-between bg-stamp-soft px-3.5 py-2.5">
          <span className="font-bold">
            Order total
            <span className="ml-2 rounded-full bg-stamp/15 px-1.5 py-px text-[10px] font-bold tracking-wider">AUTO</span>
          </span>
          <span className="tabular text-[16px] font-medium">
            {currency} {formatAmount(order.total)}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[13px]">
        <span className="text-ink-soft">Order date</span>
        <span className="text-right">{formatDate(order.orderDate)}</span>
        <span className="text-ink-soft">Payment</span>
        <span className="text-right">{order.paymentMethod ?? '—'}</span>
        <span className="text-ink-soft">Fund treatment</span>
        <span className="text-right">{POSTING_RULE_LABEL[order.postingRule]}</span>
        <span className="text-ink-soft">Fund account</span>
        <span className="text-right">{accountName}</span>
      </div>
      {order.notes && <div className="text-[13px] whitespace-pre-line text-ink-soft">{order.notes}</div>}

      <div className="flex flex-col gap-1 rounded-ledger border border-stamp/30 bg-stamp-soft px-3.5 py-3 text-[13.5px]">
        {order.status === 'DELIVERED' ? (
          <>
            <div className="font-bold">In the books</div>
            <div>
              {order.postingRule === 'MONEY_IN' ? 'Money in' : 'Money out'}{' '}
              <span className="tabular">
                {sign}
                {formatAmount(order.total)}
              </span>{' '}
              is in {accountName} on {formatDate(entryDate)}.
            </div>
            <div className="text-ink-soft">Move the order back and that entry is removed.</div>
          </>
        ) : closed ? (
          <>
            <div className="font-bold">Not counted</div>
            <div className="text-ink-soft">A {ORDER_STATUS_LABEL[order.status].toLowerCase()} order is not in the fund.</div>
          </>
        ) : (
          <>
            <div className="font-bold">When you mark it Delivered</div>
            <div>
              {order.postingRule === 'MONEY_IN' ? 'Money in' : 'Money out'}{' '}
              <span className="tabular">
                {sign}
                {formatAmount(order.total)}
              </span>{' '}
              is added to {accountName} on {formatDate(forward === 'DELIVERED' ? deliveryDate : (order.deliveryDate ?? order.orderDate))}.
            </div>
            {forward === 'DELIVERED' && (
              <div className="mt-1.5 max-w-[11rem]">
                <TextField
                  label="Delivery date"
                  type="date"
                  value={deliveryDate}
                  onChange={(event) => setDeliveryDate(event.target.value)}
                />
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <p className="text-sm text-rust" role="alert">
          {error}
        </p>
      )}

      <div className="flex flex-wrap justify-end gap-2.5">
        {order.status === 'DELIVERED' && (
          <>
            {choices.includes('RETURNED') && (
              <Button
                variant="ghost"
                disabled={updateStatus.isPending}
                onClick={() =>
                  setConfirming({
                    status: 'RETURNED',
                    title: 'Mark this order returned?',
                    body: 'Its entry is taken out of the fund, and a returned order can not be changed again.',
                    label: 'Mark returned',
                  })
                }
              >
                Mark returned
              </Button>
            )}
            <Button variant="ghost" disabled={updateStatus.isPending} onClick={() => move('SHIPPED')}>
              Move back to shipped
            </Button>
          </>
        )}
        {choices.includes('CANCELLED') && (
          <Button
            variant="ghost"
            disabled={updateStatus.isPending}
            onClick={() =>
              setConfirming({
                status: 'CANCELLED',
                title: 'Cancel this order?',
                body: 'A cancelled order is not counted and can not be changed again.',
                label: 'Cancel order',
              })
            }
          >
            Cancel order
          </Button>
        )}
        {forward && (
          <Button disabled={updateStatus.isPending} onClick={() => move(forward)}>
            {updateStatus.isPending ? 'Saving…' : FORWARD_LABEL[forward]}
          </Button>
        )}
      </div>

      <div className="flex items-center justify-between border-t border-paper-line pt-3 text-xs">
        <div className="flex gap-3">
          {!closed && (
            <button type="button" onClick={onEdit} className="text-stamp hover:underline">
              Edit
            </button>
          )}
          {isOrderDeletable(order.status) && (
            <button type="button" onClick={() => setConfirmingDelete(true)} className="text-ink-soft hover:text-rust">
              Delete
            </button>
          )}
        </div>
        {order.status === 'DELIVERED' && (
          <Link to={`/businesses/${businessId}/accounts/${order.accountId}`} className="text-stamp hover:underline">
            Open {accountName}
          </Link>
        )}
      </div>

      {confirming && (
        <ConfirmDialog
          title={confirming.title}
          body={confirming.body}
          confirmLabel={confirming.label}
          pendingLabel="Saving…"
          isPending={updateStatus.isPending}
          onConfirm={() => move(confirming.status)}
          onCancel={() => setConfirming(null)}
        />
      )}
      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this order?"
          body="This cannot be undone."
          isPending={deleteOrder.isPending}
          onConfirm={remove}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </aside>
  )
}
