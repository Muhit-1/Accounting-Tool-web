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

// Countries a business can be in. A phone number gets its leading 0 back only in
// Bangladesh; "Other" (ZZ) keeps numbers as typed. A business made before this
// existed has none set and is treated as Bangladesh.
export const COUNTRY_OPTIONS: { code: string; label: string }[] = [
  { code: 'BD', label: 'Bangladesh' },
  { code: 'IN', label: 'India' },
  { code: 'PK', label: 'Pakistan' },
  { code: 'AE', label: 'United Arab Emirates' },
  { code: 'GB', label: 'United Kingdom' },
  { code: 'US', label: 'United States' },
  { code: 'DE', label: 'Germany' },
  { code: 'CN', label: 'China' },
  { code: 'ZZ', label: 'Other' },
]
