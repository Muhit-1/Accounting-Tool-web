import { describe, expect, it } from 'vitest'
import { checkWorkbookFile, excelSerialToIso, fileExtension, readDelimitedFile, zipParts } from './workbook'

// A minimal zip with the given part names and unpacked sizes: just the table of
// contents (central directory) and the end record, which is all zipParts reads.
function zipWith(parts: { name: string; size: number }[]): Uint8Array {
  const encoder = new TextEncoder()
  const entries = parts.map((part) => {
    const name = encoder.encode(part.name)
    const entry = new Uint8Array(46 + name.length)
    const view = new DataView(entry.buffer)
    view.setUint32(0, 0x02014b50, true)
    view.setUint32(24, part.size, true)
    view.setUint16(28, name.length, true)
    entry.set(name, 46)
    return entry
  })
  const directory = entries.reduce((total, entry) => total + entry.length, 0)
  const bytes = new Uint8Array(directory + 22)
  let offset = 0
  for (const entry of entries) {
    bytes.set(entry, offset)
    offset += entry.length
  }
  const end = new DataView(bytes.buffer, directory)
  end.setUint32(0, 0x06054b50, true)
  end.setUint16(10, parts.length, true)
  end.setUint32(12, directory, true)
  end.setUint32(16, 0, true)
  return bytes
}

describe('fileExtension', () => {
  it('is the last part, lower case', () => {
    expect(fileExtension('Ledger.XLSX')).toBe('xlsx')
    expect(fileExtension('a.b.csv')).toBe('csv')
    expect(fileExtension('noextension')).toBe('')
  })
})

describe('zipParts', () => {
  it('lists the parts and their unpacked sizes', () => {
    expect(zipParts(zipWith([{ name: 'xl/workbook.xml', size: 1200 }, { name: 'xl/worksheets/sheet1.xml', size: 5000 }]))).toEqual([
      { name: 'xl/workbook.xml', size: 1200 },
      { name: 'xl/worksheets/sheet1.xml', size: 5000 },
    ])
  })
  it('says null for something that is not a zip', () => {
    expect(zipParts(new TextEncoder().encode('just some text, not a zip file at all'))).toBeNull()
    expect(zipParts(new Uint8Array(5))).toBeNull()
  })
  it('treats a zip64 size marker as too big to trust', () => {
    expect(zipParts(zipWith([{ name: 'x', size: 0xffffffff }]))?.[0].size).toBe(Infinity)
  })
})

describe('checkWorkbookFile', () => {
  const ok = zipWith([{ name: 'xl/workbook.xml', size: 1000 }])

  it('lets a normal workbook and a csv through', () => {
    expect(checkWorkbookFile({ name: 'ledger.xlsx', size: 20_000 }, ok)).toBeNull()
    expect(checkWorkbookFile({ name: 'ledger.csv', size: 20_000 })).toBeNull()
    expect(checkWorkbookFile({ name: 'ledger.TSV', size: 20_000 })).toBeNull()
  })

  it('refuses macro workbooks by name and by content', () => {
    expect(checkWorkbookFile({ name: 'ledger.xlsm', size: 100 })).toMatch(/macros/)
    expect(checkWorkbookFile({ name: 'ledger.xlsb', size: 100 })).toMatch(/macros/)
    const hidden = zipWith([{ name: 'xl/vbaProject.bin', size: 100 }])
    expect(checkWorkbookFile({ name: 'ledger.xlsx', size: 100 }, hidden)).toMatch(/macros/)
    expect(checkWorkbookFile({ name: 'ledger.xlsx', size: 100 }, zipWith([{ name: 'xl/macrosheets/sheet1.xml', size: 1 }]))).toMatch(/macros/)
  })

  it('does not mistake the printer settings every workbook has for macros', () => {
    expect(checkWorkbookFile({ name: 'a.xlsx', size: 100 }, zipWith([{ name: 'xl/printerSettings/printerSettings1.bin', size: 100 }]))).toBeNull()
  })

  it('refuses other file kinds, empty files and big files', () => {
    expect(checkWorkbookFile({ name: 'ledger.xls', size: 100 })).toMatch(/\.xlsx/)
    expect(checkWorkbookFile({ name: 'ledger.pdf', size: 100 })).toMatch(/\.xlsx/)
    expect(checkWorkbookFile({ name: 'ledger.csv', size: 0 })).toMatch(/empty/)
    expect(checkWorkbookFile({ name: 'ledger.csv', size: 5 * 1024 * 1024 + 1 })).toMatch(/5 MB/)
    expect(checkWorkbookFile({ name: 'ledger.csv', size: 5 * 1024 * 1024 })).toBeNull()
  })

  it('refuses a zip that unpacks to a huge size or has too many parts', () => {
    expect(checkWorkbookFile({ name: 'bomb.xlsx', size: 4000 }, zipWith([{ name: 'xl/sheet.xml', size: 4_000_000_000 }]))).toMatch(/too big/)
    expect(checkWorkbookFile({ name: 'bomb.xlsx', size: 4000 }, zipWith([{ name: 'xl/sheet.xml', size: 0xffffffff }]))).toMatch(/too big/)
    const many = Array.from({ length: 301 }, (_, i) => ({ name: `part${i}.xml`, size: 1 }))
    expect(checkWorkbookFile({ name: 'many.xlsx', size: 4000 }, zipWith(many))).toMatch(/too many parts/)
  })

  it('refuses an .xlsx that is not a zip', () => {
    expect(checkWorkbookFile({ name: 'fake.xlsx', size: 30 }, new TextEncoder().encode('this is plain text, not a workbook'))).toMatch(/doesn't look like/)
  })
})

describe('excelSerialToIso', () => {
  it('turns a day count into the calendar day', () => {
    expect(excelSerialToIso(46153)).toBe('2026-05-11')
    expect(excelSerialToIso(46279)).toBe('2026-09-14')
    expect(excelSerialToIso(61)).toBe('1900-03-01')
    expect(excelSerialToIso(36526)).toBe('2000-01-01')
  })
  it('drops the time of day', () => {
    expect(excelSerialToIso(46153.99)).toBe('2026-05-11')
  })
  it('knows the 1904 calendar', () => {
    expect(excelSerialToIso(46153 - 1462, true)).toBe('2026-05-11')
  })
  it('refuses nonsense', () => {
    expect(excelSerialToIso(Number.NaN)).toBeNull()
    expect(excelSerialToIso(5)).toBeNull()
    expect(excelSerialToIso(900_000)).toBeNull()
  })
})

describe('readDelimitedFile', () => {
  it('reads a csv as one sheet named after the file', () => {
    const result = readDelimitedFile('Date,Amount\n1 May 2026,50', 'my ledger.csv')
    expect(result).toMatchObject({ ok: true, sheets: [{ name: 'my ledger', rows: [{ cells: ['Date', 'Amount'], rowNumber: 1 }, { cells: ['1 May 2026', '50'], rowNumber: 2 }] }] })
  })
  it('refuses an empty file', () => {
    expect(readDelimitedFile('  \n ', 'x.csv')).toEqual({ ok: false, message: 'That file has no rows.' })
  })
})
