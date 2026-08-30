import { useRef, useState, type FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useBusiness, useDeleteBusiness, useUpdateBusiness } from '../lib/businesses'
import { ApiError } from '../lib/api-client'
import { CURRENCY_OPTIONS } from '../lib/currencies'
import type { Business } from '../types/api'
import { TextField } from '../components/TextField'
import { Textarea } from '../components/Textarea'
import { Select } from '../components/Select'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { ConfirmDialog } from '../components/ConfirmDialog'

const MAX_LOGO_BYTES = 500 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

export function BusinessSettingsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business, isLoading } = useBusiness(businessId)

  if (!businessId) return null

  return (
    <>
      <Link to={`/businesses/${businessId}`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to dashboard
      </Link>

      <div className="mb-6">
        <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
        <h1 className="font-display text-[28px] font-medium tracking-tight">Business settings</h1>
      </div>

      {isLoading || !business ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <BusinessSettingsForm businessId={businessId} business={business} />
      )}
    </>
  )
}

function BusinessSettingsForm({ businessId, business }: { businessId: string; business: Business }) {
  const navigate = useNavigate()
  const updateBusiness = useUpdateBusiness(businessId)
  const deleteBusiness = useDeleteBusiness()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [name, setName] = useState(business.name)
  const [currency, setCurrency] = useState(business.currency)
  const [logoUrl, setLogoUrl] = useState<string | null>(business.logoUrl)
  const [address, setAddress] = useState(business.address ?? '')
  const [contactEmail, setContactEmail] = useState(business.contactEmail ?? '')
  const [website, setWebsite] = useState(business.website ?? '')
  const [bankAccountName, setBankAccountName] = useState(business.bankAccountName ?? '')
  const [bankAccountNumber, setBankAccountNumber] = useState(business.bankAccountNumber ?? '')
  const [bankRoutingNumber, setBankRoutingNumber] = useState(business.bankRoutingNumber ?? '')
  const [bankSwiftCode, setBankSwiftCode] = useState(business.bankSwiftCode ?? '')
  const [bankBranch, setBankBranch] = useState(business.bankBranch ?? '')
  const [defaultTerms, setDefaultTerms] = useState(business.defaultTerms ?? '')

  const [logoError, setLogoError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  async function handleLogoChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setLogoError(null)
    if (!file.type.startsWith('image/')) {
      setLogoError('Please choose an image file.')
      return
    }
    if (file.size > MAX_LOGO_BYTES) {
      setLogoError('That image is too large — please use one under 500KB.')
      return
    }
    setLogoUrl(await readFileAsDataUrl(file))
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSaveError(null)
    setSaved(false)
    try {
      await updateBusiness.mutateAsync({
        name,
        currency,
        logoUrl,
        address: address || null,
        contactEmail: contactEmail || null,
        website: website || null,
        bankAccountName: bankAccountName || null,
        bankAccountNumber: bankAccountNumber || null,
        bankRoutingNumber: bankRoutingNumber || null,
        bankSwiftCode: bankSwiftCode || null,
        bankBranch: bankBranch || null,
        defaultTerms: defaultTerms || null,
      })
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
  }

  async function handleDelete() {
    await deleteBusiness.mutateAsync(businessId)
    navigate('/')
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <form onSubmit={handleSubmit}>
        <Panel title="Profile">
          <div className="flex flex-col gap-4 px-5 py-5">
            <div className="flex items-center gap-4">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Business logo"
                  className="h-16 w-16 rounded-ledger border border-paper-line bg-white/60 object-contain"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-ledger border border-dashed border-paper-line text-xs text-ink-soft">
                  No logo
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <div className="flex gap-3">
                  <Button type="button" variant="ghost" onClick={() => fileInputRef.current?.click()}>
                    {logoUrl ? 'Change logo' : 'Upload logo'}
                  </Button>
                  {logoUrl && (
                    <Button type="button" variant="ghost" onClick={() => setLogoUrl(null)}>
                      Remove
                    </Button>
                  )}
                </div>
                <span className="text-xs text-ink-soft">Shown on invoices. Image files under 500KB.</span>
                {logoError && <span className="text-xs text-rust">{logoError}</span>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>

            <TextField label="Name" required value={name} onChange={(event) => setName(event.target.value)} />
            <Select label="Currency" required value={currency} onChange={(event) => setCurrency(event.target.value)}>
              {CURRENCY_OPTIONS.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.label}
                </option>
              ))}
            </Select>
            <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
            <TextField
              label="Contact email"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
            <TextField label="Website" value={website} onChange={(event) => setWebsite(event.target.value)} />
            <Textarea
              label="Default terms & conditions"
              placeholder="Shown on every invoice unless overridden"
              value={defaultTerms}
              onChange={(event) => setDefaultTerms(event.target.value)}
            />
          </div>
        </Panel>

        <div className="mt-5">
          <Panel title="Payment details">
            <div className="flex flex-col gap-4 px-5 py-5">
              <p className="-mt-1 text-[13px] text-ink-soft">Shown on invoices so clients know where to send payment.</p>
              <TextField
                label="Account name"
                value={bankAccountName}
                onChange={(event) => setBankAccountName(event.target.value)}
              />
              <TextField
                label="Account number"
                value={bankAccountNumber}
                onChange={(event) => setBankAccountNumber(event.target.value)}
              />
              <div className="grid grid-cols-2 gap-4">
                <TextField
                  label="Routing number"
                  value={bankRoutingNumber}
                  onChange={(event) => setBankRoutingNumber(event.target.value)}
                />
                <TextField label="SWIFT code" value={bankSwiftCode} onChange={(event) => setBankSwiftCode(event.target.value)} />
              </div>
              <TextField label="Branch" value={bankBranch} onChange={(event) => setBankBranch(event.target.value)} />
            </div>
          </Panel>
        </div>

        <div className="mt-5 flex items-center gap-4">
          <Button type="submit" disabled={updateBusiness.isPending}>
            {updateBusiness.isPending ? 'Saving…' : 'Save changes'}
          </Button>
          {saved && <span className="text-sm text-green">Saved.</span>}
          {saveError && <span className="text-sm text-rust">{saveError}</span>}
        </div>
      </form>

      <Panel title="Danger zone">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="font-medium">Delete this venture</div>
            <div className="text-[13px] text-ink-soft">
              Removes every ledger, transaction, client, and invoice for this venture. This cannot be undone.
            </div>
          </div>
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            Delete venture
          </Button>
        </div>
      </Panel>

      {confirmingDelete && (
        <ConfirmDialog
          title="Delete this venture?"
          body="Every ledger, transaction, client, and invoice for this venture will be permanently removed."
          confirmLabel="Delete venture"
          isPending={deleteBusiness.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
