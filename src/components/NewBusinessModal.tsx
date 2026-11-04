import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useBusinessTemplates, useCreateBusiness, useCreateFromBusinessTemplate } from '../lib/businesses'
import { ApiError } from '../lib/api-client'
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS } from '../lib/currencies'
import { TextField } from './TextField'
import { Select } from './Select'
import { Button } from './Button'

// Start a business: pick what it is (blank, online shop, freelancer …), name it, choose the money. A template
// makes the tables for you; they are ordinary tables afterwards.
export function NewBusinessModal({ onClose, templateKey = 'blank' }: { onClose: () => void; templateKey?: string }) {
  const navigate = useNavigate()
  const createBlank = useCreateBusiness()
  const createFromTemplate = useCreateFromBusinessTemplate()
  const { data: templates } = useBusinessTemplates()
  const [key, setKey] = useState(templateKey)
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('BDT')
  const [country, setCountry] = useState('BD')
  const [error, setError] = useState<string | null>(null)
  const pending = createBlank.isPending || createFromTemplate.isPending
  const chosen = templates?.find((t) => t.key === key)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const business =
        key === 'blank' || !templates ? await createBlank.mutateAsync({ name, currency, country }) : await createFromTemplate.mutateAsync({ key, name, currency, country })
      onClose()
      navigate(`/businesses/${business.id}/workspace`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={onClose}>
      <div role="dialog" aria-modal="true" aria-label="New business" className="w-full max-w-md rounded-[14px] border border-paper-line bg-white p-7 shadow-lg" onClick={(e) => e.stopPropagation()}>
        <h2 className="mb-5 font-display text-xl font-bold">New business</h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          {templates && templates.length > 0 && (
            <div>
              <Select label="Start from" name="template" value={key} onChange={(event) => setKey(event.target.value)}>
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.name}
                  </option>
                ))}
              </Select>
              {chosen && (
                <p className="mt-1.5 text-[12.5px] text-ink-soft">
                  {chosen.description}
                  {chosen.tables.length > 0 && <> Tables: {chosen.tables.join(', ')}.</>}
                </p>
              )}
            </div>
          )}
          <TextField label="Name" name="name" required autoFocus placeholder="e.g. Shopnojhuri" value={name} onChange={(event) => setName(event.target.value)} />
          <div className="grid grid-cols-2 gap-3">
            <Select label="Currency" name="currency" required value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code}
                </option>
              ))}
            </Select>
            <Select label="Country" name="country" value={country} onChange={(event) => setCountry(event.target.value)}>
              {COUNTRY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
          {error && <p className="text-sm text-rust">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? 'Creating…' : 'Create business'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
