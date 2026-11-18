import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CannedDialog } from '../../components/admin/CannedDialog'
import { DataTable, TabStrip, EmptyRow, ErrorLine, inputClass, LoadMore, Loading, PageHeader, Pill, PriorityPill, selectClass, TicketStatusPill } from '../../components/admin/ui'
import { cleanSearch, ticketRef, TICKET_CATEGORY_LABEL, waitingFor } from '../../lib/admin-format'
import { useStaffTickets, useStaffUnread } from '../../lib/support'
import type { StaffTicketFilters, TicketCategory, TicketPriority } from '../../types/admin'

type Tab = 'ACTIVE' | 'ME' | 'NONE' | 'RESOLVED' | 'CLOSED'
const TABS: [Tab, string][] = [
  ['ACTIVE', 'Needs attention'],
  ['ME', 'Mine'],
  ['NONE', 'Not taken'],
  ['RESOLVED', 'Resolved'],
  ['CLOSED', 'Closed'],
]

function filtersFor(tab: Tab): StaffTicketFilters {
  if (tab === 'ME') return { status: 'ACTIVE', assigned: 'me' }
  if (tab === 'NONE') return { status: 'ACTIVE', assigned: 'none' }
  return { status: tab }
}

export function AdminSupportPage() {
  const navigate = useNavigate()
  const [tab, setTab] = useState<Tab>('ACTIVE')
  const [search, setSearch] = useState('')
  const [debounced, setDebounced] = useState('')
  const [priority, setPriority] = useState<TicketPriority | ''>('')
  const [category, setCategory] = useState<TicketCategory | ''>('')
  const [canned, setCanned] = useState(false)
  const { data: unread } = useStaffUnread()

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(cleanSearch(search)), 300)
    return () => window.clearTimeout(timer)
  }, [search])

  const { data, isLoading, error, fetchNextPage, hasNextPage, isFetchingNextPage } = useStaffTickets({ ...filtersFor(tab), priority, category, search: debounced })
  const rows = data?.pages.flatMap((p) => p.items) ?? []

  return (
    <div>
      <PageHeader title="Support" />
      <TabStrip
        value={tab}
        onChange={setTab}
        tabs={TABS.map(([key, label]) => ({
          key,
          label: (
            <>
              {label}
              {key === 'ACTIVE' && unread?.count ? <span className="ml-1.5 rounded-full bg-rust px-1.5 text-[11px] text-white">{unread.count}</span> : null}
            </>
          ),
        }))}
      />
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input type="text" aria-label="Search requests" value={search} maxLength={100} onChange={(e) => setSearch(e.target.value)} placeholder="Number, subject, name or email" className={`${inputClass} min-w-[240px]`} />
        <select aria-label="Priority" className={selectClass} value={priority} onChange={(e) => setPriority(e.target.value as TicketPriority | '')}>
          <option value="">Any priority</option>
          <option value="URGENT">Urgent</option>
          <option value="HIGH">High</option>
          <option value="NORMAL">Normal</option>
          <option value="LOW">Low</option>
        </select>
        <select aria-label="Kind" className={selectClass} value={category} onChange={(e) => setCategory(e.target.value as TicketCategory | '')}>
          <option value="">Any kind</option>
          {(Object.keys(TICKET_CATEGORY_LABEL) as TicketCategory[]).map((c) => (
            <option key={c} value={c}>{TICKET_CATEGORY_LABEL[c]}</option>
          ))}
        </select>
        <div className="flex-1" />
        <button type="button" onClick={() => setCanned(true)} className="rounded-ledger border border-paper-line bg-white px-3 py-1.5 text-[13px] font-semibold hover:bg-paper">Ready replies</button>
      </div>

      {isLoading ? (
        <Loading />
      ) : error ? (
        <ErrorLine error={error} />
      ) : (
        <DataTable
          head={
            <>
              <th>No.</th>
              <th>Subject</th>
              <th className="hidden md:table-cell">Person</th>
              <th className="hidden lg:table-cell">Kind</th>
              <th>Priority</th>
              <th>Status</th>
              <th className="hidden lg:table-cell">Taken by</th>
              <th className="hidden md:table-cell">Waiting</th>
            </>
          }
        >
          {rows.length === 0 ? (
            <tr><td colSpan={8}><EmptyRow>Nothing here. Good.</EmptyRow></td></tr>
          ) : (
            rows.map((t) => (
              <tr key={t.id} onClick={() => navigate(`/admin/support/${t.id}`)} className="cursor-pointer hover:bg-sel">
                <td className="tabular font-bold">{ticketRef(t.number)}</td>
                <td className="max-w-[320px]">
                  {t.staffUnread && <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-stamp" aria-label="Unread" />}
                  <b className="align-middle">{t.subject}</b>
                </td>
                <td className="hidden md:table-cell">{t.userName}</td>
                <td className="hidden lg:table-cell"><Pill>{TICKET_CATEGORY_LABEL[t.category]}</Pill></td>
                <td><PriorityPill priority={t.priority} /></td>
                <td><TicketStatusPill status={t.status} /></td>
                <td className="hidden lg:table-cell">{t.assignedToName ?? <span className="text-ink-soft">—</span>}</td>
                <td className="tabular hidden md:table-cell">{t.status === 'RESOLVED' || t.status === 'CLOSED' ? '—' : waitingFor(t.lastMessageAt)}</td>
              </tr>
            ))
          )}
        </DataTable>
      )}
      <LoadMore hasMore={Boolean(hasNextPage)} loading={isFetchingNextPage} onClick={() => void fetchNextPage()} />
      {canned && <CannedDialog onClose={() => setCanned(false)} />}
    </div>
  )
}
