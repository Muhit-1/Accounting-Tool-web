import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError } from '../lib/api-client'
import { useAuth } from '../lib/auth-context'
import { useBusiness, useUpdateBusiness } from '../lib/businesses'
import { useClients, useCreateClient } from '../lib/clients'
import { useCreateInvoice, useInvoice, useNextInvoiceNumber, useUpdateInvoice } from '../lib/invoices'
import { addDaysIso, PAYMENT_LABELS, previewLines, samePayment, type DraftLine, type PaymentDetails } from '../lib/invoice-preview'
import { useToast } from '../lib/toast-context'
import type { Business, Client, Invoice } from '../types/api'
import { InvoicePreview } from '../components/invoicing/InvoicePreview'
import { IconPlus } from '../components/icons'

const EMPTY_LINE: DraftLine = { description: '', quantity: '1', rate: '' }
const NEW_CLIENT = '__new'

const inputClass = 'w-full rounded-ledger border border-paper-line bg-white px-3 py-2 text-[14px] text-ink focus:border-stamp focus:outline-none disabled:bg-paper disabled:text-ink-soft'

function linesFromInvoice(items: Invoice['items']): DraftLine[] {
  if (!items || items.length === 0) return [{ ...EMPTY_LINE }]
  return items.map((item) => ({ description: item.description, quantity: String(item.quantity), rate: String(item.rate) }))
}

const paymentOf = (business: Business): PaymentDetails => ({
  accountName: business.bankAccountName ?? '',
  accountNumber: business.bankAccountNumber ?? '',
  routingNumber: business.bankRoutingNumber ?? '',
  swiftCode: business.bankSwiftCode ?? '',
  branch: business.bankBranch ?? '',
})

function Section({ title, aside, children }: { title: string; aside?: ReactNode; children: ReactNode }) {
  return (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wider text-ink-soft uppercase">
        {title}
        {aside}
      </h2>
      {children}
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11.5px] font-semibold text-ink-soft">{label}</span>
      {children}
    </label>
  )
}

export function InvoiceFormPage() {
  const { businessId, invoiceId } = useParams<{ businessId: string; invoiceId?: string }>()
  const isEdit = Boolean(invoiceId)
  const { data: business } = useBusiness(businessId)
  const { data: clients } = useClients(businessId)
  const { data: invoice, isLoading: isInvoiceLoading } = useInvoice(isEdit ? businessId : undefined, invoiceId)
  const { data: nextNumber, isLoading: isNextNumberLoading } = useNextInvoiceNumber(isEdit ? undefined : businessId)

  if (!businessId) return null
  const isReady = Boolean(business) && Boolean(clients) && (isEdit ? !isInvoiceLoading && Boolean(invoice) : !isNextNumberLoading)

  if (!isReady || !business) return <p className="px-6 py-8 text-sm text-ink-soft">Loading…</p>
  return <InvoiceForm key={invoice?.id ?? 'new'} businessId={businessId} business={business} clients={clients ?? []} invoice={invoice} defaultNumber={nextNumber?.number} />
}

