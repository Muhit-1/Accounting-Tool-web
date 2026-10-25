// A formula in everyday words: {Months} * {Rate} becomes "Months × Rate". (Same wording as the server's.)
export function explainFormula(src: string): string {
  return src
    .replace(/\{([^}]+)\}/g, '$1')
    .replace(/(?:'([^']+)'|([A-Za-z_][A-Za-z0-9_]*))\[([^\]]+)\]/g, (_m, q: string | undefined, w: string | undefined, f: string) => `all “${f}” in ${q ?? w}`)
    .replace(/\*/g, ' × ')
    .replace(/\//g, ' ÷ ')
    .replace(/ - /g, ' − ')
    .replace(/\s+/g, ' ')
    .trim()
}
