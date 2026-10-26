// A, B, C … Z, AA, AB … : the letters over the columns of a sheet, so a person who knows spreadsheets sees what they
// expect. They name the position of a column; formulas still use column names, never addresses.
export function columnLetter(index: number): string {
  let n = Math.max(0, Math.floor(index))
  let letters = ''
  do {
    letters = String.fromCharCode(65 + (n % 26)) + letters
    n = Math.floor(n / 26) - 1
  } while (n >= 0)
  return letters
}

// A sheet always looks like a sheet: empty rows are drawn under the data until there are `minRows` of them
// (the add-row counts as one). They are only for looks; a click in one goes to the add-row.
export function fillerRowCount(minRows: number, shown: number, hasAddRow: boolean): number {
  return Math.max(0, minRows - shown - (hasAddRow ? 1 : 0))
}
