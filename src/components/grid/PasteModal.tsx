import { useMemo, useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { bulkRowErrors } from '../../lib/bulk-errors'
import {
  MAX_IMPORT_ROWS,
  markDuplicates,
  parseDelimited,
  prepareRows,
  rowValues,
  type ImportAdapter,
  type RowCheck,
} from '../../lib/paste-import'
import { useToast } from '../../lib/toast-context'
import { Modal } from '../Modal'
import { Button } from '../Button'

const PREVIEW_ROWS = 40

// "Paste from Excel": copy rows in Excel or Google Sheets, paste, see which
// rows are fine and why the others are not, then add them in one go. The same
// screen serves every table — the table's adapter says how to read a row.
export function PasteModal<Row>({
  adapter,
  initialText,
  onClose,
}: {
  adapter: ImportAdapter<Row>
  initialText: string
  onClose: () => void
}) {
  const toast = useToast()
  const [text, setText] = useState(initialText)
  const [createCategories, setCreateCategories] = useState(true)
  const [saving, setSaving] = useState(false)
  const [problem, setProblem] = useState<string | null>(null)

  const analysis = useMemo(() => {
    const parsed = parseDelimited(text)
    if (parsed.length === 0) return null
    const prepared = prepareRows(parsed, adapter.targets)
    const tooMany = prepared.rows.length > MAX_IMPORT_ROWS
    const checked = tooMany ? [] : adapter.check(prepared.rows.map((cells) => rowValues(cells, prepared.mapping)), { createCategories })
    const results: RowCheck<Row>[] = markDuplicates(checked, adapter.existing)
    const labels = prepared.mapping.map((id) => adapter.targets.find((target) => target.id === id)?.label ?? null)
    return { prepared, results, tooMany, labels }
  }, [text, adapter, createCategories])

  const ready = analysis ? analysis.results.flatMap((result) => (result.status === 'ok' ? [result.row] : [])) : []
  const duplicates = analysis ? analysis.results.filter((result) => result.status === 'duplicate').length : 0
  const skippedOnPurpose = analysis ? analysis.results.filter((result) => result.status === 'skipped').length : 0
  const bad = analysis ? analysis.results.length - ready.length - duplicates - skippedOnPurpose : 0
  const summary = ready.length > 0 ? (adapter.summarize?.(ready) ?? null) : null
  // Columns shown in the preview: the first few that were matched.
  const shownColumns = analysis ? analysis.prepared.mapping.flatMap((id, index) => (id ? [index] : [])).slice(0, 4) : []

  async function submit() {
    if (ready.length === 0) {
      setProblem('Nothing to add yet. Paste rows with the columns above.')
      return
    }
    setSaving(true)
    setProblem(null)
    try {
      const done = await adapter.commit(ready, { createCategories })
      onClose()
      toast(`${done.created} ${done.created === 1 ? adapter.singular : adapter.noun} added.`, {
        undo: () => {
          void adapter
            .undo(done.batchId)
            .then(() => toast('Paste undone.'))
            .catch(() => toast('Could not undo that paste.'))
        },
      })
    } catch (err) {
      const rowProblems = bulkRowErrors(err)
      setProblem(
        rowProblems.length > 0
          ? `${err instanceof ApiError ? err.message : 'Some rows were refused.'} ${rowProblems
              .slice(0, 3)
              .map((entry) => `Row ${entry.index + 1}: ${entry.message}`)
              .join(' · ')}`
          : err instanceof ApiError
            ? err.message
            : 'Something went wrong. Nothing was added.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal title="Paste from Excel" wide onClose={onClose}>
      <p className="text-[13.5px] text-ink-soft">
        Copy rows in Excel or Google Sheets, then paste here. Order of columns: {adapter.targets.map((target) => target.label).join(' · ')}. A header row is
        matched by name.
      </p>

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-medium tracking-wider text-ink-soft uppercase">Pasted rows</span>
        <textarea
          value={text}
          rows={5}
          autoFocus
          placeholder="Paste here (Ctrl+V)"
          onChange={(event) => {
            setText(event.target.value)
            setProblem(null)
          }}
          className="tabular rounded-ledger border border-paper-line bg-white px-3 py-2 text-[12.5px] focus:border-stamp focus:outline-none"
        />
      </label>

      {adapter.offersNewCategories && (
        <label className="flex items-center gap-2 text-[13.5px]">
          <input
            type="checkbox"
            checked={createCategories}
            onChange={(event) => setCreateCategories(event.target.checked)}
            className="h-4 w-4 accent-stamp"
          />
          Create categories that don’t exist yet
        </label>
      )}

      {analysis?.tooMany && (
        <p className="rounded-ledger border border-brass-line bg-brass-soft px-3 py-2 text-[13px] text-brass" role="alert">
          That is more than {MAX_IMPORT_ROWS.toLocaleString('en-US')} rows. Paste or import {MAX_IMPORT_ROWS.toLocaleString('en-US')} rows at a time.
        </p>
      )}

      {analysis && !analysis.tooMany && (
        <>
          <div
            className={`rounded-ledger border px-3 py-2 text-[13px] ${bad > 0 || duplicates > 0 ? 'border-brass-line bg-brass-soft text-brass' : 'border-green/30 bg-green-soft text-green'}`}
          >
            {ready.length} ready
            {bad > 0 ? ` · ${bad} will be skipped` : ''}
            {duplicates > 0 ? ` · ${duplicates} already there` : ''}
            {analysis.prepared.headers ? ' · header row matched' : ''}
            {summary ? ` · ${summary}` : ''}
          </div>

          <div className="max-h-[260px] overflow-auto rounded-ledger border border-paper-line">
            <table className="w-full border-collapse text-[13px]">
              <thead>
                <tr className="bg-black/[0.02] text-left text-[12px] tracking-wider text-ink-soft uppercase">
                  <th className="px-3 py-2" />
                  {shownColumns.map((index) => (
                    <th key={index} className="px-3 py-2 font-semibold">
                      {analysis.labels[index]}
                    </th>
                  ))}
                  <th className="px-3 py-2 font-semibold">Check</th>
                </tr>
              </thead>
              <tbody>
                {analysis.results.slice(0, PREVIEW_ROWS).map((result, rowIndex) => (
                  <tr key={rowIndex} className="border-t border-paper-edge">
                    <td className="px-3 py-1.5">
                      {result.status === 'ok' ? <span className="text-green">✓</span> : result.status === 'duplicate' || result.status === 'skipped' ? <span className="text-brass">＝</span> : <span className="text-rust">✕</span>}
                    </td>
                    {shownColumns.map((index) => (
                      <td key={index} className="max-w-[200px] truncate px-3 py-1.5">
                        {analysis.prepared.rows[rowIndex]?.[index] ?? ''}
                      </td>
                    ))}
                    <td
                      className={`px-3 py-1.5 text-[12.5px] ${result.status === 'ok' ? 'text-green' : result.status === 'duplicate' || result.status === 'skipped' ? 'text-brass' : 'text-rust'}`}
                    >
                      {result.status === 'ok' ? 'Ready' : result.status === 'duplicate' ? 'Already there — skipped' : result.status === 'skipped' ? result.reason : result.message}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {analysis.results.length > PREVIEW_ROWS && (
            <p className="text-[12.5px] text-ink-soft">
              Showing the first {PREVIEW_ROWS} of {analysis.results.length} rows.
            </p>
          )}
        </>
      )}

      {problem && (
        <p className="text-sm text-rust" role="alert">
          {problem}
        </p>
      )}

      <div className="flex justify-end gap-3">
        <Button type="button" variant="ghost" onClick={onClose}>
          Cancel
        </Button>
        <Button type="button" disabled={saving || ready.length === 0} onClick={() => void submit()}>
          {saving ? 'Adding…' : `Add ${ready.length} ${ready.length === 1 ? 'row' : 'rows'}`}
        </Button>
      </div>
    </Modal>
  )
}
