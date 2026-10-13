import { describe, expect, it } from 'vitest'
import { countKeys, looksLikeHeader, markDuplicates, matchHeaders, parseDelimited, prepareRows, rowValues, runnerOf, type ImportTarget } from './paste-import'

const TARGETS: ImportTarget[] = [
  { id: 'date', label: 'Date', synonyms: ['day'] },
  { id: 'desc', label: 'Description', synonyms: ['what for', 'details'] },
  { id: 'cat', label: 'Category', synonyms: ['type', 'head'] },
  { id: 'inn', label: 'Money in', synonyms: ['in', 'income'] },
  { id: 'out', label: 'Money out', synonyms: ['out', 'expense'] },
  { id: 'proof', label: 'Proof link', synonyms: ['link'] },
]

describe('parseDelimited', () => {
  it('reads tab-separated text (what Excel copies)', () => {
    expect(parseDelimited('a\tb\tc\n1\t2\t3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('reads comma-separated text (a saved CSV) when there are no tabs', () => {
    expect(parseDelimited('a,b\n1,2\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('keeps commas inside tab-separated cells (1,250)', () => {
    expect(parseDelimited('Sales\t1,250\t')).toEqual([['Sales', '1,250', '']])
  })

  it('handles quotes, doubled quotes and line breaks inside a quoted cell', () => {
    expect(parseDelimited('"Smith, J"\t"say ""hi"""\t"two\nlines"')).toEqual([['Smith, J', 'say "hi"', 'two\nlines']])
    expect(parseDelimited('"a,b",c')).toEqual([['a,b', 'c']])
  })

  it('handles Windows line endings, a byte order mark and blank lines', () => {
    expect(parseDelimited('﻿a\tb\r\n\r\n1\t2\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('trims cells and gives nothing for empty input', () => {
    expect(parseDelimited('  a  \t b ')).toEqual([['a', 'b']])
    expect(parseDelimited('   \n  ')).toEqual([])
    expect(parseDelimited('')).toEqual([])
  })

  it('a quote in the middle of a cell is just a character', () => {
    expect(parseDelimited('5" pipe\tx')).toEqual([['5" pipe', 'x']])
  })
})

describe('matchHeaders', () => {
  it('maps by label or by other name, ignoring case and punctuation', () => {
    expect(matchHeaders(['Date', 'What for', 'Type', 'In', 'Out', 'Link'], TARGETS)).toEqual(['date', 'desc', 'cat', 'inn', 'out', 'proof'])
    expect(matchHeaders(['DATE:', ' money  IN ', 'Proof-link'], TARGETS)).toEqual(['date', 'inn', 'proof'])
  })

  it('uses a target once and prefers the label', () => {
    // "In" is a synonym of Money in, but the real "Money in" header wins it.
    expect(matchHeaders(['In', 'Money in'], TARGETS)).toEqual([null, 'inn'])
  })

  it('leaves unknown columns out', () => {
    expect(matchHeaders(['Date', 'Remarks', ''], TARGETS)).toEqual(['date', null, null])
  })
})

describe('looksLikeHeader / prepareRows', () => {
  it('needs at least two named columns to call a row a header', () => {
    expect(looksLikeHeader(['Date', 'Amount?'], TARGETS)).toBe(false)
    expect(looksLikeHeader(['Date', 'What for'], TARGETS)).toBe(true)
  })

  it('takes the header row off and maps by name', () => {
    const prepared = prepareRows(
      [
        ['Date', 'What for', 'Type', 'In', 'Out', 'Link'],
        ['14 Oct 2026', 'Payment', 'Sales', '8,000', '', ''],
      ],
      TARGETS,
    )
    expect(prepared.headers).toEqual(['Date', 'What for', 'Type', 'In', 'Out', 'Link'])
    expect(prepared.mapping).toEqual(['date', 'desc', 'cat', 'inn', 'out', 'proof'])
    expect(prepared.rows).toHaveLength(1)
  })

  it('without a header, fills the columns in the table\'s own order', () => {
    const prepared = prepareRows([['14 Oct 2026', 'Payment', 'Sales', '8,000']], TARGETS)
    expect(prepared.headers).toBeNull()
    expect(prepared.mapping).toEqual(['date', 'desc', 'cat', 'inn'])
    expect(prepared.rows).toHaveLength(1)
  })

  it('more columns than the table has: the extra ones are left out', () => {
    const prepared = prepareRows([['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']], TARGETS)
    expect(prepared.mapping.slice(6)).toEqual([null, null])
  })

  it('nothing in, nothing out', () => {
    expect(prepareRows([], TARGETS)).toEqual({ headers: null, mapping: [], rows: [] })
  })
})

describe('rowValues', () => {
  it('collects the cells by target id and skips left-out columns', () => {
    expect(rowValues(['1 May 2026', 'x', 'Sales'], ['date', null, 'cat'])).toEqual({ date: '1 May 2026', cat: 'Sales' })
  })
  it('a short row just has fewer values', () => {
    expect(rowValues(['1 May 2026'], ['date', 'desc'])).toEqual({ date: '1 May 2026' })
  })
})

describe('markDuplicates', () => {
  const ok = (key: string) => ({ check: { status: 'ok' as const, row: key }, key })

  it('skips rows that are already there', () => {
    const result = markDuplicates([ok('a'), ok('b')], countKeys(['a']))
    expect(result.map((r) => r.status)).toEqual(['duplicate', 'ok'])
  })

  it('counts copies: one existing copy covers only the first of two identical rows', () => {
    const result = markDuplicates([ok('a'), ok('a'), ok('a')], countKeys(['a']))
    expect(result.map((r) => r.status)).toEqual(['duplicate', 'ok', 'ok'])
    expect(markDuplicates([ok('a'), ok('a')], countKeys(['a', 'a'])).map((r) => r.status)).toEqual(['duplicate', 'duplicate'])
  })

  it('does not touch rows that already have a problem', () => {
    const bad = { check: { status: 'error' as const, message: 'no' }, key: 'a' }
    expect(markDuplicates([bad], countKeys(['a']))[0]).toEqual({ status: 'error', message: 'no' })
  })

  it('does not change the table\'s own counts', () => {
    const existing = countKeys(['a'])
    markDuplicates([ok('a')], existing)
    expect(existing.get('a')).toBe(1)
  })
})

describe('runnerOf', () => {
  it('checks rows, marks the ones already there, and hands rows back to its own commit', async () => {
    const committed: string[][] = []
    const runner = runnerOf<string>({
      noun: 'things',
      singular: 'thing',
      title: 'Things',
      targets: [{ id: 'name', label: 'Name' }],
      existing: countKeys(['a']),
      check: (list) => list.map((values) => ({ check: { status: 'ok' as const, row: values.name }, key: values.name })),
      commit: async (rows) => {
        committed.push(rows)
        return { batchId: 'b1', created: rows.length }
      },
      undo: async () => undefined,
    })
    const results = runner.evaluate([{ name: 'a' }, { name: 'b' }], { createCategories: false })
    expect(results.map((r) => r.status)).toEqual(['duplicate', 'ok'])
    const ready = results.flatMap((r) => (r.status === 'ok' ? [r.row] : []))
    expect(await runner.commit(ready, { createCategories: false })).toEqual({ batchId: 'b1', created: 1 })
    expect(committed).toEqual([['b']])
    expect(runner.totals).toBeNull()
    expect(runner.offersNewCategories).toBe(false)
  })
})
