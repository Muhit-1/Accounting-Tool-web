// Reads an Excel formula (the text of a cell such as `SUMIFS(Orders!K:K, Orders!M:M, "Delivered")`)
// into a tree. Nothing is ever run: this only understands the text so it can be rebuilt in our own
// language. Whatever it cannot read is reported in plain words, not guessed.

export class XlError extends Error {}
const fail = (message: string): never => {
  throw new XlError(message)
}

export type XNode =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'ref'; sheet: string | null; c1: number; r1: number | null; c2: number; r2: number | null; kind: 'cell' | 'range' | 'cols' }
  | { t: 'name'; v: string }
  | { t: 'neg'; a: XNode }
  | { t: 'pct'; a: XNode }
  | { t: 'bin'; op: string; a: XNode; b: XNode }
  | { t: 'call'; name: string; args: XNode[] }

export function colIndex(letters: string): number {
  let n = 0
  for (const ch of letters.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n - 1
}
export function colLetters(index: number): string {
  let n = index + 1
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

type Tok = { k: 'num'; v: number } | { k: 'str'; v: string } | { k: 'id'; v: string; sheet: string | null } | { k: 'op'; v: string }

const REF_CELL = /^\$?([A-Za-z]{1,3})\$?(\d{1,7})$/
const REF_COLS = /^\$?([A-Za-z]{1,3}):\$?([A-Za-z]{1,3})$/
const REF_RANGE = /^\$?([A-Za-z]{1,3})\$?(\d{1,7}):\$?([A-Za-z]{1,3})\$?(\d{1,7})$/

function tokenize(src: string): Tok[] {
  const out: Tok[] = []
  let i = 0
  while (i < src.length) {
    const c = src[i]
    if (/\s/.test(c)) {
      i++
      continue
    }
    if (c === '"') {
      let j = i + 1
      let s = ''
      for (;;) {
        if (j >= src.length) fail('A piece of text in the formula is not closed.')
        if (src[j] === '"') {
          if (src[j + 1] === '"') {
            s += '"'
            j += 2
            continue
          }
          break
        }
        s += src[j++]
      }
      out.push({ k: 'str', v: s })
      i = j + 1
      continue
    }
    if (/[0-9]/.test(c) || (c === '.' && /[0-9]/.test(src[i + 1] ?? ''))) {
      const m = /^(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?/.exec(src.slice(i)) as RegExpExecArray
      out.push({ k: 'num', v: parseFloat(m[0]) })
      i += m[0].length
      continue
    }
    // a sheet prefix: 'Fund Ledger'!  or  Orders!
    let sheet: string | null = null
    if (c === "'") {
      const m = /^'((?:[^']|'')+)'!/.exec(src.slice(i))
      if (m) {
        sheet = m[1].replace(/''/g, "'")
        i += m[0].length
      } else fail('A sheet name in the formula is not closed.')
    } else {
      const m = /^([A-Za-z_][A-Za-z0-9_.]*)!/.exec(src.slice(i))
      if (m) {
        sheet = m[1]
        i += m[0].length
      }
    }
    if (sheet !== null || /[A-Za-z_$]/.test(src[i] ?? '')) {
      const m = /^[$A-Za-z0-9_.]+(?::[$A-Za-z0-9_.]+)?/.exec(src.slice(i))
      if (!m) fail(`I can't read the formula near “${src.slice(i, i + 8)}”.`)
      const word = (m as RegExpExecArray)[0]
      i += word.length
      out.push({ k: 'id', v: word, sheet })
      continue
    }
    const two = src.slice(i, i + 2)
    if (two === '<>' || two === '<=' || two === '>=') {
      out.push({ k: 'op', v: two })
      i += 2
      continue
    }
    if ('+-*/^(),=<>&%'.includes(c)) {
      out.push({ k: 'op', v: c })
      i++
      continue
    }
    if (c === '{' || c === '}' || c === ';') fail('Array constants like {1,2,3} are not supported.')
    fail(`I don't understand “${c}” in the formula.`)
  }
  return out
}

