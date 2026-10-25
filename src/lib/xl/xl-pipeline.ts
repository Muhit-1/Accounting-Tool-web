import { CASHBOOK_TABLE } from '../cashbook-import'
import { planSheets } from '../import-plan'
import type { XSheet } from './read'
import { analyzeWorkbook, type Analysis } from './xl-analyze'
import { proposeRules, sheetGrid } from './xl-rules'

// The whole reading of a workbook: which sheets are the ledger (the Cash book import handles those),
// what the other sheets are, and which of them feed the Cash book.
export function analyzeSheets(sheets: XSheet[]): Analysis {
  const visible = sheets.filter((s) => !s.hidden)
  const plans = planSheets(visible.map(sheetGrid), [CASHBOOK_TABLE])
  const ledgerSheets = plans.filter((p) => p.tableKey === 'cashbook').map((p) => p.sheet.name)
  const analysis = analyzeWorkbook(sheets, { ledgerSheets })
  proposeRules(sheets, analysis)
  return analysis
}
