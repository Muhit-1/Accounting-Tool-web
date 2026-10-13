import { Link, useParams } from 'react-router-dom'
import { useBusiness } from '../lib/businesses'
import { formatMoneyCell } from '../lib/grid-parse'
import { usePartnerPayments } from '../lib/posting-config'
import { Panel } from '../components/Panel'
import { StatTile } from '../components/StatTile'

const cell = (value: number | undefined) => (value ? formatMoneyCell(value) : '–')
const TH = 'border-b border-paper-line px-4 py-2.5 text-right text-[12px] font-semibold tracking-wider text-ink-soft uppercase'
const TD = 'tabular border-b border-paper-line px-4 py-2.5 text-right'

// Who paid what, by cost group; each payer's share of what was paid; and what
// is still due. Everything is worked out on the server from the Costs table.
export function PartnerPaymentsPage() {
  const { businessId } = useParams<{ businessId: string }>()
  const { data: business } = useBusiness(businessId)
  const { data, isLoading, error } = usePartnerPayments(businessId)
  if (!businessId) return null

  return (
    <>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="mb-1.5 text-xs tracking-wider text-ink-soft uppercase">{business?.name ?? '…'}</p>
          <h1 className="font-display text-[28px] font-bold tracking-tight">Partner payments</h1>
        </div>
        <Link
          to={`/businesses/${businessId}/workspace?tab=costs`}
          className="rounded-ledger border border-paper-line bg-white px-3.5 py-2 text-[13.5px] font-semibold hover:bg-stamp-soft"
        >
          Open Costs
        </Link>
      </div>

      {error ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-rust" role="alert">
          Could not load the report.
        </p>
      ) : isLoading || !data ? (
        <p className="text-sm text-ink-soft">Loading…</p>
      ) : (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            <StatTile label="Total cost" value={formatMoneyCell(data.totals.total)} note={`${data.groups.length} ${data.groups.length === 1 ? 'group' : 'groups'}`} />
            <StatTile label="Paid" value={formatMoneyCell(data.totals.paidAll)} tone="in" />
            <StatTile label="Still due" value={formatMoneyCell(data.totals.due)} tone="out" note={`${data.stillDue.length} ${data.stillDue.length === 1 ? 'item' : 'items'}`} />
          </div>

          <Panel title="Who paid what, by group">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[480px] border-collapse text-[13.5px]">
                <thead>
                  <tr className="bg-black/[0.02]">
                    <th className={`${TH} text-left`}>Group</th>
                    {data.payers.map((payer) => (
                      <th key={payer.key} className={TH}>
                        {payer.name}
                      </th>
                    ))}
                    <th className={TH}>Still due</th>
                    <th className={TH}>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {data.groups.length === 0 && (
                    <tr>
                      <td colSpan={data.payers.length + 3} className="px-4 py-6 text-center text-ink-soft">
                        No costs yet.
                      </td>
                    </tr>
                  )}
                  {data.groups.map((group) => (
                    <tr key={group.name}>
                      <td className="border-b border-paper-line px-4 py-2.5 font-medium">{group.name}</td>
                      {data.payers.map((payer) => (
                        <td key={payer.key} className={TD}>
                          {cell(group.paid[payer.key])}
                        </td>
                      ))}
                      <td className={`${TD} text-rust`}>{cell(group.due)}</td>
                      <td className={`${TD} font-semibold`}>{formatMoneyCell(group.total)}</td>
                    </tr>
                  ))}
                </tbody>
                {data.groups.length > 0 && (
                  <tfoot>
                    <tr className="bg-black/[0.02] font-semibold">
                      <td className="px-4 py-2.5">Total</td>
                      {data.payers.map((payer) => (
                        <td key={payer.key} className="tabular px-4 py-2.5 text-right">
                          {cell(data.totals.paid[payer.key])}
                        </td>
                      ))}
                      <td className="tabular px-4 py-2.5 text-right text-rust">{cell(data.totals.due)}</td>
                      <td className="tabular px-4 py-2.5 text-right">{formatMoneyCell(data.totals.total)}</td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </Panel>

          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Panel title="Share of what was paid">
              <table className="w-full border-collapse text-[13.5px]">
                <tbody>
                  {data.payers.map((payer) => (
                    <tr key={payer.key}>
                      <td className="border-b border-paper-line px-4 py-2.5">{payer.name}</td>
                      <td className={TD}>{formatMoneyCell(payer.paid)}</td>
                      <td className={`${TD} w-20 font-semibold`}>{payer.sharePercent.toFixed(1)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className={`px-4 py-3 text-[13px] ${data.check === 0 ? 'text-green' : 'text-rust'}`}>
                Check: the shares add up to what was paid ({formatMoneyCell(data.check)}).
              </p>
            </Panel>

            <Panel title="Still due">
              {data.stillDue.length === 0 ? (
                <p className="px-4 py-6 text-sm text-ink-soft">Nothing is due.</p>
              ) : (
                <table className="w-full border-collapse text-[13.5px]">
                  <tbody>
                    {data.stillDue.map((cost) => (
                      <tr key={cost.id}>
                        <td className="border-b border-paper-line px-4 py-2.5">
                          {cost.item}
                          <div className="text-[12px] text-ink-soft">{cost.groupName}</div>
                        </td>
                        <td className={TD}>{formatMoneyCell(cost.total)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </Panel>
          </div>
        </div>
      )}
    </>
  )
}
