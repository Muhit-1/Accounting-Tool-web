import { Link, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { StatementPanel } from '../components/account/StatementPanel'

// Money in and money out of the whole business, grouped by category group.
export function StatementPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business } = useBusiness(businessId)
  if (!businessId) return null
  return (
    <>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Statement</h1>
        </div>
        <Link to={`/businesses/${businessId}/reports`} className="text-[13px] text-stamp underline underline-offset-2">
          PDF reports
        </Link>
      </div>
      <StatementPanel businessId={businessId} currency={business?.currency ?? 'BDT'} />
      <p className="mt-4 text-[13px] text-ink-soft">Gold rows in the Cash book (posted from your tables and invoices) are included here automatically.</p>
    </>
  )
}
