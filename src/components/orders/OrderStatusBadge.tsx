import { ORDER_STATUS_LABEL, type OrderStatus } from '../../lib/order-status'

const STYLE: Record<OrderStatus, string> = {
  NEW: 'border border-paper-line bg-paper text-ink-soft',
  CONFIRMED: 'bg-stamp-soft text-stamp',
  SHIPPED: 'bg-stamp text-white',
  DELIVERED: 'bg-green-soft text-green',
  CANCELLED: 'bg-rust-soft text-rust',
  RETURNED: 'bg-brass-soft text-brass',
}

export function OrderStatusBadge({ status }: { status: OrderStatus }) {
  return (
    <span className={`inline-block rounded-full px-2.5 py-px text-[12px] font-semibold ${STYLE[status]}`}>
      {ORDER_STATUS_LABEL[status]}
    </span>
  )
}
