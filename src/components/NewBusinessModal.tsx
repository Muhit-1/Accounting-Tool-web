import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateBusiness } from '../lib/businesses'
import { ApiError } from '../lib/api-client'
import { TextField } from './TextField'
import { Button } from './Button'

export function NewBusinessModal({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate()
  const createBusiness = useCreateBusiness()
  const [name, setName] = useState('')
  const [currency, setCurrency] = useState('BDT')
  const [error, setError] = useState<string | null>(null)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const business = await createBusiness.mutateAsync({ name, currency })
      onClose()
      navigate(`/businesses/${business.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 px-4" onClick={onClose}>
      <div
        className="w-full max-w-sm rounded-ledger border border-paper-line bg-paper p-7 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <h2 className="mb-5 font-display text-xl font-semibold">New business</h2>
        <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
          <TextField
            label="Name"
            name="name"
            required
            autoFocus
            placeholder="e.g. Shopnojhuri"
            value={name}
            onChange={(event) => setName(event.target.value)}
          />
          <TextField
            label="Currency"
            name="currency"
            required
            placeholder="BDT"
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            maxLength={3}
          />
          {error && <p className="text-sm text-rust">{error}</p>}
          <div className="mt-2 flex justify-end gap-3">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={createBusiness.isPending}>
              {createBusiness.isPending ? 'Creating…' : 'Create business'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}
