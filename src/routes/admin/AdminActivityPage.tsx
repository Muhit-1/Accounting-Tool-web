import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { DataTable, EmptyRow, ErrorLine, inputClass, LoadMore, Loading, Note, PageHeader, Pill, selectClass } from '../../components/admin/ui'
import { useAdminActivity, useAdminAudit } from '../../lib/admin'
import { ACTIVITY_LABEL, activityDetail, activityLabel, AUDIT_LABEL, cleanSearch, formatDateTime } from '../../lib/admin-format'

export function AdminActivityPage() {
  const [tab, setTab] = useState<'platform' | 'staff'>('platform')
  return (
    <div>
      <PageHeader title="Activity" />
      <div role="tablist" className="mb-3.5 flex gap-0.5 border-b border-paper-edge">
        {([['platform', 'Everyone'], ['staff', 'What staff did']] as const).map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={tab === key}
            onClick={() => setTab(key)}
            className={`border-b-2 px-3.5 py-2 text-[13.5px] font-semibold ${tab === key ? 'border-stamp text-stamp' : 'border-transparent text-ink-soft2 hover:text-ink'}`}
          >
            {label}
          </button>
        ))}
      </div>
      {tab === 'platform' ? <PlatformFeed /> : <StaffLog />}
    </div>
  )
}

function PlatformFeed() {
  const [type, setType] = useState('')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(cleanSearch(search)), 300)
    return () => window.clearTimeout(timer)
  }, [search])
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminActivity({ type, search: debounced })
  const rows = data?.pages.flatMap((p) => p.items) ?? []
  return (
    <>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <select aria-label="Kind" className={selectClass} value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">Any kind</option>
          {Object.keys(ACTIVITY_LABEL).map((k) => <option key={k} value={k}>{ACTIVITY_LABEL[k]}</option>)}
        </select>
        <input type="text" aria-label="Email" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Email" className={`${inputClass} min-w-[220px]`} />
        <div className="flex-1" />
        <span className="text-[12.5px] text-ink-soft">Kept 180 days. No amounts, no entries.</span>
      </div>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorLine error={error} />
      ) : (
        <DataTable head={<><th>When</th><th>What</th><th>Person</th><th className="hidden md:table-cell">Where</th><th className="hidden lg:table-cell">Detail</th></>}>
          {rows.length === 0 ? (
            <tr><td colSpan={5}><EmptyRow>Nothing recorded.</EmptyRow></td></tr>
          ) : (
            rows.map((e) => (
              <tr key={e.id}>
                <td className="whitespace-nowrap text-ink-soft">{formatDateTime(e.createdAt)}</td>
                <td><Pill tone={e.type === 'auth.login_failed' ? 'rust' : e.type === 'auth.signup' ? 'green' : e.type === 'ticket.create' ? 'blue' : e.type === 'business.delete' ? 'brass' : 'grey'}>{activityLabel(e.type)}</Pill></td>
                <td>{e.userId ? <Link to={`/admin/users/${e.userId}`} className="font-bold hover:underline">{e.userName ?? e.userEmail}</Link> : <b>{e.userName ?? e.userEmail ?? '—'}</b>}</td>
                <td className="hidden md:table-cell">{e.platform === 'app' ? 'Phone app' : e.platform === 'web' ? 'Web' : '—'} {e.ipTrunc ? <span className="tabular text-[12.5px] text-ink-soft">· {e.ipTrunc}</span> : null}</td>
                <td className="hidden text-ink-soft2 lg:table-cell">{activityDetail(e)}</td>
              </tr>
            ))
          )}
        </DataTable>
      )}
      <LoadMore hasMore={Boolean(hasNextPage)} loading={isFetchingNextPage} onClick={() => void fetchNextPage()} />
    </>
  )
}

function StaffLog() {
  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminAudit()
  const rows = data?.pages.flatMap((p) => p.items) ?? []
  return (
    <>
      <div className="mb-3"><Note>Every change staff make is written here, and cannot be edited or deleted. Kept forever.</Note></div>
      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorLine error={error} />
      ) : (
        <DataTable head={<><th>When</th><th>Who</th><th>Did</th><th>To</th><th className="hidden md:table-cell">Reason or detail</th></>}>
          {rows.length === 0 ? (
            <tr><td colSpan={5}><EmptyRow>Nothing yet.</EmptyRow></td></tr>
          ) : (
            rows.map((a) => (
              <tr key={a.id}>
                <td className="whitespace-nowrap text-ink-soft">{formatDateTime(a.createdAt)}</td>
                <td><b>{a.actorEmail}</b>{a.via === 'cli' ? <> <Pill tone="ink">server</Pill></> : null}</td>
                <td><Pill tone={a.action.includes('disable') || a.action.includes('delete') ? 'rust' : a.action.includes('admin') ? 'brass' : 'grey'}>{AUDIT_LABEL[a.action] ?? a.action}</Pill></td>
                <td>{a.targetUserId ? <Link to={`/admin/users/${a.targetUserId}`} className="hover:underline">{a.targetEmail}</Link> : (a.targetEmail ?? '—')}</td>
                <td className="hidden text-ink-soft2 md:table-cell">{a.reason ?? ''}</td>
              </tr>
            ))
          )}
        </DataTable>
      )}
      <LoadMore hasMore={Boolean(hasNextPage)} loading={isFetchingNextPage} onClick={() => void fetchNextPage()} />
    </>
  )
}
