import { Link } from 'react-router-dom'
import { useSharedWithMe } from '../lib/access-grants'
import { daysUntil } from '../lib/format'
import { Panel } from '../components/Panel'

export function SharedWithMePage() {
  const { data: shared, isLoading } = useSharedWithMe()

  return (
    <>
      <div className="mb-6">
        <h1 className="font-display text-[28px] font-medium tracking-tight">Shared with you</h1>
        <p className="mt-1 max-w-lg text-sm text-ink-soft">
          Businesses another owner has given you time-limited access to.
        </p>
      </div>

      <div className="max-w-lg">
        <Panel title="Access granted to you">
          {isLoading ? (
            <p className="px-5 py-6 text-sm text-ink-soft">Loading…</p>
          ) : !shared || shared.length === 0 ? (
            <p className="px-5 py-6 text-sm text-ink-soft">Nothing has been shared with you yet.</p>
          ) : (
            shared.map((entry) => (
              <Link
                key={entry.id}
                to={`/businesses/${entry.business.id}`}
                className="flex items-center justify-between border-b border-paper-edge px-5 py-3.5 transition-colors last:border-b-0 hover:bg-black/[0.02]"
              >
                <div>
                  <div className="text-[14.5px] font-medium">{entry.business.name}</div>
                  <div className="text-[12.5px] text-ink-soft">
                    {entry.permission === 'EDIT' ? 'Can edit' : 'View only'} · expires in{' '}
                    {Math.max(daysUntil(entry.expiresAt), 0)} days
                  </div>
                </div>
                <span className="text-stamp">→</span>
              </Link>
            ))
          )}
        </Panel>
      </div>
    </>
  )
}