// The invoice editor: the form on the left, the invoice itself on the right, redrawn as you type. The payment details
// are the business's own (Settings): changing them here saves them there too, because the PDF takes them from there.
function InvoiceForm({ businessId, business, clients, invoice, defaultNumber }: { businessId: string; business: Business; clients: Client[]; invoice?: Invoice; defaultNumber?: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { user } = useAuth()
  const isEdit = Boolean(invoice)
  const owner = business.ownerId === user?.id
  const createInvoice = useCreateInvoice(businessId)
  const updateInvoice = useUpdateInvoice(businessId)
  const updateBusiness = useUpdateBusiness(businessId)
  const createClient = useCreateClient(businessId)

  const today = new Date().toISOString().slice(0, 10)
  const [clientId, setClientId] = useState(invoice?.clientId ?? '')
  const [addingClient, setAddingClient] = useState(false)
  const [newClient, setNewClient] = useState({ name: '', address: '', email: '' })
  const [clientError, setClientError] = useState<string | null>(null)
  const [number, setNumber] = useState(invoice?.number ?? defaultNumber ?? '')
  const [issueDate, setIssueDate] = useState(invoice ? invoice.issueDate.slice(0, 10) : today)
  const [dueDate, setDueDate] = useState(invoice ? invoice.dueDate.slice(0, 10) : addDaysIso(today, 30))
  const [terms, setTerms] = useState(invoice?.terms ?? business.defaultTerms ?? 'Due within 30 days')
  const [lines, setLines] = useState<DraftLine[]>(linesFromInvoice(invoice?.items))
  const saved = useMemo(() => paymentOf(business), [business])
  const [payment, setPayment] = useState<PaymentDetails>(saved)
  const [error, setError] = useState<string | null>(null)

  const client = clients.find((c) => c.id === clientId) ?? null
  const { lines: shownLines, subtotal } = previewLines(lines)
  const paymentChanged = !samePayment(payment, saved)
  const isPending = createInvoice.isPending || updateInvoice.isPending || updateBusiness.isPending

  const setLine = (index: number, patch: Partial<DraftLine>) => setLines((prev) => prev.map((line, i) => (i === index ? { ...line, ...patch } : line)))

  async function saveClient() {
    setClientError(null)
    if (newClient.name.trim() === '' || newClient.address.trim() === '') {
      setClientError('A client needs a name and an address.')
      return
    }
    try {
      const made = await createClient.mutateAsync({ name: newClient.name.trim(), address: newClient.address.trim(), email: newClient.email.trim() || undefined })
      setClientId(made.id)
      setAddingClient(false)
      setNewClient({ name: '', address: '', email: '' })
      toast(`“${made.name}” added and chosen.`)
    } catch (err) {
      setClientError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    if (!clientId) {
      setError('Choose a client, or add one, first.')
      return
    }
    const payload = {
      clientId,
      number: number || undefined,
      issueDate,
      dueDate,
      terms,
      items: lines.map((line) => ({ description: line.description, quantity: Number(line.quantity), rate: Number(line.rate) })),
    }
    try {
      if (owner && paymentChanged) {
        await updateBusiness.mutateAsync({
          bankAccountName: payment.accountName.trim() || null,
          bankAccountNumber: payment.accountNumber.trim() || null,
          bankRoutingNumber: payment.routingNumber.trim() || null,
          bankSwiftCode: payment.swiftCode.trim() || null,
          bankBranch: payment.branch.trim() || null,
        })
      }
      if (isEdit && invoice) {
        await updateInvoice.mutateAsync({ id: invoice.id, ...payload })
        navigate(`/businesses/${businessId}/invoices/${invoice.id}`)
      } else {
        const created = await createInvoice.mutateAsync(payload)
        navigate(`/businesses/${businessId}/invoices/${created.id}`)
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  return (
    <form onSubmit={handleSubmit} id="invoice-form">
      <div className="sticky top-0 z-30 flex flex-wrap items-center gap-3 border-b border-paper-line bg-white px-5 py-2.5">
        <Link to={`/businesses/${businessId}/invoices`} className="text-[13.5px] font-semibold text-stamp hover:underline">
          ← Invoices
        </Link>
        <b className="text-[14.5px]">
          {isEdit ? 'Edit invoice' : 'New invoice'} <span className="font-medium text-ink-soft">#{number || '…'} · Draft</span>
        </b>
        <span className="flex-1" />
        {error && (
          <span role="alert" className="text-[13px] text-rust">
            {error}
          </span>
        )}
        <button
          type="submit"
          disabled={isPending}
          className="rounded-ledger bg-stamp px-4 py-2 text-[13.5px] font-semibold text-white hover:bg-stamp/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPending ? 'Saving…' : isEdit ? 'Save changes' : 'Create invoice'}
        </button>
      </div>

      <div className="grid items-start lg:grid-cols-[minmax(380px,520px)_minmax(0,1fr)]">
        <div className="border-paper-line px-5 py-5 pb-16 lg:min-h-[calc(100vh-104px)] lg:border-r">
          <Section title="Client">
            {addingClient ? (
              <div className="rounded-ledger border border-paper-line bg-paper p-3.5">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="sm:col-span-2">
                    <Field label="Name">
                      <input autoFocus className={inputClass} placeholder="Client or company" value={newClient.name} onChange={(event) => setNewClient({ ...newClient, name: event.target.value })} maxLength={200} />
                    </Field>
                  </div>
                  <Field label="Email (optional)">
                    <input type="email" className={inputClass} placeholder="name@example.com" value={newClient.email} onChange={(event) => setNewClient({ ...newClient, email: event.target.value })} maxLength={254} />
                  </Field>
                  <Field label="Address">
                    <input className={inputClass} value={newClient.address} onChange={(event) => setNewClient({ ...newClient, address: event.target.value })} maxLength={500} />
                  </Field>
                </div>
                {clientError && <p className="mt-2 text-[13px] text-rust">{clientError}</p>}
                <div className="mt-3 flex justify-end gap-2">
                  <button type="button" onClick={() => setAddingClient(false)} className="rounded-ledger border border-paper-line bg-white px-3 py-1.5 text-[13px] font-semibold hover:bg-stamp-soft">
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={createClient.isPending}
                    onClick={() => void saveClient()}
                    className="rounded-ledger bg-stamp px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-stamp/90 disabled:opacity-50"
                  >
                    Save client
                  </button>
                </div>
              </div>
            ) : clients.length === 0 ? (
              <div className="flex items-center gap-3 rounded-ledger border-[1.5px] border-dashed border-stamp bg-stamp-soft p-3.5">
                <p className="flex-1 text-[13.5px]">
                  <b>No clients yet.</b>
                  <br />
                  <span className="text-ink-soft">Add the person or company you are billing. It is saved for next time.</span>
                </p>
                <button
                  type="button"
                  onClick={() => setAddingClient(true)}
                  className="inline-flex items-center gap-1.5 rounded-ledger bg-stamp px-3.5 py-2 text-[13.5px] font-semibold text-white hover:bg-stamp/90"
                >
                  <IconPlus width={15} height={15} />
                  Add client
                </button>
              </div>
            ) : (
              <select
                required
                aria-label="Client"
                className={inputClass}
                value={clientId}
                onChange={(event) => {
                  if (event.target.value === NEW_CLIENT) setAddingClient(true)
                  else setClientId(event.target.value)
                }}
              >
                <option value="">Choose a client…</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
                <option value={NEW_CLIENT}>＋ Add a new client…</option>
              </select>
            )}
          </Section>

          <Section title="Details">
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Invoice number">
                <input required className={inputClass} placeholder="Auto-assigned unless you set one" value={number} onChange={(event) => setNumber(event.target.value)} />
              </Field>
              <Field label="Terms">
                <input required className={inputClass} value={terms} onChange={(event) => setTerms(event.target.value)} />
              </Field>
              <Field label="Issue date">
                <input
                  required
                  type="date"
                  className={inputClass}
                  value={issueDate}
                  onChange={(event) => {
                    setIssueDate(event.target.value)
                    // a new invoice follows its issue date: due 30 days later, until the person sets a due date themselves
                    if (!isEdit && dueDate === addDaysIso(issueDate, 30)) setDueDate(addDaysIso(event.target.value, 30))
                  }}
                />
              </Field>
              <Field label="Due date">
                <input required type="date" className={inputClass} value={dueDate} onChange={(event) => setDueDate(event.target.value)} />
              </Field>
            </div>
          </Section>

          <Section title="Items">
            <div className="grid grid-cols-[1fr_64px_96px_24px] items-center gap-2">
              <span className="text-[11.5px] text-ink-soft">Description</span>
              <span className="text-[11.5px] text-ink-soft">Qty</span>
              <span className="text-[11.5px] text-ink-soft">Rate</span>
              <span />
              {lines.map((line, index) => (
                <div key={index} className="contents">
                  <input required aria-label={`Line ${index + 1} description`} className={inputClass} placeholder="Service or product" value={line.description} onChange={(event) => setLine(index, { description: event.target.value })} />
                  <input required aria-label={`Line ${index + 1} quantity`} type="number" min="0.01" step="0.01" className={`${inputClass} px-2`} value={line.quantity} onChange={(event) => setLine(index, { quantity: event.target.value })} />
                  <input required aria-label={`Line ${index + 1} rate`} type="number" min="0.01" step="0.01" placeholder="0.00" className={`${inputClass} px-2`} value={line.rate} onChange={(event) => setLine(index, { rate: event.target.value })} />
                  <button
                    type="button"
                    aria-label="Remove line"
                    disabled={lines.length === 1}
                    onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
                    className="text-ink-soft hover:text-rust disabled:opacity-30"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])} className="mt-2 inline-flex items-center gap-1.5 text-[13px] font-bold text-stamp hover:underline">
              <IconPlus width={14} height={14} />
              Add a line
            </button>
          </Section>

          <Section
            title="Payment details"
            aside={
              <>
                <span className="rounded-full bg-stamp-soft px-2 py-px text-[10.5px] font-bold tracking-normal text-stamp normal-case">From your business settings</span>
                <Link to={`/businesses/${businessId}/settings`} className="ml-auto text-xs font-semibold tracking-normal text-stamp normal-case underline">
                  Open Settings
                </Link>
              </>
            }
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {PAYMENT_LABELS.map(({ key, label }) => (
                <div key={key} className={key === 'branch' ? 'sm:col-span-2' : undefined}>
                  <Field label={label}>
                    <input className={inputClass} disabled={!owner} value={payment[key]} onChange={(event) => setPayment({ ...payment, [key]: event.target.value })} maxLength={100} />
                  </Field>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[12.5px] text-ink-soft">
              {owner ? (paymentChanged ? 'These changes are saved to your business details when you save this invoice.' : 'Shown on every invoice. Change them here or in Settings, they are the same details.') : 'Only the owner of the business can change these. They are set in Settings.'}
            </p>
          </Section>
        </div>

        <div className="bg-paper px-5 py-5 lg:sticky lg:top-[52px] lg:h-[calc(100vh-52px)] lg:overflow-auto">
          <InvoicePreview
            business={business}
            client={client}
            number={number}
            issueDate={issueDate}
            dueDate={dueDate}
            terms={terms}
            items={shownLines}
            subtotal={subtotal}
            currency={business.currency}
            payment={payment}
          />
        </div>
      </div>
    </form>
  )
}
