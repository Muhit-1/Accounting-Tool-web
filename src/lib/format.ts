export function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(amount)
  } catch {
    return `${currency} ${amount.toFixed(2)}`
  }
}

export function formatShortDate(date: string | Date): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short' }).format(new Date(date))
}

export function daysUntil(date: string | Date): number {
  const diffMs = new Date(date).getTime() - Date.now()
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24))
}
