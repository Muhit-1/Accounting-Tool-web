// What each built-in table writes to an exported file from Settings → Data:
// all its rows and every column, values only (numbers stay numbers).
import { formatDateCell } from './grid-parse'
import { ORDER_STATUS_LABEL, POSTING_RULE_LABEL } from './order-status'
import type { ExportCell } from './export-table'
import type { CostItem, Order, Transaction } from '../types/api'

export interface ExportSheet {
  name: string
  headers: string[]
  rows: ExportCell[][]
}

export function cashbookExport(name: string, transactions: Transaction[]): ExportSheet {
  return {
    name,
    headers: ['Date', 'Description', 'Category', 'Money in', 'Money out', 'Balance', 'Proof link'],
    rows: transactions.map((tx) => [
      formatDateCell(tx.date),
      tx.memo ?? '',
      tx.category?.name ?? '',
      tx.type === 'INCOME' ? tx.amount : null,
      tx.type === 'EXPENSE' ? tx.amount : null,
      tx.runningBalance ?? null,
      tx.proofUrl ?? '',
    ]),
  }
}

export function ordersExport(name: string, orders: Order[]): ExportSheet {
  return {
    name,
    headers: ['Order no.', 'Order date', 'Customer', 'Phone', 'Email', 'Address', 'Items', 'Subtotal', 'Delivery', 'Discount', 'Total', 'Payment', 'Status', 'Fund treatment', 'Delivered on', 'Notes'],
    rows: [...orders]
      .sort((a, b) => a.number - b.number)
      .map((order) => [
        order.displayNumber,
        formatDateCell(order.orderDate),
        order.customerName,
        order.customerPhone ?? '',
        order.customerEmail ?? '',
        order.customerAddress ?? '',
        order.items ?? '',
        order.subtotal,
        order.deliveryCharge,
        order.discount,
        order.total,
        order.paymentMethod ?? '',
        ORDER_STATUS_LABEL[order.status],
        POSTING_RULE_LABEL[order.postingRule],
        formatDateCell(order.deliveryDate),
        order.notes ?? '',
      ]),
  }
}

export function costsExport(name: string, costs: CostItem[]): ExportSheet {
  return {
    name,
    headers: ['#', 'Group', 'Item', 'Monthly rate', 'Months', 'One-time', 'Total', 'Paid by', 'Status', 'Paid on', 'Notes'],
    rows: costs.map((cost) => [
      cost.number,
      cost.groupName,
      cost.item,
      cost.monthlyRate,
      cost.months,
      cost.oneTime,
      cost.total,
      cost.paidFrom === 'PARTNER' ? (cost.partnerName ?? '') : cost.paidFrom === 'BUSINESS' ? 'Business money' : 'Not paid yet',
      cost.status === 'PAID' ? 'Paid' : 'Due',
      formatDateCell(cost.paidOn),
      cost.notes ?? '',
    ]),
  }
}
