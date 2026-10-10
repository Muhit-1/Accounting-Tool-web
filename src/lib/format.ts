export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

// One formatted amount per currency, for totals across businesses. Different
// currencies are listed side by side, never added (no rate source is agreed).
export function formatPerCurrency(
  totals: { currency: string; totalIncome: number; totalExpense: number; balance: number }[],
  field: 'totalIncome' | 'totalExpense' | 'balance',
): string[] {
  return totals.map((t) => formatMoney(t[field], t.currency))
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(date))
}

export function daysUntil(date: string | Date): number {
  const diffMs = new Date(date).getTime() - Date.now()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}
