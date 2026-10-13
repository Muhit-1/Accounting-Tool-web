import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../../lib/api-client'
import { useAuth } from '../../lib/auth-context'
import { buildNewCost, decodePaidBy, paidByChoices, paidByValue, planCostEdit, type NewCostDraft } from '../../lib/costs-grid'
import { useCosts, useCreateCost, useDeleteCost, useUpdateCost } from '../../lib/costs'
import { formatMoney } from '../../lib/format'
import { formatDateCell, formatMoneyCell } from '../../lib/grid-parse'
import { gridPrefsKey } from '../../lib/grid-prefs'
import { usePartners } from '../../lib/partners'
import { useToast } from '../../lib/toast-context'
import { useDeferredDelete } from '../../lib/use-deferred-delete'
import type { CostItem } from '../../types/api'
import { Grid } from '../grid/Grid'
import { PasteModal } from '../grid/PasteModal'
import type { BulkAction, GridColumn, GridFilter } from '../grid/grid-types'
import { StatTile } from '../StatTile'
import { useCostsAdapter } from './use-costs-adapter'

const EMPTY_COSTS: CostItem[] = []
const rowId = (cost: CostItem) => cost.id
const describeDeleted = (count: number) => (count === 1 ? 'Cost deleted.' : `${count} costs deleted.`)

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

