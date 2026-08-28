import type { AccessGrantWithBusiness } from '../../lib/access-grants'
import { daysUntil } from '../../lib/format'
import { Panel } from '../Panel'

export function SharedAccessPanel({
  grants,
  showBusiness,
  isLoading,
}: {
  grants: AccessGrantWithBusiness[]
  showBusiness: boolean
  isLoading: boolean
}) {
  const active = grants.filter((g) => g.status === 'active').slice(0, 5)

  return (
    <Panel title="Shared access">
      {isLoading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
      ) : active.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Nobody else has access yet.</p>
      ) : (
        active.map((grant) => (
          <div key={grant.id} className="border-b border-paper-edge px-5 py-3.5 last:border-b-0">
            <div className="mb-1 flex items-center justify-between text-[14.5px] font-medium">
              <span>{grant.grantee.name}</span>
              <span className="rounded-full border border-paper-line px-2 py-0.5 text-[11.5px] font-normal">
                {grant.permission === 'EDIT' ? 'Edit' : 'View'}
              </span>
            </div>
            <div className="text-[12.5px] text-ink-soft">
              {showBusiness ? grant.businessName : grant.tableName ? `Table: ${grant.tableName}` : 'Whole business'}
              {' · expires in '}
              {Math.max(daysUntil(grant.expiresAt), 0)} days
            </div>
          </div>
        ))
      )}
    </Panel>
  )
}
