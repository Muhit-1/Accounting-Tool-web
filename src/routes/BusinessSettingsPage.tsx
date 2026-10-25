import { useRef, useState, type FormEvent } from 'react'
import { Link, useParams, useSearchParams } from 'react-router-dom'
import { useBusiness, useUpdateBusiness } from '../lib/businesses'
import { ApiError } from '../lib/api-client'
import { COUNTRY_OPTIONS, CURRENCY_OPTIONS } from '../lib/currencies'
import type { Business } from '../types/api'
import { TextField } from '../components/TextField'
import { Textarea } from '../components/Textarea'
import { Select } from '../components/Select'
import { Button } from '../components/Button'
import { Panel } from '../components/Panel'
import { DataPanel } from '../components/settings/DataPanel'
import { PartnersPanel } from '../components/settings/PartnersPanel'
import { ActivityList } from '../components/trust/ActivityList'
import { PeriodLockPanel } from '../components/trust/PeriodLockPanel'
import { TrashPanel } from '../components/trust/TrashPanel'

const MAX_LOGO_BYTES = 500 * 1024

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

const TABS = [
  { id: 'general', label: 'General' },
  { id: 'partners', label: 'Partners' },
  { id: 'data', label: 'Data' },
  { id: 'activity', label: 'Activity' },
  { id: 'trash', label: 'Trash' },
] as const
type TabId = (typeof TABS)[number]['id']

// General, Partners, Data (with the lock date), Activity and Trash. Categories live in the
// Cash book; table names and what a table posts live on the tables.
export function BusinessSettingsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business, isLoading } = useBusiness(businessId)
  const [searchParams, setSearchParams] = useSearchParams()
  const requested = searchParams.get('tab')
  const tab: TabId = TABS.some((candidate) => candidate.id === requested) ? (requested as TabId) : 'general'

  if (!businessId) return null

  return (
    <>
      <Link to={`/businesses/${businessId}`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to dashboard
      </Link>

      <div className="mb-5">
        <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
        <h1 className="font-display text-[28px] font-bold tracking-tight">Settings</h1>
      </div>

      <div role="tablist" aria-label="Settings" className="mb-6 flex gap-1 border-b border-paper-line">
        {TABS.map((candidate) => (
          <button
            key={candidate.id}
            type="button"
            role="tab"
            aria-selected={tab === candidate.id}
            onClick={() => setSearchParams(candidate.id === 'general' ? {} : { tab: candidate.id }, { replace: true })}
            className={`-mb-px border-b-2 px-4 py-2.5 text-[14px] font-semibold transition-colors ${
              tab === candidate.id ? 'border-stamp text-stamp' : 'border-transparent text-ink-soft hover:text-ink'
            }`}
          >
            {candidate.label}
          </button>
        ))}
      </div>

      {tab === 'partners' && <PartnersPanel businessId={businessId} />}
      {tab === 'data' && (
        <div className="flex flex-col gap-6">
          <PeriodLockPanel businessId={businessId} />
          <DataPanel businessId={businessId} />
        </div>
      )}
      {tab === 'activity' && (
        <Panel title="Activity">
          <ActivityList businessId={businessId} />
        </Panel>
      )}
      {tab === 'trash' && <TrashPanel businessId={businessId} />}
      {tab === 'general' &&
        (isLoading || !business ? <p className="text-sm text-ink-soft">Loading…</p> : <BusinessSettingsForm businessId={businessId} business={business} />)}
    </>
  )
}

function BusinessSettingsForm({ businessId, business }: { businessId: string; business: Business }) {
  const updateBusiness = useUpdateBusiness(businessId)
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
  const [orderPrefix, setOrderPrefix] = useState(business.orderPrefix ?? '')
  const [country, setCountry] = useState(business.country ?? '')

  const [logoError, setLogoError] = useState<string | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

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
        orderPrefix: orderPrefix.trim() || null,
        country: country || null,
      })
      setSaved(true)
    } catch (err) {
      setSaveError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    }
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
                  className="h-16 w-16 rounded-ledger border border-paper-line bg-white object-contain"
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
            <div className="flex flex-col gap-1">
              <Select label="Country" value={country} onChange={(event) => setCountry(event.target.value)}>
                <option value="">Not set (Bangladesh rules)</option>
                {COUNTRY_OPTIONS.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </Select>
              <span className="text-xs text-ink-soft">Bangladesh adds the missing 0 to phone numbers (1712… becomes 01712…).</span>
            </div>
            <Textarea label="Address" value={address} onChange={(event) => setAddress(event.target.value)} />
            <TextField
              label="Contact email"
              type="email"
              value={contactEmail}
              onChange={(event) => setContactEmail(event.target.value)}
            />
            <TextField label="Website" value={website} onChange={(event) => setWebsite(event.target.value)} />
            <TextField
              label="Order prefix"
              maxLength={10}
              placeholder="e.g. SJ → SJ-0001"
              value={orderPrefix}
              onChange={(event) => setOrderPrefix(event.target.value.replace(/[^A-Za-z0-9]/g, ''))}
            />
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
    </div>
  )
}
