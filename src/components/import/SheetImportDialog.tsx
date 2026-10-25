import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react'
import { ApiError } from '../../lib/api-client'
import { CASHBOOK_TABLE, moneyOfValues, summarizeCashbookRows, type CashbookImportRow } from '../../lib/cashbook-import'
import { useCategories } from '../../lib/categories'
import { formatMoneyCell } from '../../lib/grid-parse'
import { checkPlans, planSheets, type TableCheck } from '../../lib/import-plan'
import { runnerOf, type CommitResult } from '../../lib/paste-import'
import { importSheet, useRefreshAfterImport, useUndoImport, type ImportReport } from '../../lib/tables'
import { useToast } from '../../lib/toast-context'
import { useTransactions } from '../../lib/transactions'
import { checkWorkbookFile, fileExtension } from '../../lib/workbook'
import { readCsv, readXl, type XSheet } from '../../lib/xl/read'
import { explainFormula } from '../../lib/xl/explain'
import type { Analysis, AnalyzedColumn, AnalyzedTable } from '../../lib/xl/xl-analyze'
import { buildPlan, type ImportPlanOut } from '../../lib/xl/xl-plan'
import { analyzeSheets } from '../../lib/xl/xl-pipeline'
import { sheetGrid } from '../../lib/xl/xl-rules'
import { Button } from '../Button'
import { Modal } from '../Modal'
import { useCashbookAdapter } from '../workspace/use-cashbook-adapter'

const TYPE_WORD: Record<string, string> = { TEXT: 'Text', NUMBER: 'Number', MONEY: 'Money', DATE: 'Date', CHOICE: 'Choice list', TICK: 'Tick box', AUTO: 'Auto number', LINK: 'Link', FORMULA: 'Formula' }
const num = (v: unknown) => (typeof v === 'number' ? formatMoneyCell(v) : v === null || v === undefined || v === '' ? '(empty)' : String(v))
const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

function ColumnLine({ column }: { column: AnalyzedColumn }) {
  return (
    <li className="flex flex-wrap items-baseline gap-x-2 text-[13px]">
      <span className="font-medium">{column.name}</span>
      <span className="text-ink-soft">{TYPE_WORD[column.type] ?? column.type}</span>
      {column.type === 'LINK' && <span className="text-ink-soft">→ {column.linkTo}</span>}
      {column.type === 'FORMULA' && (
        <span className="min-w-0 basis-full text-ink-soft">
          <span className="font-mono text-[12px]">{explainFormula(column.formula ?? '')}</span>
          {column.formulaFrom && <span className="ml-2 text-[11.5px] opacity-70">(was ={column.formulaFrom})</span>}
        </span>
      )}
      {column.notConverted && <span className="min-w-0 basis-full text-[12px] text-brass">Kept as values: {column.notConverted}.</span>}
    </li>
  )
}