// The Costs table as a sheet. The server works out every total; a cost paid
// from Business money posts one expense entry to the Cash book, a partner's
// own payment posts nothing.
export function CostsTab({
  businessId,
  currency,
  tableName,
  onImport,
  postsButton,
}: {
  businessId: string
  currency: string
  tableName: string
  onImport: () => void
  // "Posts to Cash book: On/Off" for the toolbar.
  postsButton?: ReactNode
}) {
  const { user } = useAuth()
  const toast = useToast()
  const { data, isLoading, error } = useCosts(businessId)
  const { data: partnerData } = usePartners(businessId)
  const costs = data?.costs ?? EMPTY_COSTS
  const partners = useMemo(() => partnerData ?? [], [partnerData])
  const createCost = useCreateCost(businessId)
  const updateCost = useUpdateCost(businessId)
  const deleteCost = useDeleteCost(businessId)

  const [draft, setDraft] = useState<{ values: Record<string, string>; bad: string | null }>({ values: {}, bad: null })
  const [adding, setAdding] = useState(false)
  const [paste, setPaste] = useState<string | null>(null)
  const adapter = useCostsAdapter(businessId, costs, partners)

  const deleteRows = useCallback((rows: CostItem[]) => Promise.all(rows.map((cost) => deleteCost.mutateAsync(cost.id))), [deleteCost])
  const { hiddenIds, schedule } = useDeferredDelete(rowId, deleteRows, describeDeleted)

  const updateAsync = updateCost.mutateAsync
  const commit = useCallback(
    async (cost: CostItem, columnId: string, text: string): Promise<string | null> => {
      const plan = planCostEdit(cost, columnId, text, partners)
      if (plan.kind === 'noop') return null
      if (plan.kind === 'error') return plan.message
      try {
        await updateAsync({ id: cost.id, ...plan.patch })
        if (plan.notice) toast(plan.notice)
        return null
      } catch (err) {
        return messageOf(err)
      }
    },
    [partners, updateAsync, toast],
  )

  const changeDraft = useCallback((columnId: string, text: string) => {
    setDraft((current) => ({ values: { ...current.values, [columnId]: text }, bad: current.bad === columnId ? null : current.bad }))
  }, [])

  async function submitDraft() {
    if (adding) return
    const values = draft.values
    const form: NewCostDraft = {
      group: values.group ?? '',
      item: values.item ?? '',
      rate: values.rate ?? '',
      months: values.months ?? '',
      oneTime: values.oneTime ?? '',
      paidBy: values.paidBy ?? '',
      paidOn: values.paidOn ?? '',
      notes: values.notes ?? '',
    }
    const result = buildNewCost(form, partners)
    if (!result.ok) {
      toast(result.message)
      setDraft((current) => ({ ...current, bad: result.column }))
      return
    }
    setAdding(true)
    try {
      const created = await createCost.mutateAsync(result.input)
      setDraft({ values: {}, bad: null })
      toast(created.transactionId ? 'Cost added. Posted to the Cash book as money out.' : 'Cost added.')
      window.setTimeout(() => document.querySelector<HTMLElement>('[data-grid-cell][data-draft][data-col="item"]')?.focus(), 0)
    } catch (err) {
      toast(messageOf(err))
    } finally {
      setAdding(false)
    }
  }

  const groups = useMemo(() => [...new Set(costs.map((cost) => cost.groupName))].sort((a, b) => a.localeCompare(b)), [costs])
  const choices = useMemo(() => paidByChoices(partners), [partners])

  const columns = useMemo<GridColumn<CostItem>[]>(
    () => [
      { id: 'n', label: '#', type: 'calc', width: '64px', required: true, locked: true, value: (c) => c.number, text: (c) => String(c.number), draftNote: 'new' },
      { id: 'group', label: 'Group', type: 'text', width: '170px', value: (c) => c.groupName, placeholder: 'Other' },
      { id: 'item', label: 'Item', type: 'text', width: 'minmax(220px,1fr)', required: true, value: (c) => c.item },
      { id: 'rate', label: 'Monthly rate', type: 'money', width: '122px', value: (c) => c.monthlyRate, text: (c) => (c.monthlyRate ? formatMoneyCell(c.monthlyRate) : ''), placeholder: '0.00' },
      { id: 'months', label: 'Months', type: 'number', width: '86px', value: (c) => c.months, text: (c) => (c.months ? String(c.months) : ''), placeholder: '0' },
      { id: 'oneTime', label: 'One-time', type: 'money', width: '122px', value: (c) => c.oneTime, text: (c) => (c.oneTime ? formatMoneyCell(c.oneTime) : ''), placeholder: '0.00' },
      { id: 'total', label: 'Total', type: 'calc', width: '122px', required: true, locked: true, sum: true, value: (c) => c.total, text: (c) => formatMoneyCell(c.total), draftNote: 'auto' },
      {
        id: 'paidBy',
        label: 'Paid by',
        type: 'choice',
        width: '210px',
        required: true,
        value: (c) => paidByValue(c),
        text: (c) => choices.find((choice) => choice.value === paidByValue(c))?.label ?? '',
        choices: () => choices,
        placeholder: 'Not paid yet',
      },
      {
        id: 'status',
        label: 'Status',
        type: 'pill',
        width: '92px',
        locked: true,
        value: (c) => c.status,
        text: (c) => (c.status === 'PAID' ? 'Paid' : 'Due'),
        pillTone: (c) => (c.status === 'PAID' ? 'in' : 'out'),
      },
      { id: 'paidOn', label: 'Paid on', type: 'date', width: '118px', value: (c) => c.paidOn?.slice(0, 10) ?? '', text: (c) => formatDateCell(c.paidOn) },
      { id: 'notes', label: 'Notes', type: 'text', width: '190px', value: (c) => c.notes ?? '' },
    ],
    [choices],
  )

  const filter = useMemo<GridFilter<CostItem>>(
    () => ({ label: 'All groups', choices: groups.map((group) => ({ value: group, label: group })), match: (cost, value) => cost.groupName === value }),
    [groups],
  )

  const bulkActions = useMemo<BulkAction<CostItem>[]>(
    () => [
      {
        id: 'paidBy',
        label: 'Set paid by',
        choices,
        run: async (rows, value) => {
          let changed = 0
          let skipped = 0
          for (const cost of rows) {
            const problem = await commit(cost, 'paidBy', value)
            if (problem) skipped += 1
            else if (decodePaidBy(value, partners) && value !== paidByValue(cost)) changed += 1
          }
          toast(`${changed} ${changed === 1 ? 'cost' : 'costs'} updated${skipped ? `, ${skipped} skipped` : ''}.`)
        },
      },
    ],
    [choices, commit, partners, toast],
  )

  const summary = data?.summary

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
        <StatTile label="Total cost" value={formatMoneyCell(summary?.total ?? 0)} note={`${summary?.count ?? 0} items`} />
        <StatTile label="Paid" value={formatMoneyCell(summary?.paid ?? 0)} tone="in" />
        <StatTile label="Still due" value={formatMoneyCell(summary?.due ?? 0)} tone="out" note={`${costs.filter((cost) => cost.status === 'DUE').length} items`} />
      </div>

      {error ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-rust" role="alert">
          Could not load the costs.
        </p>
      ) : isLoading ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Grid<CostItem>
              prefsKey={gridPrefsKey(user?.id ?? 'anonymous', businessId, 'costs')}
              columns={columns}
              rows={costs}
              rowId={rowId}
              onCommit={commit}
              addRow={{
                values: draft.values,
                onChange: changeDraft,
                onSubmit: () => void submitDraft(),
                badColumn: draft.bad,
                focusColumn: 'item',
                noun: 'cost',
                isSubmitting: adding,
              }}
              onDeleteRows={schedule}
              bulkActions={bulkActions}
              filter={filter}
              onPasteText={setPaste}
              hiddenIds={hiddenIds}
              exportName={tableName}
              noun="cost"
              emptyTitle="No costs yet"
              emptyHint="Fill the empty row below and press Enter — or paste from Excel, or import a file."
              toolbarLeft={
                partners.length === 0 ? (
                  <Link to={`/businesses/${businessId}/settings?tab=partners`} className="text-[12.5px] text-stamp underline underline-offset-2">
                    Add partners to use “Paid by”
                  </Link>
                ) : undefined
              }
              toolbarRight={
                <>
                  {postsButton}
                  <button
                    type="button"
                    onClick={() => setPaste('')}
                    className="rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-stamp-soft"
                  >
                    Paste from Excel
                  </button>
                  <button
                    type="button"
                    onClick={onImport}
                    className="rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-stamp-soft"
                  >
                    Import
                  </button>
                </>
              }
            />
          </div>
          <ul className="flex flex-col gap-2 md:hidden">
            {costs.length === 0 && <li className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">No costs yet.</li>}
            {costs.map((cost) => (
              <li key={cost.id} className="flex items-start justify-between gap-3 rounded-ledger border border-paper-line bg-white px-4 py-3">
                <span className="min-w-0">
                  <span className="block truncate font-medium">{cost.item}</span>
                  <span className="block text-[12.5px] text-ink-soft">{cost.groupName}</span>
                </span>
                <span className="flex-none text-right">
                  <span className="tabular block">{formatMoney(cost.total, currency)}</span>
                  <span className={`text-xs font-semibold ${cost.status === 'PAID' ? 'text-green' : 'text-rust'}`}>
                    {cost.status === 'PAID' ? `Paid${cost.partnerName ? ` · ${cost.partnerName}` : ' · Business money'}` : 'Due'}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </>
      )}

      {paste !== null && <PasteModal adapter={adapter} initialText={paste} onClose={() => setPaste(null)} />}
    </div>
  )
}
