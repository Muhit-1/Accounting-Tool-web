import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ApiError } from '../../lib/api-client'
import { useAuth } from '../../lib/auth-context'
import { describeCalculation } from '../../lib/calc'
import {
  broughtForward,
  buildNewEntry,
  calculationChip,
  categoryChoices,
  closingBalance,
  isCalculated,
  moneyInOf,
  moneyOutOf,
  planCategoryEdit,
  planDateEdit,
  planMemoEdit,
  planMoneyEdit,
  planProofEdit,
  postedBy,
  type NewEntryDraft,
  type Plan,
} from '../../lib/cashbook-grid'
import { useCategories } from '../../lib/categories'
import { formatDateCell, formatMoneyCell, todayIso } from '../../lib/grid-parse'
import { gridPrefsKey } from '../../lib/grid-prefs'
import { sumMoney } from '../../lib/grid-rows'
import { safeProofHref } from '../../lib/proof-url'
import { useToast } from '../../lib/toast-context'
import { useDeferredDelete } from '../../lib/use-deferred-delete'
import { useCreateTransaction, useDeleteTransaction, useTransactions, useUpdateTransaction } from '../../lib/transactions'
import type { AmountType } from '../../lib/calc'
import type { Category, CategoryType, Transaction } from '../../types/api'
import { FloatingMenu, type MenuEntry } from '../FloatingMenu'
import { Grid } from '../grid/Grid'
import { PasteModal } from '../grid/PasteModal'
import { NEW_CHOICE, type BulkAction, type GridColumn, type GridFilter } from '../grid/grid-types'
import { IconPlus } from '../icons'
import { AmountPopover, type AmountChoice } from './AmountPopover'
import { CategoriesDialog } from './CategoriesDialog'
import { EntryCards } from './EntryCards'
import { NewCategoryDialog } from './NewCategoryDialog'
import { useCashbookAdapter } from './use-cashbook-adapter'

const EMPTY: Transaction[] = []
const rowId = (tx: Transaction) => tx.id
const describeDeleted = (count: number) => (count === 1 ? 'Entry deleted.' : `${count} entries deleted.`)

interface Draft {
  values: Record<string, string>
  // The amount of the add-row came from the ƒ box, on this side.
  calc: { side: 'inn' | 'out'; type: AmountType; inputs: number[]; amount: number } | null
  badColumn: string | null
}

const freshDraft = (): Draft => ({ values: { date: formatDateCell(todayIso()) }, calc: null, badColumn: null })

// Which grid column a refused add-row problem belongs to.
const COLUMN_OF_PROBLEM = { date: 'date', category: 'cat', moneyIn: 'inn', moneyOut: 'out', proof: 'proof' } as const

interface FxTarget {
  row: Transaction | null
  columnId: string
  anchor: DOMRect
}

type NewCategoryTarget = { kind: 'draft' } | { kind: 'row'; tx: Transaction }

function messageOf(err: unknown): string {
  return err instanceof ApiError ? err.message : 'Something went wrong. Please try again.'
}

