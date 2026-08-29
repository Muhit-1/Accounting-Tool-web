import { useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { useClients } from '../lib/clients'
import { useCreateInvoice } from '../lib/invoices'
import { ApiError } from '../lib/api-client'
import { formatMoney } from '../lib/format'
import { TextField } from '../components/TextField'
import { Select } from '../components/Select'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'

interface LineItemDraft {
  description: string
  quantity: string
  rate: string
}

const EMPTY_ITEM: LineItemDraft = { description: '', quantity: '1', rate: '' }

export function NewInvoicePage() {
  const { businessId } = useParams<{ businessId: string }>()
  const navigate = useNavigate()
  const { data: business } = useBusiness(businessId)
  const { data: clients } = useClients(businessId)
  const createInvoice = useCreateInvoice(businessId ?? '')

  const [clientId, setClientId] = useState('')
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10))
  const [dueDate, setDueDate] = useState('')
  const [terms, setTerms] = useState('Due within 30 days')
  const [items, setItems] = useState<LineItemDraft[]>([{ ...EMPTY_ITEM }])
  const [error, setError] = useState<string | null>(null)

  if (!businessId) return null
  const currency = business?.currency ?? 'BDT'

  function updateItem(index: number, patch: Partial<LineItemDraft>) {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)))
  }

  function addItem() {
    setItems((prev) => [...prev, { ...EMPTY_ITEM }])
  }

  function removeItem(index: number) {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const subtotal = items.reduce((sum, item) => sum + (Number(item.quantity) || 0) * (Number(item.rate) || 0), 0)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    try {
      const invoice = await createInvoice.mutateAsync({
        clientId,
        issueDate,
        dueDate,
        terms,
        items: items.map((item) => ({
          description: item.description,
          quantity: Number(item.quantity),
          rate: Number(item.rate),
        })),
      })
      navigate(`/businesses/${businessId}/invoices/${invoice.id}`)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <>
      <Link to={`/businesses/${businessId}/invoices`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to invoices
      </Link>

      <div className="mb-6">
        <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
        <h1 className="font-display text-[28px] font-medium tracking-tight">New invoice</h1>
      </div>

      {clients && clients.length === 0 ? (
        <Panel title="Add a client first">
          <p className="px-5 py-6 text-sm text-ink-soft">
            You need at least one client before you can create an invoice.{' '}
            <Link to={`/businesses/${businessId}/invoices`} className="text-stamp underline underline-offset-2">
              Add one on the invoices page
            </Link>
            .
          </p>
        </Panel>
      ) : (
        <form onSubmit={handleSubmit} className="max-w-2xl">
          <Panel title="Invoice details">
            <div className="flex flex-col gap-4 px-5 py-5">
              <Select label="Client" required value={clientId} onChange={(event) => setClientId(event.target.value)}>
                <option value="">Select a client</option>
                {clients?.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Issue date"
                  type="date"
                  required
                  value={issueDate}
                  onChange={(event) => setIssueDate(event.target.value)}
                />
                <TextField
                  label="Due date"
                  type="date"
                  required
                  value={dueDate}
                  onChange={(event) => setDueDate(event.target.value)}
                />
              </div>

              <TextField label="Terms" required value={terms} onChange={(event) => setTerms(event.target.value)} />

              <div>
                <div className="mb-2 grid grid-cols-[1fr_70px_100px_28px] gap-2 text-xs font-medium tracking-wider text-ink-soft uppercase">
                  <span>Description</span>
                  <span>Qty</span>
                  <span>Rate</span>
                  <span />
                </div>
                <div className="flex flex-col gap-2">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-[1fr_70px_100px_28px] items-center gap-2">
                      <input
                        required
                        placeholder="Service or product"
                        value={item.description}
                        onChange={(event) => updateItem(index, { description: event.target.value })}
                        className="rounded-ledger border border-paper-line bg-white/40 px-3 py-2 text-[14px] text-ink focus:border-stamp focus:outline-none"
                      />
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        value={item.quantity}
                        onChange={(event) => updateItem(index, { quantity: event.target.value })}
                        className="rounded-ledger border border-paper-line bg-white/40 px-2 py-2 text-[14px] text-ink focus:border-stamp focus:outline-none"
                      />
                      <input
                        required
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={item.rate}
                        onChange={(event) => updateItem(index, { rate: event.target.value })}
                        className="rounded-ledger border border-paper-line bg-white/40 px-2 py-2 text-[14px] text-ink focus:border-stamp focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(index)}
                        disabled={items.length === 1}
                        className="text-ink-soft transition-colors hover:text-rust disabled:opacity-30"
                        aria-label="Remove line"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <button type="button" onClick={addItem} className="mt-2 border-b border-current text-[13px] text-stamp">
                  + Add line
                </button>
              </div>

              <div className="flex justify-end border-t border-paper-line pt-3 text-[15px] font-medium">
                Subtotal&nbsp;&nbsp;<span className="tabular">{formatMoney(subtotal, currency)}</span>
              </div>

              {error && <p className="text-sm text-rust">{error}</p>}
              <Button type="submit" disabled={createInvoice.isPending} className="self-start">
                {createInvoice.isPending ? 'Creating…' : 'Create invoice'}
              </Button>
            </div>
          </Panel>
        </form>
      )}
    </>
  )
}
