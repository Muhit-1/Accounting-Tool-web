import type { CashFlowPoint } from '../components/dashboard/CashFlowChart'

interface TxLike {
  date: string
  type: 'INCOME' | 'EXPENSE' | null
  amount: number
}

const MONTH_LABEL = new Intl.DateTimeFormat('en-GB', { month: 'short' })

export function monthlyCashFlow(transactions: TxLike[], monthsBack = 6): CashFlowPoint[] {
  const now = new Date()
  const buckets: CashFlowPoint[] = []
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    buckets.push({ label: MONTH_LABEL.format(d), income: 0, expense: 0 })
  }

  const startOfWindow = new Date(now.getFullYear(), now.getMonth() - (monthsBack - 1), 1)

  for (const tx of transactions) {
    const date = new Date(tx.date)
    if (date < startOfWindow) continue
    const monthsAgo = (now.getFullYear() - date.getFullYear()) * 12 + (now.getMonth() - date.getMonth())
    const index = monthsBack - 1 - monthsAgo
    if (index < 0 || index >= buckets.length) continue
    if (tx.type === 'INCOME') buckets[index].income += tx.amount
    else if (tx.type === 'EXPENSE') buckets[index].expense += tx.amount
  }

  return buckets
}

export function monthOverMonthDelta(buckets: CashFlowPoint[]): { tone: 'up' | 'down'; label: string } | undefined {
  if (buckets.length < 2) return undefined
  const current = buckets[buckets.length - 1]
  const previous = buckets[buckets.length - 2]
  const currentNet = current.income - current.expense
  const previousNet = previous.income - previous.expense
  if (previousNet === 0) return undefined
  const change = ((currentNet - previousNet) / Math.abs(previousNet)) * 100
  return {
    tone: change >= 0 ? 'up' : 'down',
    label: `${Math.abs(change).toFixed(1)}% vs last month`,
  }
}
