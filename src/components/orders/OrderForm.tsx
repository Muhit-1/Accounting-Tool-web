import { useState, type FormEvent } from 'react'
import { ApiError } from '../../lib/api-client'
import { formatAmount } from '../../lib/format'
import { POSTING_RULE_LABEL, isOrderFinal, orderTotal, type OrderPostingRule } from '../../lib/order-status'
import { useCreateOrder, useUpdateOrder, type OrderInput } from '../../lib/orders'
import type { Account, Order } from '../../types/api'
import { Button } from '../Button'
import { Select } from '../Select'
import { TextField } from '../TextField'
import { Textarea } from '../Textarea'

const PAYMENT_METHODS = ['Cash on delivery', 'bKash', 'Nagad', 'Bank transfer', 'Card']

const money = (text: string) => (text.trim() === '' ? 0 : Number(text))

// New order, or edit one. Status is not here: an order moves through its
// steps from the side panel. The total is shown as it will be saved, but the
// server always works it out itself.
export function OrderForm({
  businessId,
  accounts,
  currency,
  order,
  defaultAccountId,
  onSaved,
  onClose,
}: {
  businessId: string
  accounts: Account[]
  currency: string
  order?: Order
  defaultAccountId?: string
  onSaved: (order: { id: string }) => void
  onClose: () => void
}) {
  const isEdit = Boolean(order)
  const createOrder = useCreateOrder(businessId)
  const updateOrder = useUpdateOrder(businessId)

  const [customerName, setCustomerName] = useState(order?.customerName ?? '')
  const [customerPhone, setCustomerPhone] = useState(order?.customerPhone ?? '')
  const [customerEmail, setCustomerEmail] = useState(order?.customerEmail ?? '')
  const [customerAddress, setCustomerAddress] = useState(order?.customerAddress ?? '')
  const [items, setItems] = useState(order?.items ?? '')
  const [orderDate, setOrderDate] = useState(order ? order.orderDate.slice(0, 10) : new Date().toISOString().slice(0, 10))
  const [subtotal, setSubtotal] = useState(order ? String(order.subtotal) : '')
  const [deliveryCharge, setDeliveryCharge] = useState(order ? String(order.deliveryCharge) : '0')
  const [discount, setDiscount] = useState(order ? String(order.discount) : '0')
  const [paymentMethod, setPaymentMethod] = useState(order?.paymentMethod ?? '')
  const [accountId, setAccountId] = useState(order?.accountId ?? defaultAccountId ?? accounts[0]?.id ?? '')
  const [postingRule, setPostingRule] = useState<OrderPostingRule>(order?.postingRule ?? 'MONEY_IN')
  const [deliveryDate, setDeliveryDate] = useState(order?.deliveryDate ? order.deliveryDate.slice(0, 10) : '')
  const [notes, setNotes] = useState(order?.notes ?? '')
  const [error, setError] = useState<string | null>(null)

  const total = orderTotal(money(subtotal), money(deliveryCharge), money(discount))
  const discountTooBig = total === null
  const isPending = createOrder.isPending || updateOrder.isPending
  const delivered = Boolean(order?.transactionId)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (discountTooBig) return
    const input: OrderInput = {
      accountId,
      orderDate,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim() || null,
      customerEmail: customerEmail.trim() || null,
      customerAddress: customerAddress.trim() || null,
      items: items.trim() || null,
      subtotal: money(subtotal),
      deliveryCharge: money(deliveryCharge),
      discount: money(discount),
      paymentMethod: paymentMethod.trim() || null,
      postingRule,
      deliveryDate: deliveryDate || null,
      notes: notes.trim() || null,
    }
    try {
      const saved =
        isEdit && order ? await updateOrder.mutateAsync({ id: order.id, ...input }) : await createOrder.mutateAsync(input)
      onSaved(saved)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/20" onClick={onClose}>
      <div className="flex min-h-full items-center justify-center px-4 py-6">
        <div
          role="dialog"
          aria-modal="true"
          aria-label={isEdit ? 'Edit order' : 'New order'}
          className="w-full max-w-lg rounded-ledger border border-paper-line bg-white p-7 shadow-lg"
          onClick={(event) => event.stopPropagation()}
        >
          <h2 className="mb-5 font-display text-xl font-bold">{isEdit ? `Edit order ${order?.displayNumber}` : 'New order'}</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <TextField
              label="Customer"
              required
              autoFocus
              maxLength={120}
              value={customerName}
              onChange={(event) => setCustomerName(event.target.value)}
            />
            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Phone"
                type="tel"
                inputMode="tel"
                maxLength={30}
                className="min-w-0"
                value={customerPhone}
                onChange={(event) => setCustomerPhone(event.target.value)}
              />
              <TextField
                label="Email"
                type="email"
                maxLength={254}
                className="min-w-0"
                value={customerEmail}
                onChange={(event) => setCustomerEmail(event.target.value)}
              />
            </div>
            <Textarea
              label="Address"
              rows={2}
              maxLength={500}
              value={customerAddress}
              onChange={(event) => setCustomerAddress(event.target.value)}
            />
            <Textarea
              label="Items"
              rows={2}
              maxLength={2000}
              placeholder="e.g. Wooden puzzle × 1"
              value={items}
              onChange={(event) => setItems(event.target.value)}
            />

            <div className="grid grid-cols-2 gap-3">
              <TextField
                label="Order date"
                type="date"
                required
                className="min-w-0"
                value={orderDate}
                onChange={(event) => setOrderDate(event.target.value)}
              />
              <TextField
                label="Payment method"
                list="order-payment-methods"
                maxLength={60}
                autoComplete="off"
                className="min-w-0"
                value={paymentMethod}
                onChange={(event) => setPaymentMethod(event.target.value)}
              />
              <datalist id="order-payment-methods">
                {PAYMENT_METHODS.map((method) => (
                  <option key={method} value={method} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <TextField
                label="Subtotal"
                type="number"
                step="0.01"
                min="0"
                required
                className="min-w-0"
                value={subtotal}
                onChange={(event) => setSubtotal(event.target.value)}
              />
              <TextField
                label="Delivery"
                type="number"
                step="0.01"
                min="0"
                className="min-w-0"
                value={deliveryCharge}
                onChange={(event) => setDeliveryCharge(event.target.value)}
              />
              <TextField
                label="Discount"
                type="number"
                step="0.01"
                min="0"
                className="min-w-0"
                value={discount}
                onChange={(event) => setDiscount(event.target.value)}
              />
            </div>
            <div className="flex items-center justify-between rounded-ledger border border-stamp/30 bg-stamp-soft px-3.5 py-3">
              <span className="text-[13.5px] font-bold">
                Order total
                <span className="ml-2 rounded-full bg-stamp/15 px-1.5 py-px text-[10px] font-bold tracking-wider text-ink">AUTO</span>
              </span>
              <span className="tabular text-[16px] font-medium" aria-live="polite">
                {total === null ? '—' : `${currency} ${formatAmount(total)}`}
              </span>
            </div>
            {discountTooBig && (
              <p className="-mt-2 text-sm text-rust" role="alert">
                The discount is bigger than the subtotal plus delivery.
              </p>
            )}

            <div className="grid grid-cols-2 gap-3">
              <Select
                label="Fund account"
                className="min-w-0"
                value={accountId}
                onChange={(event) => setAccountId(event.target.value)}
              >
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name}
                  </option>
                ))}
              </Select>
              <Select
                label="Fund treatment"
                className="min-w-0"
                value={postingRule}
                onChange={(event) => setPostingRule(event.target.value as OrderPostingRule)}
              >
                {(Object.keys(POSTING_RULE_LABEL) as OrderPostingRule[]).map((rule) => (
                  <option key={rule} value={rule}>
                    {POSTING_RULE_LABEL[rule]}
                  </option>
                ))}
              </Select>
            </div>
            <TextField
              label="Delivery date"
              type="date"
              value={deliveryDate}
              onChange={(event) => setDeliveryDate(event.target.value)}
            />
            <Textarea label="Notes" rows={2} maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />

            {delivered && (
              <p className="text-[13px] text-ink-soft">
                This order is in the Cash book. Changing its total, account, treatment or delivery date also updates that entry.
              </p>
            )}
            {order && isOrderFinal(order.status) && (
              <p className="text-sm text-rust">This order is closed and can no longer be changed.</p>
            )}
            {error && (
              <p className="text-sm text-rust" role="alert">
                {error}
              </p>
            )}
            <div className="mt-2 flex justify-end gap-3">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending || discountTooBig || !accountId || Boolean(order && isOrderFinal(order.status))}>
                {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Add order'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
