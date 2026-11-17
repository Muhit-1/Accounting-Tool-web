import { useSyncExternalStore } from 'react'
import { DEFAULT_THEME_KEY, themeByKey, themeVars, THEMES } from './themes'

// Which theme this browser uses. Kept in localStorage (like the grid's column choices), applied by setting the
// colour variables on <html>, so every Tailwind colour name follows at once. Index.css holds the default theme's
// values, so the first paint is right even before this runs.

const STORAGE_KEY = 'exin_theme'
const EVENT = 'exin-theme-change'

/** What was saved → a theme key; anything unknown is the default theme. */
export function parseThemeKey(raw: string | null | undefined): string {
  return THEMES.some((t) => t.key === raw) ? (raw as string) : DEFAULT_THEME_KEY
}

export function getThemeKey(): string {
  try {
    return parseThemeKey(localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_THEME_KEY
  }
}

/** Puts a theme on the page: the colour variables, and the colour of the phone's browser bar. */
export function applyTheme(key: string): void {
  const theme = themeByKey(key)
  const root = document.documentElement
  for (const [name, value] of Object.entries(themeVars(theme))) root.style.setProperty(name, value)
  root.dataset.theme = theme.key
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme.base.ink)
}

export function setThemeKey(key: string): void {
  const next = parseThemeKey(key)
  try {
    localStorage.setItem(STORAGE_KEY, next)
  } catch {
    /* private mode: the choice lasts until the page is closed */
  }
  applyTheme(next)
  window.dispatchEvent(new Event(EVENT))
}

function subscribe(onChange: () => void): () => void {
  window.addEventListener(EVENT, onChange)
  window.addEventListener('storage', onChange)
  return () => {
    window.removeEventListener(EVENT, onChange)
    window.removeEventListener('storage', onChange)
  }
}

export function useThemeKey(): string {
  return useSyncExternalStore(subscribe, getThemeKey, () => DEFAULT_THEME_KEY)
}
