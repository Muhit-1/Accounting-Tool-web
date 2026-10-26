// What the invoice editor shows next to the form: the invoice as it will print. These are the plain rules behind it,
// kept apart from the screen so they are tested without a browser. They mirror what the server's PDF does.

export interface DraftLine {
  description: string
  quantity: string
  rate: string
}

export interface PreviewLine {
  description: string
  quantity: number
  rate: number
  amount: number
}

// whole cents, so 3 × 33.33 never shows 99.99000000000001
const cents = (n: number) => Math.round(n * 100) / 100

/** Lines worth showing (something typed in them) with their amounts, and the subtotal. */
export function previewLines(lines: DraftLine[]): { lines: PreviewLine[]; subtotal: number } {
  const out: PreviewLine[] = []
  let subtotal = 0
  for (const line of lines) {
    const quantity = Number(line.quantity) || 0
    const rate = Number(line.rate) || 0
    if (line.description.trim() === '' && rate === 0) continue
    const amount = cents(quantity * rate)
    out.push({ description: line.description, quantity, rate, amount })
    subtotal = cents(subtotal + amount)
  }
  return { lines: out, subtotal }
}

export interface PaymentDetails {
  accountName: string
  accountNumber: string
  routingNumber: string
  swiftCode: string
  branch: string
}

export const PAYMENT_LABELS: { key: keyof PaymentDetails; label: string }[] = [
  { key: 'accountName', label: 'A/c name' },
  { key: 'accountNumber', label: 'A/c no' },
  { key: 'routingNumber', label: 'Routing Number' },
  { key: 'swiftCode', label: 'Swift Code' },
  { key: 'branch', label: 'Branch' },
]

/** The payment lines the invoice prints: only the ones that are filled in, as the PDF does. */
export function paymentRows(details: PaymentDetails): { label: string; value: string }[] {
  return PAYMENT_LABELS.map(({ key, label }) => ({ label, value: details[key].trim() })).filter((row) => row.value !== '')
}

export const samePayment = (a: PaymentDetails, b: PaymentDetails) => PAYMENT_LABELS.every(({ key }) => a[key].trim() === b[key].trim())

/** A day plus some days, as YYYY-MM-DD (for "due in 30 days"). An unreadable day gives an empty text. */
export function addDaysIso(day: string, days: number): string {
  const date = new Date(`${day}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return ''
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
