import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { useBusiness } from '../lib/businesses'
import { AccessGrantManager } from '../components/sharing/AccessGrantManager'
import { Panel } from '../components/Panel'

export function SharingPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { user } = useAuth()
  const { data: business, isLoading } = useBusiness(businessId)

  if (!businessId) return null
  const isOwner = business ? business.ownerId === user?.id : false

  return (
    <>
      <Link to={`/businesses/${businessId}`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to dashboard
      </Link>

      <div className="mb-6">
        <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
        <h1 className="font-display text-[28px] font-bold tracking-tight">Sharing</h1>
        <p className="mt-1 max-w-lg text-sm text-ink-soft">
          Grant another registered user time-limited access to this whole business — view-only or full edit. They
          can see it in their own "Shared with you" list once granted.
        </p>
      </div>

      <div className="max-w-lg">
        {isLoading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : isOwner ? (
          <AccessGrantManager businessId={businessId} />
        ) : (
          <Panel title="Shared access">
            <p className="px-5 py-6 text-sm text-ink-soft">
              Only the business owner can manage sharing for it.
            </p>
          </Panel>
        )}
      </div>
    </>
  )
}
