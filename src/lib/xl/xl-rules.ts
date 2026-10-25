import { CASHBOOK_TABLE } from '../cashbook-import'
import { segmentGrid, type SheetGrid } from '../sheet-segments'
import type { XCell, XSheet } from './read'
import type { Analysis, AnalyzedTable, RuleProposal } from './xl-analyze'
import { parseExcel, type XNode } from './xl-formula'

// Reads the ledger sheet's own formulas to learn which tables feed the Cash book and when:
//   =SUMIFS(Orders!K:K, Orders!M:M, "Delivered")   inside the "(money in)" block
// becomes the rule "Orders → Cash book, when Status is Delivered, money in, Total".

export function sheetGrid(sheet: XSheet): SheetGrid {
  return {
    name: sheet.name,
    rows: sheet.rows
      .map((row, index) => {
        const cells = row.map((c) => cellText(c))
        while (cells.length > 0 && cells[cells.length - 1] === '') cells.pop()
        return { cells, links: cells.map(() => null), rowNumber: index + 1 }
      })
      .filter((r) => r.cells.some((c) => c !== '')),
  }
}

function cellText(c: XCell | undefined): string {
  if (!c || c.v === null) return ''
  if (typeof c.v === 'boolean') return c.v ? 'Yes' : ''
  return String(c.v)
}


interface Found {
  tableName: string
  col: number
}

function refTarget(node: XNode, analysis: Analysis): Found | null {
  if (node.t !== 'ref' || node.c1 !== node.c2) return null
  const t = analysis.tables.find((x) => x.region.sheet === node.sheet && x.region.cols.has(node.c1))
  return t ? { tableName: t.name, col: node.c1 } : null
}

function criterion(node: XNode): { op: 'eq' | 'ne'; value: string } | null {
  if (node.t !== 'str') return null
  const m = /^(<>|=)?\s*(.+)$/.exec(node.v)
  if (!m || /^[<>]/.test(m[2])) return null
  return { op: m[1] === '<>' ? 'ne' : 'eq', value: m[2].trim() }
}

export function proposeRules(sheets: XSheet[], analysis: Analysis): void {
  for (const name of analysis.ledgerSheets) {
    const sheet = sheets.find((s) => s.name === name)
    if (!sheet) continue
    const segments = segmentGrid(sheetGrid(sheet), CASHBOOK_TABLE)
    sheet.rows.forEach((row, r) => {
      row.forEach((cell) => {
        if (!cell?.f) return
        let node: XNode
        try {
          node = parseExcel(cell.f)
        } catch {
          return
        }
        if (node.t !== 'call' || !['SUMIFS', 'SUMIF', 'SUM'].includes(node.name)) return
        const segment = segments.find((s) => s.rows.some((x) => x.rowNumber === r + 1))
        if (!segment?.direction) return
        let sumRef: XNode | undefined
        const pairs: [XNode, XNode][] = []
        if (node.name === 'SUMIFS') {
          sumRef = node.args[0]
          for (let i = 1; i + 1 < node.args.length; i += 2) pairs.push([node.args[i], node.args[i + 1]])
        } else if (node.name === 'SUMIF') {
          sumRef = node.args[2] ?? node.args[0]
          if (node.args[1]) pairs.push([node.args[0], node.args[1]])
        } else sumRef = node.args[0]
        const amount = sumRef ? refTarget(sumRef, analysis) : null
        if (!amount) return
        const table = analysis.tables.find((t) => t.name === amount.tableName) as AnalyzedTable
        if (table.rule) return
        const amountColumn = table.columns.find((c) => c.col === amount.col)
        if (!amountColumn) return
        const when: RuleProposal['when'] = []
        for (const [rangeNode, critNode] of pairs) {
          const target = refTarget(rangeNode, analysis)
          const crit = criterion(critNode)
          const column = target && target.tableName === table.name ? table.columns.find((c) => c.col === target.col) : undefined
          if (!column || !crit) return // a condition we cannot read: do not guess a rule
          when.push({ field: column.key, op: crit.op, value: crit.value })
        }
        const dateColumn = table.columns.find((c) => c.type === 'DATE' && /deliver|paid on|settled|completed|done/i.test(c.name)) ?? table.columns.find((c) => c.type === 'DATE')
        const auto = table.columns.find((c) => c.type === 'AUTO')
        const textCol = table.columns.find((c) => c.type === 'TEXT')
        const description = [auto, textCol].filter(Boolean).map((c) => `{${(c as { name: string }).name}}`).join(' · ')
        table.rule = {
          amount: amountColumn.key,
          date: dateColumn?.key ?? null,
          direction: segment.direction === 'in' ? 'IN' : 'OUT',
          when,
          description,
          from: cell.f,
        }
      })
    })
  }
}
