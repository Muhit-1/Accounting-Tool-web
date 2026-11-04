import { Link, useParams } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { useBusiness } from '../lib/businesses'
import { ShareManager } from '../components/sharing/ShareManager'
import { Panel } from '../components/Panel'

export function SharingPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { user } = useAuth()
  const { data: business, isLoading } = useBusiness(businessId)

  if (!businessId) return null
  const isOwner = business ? business.ownerId === user?.id : false

  return (
    <>
      <Link to={`/businesses/${businessId}/workspace`} className="mb-3 inline-block text-sm text-stamp underline underline-offset-2">
        ← Back to the sheet
      </Link>

      <div className="mb-6">
        <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
        <h1 className="font-display text-[28px] font-bold tracking-tight">Sharing</h1>
        <p className="mt-1 max-w-lg text-sm text-ink-soft">
          Give another person time-limited access to the whole business or to one table, to look or to edit. You can change what they may do, or the end date, at any time.
          They see it in their own &ldquo;Shared with you&rdquo; list.
        </p>
      </div>

      <div className="max-w-2xl">
        {isLoading ? (
          <p className="text-sm text-ink-soft">Loading…</p>
        ) : isOwner ? (
          <Panel title="People with access">
            <div className="px-5 py-4">
              <ShareManager businessId={businessId} />
            </div>
          </Panel>
        ) : (
          <Panel title="Shared access">
            <p className="px-5 py-6 text-sm text-ink-soft">Only the business owner can manage sharing for it.</p>
          </Panel>
        )}
      </div>
    </>
  )
}
