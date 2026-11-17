// The look of the website, in one place. A theme is a handful of base colours; everything else a screen needs (the
// tints of a sheet, the formula column, the search box ...) is worked out from them, so a new theme is ten lines and
// every screen follows. Screens never write a colour themselves: they use the Tailwind names from index.css
// (bg-paper, text-ink, bg-stamp-soft, bg-sheet ...), which read the CSS variables set here.
//
// The same names (paper, ink, stamp ...) and the same themes are in the Android app (accounting-app/src/lib/theme),
// so the two look alike. Mint ledger is the default. Kept on this browser only (see theme-store.ts).

export interface ThemeBase {
  paper: string
  paperLine: string
  ink: string
  inkSoft: string
  stamp: string
  stampSoft: string
  // the accent on a dark surface (the home page, the admin menu): a light version of stamp
  stampLight: string
  green: string
  greenSoft: string
  rust: string
  rustSoft: string
}

export interface WebTheme {
  key: string
  name: string
  description: string
  base: ThemeBase
}

export const MINT_LEDGER: WebTheme = {
  key: 'mint',
  name: 'Mint ledger',
  description: 'Fresh, money-positive green',
  base: {
    paper: '#f6faf8',
    paperLine: '#d4e3dc',
    ink: '#0e3b2e',
    inkSoft: '#566d63',
    // The brightest green that still gives white text 4.5 : 1 (#1fa37a is only 3.2 : 1)
    stamp: '#0f7b59',
    stampSoft: '#ddf3ea',
    stampLight: '#5fdcb0',
    green: '#157a42',
    greenSoft: '#dcefe6',
    rust: '#b8283f',
    rustSoft: '#f9dde1',
  },
}

export const WORKSPACE: WebTheme = {
  key: 'workspace',
  name: 'Workspace',
  description: 'Blue, the first look of Exin Finance',
  base: {
    paper: '#f4f6fa',
    paperLine: '#d7dde5',
    ink: '#0f2a4a',
    inkSoft: '#5d6977',
    stamp: '#1c6dd0',
    stampSoft: '#eef4fc',
    stampLight: '#8ec1ff',
    green: '#157a42',
    greenSoft: '#dcefe6',
    rust: '#b8283f',
    rustSoft: '#f9dde1',
  },
}

export const FOREST: WebTheme = {
  key: 'forest',
  name: 'Forest',
  description: 'Green and calm',
  base: {
    paper: '#f2f7f4',
    paperLine: '#d2dfd8',
    ink: '#10302a',
    inkSoft: '#566a62',
    stamp: '#14764f',
    stampSoft: '#e7f4ee',
    stampLight: '#7fe0b4',
    green: '#157a42',
    greenSoft: '#dcefe6',
    rust: '#b8283f',
    rustSoft: '#f9dde1',
  },
}

export const GRAPHITE: WebTheme = {
  key: 'graphite',
  name: 'Graphite',
  description: 'Grey and quiet',
  base: {
    paper: '#f3f4f6',
    paperLine: '#d9dce1',
    ink: '#1d2430',
    inkSoft: '#5b6472',
    stamp: '#394a66',
    stampSoft: '#eceff5',
    stampLight: '#b7c8ea',
    green: '#157a42',
    greenSoft: '#dcefe6',
    rust: '#b8283f',
    rustSoft: '#f9dde1',
  },
}

export const PLUM: WebTheme = {
  key: 'plum',
  name: 'Plum',
  description: 'Purple',
  base: {
    paper: '#f7f4fa',
    paperLine: '#ded6e6',
    ink: '#2a1840',
    inkSoft: '#665a76',
    stamp: '#7436b8',
    stampSoft: '#f2ebfa',
    stampLight: '#d9b8ff',
    green: '#157a42',
    greenSoft: '#dcefe6',
    rust: '#b8283f',
    rustSoft: '#f9dde1',
  },
}

export const THEMES: WebTheme[] = [MINT_LEDGER, WORKSPACE, FOREST, GRAPHITE, PLUM]
export const DEFAULT_THEME_KEY = MINT_LEDGER.key

export function themeByKey(key: string | null | undefined): WebTheme {
  return THEMES.find((t) => t.key === key) ?? MINT_LEDGER
}

// ---- colour maths (hex only) ----

function channels(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const toHex = (v: number) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')

/** `amount` of `b` mixed into `a` (0 = a, 1 = b). */
export function mix(a: string, b: string, amount: number): string {
  const [ar, ag, ab] = channels(a)
  const [br, bg, bb] = channels(b)
  return `#${toHex(ar + (br - ar) * amount)}${toHex(ag + (bg - ag) * amount)}${toHex(ab + (bb - ab) * amount)}`
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  const channel = (v: number) => {
    const c = v / 255
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  }
  const [r, g, b] = channels(hex)
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)
}

/** WCAG contrast ratio of two colours, 1 to 21. */
export function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x)
  return (hi + 0.05) / (lo + 0.05)
}

const WHITE = '#ffffff'

/** Every colour variable of a theme, by the CSS name Tailwind reads (`--color-paper` ...). */
export function themeVars(theme: WebTheme): Record<string, string> {
  const b = theme.base
  return {
    '--color-paper': b.paper,
    '--color-paper-line': b.paperLine,
    '--color-paper-edge': mix(b.paperLine, b.paper, 0.45),
    '--color-ink': b.ink,
    '--color-ink-soft': b.inkSoft,
    // small text inside a table: a step darker than ink-soft
    '--color-ink-soft2': mix(b.inkSoft, b.ink, 0.35),
    '--color-ink-inverse-soft': mix(b.paper, b.ink, 0.35),
    '--color-stamp': b.stamp,
    '--color-stamp-soft': b.stampSoft,
    '--color-stamp-light': b.stampLight,
    // gold: "filled in by another table, locked". The same in every theme, so it always means the same thing.
    '--color-brass': '#7a5c14',
    '--color-brass-soft': '#f0e2b8',
    '--color-brass-row': '#f8f1dc',
    '--color-brass-line': '#e3d29a',
    '--color-sel': mix(b.stampSoft, WHITE, 0.6),
    '--color-err': mix(b.rustSoft, WHITE, 0.6),
    '--color-rust': b.rust,
    '--color-rust-soft': b.rustSoft,
    '--color-green': b.green,
    '--color-green-soft': b.greenSoft,
    // the surfaces of a sheet and its neighbours
    '--color-sheet': mix(b.paper, WHITE, 0.25),
    '--color-sheet-head': mix(b.paper, WHITE, 0.55),
    '--color-formula': mix(b.stampSoft, WHITE, 0.35),
    '--color-formula-soft': mix(b.stampSoft, WHITE, 0.7),
    '--color-hint': '#fffdf3',
    '--color-search': mix(b.stampSoft, b.paperLine, 0.25),
    '--color-prompt': mix(b.stampSoft, WHITE, 0.5),
    '--color-prompt-line': mix(b.stampSoft, b.stamp, 0.12),
    // text on a banner's tint
    '--color-info-ink': mix(b.stamp, b.ink, 0.55),
    '--color-warn-ink': '#5d4510',
  }
}