// The Cash book as a sheet: every cell is an input, the last row adds an
// entry, Balance is worked out for you. The server checks everything again.
export function CashBookTab({
  businessId,
  accountId,
  currency,
  onEditEntry,
  onOpenPosted,
  onImport,
  onAddEntry,
  onScanInvoice,
  accountSwitcher,
  tableName,
}: {
  businessId: string
  accountId: string
  currency: string
  // Phones: a tap on a card opens the entry form.
  onEditEntry: (transaction: Transaction) => void
  // A gold row's chip: go to the table that posted it (its order, its cost).
  onOpenPosted: (transaction: Transaction) => void
  // Opens the import screen on this table.
  onImport: () => void
  // Opens the form to add an entry, and the one that reads an invoice file.
  onAddEntry: () => void
  onScanInvoice: () => void
  // A choice of cash book, when the business has more than one.
  accountSwitcher?: ReactNode
  // The name this viewer sees on the tab ("Cash book", or their own).
  tableName: string
}) {
  const { user } = useAuth()
  const toast = useToast()
  const { data, isLoading, error } = useTransactions(businessId, accountId)
  const { data: categoryData } = useCategories(businessId)
  const transactions = data ?? EMPTY
  const categories = useMemo(() => categoryData ?? [], [categoryData])
  const createTx = useCreateTransaction(businessId)
  const updateTx = useUpdateTransaction(businessId)
  const deleteTx = useDeleteTransaction(businessId)

  const [draft, setDraft] = useState<Draft>(freshDraft)
  const [fx, setFx] = useState<FxTarget | null>(null)
  const [newCategory, setNewCategory] = useState<NewCategoryTarget | null>(null)
  const [showCategories, setShowCategories] = useState(false)
  const [adding, setAdding] = useState(false)
  const [addMenu, setAddMenu] = useState<DOMRect | null>(null)
  // Text pasted into the grid, waiting in the preview (null = no preview open).
  const [paste, setPaste] = useState<string | null>(null)
  const adapter = useCashbookAdapter(businessId, accountId, categories, transactions)

  const deleteRows = useCallback((rows: Transaction[]) => Promise.all(rows.map((tx) => deleteTx.mutateAsync(tx.id))), [deleteTx])
  const { hiddenIds, schedule } = useDeferredDelete(rowId, deleteRows, describeDeleted)

  // ---- saving an edit -------------------------------------------------
  const updateAsync = updateTx.mutateAsync
  const runPlan = useCallback(
    async (tx: Transaction, plan: Plan): Promise<string | null> => {
      if (plan.kind === 'noop') return null
      if (plan.kind === 'error') return plan.message
      try {
        await updateAsync({ id: tx.id, ...plan.patch })
        if (plan.notice) toast(plan.notice)
        return null
      } catch (err) {
        return messageOf(err)
      }
    },
    [updateAsync, toast],
  )

  const handleCommit = useCallback(
    async (tx: Transaction, columnId: string, text: string): Promise<string | null> => {
      switch (columnId) {
        case 'date':
          return runPlan(tx, planDateEdit(tx, text))
        case 'desc':
          return runPlan(tx, planMemoEdit(tx, text))
        case 'cat':
          if (text === NEW_CHOICE) {
            setNewCategory({ kind: 'row', tx })
            return null
          }
          return runPlan(tx, planCategoryEdit(tx, text, categories))
        case 'inn':
          return runPlan(tx, planMoneyEdit(tx, 'in', text))
        case 'out':
          return runPlan(tx, planMoneyEdit(tx, 'out', text))
        case 'proof':
          return runPlan(tx, planProofEdit(tx, text))
        default:
          return null
      }
    },
    [categories, runPlan],
  )

  // ---- the add-row ----------------------------------------------------
  const changeDraft = useCallback((columnId: string, text: string) => {
    setDraft((current) => {
      const values = { ...current.values, [columnId]: text }
      let calc = current.calc
      // Typing in the other money column replaces a calculated amount.
      if (calc && (columnId === 'inn' || columnId === 'out') && columnId !== calc.side && text.trim() !== '') {
        values[calc.side] = ''
        calc = null
      }
      return { values, calc, badColumn: current.badColumn === columnId ? null : current.badColumn }
    })
  }, [])

  async function submitDraft() {
    if (adding) return
    const entry: NewEntryDraft = {
      date: draft.values.date ?? '',
      memo: draft.values.desc ?? '',
      categoryId: draft.values.cat ?? '',
      moneyIn: draft.values.inn ?? '',
      moneyOut: draft.values.out ?? '',
      proofUrl: draft.values.proof ?? '',
      calc: draft.calc ? { type: draft.calc.type, inputs: draft.calc.inputs, amount: draft.calc.amount } : null,
    }
    const result = buildNewEntry(entry, categories)
    if (!result.ok) {
      toast(result.message)
      setDraft((current) => ({ ...current, badColumn: COLUMN_OF_PROBLEM[result.column] }))
      return
    }
    setAdding(true)
    try {
      await createTx.mutateAsync({ accountId, ...result.input })
      setDraft(freshDraft())
      toast('Entry added.')
      // The cursor goes back to the description of the (new, empty) add-row.
      window.setTimeout(() => document.querySelector<HTMLElement>('[data-grid-cell][data-draft][data-col="desc"]')?.focus(), 0)
    } catch (err) {
      toast(messageOf(err))
    } finally {
      setAdding(false)
    }
  }

  // ---- ƒ amount type --------------------------------------------------
  const fxChip = useCallback(
    (tx: Transaction | null, columnId: string): string | null => {
      if (tx === null) {
        return draft.calc && draft.calc.side === columnId ? describeCalculation(draft.calc.type, draft.calc.inputs) : null
      }
      const side = tx.type === 'INCOME' ? 'inn' : 'out'
      return columnId === side ? calculationChip(tx) : null
    },
    [draft.calc],
  )

  async function applyAmount(choice: AmountChoice) {
    if (!fx) return
    const side = fx.columnId === 'inn' ? 'inn' : 'out'
    if (fx.row === null) {
      const other = side === 'inn' ? 'out' : 'inn'
      setDraft((current) => ({
        ...current,
        values: { ...current.values, [side]: formatMoneyCell(choice.amount), [other]: '' },
        calc: { side, type: choice.type, inputs: choice.inputs, amount: choice.amount },
        badColumn: null,
      }))
      setFx(null)
      return
    }
    const tx = fx.row
    const entryType: CategoryType = side === 'inn' ? 'INCOME' : 'EXPENSE'
    const moves = tx.type !== entryType
    setFx(null)
    const problem = await runPlan(tx, {
      kind: 'patch',
      patch: { amountType: choice.type, amountInputs: choice.inputs, amount: choice.amount, ...(moves ? { type: entryType } : {}) },
      notice: moves ? `Moved to money ${side === 'inn' ? 'in' : 'out'}. Pick a category for it.` : undefined,
    })
    toast(problem ?? `Amount set to ${formatMoneyCell(choice.amount)} (${describeCalculation(choice.type, choice.inputs)}).`)
  }

  async function clearAmount() {
    if (!fx) return
    const { row } = fx
    setFx(null)
    if (row === null) {
      setDraft((current) => {
        if (!current.calc) return current
        return { ...current, values: { ...current.values, [current.calc.side]: '' }, calc: null }
      })
      return
    }
    const problem = await runPlan(row, { kind: 'patch', patch: { amountType: 'FIXED', amount: row.amount } })
    toast(problem ?? 'Calculation cleared. You can type the amount again.')
  }

  // ---- columns --------------------------------------------------------
  const columns = useMemo<GridColumn<Transaction>[]>(
    () => [
      {
        id: 'date',
        label: 'Date',
        type: 'date',
        width: '118px',
        required: true,
        value: (tx) => tx.date.slice(0, 10),
        text: (tx) => formatDateCell(tx.date),
        placeholder: formatDateCell(todayIso()),
      },
      {
        id: 'desc',
        label: 'Description',
        type: 'text',
        width: 'minmax(200px,1fr)',
        required: true,
        value: (tx) => tx.memo ?? '',
      },
      {
        id: 'cat',
        label: 'Category',
        type: 'choice',
        width: '180px',
        required: true,
        value: (tx) => tx.category?.id ?? '',
        text: (tx) => tx.category?.name ?? '',
        choices: (tx) =>
          categoryChoices(categories, tx?.category?.id).map((choice) => ({ value: choice.value, label: choice.label, group: choice.group })),
        newChoice: '＋ New category…',
        placeholder: 'Choose…',
        menu: [{ label: 'Manage categories…', hint: 'Rename, regroup, add or delete.', onSelect: () => setShowCategories(true) }],
      },
      {
        id: 'inn',
        label: 'Money in',
        type: 'money',
        width: '128px',
        sum: true,
        tone: 'in',
        fx: true,
        value: (tx) => moneyInOf(tx),
        text: (tx) => formatMoneyCell(moneyInOf(tx)),
        readOnly: (tx) => isCalculated(tx),
        placeholder: '0.00',
      },
      {
        id: 'out',
        label: 'Money out',
        type: 'money',
        width: '128px',
        sum: true,
        tone: 'out',
        fx: true,
        value: (tx) => moneyOutOf(tx),
        text: (tx) => formatMoneyCell(moneyOutOf(tx)),
        readOnly: (tx) => isCalculated(tx),
        placeholder: '0.00',
      },
      {
        id: 'bal',
        label: 'Balance',
        type: 'calc',
        width: '128px',
        required: true,
        locked: true,
        value: (tx) => tx.runningBalance ?? 0,
        text: (tx) => formatMoneyCell(tx.runningBalance ?? 0),
        draftNote: 'auto',
        footer: () => formatMoneyCell(closingBalance(transactions)),
      },
      {
        id: 'proof',
        label: 'Proof link',
        type: 'text',
        width: '140px',
        value: (tx) => tx.proofUrl ?? '',
        href: (tx) => safeProofHref(tx.proofUrl),
        placeholder: 'https://…',
      },
    ],
    [categories, transactions],
  )

  const filter = useMemo<GridFilter<Transaction>>(
    () => ({
      label: 'All categories',
      choices: categories.map((category) => ({ value: category.id, label: category.name })),
      match: (tx, value) => tx.category?.id === value,
    }),
    [categories],
  )

  const bulkActions = useMemo<BulkAction<Transaction>[]>(
    () => [
      {
        id: 'category',
        label: 'Change category',
        choices: categoryChoices(categories).map((choice) => ({ value: choice.value, label: choice.label, group: choice.group })),
        run: async (rows, categoryId) => {
          let changed = 0
          let skipped = 0
          for (const tx of rows) {
            const plan = planCategoryEdit(tx, categoryId, categories)
            if (plan.kind === 'patch') {
              if ((await runPlan(tx, plan)) === null) changed += 1
              else skipped += 1
            } else if (plan.kind === 'error') skipped += 1
          }
          toast(`${changed} ${changed === 1 ? 'entry' : 'entries'} updated${skipped ? `, ${skipped} skipped (the category is for the other kind of money).` : '.'}`)
        },
      },
    ],
    [categories, runPlan, toast],
  )

  const leadRow = useCallback(
    (rows: Transaction[], sorted: boolean) => {
      if (sorted) return null
      const before = broughtForward(transactions, rows)
      return before === null ? null : { desc: 'Balance brought forward', bal: formatMoneyCell(before) }
    },
    [transactions],
  )

  const totalIn = sumMoney(transactions.map((tx) => moneyInOf(tx)))
  const totalOut = sumMoney(transactions.map((tx) => moneyOutOf(tx)))
  const posted = transactions.filter((tx) => postedBy(tx)).length

  // The category a "＋ New category…" starts with: the kind of money the row is.
  const newCategoryType: CategoryType =
    newCategory?.kind === 'row' ? (newCategory.tx.type ?? 'EXPENSE') : draft.values.inn?.trim() ? 'INCOME' : 'EXPENSE'

  function handleCategoryCreated(category: Category) {
    if (!newCategory) return
    if (newCategory.kind === 'draft') {
      changeDraft('cat', category.id)
      return
    }
    void runPlan(newCategory.tx, planCategoryEdit(newCategory.tx, category.id, [...categories, category])).then((problem) => {
      if (problem) toast(problem)
    })
  }

  const fxAnchorRow = fx?.row ?? null
  const fxSide = fx?.columnId === 'inn' ? 'in' : 'out'

  const addEntryMenu: MenuEntry[] = [
    { label: 'Type in the sheet', hint: 'Fill the empty row and press Enter.', onSelect: () => document.querySelector<HTMLElement>('[data-grid-cell][data-draft][data-col="desc"]')?.focus() },
    { label: 'From an invoice or receipt file…', hint: 'The amount, date and name are read for you.', onSelect: onScanInvoice },
    { label: 'Several at once (paste)', hint: 'Copy rows from Excel.', onSelect: () => setPaste('') },
  ]

  return (
    <>
      {error ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-rust" role="alert">
          Could not load the entries.
        </p>
      ) : isLoading ? (
        <p className="rounded-ledger border border-paper-line bg-white px-5 py-8 text-sm text-ink-soft">Loading…</p>
      ) : (
        <>
          <div className="hidden md:block">
            <Grid<Transaction>
              prefsKey={gridPrefsKey(user?.id ?? 'anonymous', businessId, 'cashbook')}
              columns={columns}
              rows={transactions}
              rowId={rowId}
              rowLock={(tx) => {
                const source = postedBy(tx)
                return source ? { label: source.label, onOpen: () => onOpenPosted(tx) } : null
              }}
              lockChipColumn="desc"
              onCommit={handleCommit}
              addRow={{
                values: draft.values,
                onChange: changeDraft,
                onSubmit: () => void submitDraft(),
                badColumn: draft.badColumn,
                focusColumn: 'desc',
                noun: 'entry',
                disabledColumns: draft.calc ? [draft.calc.side] : [],
                isSubmitting: adding,
                onNewChoice: () => setNewCategory({ kind: 'draft' }),
              }}
              fx={{
                chip: fxChip,
                open: (target) => setFx(target),
              }}
              onDeleteRows={schedule}
              bulkActions={bulkActions}
              filter={filter}
              leadRow={leadRow}
              onPasteText={setPaste}
              hiddenIds={hiddenIds}
              noun="entry"
              emptyTitle="No entries yet"
              emptyHint="Fill the empty row below and press Enter."
              exportName={tableName}
              minRows={24}
              summary={
                <div className="mr-1 flex items-center gap-4 text-[12.5px] text-ink-soft">
                  <span>
                    In <b className="tabular font-medium text-green">{formatMoneyCell(totalIn)}</b>
                  </span>
                  <span>
                    Out <b className="tabular font-medium text-rust">{formatMoneyCell(totalOut)}</b>
                  </span>
                  <span>
                    Balance <b className="tabular font-medium text-ink">{formatMoneyCell(closingBalance(transactions))}</b>
                  </span>
                </div>
              }
              filterPanel={() => (
                <p className="flex items-start gap-2 text-[12.5px] text-ink-soft">
                  <i className="mt-0.5 inline-block h-3.5 w-3.5 flex-none rounded-[3px] border border-brass-line bg-brass-row" />
                  Gold rows were posted from other sheets or invoices{posted > 0 ? ` (${posted} now)` : ''}. Change them where they came from.
                </p>
              )}
              viewMenuItems={[{ label: 'Categories…', hint: 'Rename, regroup, add or delete.', onSelect: () => setShowCategories(true) }]}
              dataMenuItems={[
                { label: 'Paste from Excel', hint: 'Copy rows, paste them here.', onSelect: () => setPaste('') },
                { label: 'Import a file…', hint: 'Excel or CSV, with a check before anything is added.', onSelect: onImport },
              ]}
              toolbarEnd={
                <>
                  {accountSwitcher}
                  <span className="inline-flex">
                    <button
                      type="button"
                      onClick={onAddEntry}
                      className="inline-flex items-center gap-1.5 rounded-l-ledger bg-stamp px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-stamp/90"
                    >
                      <IconPlus width={15} height={15} />
                      Add entry
                    </button>
                    <button
                      type="button"
                      aria-haspopup="menu"
                      aria-label="More ways to add"
                      onClick={(event) => setAddMenu(event.currentTarget.getBoundingClientRect())}
                      className="rounded-r-ledger border-l border-white/35 bg-stamp px-2 text-[11px] text-white hover:bg-stamp/90"
                    >
                      ▾
                    </button>
                  </span>
                </>
              }
            />
          </div>
          <div className="md:hidden">
            <EntryCards transactions={transactions} currency={currency} onEdit={onEditEntry} onOpenPosted={onOpenPosted} />
          </div>
        </>
      )}

      {fx && (
        <AmountPopover
          anchor={fx.anchor}
          side={fxSide}
          initial={
            fxAnchorRow && fxAnchorRow.amountType && fxAnchorRow.amountInputs
              ? { type: fxAnchorRow.amountType, inputs: fxAnchorRow.amountInputs }
              : fxAnchorRow === null && draft.calc && draft.calc.side === fx.columnId
                ? { type: draft.calc.type, inputs: draft.calc.inputs }
                : null
          }
          canClear={fxAnchorRow ? isCalculated(fxAnchorRow) : draft.calc?.side === fx.columnId}
          currency={currency}
          onUse={(choice) => void applyAmount(choice)}
          onClear={() => void clearAmount()}
          onClose={() => setFx(null)}
        />
      )}

      {newCategory && (
        <NewCategoryDialog
          businessId={businessId}
          categories={categories}
          initialType={newCategoryType}
          onCreated={handleCategoryCreated}
          onClose={() => setNewCategory(null)}
        />
      )}

      {paste !== null && <PasteModal adapter={adapter} initialText={paste} onClose={() => setPaste(null)} />}

      {addMenu && <FloatingMenu anchor={addMenu} items={addEntryMenu} onClose={() => setAddMenu(null)} />}

      {showCategories && <CategoriesDialog businessId={businessId} categories={categories} onClose={() => setShowCategories(false)} />}
    </>
  )
}