function TableCard({ table, on, onToggle }: { table: AnalyzedTable; on: boolean; onToggle: (on: boolean) => void }) {
  const [open, setOpen] = useState(false)
  const formulas = table.columns.filter((c) => c.type === 'FORMULA').length
  return (
    <section className={`rounded-ledger border bg-white ${on ? 'border-paper-line' : 'border-dashed border-paper-line opacity-70'}`}>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <label className="flex items-center gap-2.5">
          <input type="checkbox" checked={on} onChange={(event) => onToggle(event.target.checked)} className="h-4 w-4 accent-stamp" aria-label={`Import ${table.name}`} />
          <span className="font-display text-[16px] font-bold">{table.name}</span>
        </label>
        <span className="text-[12.5px] text-ink-soft">
          {table.kind === 'made' ? 'made from a column' : `sheet “${table.sheet}”`} · {table.rows.length} {table.rows.length === 1 ? 'row' : 'rows'} · {table.columns.length} columns
          {formulas > 0 && ` · ${formulas} formula ${formulas === 1 ? 'column' : 'columns'}`}
          {table.fnRows.length > 0 && ` · ${table.fnRows.length} function ${table.fnRows.length === 1 ? 'row' : 'rows'}`}
        </span>
        <button type="button" className="ml-auto text-[12.5px] font-semibold text-stamp hover:underline" onClick={() => setOpen(!open)}>
          {open ? 'Hide columns' : 'Show columns'}
        </button>
      </div>
      {table.note && <p className="px-4 pb-2 text-[12.5px] text-ink-soft">{table.note}</p>}
      {table.rule && (
        <p className="px-4 pb-2 text-[12.5px]">
          <span className="font-semibold text-brass">Posts to the Cash book</span>
          {table.rule.when.length > 0 ? ` when ${table.rule.when.map((w) => `${table.columns.find((c) => c.key === w.field)?.name ?? ''} ${w.op === 'eq' ? 'is' : 'is not'} ${w.value}`).join(' and ')}` : ''},{' '}
          {table.rule.direction === 'IN' ? 'money in' : 'money out'} <span className="text-ink-soft">(read from your ledger’s ={table.rule.from})</span>
        </p>
      )}
      {open && (
        <div className="border-t border-paper-line px-4 py-3">
          <ul className="flex flex-col gap-1.5">
            {table.columns.map((c) => (
              <ColumnLine key={c.key} column={c} />
            ))}
          </ul>
          {table.fnRows.map((fr) => (
            <div key={fr.label} className="mt-3 text-[12.5px]">
              <b>{fr.label}</b> (function row)
              <ul className="ml-4 list-disc text-ink-soft">
                {Object.entries(fr.cells).map(([key, c]) => (
                  <li key={key}>
                    {table.columns.find((x) => x.key === key)?.name}: <span className="font-mono">{c.fn === 'formula' ? explainFormula(c.formula ?? '') : c.fn}</span> <span className="opacity-70">(was ={c.from})</span>
                  </li>
                ))}
                {fr.notes.map((n) => (
                  <li key={n} className="text-brass">
                    Left out: {n}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  )
}

// Upload a workbook → see what it becomes (tables, formulas, links, rules, the numbers checked against your file)
// → create it all in one step → undo it in one click.
export function SheetImportDialog({ businessId, accountId, onClose, onCreated }: { businessId: string; accountId: string; onClose: () => void; onCreated: (firstTableId: string | null) => void }) {
  const toast = useToast()
  const refresh = useRefreshAfterImport(businessId)
  const undoImport = useUndoImport(businessId)
  const { data: categories } = useCategories(businessId)
  const { data: transactions } = useTransactions(businessId, accountId)
  const cashbook = useCashbookAdapter(businessId, accountId, categories ?? [], transactions ?? [])
  const runner = useMemo(() => runnerOf<CashbookImportRow>(cashbook, summarizeCashbookRows, moneyOfValues), [cashbook])

  const fileInput = useRef<HTMLInputElement>(null)
  const [step, setStep] = useState<'choose' | 'review' | 'done'>('choose')
  const [loading, setLoading] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)
  const [fileName, setFileName] = useState('')
  const [sheets, setSheets] = useState<XSheet[]>([])
  const [analysis, setAnalysis] = useState<Analysis | null>(null)
  const [include, setInclude] = useState<Record<string, boolean>>({})
  const [includeLedger, setIncludeLedger] = useState(true)
  // The answer for one particular plan; a new plan means the old answer is out of date.
  const [checked, setChecked] = useState<{ plan: ImportPlanOut; report: ImportReport | null; error: string | null } | null>(null)
  const [creating, setCreating] = useState(false)
  const [done, setDone] = useState<{ report: ImportReport; ledger: CommitResult | null } | null>(null)

  async function chooseFile(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return
    setProblem(null)
    const early = checkWorkbookFile(file)
    if (early) return setProblem(early)
    setLoading(true)
    try {
      const bytes = new Uint8Array(await file.arrayBuffer())
      const refused = checkWorkbookFile(file, bytes)
      if (refused) return setProblem(refused)
      const result = fileExtension(file.name) === 'xlsx' ? readXl(await import('xlsx'), bytes) : readCsv(new TextDecoder().decode(bytes), file.name)
      if (!result.ok) return setProblem(result.message)
      const found = analyzeSheets(result.sheets)
      if (found.tables.length === 0 && found.ledgerSheets.length === 0) return setProblem('No tables were found in that file. A table has a row of column names with rows below it.')
      setFileName(file.name)
      setSheets(result.sheets)
      setAnalysis(found)
      setInclude(Object.fromEntries(found.tables.map((t) => [t.name, t.include])))
      setStep('review')
    } catch {
      setProblem("That file couldn't be read.")
    } finally {
      setLoading(false)
    }
  }

  const plan = useMemo(() => (analysis ? buildPlan(analysis, include) : null), [analysis, include])

  // The server builds the whole plan, checks it against the numbers in the file, then takes it back.
  useEffect(() => {
    if (step !== 'review' || !plan) return
    if (plan.tables.length === 0) return
    let stale = false
    const timer = window.setTimeout(() => {
      importSheet(businessId, plan, true)
        .then((r) => !stale && setChecked({ plan, report: r, error: null }))
        .catch((err) => !stale && setChecked({ plan, report: null, error: messageOf(err) }))
    }, 450)
    return () => {
      stale = true
      window.clearTimeout(timer)
    }
  }, [businessId, plan, step])

  const current = checked && checked.plan === plan ? checked : null
  const report = current?.report ?? null
  const reportError = current?.error ?? null
  const checking = Boolean(plan && plan.tables.length > 0 && !current)

  // The ledger sheet(s) go to the Cash book through the same checks as a paste.
  const ledgerCheck = useMemo<TableCheck | null>(() => {
    if (!analysis || analysis.ledgerSheets.length === 0 || !includeLedger) return null
    const grids = sheets.filter((s) => analysis.ledgerSheets.includes(s.name)).map(sheetGrid)
    const plans = planSheets(grids, [CASHBOOK_TABLE])
    return checkPlans(plans, [CASHBOOK_TABLE], { cashbook: runner }, { createCategories: true })[0] ?? null
  }, [analysis, sheets, includeLedger, runner])

  const cashAfter = useMemo(() => {
    const posted = report?.rules.reduce((t, r) => ({ moneyIn: t.moneyIn + Math.max(0, r.total), moneyOut: t.moneyOut + Math.max(0, -r.total) }), { moneyIn: 0, moneyOut: 0 }) ?? { moneyIn: 0, moneyOut: 0 }
    const base = ledgerCheck?.readyTotals ?? { moneyIn: 0, moneyOut: 0 }
    const moneyIn = Math.round((base.moneyIn + posted.moneyIn) * 100) / 100
    const moneyOut = Math.round((base.moneyOut + posted.moneyOut) * 100) / 100
    return { moneyIn, moneyOut, balance: Math.round((moneyIn - moneyOut) * 100) / 100 }
  }, [report, ledgerCheck])

  async function create() {
    if (!plan) return
    setCreating(true)
    setProblem(null)
    const batchId = crypto.randomUUID()
    let created: ImportReport | null = null
    try {
      created = await importSheet(businessId, { ...plan, importBatchId: batchId }, false)
      let ledger: CommitResult | null = null
      if (ledgerCheck && ledgerCheck.ready.length > 0) ledger = await runner.commit(ledgerCheck.ready, { createCategories: true })
      refresh()
      setDone({ report: created, ledger })
      setStep('done')
    } catch (err) {
      // All or nothing: take back the tables when the Cash book part failed.
      if (created) await undoImport.mutateAsync(created.importBatchId).catch(() => undefined)
      setProblem(`${messageOf(err)} Nothing was added.`)
    } finally {
      setCreating(false)
    }
  }

  async function undo() {
    if (!done) return
    setCreating(true)
    const results = await Promise.allSettled([undoImport.mutateAsync(done.report.importBatchId), done.ledger ? runner.undo(done.ledger.batchId) : Promise.resolve()])
    setCreating(false)
    refresh()
    if (results.every((r) => r.status === 'fulfilled')) {
      toast('Import undone. Everything it made is gone.')
      onClose()
    } else setProblem('Could not undo everything. Please check your tables.')
  }

  const totalTables = plan?.tables.length ?? 0
  const nothing = totalTables === 0 && !(ledgerCheck && ledgerCheck.ready.length > 0)

  return (
    <Modal title="Upload my sheet" onClose={onClose} wide>
      {step === 'choose' && (
        <div className="flex flex-col gap-4">
          <div className="rounded-ledger border-2 border-dashed border-paper-line bg-paper-edge px-6 py-10 text-center">
            <p className="mb-1 text-[16px] font-bold">Choose your .xlsx or .csv file</p>
            <p className="mb-4 text-sm text-ink-soft">Up to 5 MB and 20 sheets. We read every sheet and every formula and rebuild them as tables, columns and links. Formulas are read as text, never run. Macros are refused.</p>
            <input ref={fileInput} type="file" accept=".xlsx,.csv,.tsv,.txt" className="hidden" onChange={(event) => void chooseFile(event)} aria-label="Choose a file" />
            <Button onClick={() => fileInput.current?.click()} disabled={loading}>
              {loading ? 'Reading…' : 'Choose a file'}
            </Button>
          </div>
          {problem && (
            <p role="alert" className="text-sm text-rust">
              {problem}
            </p>
          )}
          <div className="flex justify-end">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </div>
      )}

      {step === 'review' && analysis && (
        <div className="flex flex-col gap-4">
          <p className="text-sm text-ink-soft">
            <b className="text-ink">{fileName}</b> · {sheets.length} {sheets.length === 1 ? 'sheet' : 'sheets'} · {analysis.formulaCells} formula {analysis.formulaCells === 1 ? 'cell' : 'cells'} found, {analysis.convertedCells} rebuilt as columns and function rows.
          </p>

          {analysis.ledgerSheets.length > 0 && (
            <section className={`rounded-ledger border bg-white px-4 py-3 ${includeLedger ? 'border-paper-line' : 'border-dashed border-paper-line opacity-70'}`}>
              <label className="flex items-center gap-2.5">
                <input type="checkbox" checked={includeLedger} onChange={(event) => setIncludeLedger(event.target.checked)} className="h-4 w-4 accent-stamp" aria-label="Import the Cash book" />
                <span className="font-display text-[16px] font-bold">Cash book</span>
                <span className="text-[12.5px] text-ink-soft">from sheet “{analysis.ledgerSheets.join('”, “')}”</span>
              </label>
              {ledgerCheck && (
                <p className="mt-1 text-[13px]">
                  {ledgerCheck.counts.ready} {ledgerCheck.counts.ready === 1 ? 'entry' : 'entries'} ready
                  {ledgerCheck.readyTotals && `: ${formatMoneyCell(ledgerCheck.readyTotals.moneyIn)} money in, ${formatMoneyCell(ledgerCheck.readyTotals.moneyOut)} money out`}
                  {ledgerCheck.counts.duplicate > 0 && ` · ${ledgerCheck.counts.duplicate} already there`}
                  {ledgerCheck.counts.skipped > 0 && ` · ${ledgerCheck.counts.skipped} ${ledgerCheck.counts.skipped === 1 ? 'line' : 'lines'} your sheet works out itself left out`}
                  {ledgerCheck.counts.problem > 0 && ` · ${ledgerCheck.counts.problem} with a problem`}
                </p>
              )}
              {ledgerCheck && ledgerCheck.problems.length > 0 && (
                <ul className="mt-1 list-disc pl-5 text-[12.5px] text-rust">
                  {ledgerCheck.problems.slice(0, 3).map((p) => (
                    <li key={`${p.sheetName}-${p.rowNumber}`}>
                      Row {p.rowNumber}: {p.message}
                    </li>
                  ))}
                </ul>
              )}
            </section>
          )}

          <div className="flex flex-col gap-3">
            {analysis.tables.map((t) => (
              <TableCard key={t.name} table={t} on={include[t.name] ?? t.include} onToggle={(on) => setInclude((cur) => ({ ...cur, [t.name]: on }))} />
            ))}
            {analysis.skipped.length > 0 && (
              <p className="text-[12.5px] text-ink-soft">
                Left out: {analysis.skipped.map((s) => `${s.sheet} (${s.reason.toLowerCase()})`).join(' · ')}
              </p>
            )}
          </div>

          <section className="rounded-ledger border border-paper-line bg-paper-edge px-4 py-3 text-[13px]" aria-live="polite">
            <b className="mb-1 block text-[14px]">Checked against your file</b>
            {nothing ? (
              <span className="text-ink-soft">Switch on at least one table.</span>
            ) : checking && !report ? (
              <span className="text-ink-soft">Checking…</span>
            ) : reportError ? (
              <span className="text-rust">{reportError}</span>
            ) : report && totalTables > 0 ? (
              <div className="flex flex-col gap-1.5">
                {report.formulas.checked > 0 ? (
                  <span className={report.formulas.differ === 0 ? 'text-green' : ''}>
                    <b>{report.formulas.matched} of {report.formulas.checked}</b> formula cells give the same number as your file{report.formulas.differ > 0 ? `; ${report.formulas.differ} differ` : '.'}
                  </span>
                ) : (
                  <span className="text-ink-soft">No formula columns to check.</span>
                )}
                {report.formulas.samples.slice(0, 5).map((s, i) => (
                  <span key={i} className="text-[12.5px] text-rust">
                    {s.table} · {s.column}, row {s.row}: your file says {num(s.expected)}, we get {num(s.got)}
                  </span>
                ))}
                {report.links.linked > 0 && <span>{report.links.linked} links between tables made.</span>}
                {report.links.unlinked > 0 && (
                  <span className="text-brass">
                    {report.links.unlinked} {report.links.unlinked === 1 ? 'name does' : 'names do'} not match a row of the linked table (left empty): {report.links.samples.slice(0, 3).map((s) => `“${s.value}”`).join(', ')}
                  </span>
                )}
                {report.dropped.count > 0 && (
                  <span className="text-brass">
                    {report.dropped.count} {report.dropped.count === 1 ? 'cell' : 'cells'} could not be read and will be empty: {report.dropped.samples.slice(0, 2).map((s) => `${s.table} · ${s.column}, row ${s.row}`).join('; ')}
                  </span>
                )}
                {report.rules.map((r) => (
                  <span key={r.table}>
                    {r.table} → Cash book: {r.posting} of {r.of} rows post, total {formatMoneyCell(Math.abs(r.total))}.
                  </span>
                ))}
                {(ledgerCheck || report.rules.length > 0) && (
                  <span className="mt-1 border-t border-paper-line pt-1.5">
                    Cash book after the import: money in <b className="tabular">{formatMoneyCell(cashAfter.moneyIn)}</b> · money out <b className="tabular">{formatMoneyCell(cashAfter.moneyOut)}</b> · balance <b className="tabular">{formatMoneyCell(cashAfter.balance)}</b>
                  </span>
                )}
              </div>
            ) : null}
          </section>

          {problem && (
            <p role="alert" className="text-sm text-rust">
              {problem}
            </p>
          )}
          <div className="flex flex-wrap justify-between gap-3">
            <Button variant="ghost" onClick={() => setStep('choose')}>
              Choose another file
            </Button>
            <div className="flex gap-3">
              <Button variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button onClick={() => void create()} disabled={creating || nothing || checking || Boolean(reportError)}>
                {creating ? 'Creating…' : 'Create my tables'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {step === 'done' && done && (
        <div className="flex flex-col gap-4">
          <p className="text-[15px]">
            <b>Your system is ready.</b> {done.report.tables.length} {done.report.tables.length === 1 ? 'table' : 'tables'}, {done.report.formulas.checked} formula cells checked
            {done.ledger ? `, ${done.ledger.created} Cash book entries` : ''}
            {done.report.posted > 0 ? `, ${done.report.posted} rows posted from your tables` : ''}.
          </p>
          <p className="text-sm text-ink-soft">If something is wrong, undo the whole import in one click.</p>
          {problem && (
            <p role="alert" className="text-sm text-rust">
              {problem}
            </p>
          )}
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => void undo()} disabled={creating}>
              Undo this import
            </Button>
            <Button
              onClick={() => {
                onCreated(done.report.tables[0]?.id ?? null)
                onClose()
              }}
            >
              Open my tables
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
