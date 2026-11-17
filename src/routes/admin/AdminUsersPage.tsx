import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Avatar, DataTable, EmptyRow, ErrorLine, inputClass, LoadMore, Loading, PageHeader, RolePill, selectClass, StatusPill } from '../../components/admin/ui'
import { useAdminUsers } from '../../lib/admin'
import { cleanSearch, formatDuration, timeAgo } from '../../lib/admin-format'
import type { AdminUserFilters } from '../../types/admin'

export function AdminUsersPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [role, setRole] = useState<AdminUserFilters['role']>('')
  const [status, setStatus] = useState<AdminUserFilters['status']>('')
  const [platform, setPlatform] = useState<AdminUserFilters['platform']>('')
  const [seen, setSeen] = useState<AdminUserFilters['seen']>('')

  // the list is asked for once typing pauses, not on every key
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(cleanSearch(search)), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useAdminUsers({ search: debounced, role, status, platform, seen, sort: 'newest' })
  const rows = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div>
      <PageHeader title="People" />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input type="text" aria-label="Search people" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Name or email" className={`${inputClass} min-w-[220px]`} />
        <select aria-label="Role" className={selectClass} value={role} onChange={(e) => setRole(e.target.value as AdminUserFilters['role'])}>
          <option value="">Any role</option>
          <option value="USER">Person</option>
          <option value="ADMIN">Admin</option>
          <option value="SUPER_ADMIN">Super admin</option>
        </select>
        <select aria-label="Status" className={selectClass} value={status} onChange={(e) => setStatus(e.target.value as AdminUserFilters['status'])}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="disabled">Deactivated</option>
          <option value="invited">Invited</option>
        </select>
        <select aria-label="Where they signed up" className={selectClass} value={platform} onChange={(e) => setPlatform(e.target.value as AdminUserFilters['platform'])}>
          <option value="">Web and app</option>
          <option value="web">Web</option>
          <option value="app">Phone app</option>
        </select>
        <select aria-label="Last seen" className={selectClass} value={seen} onChange={(e) => setSeen(e.target.value as AdminUserFilters['seen'])}>
          <option value="">Seen any time</option>
          <option value="1">Today</option>
          <option value="7">This week</option>
          <option value="30">This month</option>
          <option value="never">Never</option>
        </select>
      </div>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorLine error={error} />
      ) : (
        <DataTable
          head={
            <>
              <th>Person</th>
              <th>Role</th>
              <th>Status</th>
              <th className="hidden md:table-cell">Businesses</th>
              <th className="hidden md:table-cell">Tables</th>
              <th className="hidden lg:table-cell">Time (30 d)</th>
              <th className="hidden md:table-cell">Last seen</th>
              <th className="hidden lg:table-cell">Joined</th>
            </>
          }
        >
          {rows.length === 0 ? (
            <tr>
              <td colSpan={8}><EmptyRow>Nobody matches.</EmptyRow></td>
            </tr>
          ) : (
            rows.map((u) => (
              <tr key={u.id} onClick={() => navigate(`/admin/users/${u.id}`)} className="cursor-pointer hover:bg-sel">
                <td>
                  <div className="flex items-center gap-2.5">
                    <Avatar name={u.name} />
                    <div className="min-w-0">
                      <a href={`/admin/users/${u.id}`} onClick={(e) => { e.preventDefault(); navigate(`/admin/users/${u.id}`) }} className="block truncate font-bold">{u.name}</a>
                      <div className="truncate text-[12.5px] text-ink-soft">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td><RolePill role={u.role} /></td>
                <td><StatusPill status={u.status} /></td>
                <td className="tabular hidden md:table-cell">{u.businesses}</td>
                <td className="tabular hidden md:table-cell">{u.tables}</td>
                <td className="tabular hidden lg:table-cell">{formatDuration(u.activeSeconds30d)}</td>
                <td className="hidden md:table-cell">{timeAgo(u.lastSeenAt)}{u.signupPlatform ? <span className="text-[12.5px] text-ink-soft"> · {u.signupPlatform}</span> : null}</td>
                <td className="hidden lg:table-cell">{timeAgo(u.createdAt)}</td>
              </tr>
            ))
          )}
        </DataTable>
      )}
      <LoadMore hasMore={Boolean(hasNextPage)} loading={isFetchingNextPage} onClick={() => void fetchNextPage()} />
    </div>
  )
}
