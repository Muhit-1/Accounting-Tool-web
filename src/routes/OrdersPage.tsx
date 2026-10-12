import { useState } from 'react'
import { useParams, useSearchParams } from 'react-router-dom'
import { useAccounts } from '../lib/accounts'
import { useBusiness } from '../lib/businesses'
import { formatAmount, formatDate, formatMoney } from '../lib/format'
import { ORDER_STATUSES, ORDER_STATUS_LABEL, fundEffect, type OrderStatus } from '../lib/order-status'
import { useOrders } from '../lib/orders'
import type { Order } from '../types/api'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { Select } from '../components/Select'
import { OrderDetailPanel } from '../components/orders/OrderDetailPanel'
import { OrderForm } from '../components/orders/OrderForm'
import { OrderStatusBadge } from '../components/orders/OrderStatusBadge'

function Tile({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-ledger border border-paper-line bg-white px-4 py-3.5">
      <div className="text-[11.5px] tracking-wider text-ink-soft uppercase">{label}</div>
      <div className="tabular text-[22px] font-medium">{value}</div>
    </div>
  )
}

const HEAD = 'border-b border-paper-line px-3 py-2.5 text-[12.5px] font-semibold tracking-wider text-ink-soft uppercase'

export function OrdersPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const [searchParams, setSearchParams] = useSearchParams()
  const { data: business } = useBusiness(businessId)
  const { data: accounts } = useAccounts(businessId)
  const { data, isLoading, error } = useOrders(businessId)

  // The open order lives in the address (?open=<id>) so a link from an account entry can land on it.
  const openId = searchParams.get('open')
  const [filter, setFilter] = useState<'ALL' | OrderStatus>('ALL')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<Order | undefined>(undefined)

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'
  const orders = data?.orders ?? []
  const shown = filter === 'ALL' ? orders : orders.filter((order) => order.status === filter)
  const selected = orders.find((order) => order.id === openId)
  const accountName = (id: string) => accounts?.find((account) => account.id === id)?.name ?? 'Fund'

  function select(id: string | null) {
    setSearchParams(id ? { open: id } : {}, { replace: true })
  }

  function closeForm() {
    setShowForm(false)
    setEditing(undefined)
  }

  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Orders</h1>
        </div>
        <Button
          onClick={() => {
            setEditing(undefined)
            setShowForm(true)
          }}
        >
          + New order
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        <Tile label="Orders" value={data?.summary.orders ?? 0} />
        <Tile label="In progress" value={data?.summary.inProgress ?? 0} />
        <Tile label="Delivered" value={data?.summary.delivered ?? 0} />
        <Tile label="Delivered value" value={formatAmount(data?.summary.deliveredValue ?? 0)} />
        <Tile label="Discounts on delivered" value={formatAmount(data?.summary.discountsOnDelivered ?? 0)} />
      </div>

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(320px,1fr)]">
        <Panel
          title="All orders"
          action={
            <div className="w-40">
              <Select
                label="Show"
                value={filter}
                onChange={(event) => setFilter(event.target.value as 'ALL' | OrderStatus)}
              >
                <option value="ALL">All</option>
                {ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {ORDER_STATUS_LABEL[status]}
                  </option>
                ))}
              </Select>
            </div>
          }
        >
          {error ? (
            <p className="px-5 py-8 text-sm text-rust" role="alert">
              Could not load the orders.
            </p>
          ) : isLoading ? (
            <p className="px-5 py-8 text-sm text-ink-soft">Loading…</p>
          ) : shown.length === 0 ? (
            <p className="px-5 py-8 text-sm text-ink-soft">
              {orders.length === 0 ? 'No orders yet — add your first one above.' : 'No orders with that status.'}
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[600px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="bg-black/[0.02]">
                    <th className={`${HEAD} pl-5 text-left`}>Order</th>
                    <th className={`${HEAD} text-left`}>Customer</th>
                    <th className={`${HEAD} text-right`}>Total</th>
                    <th className={`${HEAD} text-left`}>Status</th>
                    <th className={`${HEAD} pr-5 text-left`}>Fund</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((order) => {
                    const effect = fundEffect(order.status, order.postingRule)
                    const isSelected = order.id === selected?.id
                    return (
                      <tr
                        key={order.id}
                        onClick={() => select(order.id)}
                        className={`cursor-pointer border-b border-paper-line last:border-b-0 ${
                          isSelected ? 'bg-stamp-soft' : 'hover:bg-black/[0.02]'
                        }`}
                      >
                        <td className="py-3 pr-3 pl-5">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation()
                              select(order.id)
                            }}
                            aria-pressed={isSelected}
                            className="rounded-[4px] font-semibold text-ink"
                          >
                            {order.displayNumber}
                          </button>
                          <div className="text-[12.5px] text-ink-soft">
                            {formatDate(order.orderDate)}
                            {order.items ? ` · ${order.items.split('\n')[0].slice(0, 40)}` : ''}
                          </div>
                        </td>
                        <td className="px-3 py-3">{order.customerName}</td>
                        <td
                          className={`tabular px-3 py-3 text-right ${
                            order.status === 'CANCELLED' || order.status === 'RETURNED' ? 'text-ink-soft' : ''
                          }`}
                        >
                          {formatMoney(order.total, currency)}
                        </td>
                        <td className="px-3 py-3">
                          <OrderStatusBadge status={order.status} />
                        </td>
                        <td
                          className={`py-3 pr-5 pl-3 ${
                            effect.tone === 'in' ? 'font-semibold text-green' : effect.tone === 'out' ? 'font-semibold text-rust' : 'text-ink-soft'
                          }`}
                        >
                          {effect.text}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {selected ? (
          <OrderDetailPanel
            key={selected.id}
            businessId={businessId}
            order={selected}
            accountName={accountName(selected.accountId)}
            currency={currency}
            onEdit={() => {
              setEditing(selected)
              setShowForm(true)
            }}
            onDeleted={() => select(null)}
          />
        ) : (
          <p className="rounded-ledger border border-dashed border-paper-line px-5 py-8 text-sm text-ink-soft">
            Pick an order to see its details.
          </p>
        )}
      </div>

      {showForm && (
        <OrderForm
          businessId={businessId}
          accounts={accounts ?? []}
          currency={currency}
          order={editing}
          onSaved={(saved) => {
            closeForm()
            select(saved.id)
          }}
          onClose={closeForm}
        />
      )}
    </>
  )
}
