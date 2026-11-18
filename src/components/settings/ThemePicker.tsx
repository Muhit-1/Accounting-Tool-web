import { setThemeKey, useThemeKey } from '../../lib/theme-store'
import { THEMES, themeVars, type WebTheme } from '../../lib/themes'

// A little picture of the app in the theme's own colours: the dark menu on the left, the page on the right.
function Preview({ theme }: { theme: WebTheme }) {
  const c = themeVars(theme)
  return (
    <div
      aria-hidden
      className="flex min-h-0 flex-1 overflow-hidden rounded-[7px] border"
      style={{ background: c['--color-paper'], borderColor: c['--color-paper-line'] }}
    >
      <div className="flex w-[34%] flex-col gap-1 p-1.5" style={{ background: c['--color-ink'] }}>
        <span className="h-1 w-[70%] rounded-full" style={{ background: c['--color-paper'] }} />
        <span className="h-1 w-full rounded-full" style={{ background: c['--color-stamp'] }} />
        <span className="h-1 w-[80%] rounded-full" style={{ background: c['--color-ink-inverse-soft'], opacity: 0.55 }} />
      </div>
      <div className="flex flex-1 flex-col gap-1 p-1.5">
        <span className="h-1 w-[55%] rounded-full" style={{ background: c['--color-ink'] }} />
        <span className="h-3.5 w-full rounded-[3px]" style={{ background: c['--color-stamp-soft'] }} />
        <span className="mt-auto h-2 w-[40%] rounded-[2px]" style={{ background: c['--color-stamp'] }} />
      </div>
    </div>
  )
}

// Appearance: pick the colours of the website. Small square cards; the one in use has a ring. Kept in this browser;
// the Android app has the same themes in More → Appearance.
export function ThemePicker() {
  const current = useThemeKey()
  return (
    <div role="radiogroup" aria-label="Colour theme" className="stagger grid grid-cols-[repeat(auto-fill,minmax(148px,1fr))] gap-3.5 p-5">
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
            className={`surface surface-hover flex aspect-square max-w-[190px] flex-col gap-2 rounded-[10px] border p-2.5 text-left ${on ? 'border-stamp ring-2 ring-stamp' : 'border-paper-line'}`}
          >
            <Preview theme={theme} />
            <div className="min-w-0">
              <div className="flex items-center justify-between gap-1">
                <span className="truncate text-[13px] font-bold">
                  {index + 1}. {theme.name}
                </span>
                {on && <span className="flex-none rounded-full bg-stamp-soft px-1.5 py-px text-[10px] font-semibold text-stamp">In use</span>}
              </div>
              <p className="truncate text-[11.5px] text-ink-soft">{theme.description}</p>
            </div>
            <div className="flex gap-1" aria-hidden>
              {['--color-paper', '--color-ink', '--color-stamp', '--color-stamp-soft'].map((name) => (
                <span key={name} className="h-3 flex-1 rounded-[3px] border border-paper-line" style={{ background: c[name] }} />
              ))}
            </div>
          </button>
        )
      })}
    </div>
  )
}