function ref(word: string, sheet: string | null): XNode | null {
  let m = REF_CELL.exec(word)
  if (m) return { t: 'ref', sheet, c1: colIndex(m[1]), r1: Number(m[2]) - 1, c2: colIndex(m[1]), r2: Number(m[2]) - 1, kind: 'cell' }
  m = REF_RANGE.exec(word)
  if (m) return { t: 'ref', sheet, c1: colIndex(m[1]), r1: Number(m[2]) - 1, c2: colIndex(m[3]), r2: Number(m[4]) - 1, kind: 'range' }
  m = REF_COLS.exec(word)
  if (m) return { t: 'ref', sheet, c1: colIndex(m[1]), r1: null, c2: colIndex(m[2]), r2: null, kind: 'cols' }
  return null
}

export function parseExcel(src: string): XNode {
  const t = tokenize(src.startsWith('=') ? src.slice(1) : src)
  if (!t.length) fail('The formula is empty.')
  let p = 0
  let depth = 0
  const isOp = (v: string) => {
    const x = t[p]
    return !!x && x.k === 'op' && x.v === v
  }
  const eat = (v: string) => (isOp(v) ? (p++, true) : false)
  const bin = (op: string, a: XNode, b: XNode): XNode => ({ t: 'bin', op, a, b })

  function cmp(): XNode {
    let a = cat()
    for (;;) {
      const x = t[p]
      if (x && x.k === 'op' && ['=', '<>', '<', '>', '<=', '>='].includes(x.v)) {
        p++
        a = bin(x.v, a, cat())
      } else return a
    }
  }
  function cat(): XNode {
    let a = add()
    while (eat('&')) a = bin('&', a, add())
    return a
  }
  function add(): XNode {
    let a = mul()
    for (;;) {
      if (eat('+')) a = bin('+', a, mul())
      else if (eat('-')) a = bin('-', a, mul())
      else return a
    }
  }
  function mul(): XNode {
    let a = pow()
    for (;;) {
      if (eat('*')) a = bin('*', a, pow())
      else if (eat('/')) a = bin('/', a, pow())
      else return a
    }
  }
  function pow(): XNode {
    let a = un()
    while (eat('^')) a = bin('^', a, un())
    return a
  }
  function un(): XNode {
    if (eat('-')) return { t: 'neg', a: un() }
    if (eat('+')) return un()
    let a = prim()
    while (eat('%')) a = { t: 'pct', a }
    return a
  }
  function prim(): XNode {
    if (++depth > 40) fail('The formula is nested too deeply.')
    try {
      const x = t[p++]
      if (!x) return fail('The formula ends too early.')
      if (x.k === 'num') return { t: 'num', v: x.v }
      if (x.k === 'str') return { t: 'str', v: x.v }
      if (x.k === 'id') {
        if (isOp('(') && x.sheet === null) {
          p++
          const args: XNode[] = []
          if (!eat(')')) {
            do {
              // an empty argument, as in IF(A1,,2), is not supported
              if (isOp(',') || isOp(')')) fail('A formula with an empty argument is not supported.')
              args.push(cmp())
            } while (eat(','))
            if (!eat(')')) fail('A bracket in the formula is not closed.')
          }
          return { t: 'call', name: x.v.toUpperCase(), args }
        }
        const r = ref(x.v, x.sheet)
        if (r) return r
        if (x.sheet === null && /^true$/i.test(x.v)) return { t: 'bool', v: true }
        if (x.sheet === null && /^false$/i.test(x.v)) return { t: 'bool', v: false }
        return { t: 'name', v: x.v }
      }
      if (x.k === 'op' && x.v === '(') {
        const a = cmp()
        if (!eat(')')) fail('A bracket in the formula is not closed.')
        return a
      }
      return fail(`Unexpected “${x.v}” in the formula.`)
    } finally {
      depth--
    }
  }
  const ast = cmp()
  if (p < t.length) fail('There is something extra at the end of the formula.')
  return ast
}

/** every sheet-and-range a formula points at (for finding which formulas read which table) */
export function refsOf(node: XNode): Extract<XNode, { t: 'ref' }>[] {
  const out: Extract<XNode, { t: 'ref' }>[] = []
  const walk = (n: XNode) => {
    if (n.t === 'ref') out.push(n)
    else if (n.t === 'neg' || n.t === 'pct') walk(n.a)
    else if (n.t === 'bin') {
      walk(n.a)
      walk(n.b)
    } else if (n.t === 'call') n.args.forEach(walk)
  }
  walk(node)
  return out
}
