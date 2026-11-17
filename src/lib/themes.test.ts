import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { parseThemeKey } from './theme-store'
import { contrast, DEFAULT_THEME_KEY, mix, themeByKey, themeVars, THEMES, type WebTheme } from './themes'

// Text must be readable for people with weaker sight: at least 4.5 to 1 against what it sits on (WCAG AA), in EVERY
// theme. A new theme cannot ship unreadable: add it to THEMES and this test checks it.
const WHITE = '#ffffff'
const PAIRS: { text: string; on: string; what: string }[] = [
  { text: '--color-ink', on: '--color-paper', what: 'body text on the page' },
  { text: '--color-ink', on: 'white', what: 'body text on a card' },
  { text: '--color-ink-soft', on: '--color-paper', what: 'quiet text on the page' },
  { text: '--color-ink-soft', on: 'white', what: 'quiet text on a card' },
  { text: '--color-ink-soft2', on: '--color-sheet', what: 'small text in a table' },
  { text: 'white', on: '--color-stamp', what: 'text on a button' },
  { text: '--color-stamp', on: 'white', what: 'links on a card' },
  { text: '--color-stamp', on: '--color-paper', what: 'links on the page' },
  { text: '--color-stamp', on: '--color-stamp-soft', what: 'links on their tint' },
  { text: '--color-ink', on: '--color-stamp-soft', what: 'body text on a chosen row' },
  { text: '--color-rust', on: 'white', what: 'red amounts and errors on a card' },
  { text: '--color-rust', on: '--color-rust-soft', what: 'red text on its tint' },
  { text: '--color-green', on: 'white', what: 'green amounts on a card' },
  { text: '--color-green', on: '--color-green-soft', what: 'green text on its tint' },
  { text: '--color-brass', on: '--color-brass-row', what: 'gold text on a locked row' },
  { text: '--color-info-ink', on: '--color-stamp-soft', what: 'text on an info banner' },
  { text: '--color-warn-ink', on: '--color-brass-soft', what: 'text on a warning banner' },
  { text: '--color-stamp-light', on: '--color-ink', what: 'accent on the dark home page and admin menu' },
  { text: '--color-ink-inverse-soft', on: '--color-ink', what: 'quiet text on a dark surface' },
  { text: 'white', on: '--color-ink', what: 'text on a dark surface' },
]

function pick(vars: Record<string, string>, name: string): string {
  return name === 'white' ? WHITE : vars[name]
}

describe.each(THEMES.map((t) => [t.name, t] as [string, WebTheme]))('%s colours', (_name, theme) => {
  const vars = themeVars(theme)
  it.each(PAIRS)('$what is readable', ({ text, on }) => {
    expect(contrast(pick(vars, text), pick(vars, on))).toBeGreaterThanOrEqual(4.5)
  })
})

describe('the list of themes', () => {
  it('has unique keys and names, and the default is Mint ledger', () => {
    expect(new Set(THEMES.map((t) => t.key)).size).toBe(THEMES.length)
    expect(new Set(THEMES.map((t) => t.name)).size).toBe(THEMES.length)
    expect(DEFAULT_THEME_KEY).toBe('mint')
    expect(THEMES[0].name).toBe('Mint ledger')
  })

  it('gives every theme the same set of variables, all colours', () => {
    const names = Object.keys(themeVars(THEMES[0])).sort()
    for (const theme of THEMES) {
      const vars = themeVars(theme)
      expect(Object.keys(vars).sort()).toEqual(names)
      for (const value of Object.values(vars)) expect(value).toMatch(/^#[0-9a-f]{6}$/)
    }
  })

  it('an unknown or empty key is the default theme', () => {
    expect(themeByKey('nope').key).toBe('mint')
    expect(themeByKey(null).key).toBe('mint')
    expect(themeByKey('plum').key).toBe('plum')
    expect(parseThemeKey('graphite')).toBe('graphite')
    expect(parseThemeKey('x')).toBe('mint')
    expect(parseThemeKey(undefined)).toBe('mint')
  })
})

describe('mix', () => {
  it('goes from the first colour to the second', () => {
    expect(mix('#000000', '#ffffff', 0)).toBe('#000000')
    expect(mix('#000000', '#ffffff', 1)).toBe('#ffffff')
    expect(mix('#000000', '#ffffff', 0.5)).toBe('#808080')
  })
})

describe('index.css', () => {
  // The first paint uses the values written in index.css; they must be the default theme's, or the page would flash.
  const css = readFileSync(new URL('../index.css', import.meta.url), 'utf8')
  it('holds exactly the default theme', () => {
    for (const [name, value] of Object.entries(themeVars(themeByKey(DEFAULT_THEME_KEY)))) {
      expect(css, name).toContain(`${name}: ${value};`)
    }
  })
})
