import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { useBusinesses } from '../lib/businesses'
import { useAccessGrantsAcross } from '../lib/access-grants'
import { formatMoney } from '../lib/format'
import { useCombinedDashboard } from '../lib/dashboard'
import { Panel } from '../components/Panel'

export function AdminPage() {
  const { user } = useAuth()
  const { data: businesses, isLoading: isBusinessesLoading } = useBusinesses()
  const list = businesses ?? []
  const { data: grants, isLoading: isGrantsLoading } = useAccessGrantsAcross(list)
  const { data: combined } = useCombinedDashboard()

  const activeGrants = grants.filter((g) => g.status === 'active')
  const primaryCurrency = combined?.businesses[0]?.currency ?? 'BDT'

  return (
    <div>
      <div className="mb-6">
        <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">Account administration</p>
        <h1 className="font-display text-[28px] font-bold tracking-tight">Admin</h1>
        <p className="mt-1 text-sm text-ink-soft">
          A single place for account-level details — every venture you own, everyone with access to them, and who
          you're signed in as.
        </p>
      </div>

      <div className="rise rise-1 mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5 rounded-ledger border border-paper-line bg-white px-[18px] py-4">
          <div className="text-[11.5px] tracking-wider text-ink-soft uppercase">Signed in as</div>
          <div className="text-[15px] font-bold">{user?.name}</div>
          <div className="text-[13px] text-ink-soft">{user?.email}</div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-ledger border border-paper-line bg-white px-[18px] py-4">
          <div className="text-[11.5px] tracking-wider text-ink-soft uppercase">Businesses owned</div>
          <div className="tabular text-[24px] font-bold">{list.length}</div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-ledger border border-paper-line bg-white px-[18px] py-4">
          <div className="text-[11.5px] tracking-wider text-ink-soft uppercase">Active access grants</div>
          <div className="tabular text-[24px] font-bold">{activeGrants.length}</div>
        </div>
        <div className="flex flex-col gap-1.5 rounded-ledger border border-paper-line bg-white px-[18px] py-4">
          <div className="text-[11.5px] tracking-wider text-ink-soft uppercase">Combined balance</div>
          <div className="tabular text-[24px] font-bold">
            {formatMoney(combined?.combined.balance ?? 0, primaryCurrency)}
          </div>
        </div>
      </div>

      <div className="rise rise-2 grid grid-cols-1 items-start gap-7 lg:grid-cols-2">
        <Panel title="Your businesses">
          {isBusinessesLoading ? (
            <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
          ) : list.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-soft">You don't own any businesses yet.</p>
          ) : (
            list.map((business) => (
              <div
                key={business.id}
                className="flex items-center justify-between border-b border-paper-edge px-5 py-3.5 last:border-b-0"
              >
                <div>
                  <div className="text-[14.5px] font-medium">{business.name}</div>
                  <div className="text-[12.5px] text-ink-soft">{business.currency}</div>
                </div>
                <Link
                  to={`/businesses/${business.id}/settings`}
                  className="border-b border-current text-[13px] text-stamp no-underline"
                >
                  Settings
                </Link>
              </div>
            ))
          )}
        </Panel>

        <Panel title="Everyone with access">
          {isGrantsLoading ? (
            <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
          ) : activeGrants.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-soft">Nobody else has access to any of your businesses.</p>
          ) : (
            activeGrants.map((grant) => (
              <div key={grant.id} className="border-b border-paper-edge px-5 py-3.5 last:border-b-0">
                <div className="mb-1 flex items-center justify-between text-[14.5px] font-medium">
                  <span>{grant.grantee.name}</span>
                  <span className="rounded-full border border-paper-line px-2 py-0.5 text-[11.5px] font-normal">
                    {grant.permission === 'EDIT' ? 'Edit' : 'View'}
                  </span>
                </div>
                <div className="text-[12.5px] text-ink-soft">
                  {grant.businessName} · {grant.grantee.email}
                </div>
              </div>
            ))
          )}
        </Panel>
      </div>
    </div>
  )
}
