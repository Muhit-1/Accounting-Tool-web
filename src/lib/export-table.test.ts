import * as XLSX from 'xlsx'
import { describe, expect, it } from 'vitest'
import { exportFileName, exportValue, neutralizeText, toCsv, toXlsx } from './export-table'

describe('neutralizeText', () => {
  it.each(['=SUM(A1:A9)', '+1+1', '-2+3', '@SUM(1)', '=HYPERLINK("http://evil.example","x")', '\t=1', '\r=1'])('makes %j harmless', (text) => {
    expect(neutralizeText(text)).toBe(`'${text}`)
  })
  it.each(['Rent', '5 - 3', 'a=b', 'Tom@home', '', '12 May 2026', "'already"])('leaves %j as it is', (text) => {
    expect(neutralizeText(text)).toBe(text)
  })
})

describe('exportValue', () => {
  it('keeps numbers as numbers, including negative ones', () => {
    expect(exportValue(-5)).toBe(-5)
    expect(exportValue(1250.5)).toBe(1250.5)
    expect(exportValue(0)).toBe(0)
  })
  it('turns nothing into an empty cell and drops non-finite numbers', () => {
    expect(exportValue(null)).toBe('')
    expect(exportValue(undefined)).toBe('')
    expect(exportValue(Number.NaN)).toBe('')
  })
})

describe('toCsv', () => {
  it('writes a header, rows, quotes where needed and a byte order mark', () => {
    const csv = toCsv(['Date', 'What for', 'Amount'], [['12 May 2026', 'Stickers, large', 1250], ['13 May 2026', 'He said "hi"', 5.5]])
    expect(csv).toBe('﻿Date,What for,Amount\r\n12 May 2026,"Stickers, large",1250\r\n13 May 2026,"He said ""hi""",5.5\r\n')
  })

  it('neutralises formula-looking text but not numbers', () => {
    const csv = toCsv(['What', 'Amount'], [['=1+1', -5], ['-note', 3]])
    expect(csv).toBe("﻿What,Amount\r\n'=1+1,-5\r\n'-note,3\r\n")
  })

  it('keeps line breaks inside quoted cells', () => {
    expect(toCsv(['a'], [['two\nlines']])).toBe('﻿a\r\n"two\nlines"\r\n')
  })
})

describe('toXlsx', () => {
  it('writes a workbook whose cells are values, with text neutralised and numbers kept', () => {
    const bytes = toXlsx(XLSX, 'Cash book', ['What', 'Amount'], [['=1+1', 1250], ['Rent', -5]])
    const book = XLSX.read(bytes, { type: 'array', cellFormula: true })
    expect(book.SheetNames).toEqual(['Cash book'])
    const sheet = book.Sheets['Cash book']
    expect(sheet.A2.v).toBe("'=1+1")
    expect(sheet.A2.f).toBeUndefined()
    expect(sheet.B2).toMatchObject({ t: 'n', v: 1250 })
    expect(sheet.B3).toMatchObject({ t: 'n', v: -5 })
  })

  it('cleans the sheet name', () => {
    const book = XLSX.read(toXlsx(XLSX, 'Q1/Q2: [draft]?', ['a'], []), { type: 'array' })
    expect(book.SheetNames[0]).toBe('Q1 Q2   draft')
  })
})

describe('exportFileName', () => {
  it('is the table name and the day', () => {
    expect(exportFileName('Cash book', 'csv', new Date(2026, 9, 13))).toBe('Cash-book-2026-10-13.csv')
    expect(exportFileName('Orders / 2026', 'xlsx', new Date(2026, 0, 5))).toBe('Orders-2026-2026-01-05.xlsx')
    expect(exportFileName('???', 'csv', new Date(2026, 0, 5))).toBe('table-2026-01-05.csv')
  })
})
