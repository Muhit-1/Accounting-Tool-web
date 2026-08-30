export interface CurrencyOption {
  code: string
  label: string
}

export const CURRENCY_OPTIONS: CurrencyOption[] = [
  { code: 'BDT', label: 'BDT — Bangladeshi Taka' },
  { code: 'USD', label: 'USD — US Dollar' },
  { code: 'EUR', label: 'EUR — Euro' },
  { code: 'CNY', label: 'CNY — Chinese Yuan' },
]
