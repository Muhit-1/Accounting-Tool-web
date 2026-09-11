import { Link } from 'react-router-dom'
import type { Account } from '../../types/api'
import { formatMoney } from '../../lib/format'
import { Panel } from '../Panel'
import { IconWallet } from '../icons'

export function AccountsSummaryPanel({
  businessId,
  accounts,
  currency,
  isLoading,
}: {
  businessId: string
  accounts: Account[]
  currency: string
  isLoading: boolean
}) {
  return (
    <Panel
      title="Accounts"
      action={
        <Link
          to={`/businesses/${businessId}/accounts`}
          className="border-b border-current text-[13px] text-stamp no-underline"
        >
          Manage
        </Link>
      }
    >
      {isLoading ? (
        <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
      ) : accounts.length === 0 ? (
        <p className="px-5 py-6 text-sm text-ink-soft">No accounts yet.</p>
      ) : (
        accounts.map((account) => (
          <Link
            key={account.id}
            to={`/businesses/${businessId}/accounts/${account.id}`}
            className="flex items-center justify-between border-b border-paper-edge px-5 py-3 transition-colors last:border-b-0 hover:bg-black/[0.02]"
          >
            <div className="flex items-center gap-3">
              <span className="flex h-8 w-8 flex-none items-center justify-center rounded-[8px] bg-stamp-soft text-stamp">
                <IconWallet width={16} height={16} />
              </span>
              <span className="text-[14.5px] font-medium">{account.name}</span>
            </div>
            <span className={`tabular text-[14px] font-medium ${account.balance < 0 ? 'text-rust' : 'text-ink'}`}>
              {formatMoney(account.balance, currency)}
            </span>
          </Link>
        ))
      )}
    </Panel>
  )
}
