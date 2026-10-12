import { useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { MonthlyPanel } from '../components/account/MonthlyPanel'

// Money in, out and the closing balance for each month of the whole business.
export function MonthlyPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business } = useBusiness(businessId)
  if (!businessId) return null
  return (
    <>
      <div className="mb-6">
        <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
        <h1 className="font-display text-[28px] font-bold tracking-tight">Monthly view</h1>
      </div>
      <MonthlyPanel businessId={businessId} currency={business?.currency ?? 'BDT'} />
    </>
  )
}
