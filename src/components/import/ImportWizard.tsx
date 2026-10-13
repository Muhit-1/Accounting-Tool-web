import { useMemo, useState, type ChangeEvent } from 'react'
import { ApiError } from '../../lib/api-client'
import { bulkRowErrors } from '../../lib/bulk-errors'
import { formatMoneyCell } from '../../lib/grid-parse'
import { checkPlans, planColumns, planSheets, withMapping, withTable, type FileComparison, type SheetPlan } from '../../lib/import-plan'
import type { CommitResult, ImportRunner } from '../../lib/paste-import'
import type { ImportTableInfo } from '../../lib/sheet-import'
import { useToast } from '../../lib/toast-context'
import { checkWorkbookFile, fileExtension, readDelimitedFile, readWorkbook, type ReadResult } from '../../lib/workbook'
import { Button } from '../Button'
import { Modal } from '../Modal'

type Step = 1 | 2 | 3 | 4

const STEP_NAMES = ['Choose file', 'Match columns', 'Check', 'Done']
const PROBLEM_ROWS_SHOWN = 40

function Steps({ step }: { step: Step }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Steps">
      {STEP_NAMES.map((name, index) => {
        const number = index + 1
        const state = number === step ? 'now' : number < step ? 'done' : 'todo'
        return (
          <li key={name} aria-current={state === 'now' ? 'step' : undefined} className={`flex items-center gap-2 text-[13.5px] font-semibold ${state === 'todo' ? 'text-ink-soft' : 'text-ink'}`}>
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full border text-xs font-bold ${
                state === 'now' ? 'border-stamp bg-stamp text-white' : state === 'done' ? 'border-green bg-green text-white' : 'border-paper-line bg-white'
              }`}
            >
              {state === 'done' ? '✓' : number}
            </span>
            {name}
          </li>
        )
      })}
    </ol>
  )
}

function Tile({ label, value, tone, note }: { label: string; value: string | number; tone?: 'in' | 'out'; note?: string }) {
  return (
    <div className="rounded-ledger border border-paper-line bg-white px-4 py-2.5">
      <div className="text-[11.5px] tracking-wider text-ink-soft uppercase">{label}</div>
      <div className={`tabular text-[20px] font-medium ${tone === 'in' ? 'text-green' : tone === 'out' ? 'text-rust' : ''}`}>{value}</div>
      {note && <div className="text-xs text-ink-soft">{note}</div>}
    </div>
  )
}

function ComparisonNote({ comparison }: { comparison: FileComparison }) {
  const { file, rows, leftOut } = comparison
  const money = (value: number | undefined) => (value === undefined ? '—' : formatMoneyCell(value))
  const hasLeftOut = leftOut.moneyIn !== 0 || leftOut.moneyOut !== 0
  return (
    <div className={`rounded-ledger border px-3 py-2 text-[13px] ${comparison.matches ? 'border-green/30 bg-green-soft text-green' : 'border-brass-line bg-brass-soft text-brass'}`}>
      <div>
        <b>{comparison.matches ? '✓ ' : ''}“{comparison.sheetName}” says:</b> money in {money(file.moneyIn)} · money out {money(file.moneyOut)}
        {file.balance !== undefined ? ` · balance ${money(file.balance)}` : ''}
      </div>
      <div>
        These rows add: money in {formatMoneyCell(rows.moneyIn)} · money out {formatMoneyCell(rows.moneyOut)}
        {hasLeftOut ? ` · left out ${leftOut.moneyIn ? `${formatMoneyCell(leftOut.moneyIn)} in` : ''}${leftOut.moneyIn && leftOut.moneyOut ? ' and ' : ''}${leftOut.moneyOut ? `${formatMoneyCell(leftOut.moneyOut)} out` : ''} (worked out by your sheet)` : ''}
      </div>
      {!comparison.matches && <div>The totals differ. Check the problems below and the matched columns before you import.</div>}
    </div>
  )
}

// Import in four steps: choose a file; say which sheet is which table and
// which column is which; look at what would happen; done (with Undo).
// Nothing is saved before the last click of step 3, and a table's rows are
// saved all or nothing.
export function ImportWizard({
  tables,
  runners,
  initialTableKey,
  onClose,
}: {
  tables: ImportTableInfo[]
  runners: Record<string, ImportRunner>
  // The table whose Import button was clicked: a plain CSV goes there.
  initialTableKey?: string
  onClose: () => void
}) {
  const toast = useToast()
  const [step, setStep] = useState<Step>(1)
  const [fileName, setFileName] = useState('')
  const [plans, setPlans] = useState<SheetPlan[]>([])
  const [createCategories, setCreateCategories] = useState(true)
  const [loading, setLoading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [done, setDone] = useState<{ tableKey: string; label: string; result: CommitResult }[]>([])

  const checks = useMemo(
    () => (step === 3 ? checkPlans(plans, tables, runners, { createCategories }) : []),
    [step, plans, tables, runners, createCategories],
  )
  const readyTotal = checks.reduce((total, check) => total + check.counts.ready, 0)
  const offersNewCategories = checks.some((check) => runners[check.tableKey]?.offersNewCategories)
  const oneTable = tables.length === 1

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setProblem(null)
    const early = checkWorkbookFile(file)
    if (early) {
      setProblem(early)
      return
    }
    setLoading(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const refused = checkWorkbookFile(file, bytes)
      if (refused) {
        setProblem(refused)
        return
      }
      let result: ReadResult
      if (fileExtension(file.name) === 'xlsx') {
        // The library is only fetched when somebody imports a workbook.
        const XLSX = await import('xlsx')
        result = readWorkbook(XLSX, bytes)
      } else {
        result = readDelimitedFile(new TextDecoder().decode(bytes), file.name)
      }
      if (!result.ok) {
        setProblem(result.message)
        return
      }
      let planned = planSheets(result.sheets, tables)
      // A plain CSV has nothing to tell what it is: it is for the table whose Import was clicked.
      if (planned.length === 1 && planned[0].tableKey === null && initialTableKey && fileExtension(file.name) !== 'xlsx') {
        planned = [withTable(planned[0], initialTableKey, tables)]
      }
      setFileName(file.name)
      setPlans(planned)
      setStep(2)
    } catch {
      setProblem("That file couldn't be read.")
    } finally {
      setLoading(false)
    }
  }

  function updatePlan(index: number, next: SheetPlan) {
    setPlans((current) => current.map((plan, i) => (i === index ? next : plan)))
  }

  async function runImport() {
    if (readyTotal === 0) {
      setProblem('No rows are ready. Go back and match the columns.')
      return
    }
    setSaving(true)
    setProblem(null)
    const saved: { tableKey: string; label: string; result: CommitResult }[] = []
    try {
      for (const check of checks) {
        if (check.ready.length === 0) continue
        const result = await runners[check.tableKey].commit(check.ready, { createCategories })
        saved.push({ tableKey: check.tableKey, label: check.label, result })
      }
      setDone(saved)
      setStep(4)
    } catch (err) {
      // All or nothing for the whole file: take back what an earlier table already saved.
      await Promise.allSettled(saved.map((entry) => runners[entry.tableKey].undo(entry.result.batchId)))
      const rowProblems = bulkRowErrors(err)
      setProblem(
        `${err instanceof ApiError ? err.message : 'Something went wrong.'} Nothing was added.${
          rowProblems.length > 0 ? ` ${rowProblems.slice(0, 3).map((entry) => `Row ${entry.index + 1}: ${entry.message}`).join(' · ')}` : ''
        }`,
      )
    } finally {
      setSaving(false)
    }
  }

  async function undoImport() {
    setSaving(true)
    const results = await Promise.allSettled(done.map((entry) => runners[entry.tableKey].undo(entry.result.batchId)))
    setSaving(false)
    if (results.every((result) => result.status === 'fulfilled')) {
      toast(`Import undone — ${done.reduce((total, entry) => total + entry.result.created, 0)} rows removed.`)
      onClose()
    } else {
      setProblem('Could not undo everything. Please check the table.')
    }
  }

  const totalAdded = done.reduce((total, entry) => total + entry.result.created, 0)

  return (
    <Modal title="Import" wide onClose={onClose}>
      <Steps step={step} />

      {step === 1 && (
        <div className="flex flex-col items-center gap-3 rounded-ledger border-2 border-dashed border-paper-line px-6 py-8 text-center text-ink-soft">
          <b className="text-ink">Choose an Excel (.xlsx) or CSV file</b>
          <span className="text-[13px]">
            It is opened on your computer. Nothing is saved until you click Import at the end. Up to 5 MB, 20 sheets, 1,000 rows per table. Formulas are not
            read: only the values your file saved.
          </span>
          <input type="file" accept=".xlsx,.csv,.tsv,.txt" onChange={(event) => void chooseFile(event)} disabled={loading} aria-label="Choose a file" />
          {loading && <span className="text-[13px]">Reading the file…</span>}
        </div>
      )}

      {step === 2 && (
        <>
          <p className="text-[13.5px] text-ink-soft">
            {fileName} · {plans.length} {plans.length === 1 ? 'sheet' : 'sheets'}. Tell the app where each {plans.length === 1 ? 'column' : 'sheet and column'} goes.
          </p>

          {plans.length > 1 && (
            <section className="flex flex-col gap-2" aria-label="Your sheets become tables">
              <h3 className="text-[13px] font-bold tracking-wider text-ink-soft uppercase">Your sheets become tables</h3>
              <div className="overflow-hidden rounded-ledger border border-paper-line">
                {plans.map((plan, index) => (
                  <div key={plan.sheet.name} className="flex flex-wrap items-center justify-between gap-3 border-b border-paper-edge px-3 py-2 last:border-b-0">
                    <div className="min-w-0">
                      <b className="text-[14px]">{plan.sheet.name}</b>
                      <div className="text-xs text-ink-soft">
                        {plan.sheet.rows.length} lines{plan.tableKey === null && plan.reason ? ` · ${plan.reason}` : ''}
                      </div>
                    </div>
                    <select
                      value={plan.tableKey ?? ''}
                      aria-label={`Table for ${plan.sheet.name}`}
                      onChange={(event) => updatePlan(index, withTable(plan, event.target.value || null, tables))}
                      className="rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[13px]"
                    >
                      <option value="">Skip this sheet</option>
                      {tables.map((table) => (
                        <option key={table.key} value={table.key}>
                          {table.label}
                        </option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            </section>
          )}

          {plans.map((plan, index) => {
            const table = tables.find((candidate) => candidate.key === plan.tableKey)
            if (!table) return plans.length === 1 ? (
              <p key={plan.sheet.name} className="rounded-ledger border border-brass-line bg-brass-soft px-3 py-2 text-[13px] text-brass">
                {oneTable ? 'This file does not look like a table the app knows. Pick a table above or choose another file.' : 'Choose which table this file is for.'}
                {!oneTable && (
                  <select
                    value=""
                    aria-label="Table for this file"
                    onChange={(event) => updatePlan(index, withTable(plan, event.target.value || null, tables))}
                    className="ml-2 rounded-ledger border border-paper-line bg-white px-2 py-1 text-[13px] text-ink"
                  >
                    <option value="">Choose…</option>
                    {tables.map((candidate) => (
                      <option key={candidate.key} value={candidate.key}>
                        {candidate.label}
                      </option>
                    ))}
                  </select>
                )}
              </p>
            ) : null
            const columns = planColumns(plan)
            return (
              <section key={plan.sheet.name} className="flex flex-col gap-2" aria-label={`Columns of ${plan.sheet.name}`}>
                <h3 className="text-[13px] font-bold tracking-wider text-ink-soft uppercase">
                  {plan.sheet.name} → {table.label}
                  {plan.segments.length > 1 ? ` · ${plan.segments.length} blocks` : ''}
                </h3>
                {plan.segments.some((segment) => segment.heading) && (
                  <p className="text-[12.5px] text-ink-soft">
                    Headings like “{plan.segments.find((segment) => segment.heading)?.heading}” set money in or out and the category for the rows under them.
                  </p>
                )}
                <div className="max-h-[300px] overflow-auto rounded-ledger border border-paper-line">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-black/[0.02] text-left text-[12px] tracking-wider text-ink-soft uppercase">
                        <th className="px-3 py-2 font-semibold">Column in your file</th>
                        <th className="px-3 py-2 font-semibold">Example</th>
                        <th className="px-3 py-2 font-semibold">Goes to</th>
                      </tr>
                    </thead>
                    <tbody>
                      {columns.map((column) => (
                        <tr key={column.key} className="border-t border-paper-edge">
                          <td className="px-3 py-1.5 font-semibold">{column.header}</td>
                          <td className="max-w-[220px] truncate px-3 py-1.5 text-ink-soft">{column.example}</td>
                          <td className="px-3 py-1.5">
                            <select
                              value={column.targetId ?? ''}
                              aria-label={`Goes to: ${column.header}`}
                              onChange={(event) => updatePlan(index, withMapping(plan, column.key, event.target.value || null))}
                              className="rounded-ledger border border-paper-line bg-white px-2 py-1 text-[13px]"
                            >
                              <option value="">Skip this column</option>
                              {table.targets.map((target) => (
                                <option key={target.id} value={target.id}>
                                  {target.label}
                                </option>
                              ))}
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )
          })}
        </>
      )}

      {step === 3 && (
        <>
          {checks.length === 0 && <p className="text-[13.5px] text-ink-soft">No sheet is set to become a table. Go back and choose one.</p>}
          {checks.map((check) => (
            <section key={check.tableKey} className="flex flex-col gap-3" aria-label={`Check ${check.label}`}>
              <h3 className="text-[13px] font-bold tracking-wider text-ink-soft uppercase">{check.label}</h3>
              <div className="grid grid-cols-3 gap-3">
                <Tile label="Ready" value={check.counts.ready} tone="in" />
                <Tile label="Already there" value={check.counts.duplicate} note="skipped" />
                <Tile label="Problems" value={check.counts.problem} tone="out" note="skipped" />
              </div>
              {check.tooMany && (
                <p className="rounded-ledger border border-brass-line bg-brass-soft px-3 py-2 text-[13px] text-brass" role="alert">
                  {check.tooMany}
                </p>
              )}
              {check.summary && (
                <div className="rounded-ledger border border-green/30 bg-green-soft px-3 py-2 text-[13px] text-green">
                  The ready rows add <b className="tabular">{check.summary}</b>.
                </div>
              )}
              {check.comparisons.map((comparison) => (
                <ComparisonNote key={comparison.sheetName} comparison={comparison} />
              ))}
              {check.counts.skipped > 0 && (
                <p className="text-[12.5px] text-ink-soft">
                  {check.counts.skipped} {check.counts.skipped === 1 ? 'line' : 'lines'} left out:{' '}
                  {check.skipped.map((entry) => `${entry.sheetName} row ${entry.rowNumber} (${entry.reason.toLowerCase()})`).join(', ')}.
                </p>
              )}
              {check.problems.length > 0 && (
                <div className="max-h-[220px] overflow-auto rounded-ledger border border-paper-line">
                  <table className="w-full border-collapse text-[13px]">
                    <thead>
                      <tr className="bg-black/[0.02] text-left text-[12px] tracking-wider text-ink-soft uppercase">
                        <th className="px-3 py-2 font-semibold">Where</th>
                        <th className="px-3 py-2 font-semibold">Problem</th>
                      </tr>
                    </thead>
                    <tbody>
                      {check.problems.slice(0, PROBLEM_ROWS_SHOWN).map((entry) => (
                        <tr key={`${entry.sheetName}-${entry.rowNumber}`} className="border-t border-paper-edge">
                          <td className="px-3 py-1.5 whitespace-nowrap">
                            {entry.sheetName} · row {entry.rowNumber}
                          </td>
                          <td className="px-3 py-1.5 text-rust">{entry.message}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {check.problems.length > PROBLEM_ROWS_SHOWN && (
                <p className="text-[12.5px] text-ink-soft">
                  Showing the first {PROBLEM_ROWS_SHOWN} of {check.problems.length} problems.
                </p>
              )}
            </section>
          ))}
          {offersNewCategories && (
            <label className="flex items-center gap-2 text-[13.5px]">
              <input type="checkbox" checked={createCategories} onChange={(event) => setCreateCategories(event.target.checked)} className="h-4 w-4 accent-stamp" />
              Create categories that don’t exist yet
            </label>
          )}
        </>
      )}

      {step === 4 && (
        <>
          <div className="rounded-ledger border border-green/30 bg-green-soft px-4 py-3 text-[14px] text-green">
            <b>
              {totalAdded} {totalAdded === 1 ? 'row' : 'rows'} added.
            </b>{' '}
            {done.map((entry) => `${entry.result.created} to ${entry.label}`).join(' · ')}. Nothing was changed in the rows that were already there.
          </div>
          <p className="text-[13.5px] text-ink-soft">Changed your mind? Undo removes only the rows from this import.</p>
        </>
      )}

      {problem && (
        <p className="text-sm text-rust" role="alert">
          {problem}
        </p>
      )}

      <div className="flex items-center justify-end gap-3">
        {(step === 2 || step === 3) && (
          <Button type="button" variant="ghost" className="mr-auto" onClick={() => setStep((step - 1) as Step)} disabled={saving}>
            Back
          </Button>
        )}
        {step === 4 && (
          <Button type="button" variant="ghost" className="mr-auto" onClick={() => void undoImport()} disabled={saving}>
            Undo this import
          </Button>
        )}
        {step !== 4 && (
          <Button type="button" variant="ghost" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
        )}
        {step === 2 && (
          <Button type="button" onClick={() => setStep(3)} disabled={!plans.some((plan) => plan.tableKey !== null)}>
            Next
          </Button>
        )}
        {step === 3 && (
          <Button type="button" onClick={() => void runImport()} disabled={saving || readyTotal === 0}>
            {saving ? 'Importing…' : `Import ${readyTotal} ${readyTotal === 1 ? 'row' : 'rows'}`}
          </Button>
        )}
        {step === 4 && (
          <Button type="button" onClick={onClose}>
            Done
          </Button>
        )}
      </div>
    </Modal>
  )
}
