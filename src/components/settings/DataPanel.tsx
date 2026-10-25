import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAccounts } from '../../lib/accounts'
import { useBusiness, useDeleteBusiness } from '../../lib/businesses'
import { downloadFile } from '../../lib/download'
import { exportFileName, toCsv, toXlsx } from '../../lib/export-table'
import { exportBookName, saveExport } from '../../lib/export-formulas'
import { cashbookExport, type ExportSheet } from '../../lib/export-rows'
import { useToast } from '../../lib/toast-context'
import { useTransactions } from '../../lib/transactions'
import { Button } from '../Button'
import { ConfirmDialog } from '../ConfirmDialog'
import { ImportWizardHost } from '../import/ImportWizardHost'
import { Panel } from '../Panel'
import { Select } from '../Select'


// Settings → Data: bring a file in, take a table out, and the one thing that
// cannot be undone. Categories, table names and what a table posts live on the tables.
export function DataPanel({ businessId }: { businessId: string }) {
  const navigate = useNavigate()
  const toast = useToast()
  const { data: business } = useBusiness(businessId)
  const { data: accounts } = useAccounts(businessId)
  const cashAccount = accounts?.[0]
  const { data: transactions } = useTransactions(businessId, cashAccount?.id)
  const deleteBusiness = useDeleteBusiness()

  const [importing, setImporting] = useState(false)
  const [format, setFormat] = useState<'xlsx' | 'csv'>('xlsx')
  const [confirmingDelete, setConfirmingDelete] = useState(false)

  const sheetFor = (): ExportSheet | null => (transactions ? cashbookExport('Cash book', transactions) : null)

  async function handleExport() {
    const sheet = sheetFor()
    if (!sheet) {
      toast('Still loading. Try again in a moment.')
      return
    }
    try {
      if (format === 'csv') {
        downloadFile(toCsv(sheet.headers, sheet.rows), exportFileName(sheet.name, 'csv'), 'text/csv;charset=utf-8')
      } else {
        const XLSX = await import('xlsx')
        downloadFile(toXlsx(XLSX, sheet.name, sheet.headers, sheet.rows).slice().buffer, exportFileName(sheet.name, 'xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
      }
      toast(`${sheet.rows.length} rows saved.`)
    } catch {
      toast('Could not save the file.')
    }
  }

  const [savingAll, setSavingAll] = useState(false)
  async function handleExportAll() {
    setSavingAll(true)
    try {
      const sheets = await saveExport(businessId, exportBookName(business?.name ?? 'tables'))
      toast(sheets === 1 ? '1 table saved.' : `${sheets} tables saved.`)
    } catch {
      toast('Could not save the file.')
    } finally {
      setSavingAll(false)
    }
  }

  async function handleDelete() {
    await deleteBusiness.mutateAsync(businessId)
    navigate('/')
  }

  return (
    <div className="flex max-w-2xl flex-col gap-6">
      <Panel title="Import">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <p className="max-w-md text-[13.5px] text-ink-soft">Bring in an Excel or CSV file. You see what would happen before anything is saved, and can undo it.</p>
          <Button onClick={() => setImporting(true)} disabled={!cashAccount}>
            Import a file
          </Button>
        </div>
      </Panel>

      <Panel title="Export the Cash book">
        <div className="flex flex-wrap items-end gap-4 px-5 py-4">
          <Select label="File" value={format} onChange={(event) => setFormat(event.target.value as 'xlsx' | 'csv')}>
            <option value="xlsx">Excel (.xlsx)</option>
            <option value="csv">CSV (.csv)</option>
          </Select>
          <Button onClick={() => void handleExport()}>Export</Button>
        </div>
      </Panel>

      <Panel title="Export with formulas">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <p className="max-w-md text-[13.5px] text-ink-soft">Every table of your own as one Excel file. Formula columns and function rows stay formulas, so the file still adds up in Excel and can be uploaded again.</p>
          <Button onClick={() => void handleExportAll()} disabled={savingAll}>
            {savingAll ? 'Saving…' : 'Export all tables'}
          </Button>
        </div>
      </Panel>

      <Panel title="Danger zone">
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div>
            <div className="font-medium">Delete this business</div>
            <div className="text-[13px] text-ink-soft">Removes every entry, order, cost, client and invoice. This cannot be undone.</div>
          </div>
          <Button variant="danger" onClick={() => setConfirmingDelete(true)}>
            Delete business
          </Button>
        </div>
      </Panel>

      {importing && cashAccount && <ImportWizardHost businessId={businessId} accountId={cashAccount.id} onClose={() => setImporting(false)} />}

      {confirmingDelete && (
        <ConfirmDialog
          title={`Delete ${business?.name ?? 'this business'}?`}
          body="Every entry, order, cost, client and invoice will be permanently removed."
          confirmLabel="Delete business"
          isPending={deleteBusiness.isPending}
          onConfirm={handleDelete}
          onCancel={() => setConfirmingDelete(false)}
        />
      )}
    </div>
  )
}
