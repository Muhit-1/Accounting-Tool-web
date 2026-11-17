import { setThemeKey, useThemeKey } from '../../lib/theme-store'
import { THEMES, themeVars, type WebTheme } from '../../lib/themes'

// A little picture of the app in the theme's own colours: the dark menu on the left, the page on the right.
function Preview({ theme }: { theme: WebTheme }) {
  const c = themeVars(theme)
  return (
    <div
      aria-hidden
      className="flex h-[88px] overflow-hidden rounded-[8px] border"
      style={{ background: c['--color-paper'], borderColor: c['--color-paper-line'] }}
    >
      <div className="flex w-[34%] flex-col gap-1.5 p-2.5" style={{ background: c['--color-ink'] }}>
        <span className="h-1.5 w-[70%] rounded-full" style={{ background: c['--color-paper'] }} />
        <span className="h-1.5 w-full rounded-full" style={{ background: c['--color-stamp'] }} />
        <span className="h-1.5 w-[80%] rounded-full" style={{ background: c['--color-ink-inverse-soft'], opacity: 0.55 }} />
        <span className="h-1.5 w-[60%] rounded-full" style={{ background: c['--color-ink-inverse-soft'], opacity: 0.55 }} />
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-2.5">
        <span className="h-1.5 w-[55%] rounded-full" style={{ background: c['--color-ink'] }} />
        <span className="h-[26px] w-full rounded-[4px]" style={{ background: c['--color-stamp-soft'] }} />
        <span className="mt-auto h-3 w-[38%] rounded-[3px]" style={{ background: c['--color-stamp'] }} />
      </div>
    </div>
  )
}

// Appearance: pick the colours of the website. Kept in this browser; the Android app has the same themes in
// More → Appearance.
export function ThemePicker() {
  const current = useThemeKey()
  return (
    <div role="radiogroup" aria-label="Colour theme" className="grid grid-cols-1 gap-3 p-5 sm:grid-cols-2 xl:grid-cols-3">
      {THEMES.map((theme, index) => {
        const on = theme.key === current
        const c = themeVars(theme)
        return (
          <button
            key={theme.key}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => setThemeKey(theme.key)}
            className={`flex flex-col gap-3 rounded-[12px] border bg-white p-3 text-left transition-shadow hover:shadow-md ${
              on ? 'border-stamp ring-2 ring-stamp' : 'border-paper-line'
            }`}
          >
            <Preview theme={theme} />
            <div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[15px] font-bold">
                  {index + 1}. {theme.name}
                </span>
                {on && <span className="rounded-full bg-stamp-soft px-2 py-0.5 text-[11px] font-semibold text-stamp">In use</span>}
              </div>
              <p className="mt-0.5 text-[13px] text-ink-soft">{theme.description}</p>
            </div>
            <div className="flex gap-1.5" aria-hidden>
              {['--color-paper', '--color-ink', '--color-stamp', '--color-stamp-soft'].map((name) => (
                <span key={name} className="h-5 flex-1 rounded-[4px] border border-paper-line" style={{ background: c[name] }} />
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}
