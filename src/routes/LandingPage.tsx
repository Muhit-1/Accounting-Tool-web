import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from 'react'
import { useSearchParams } from 'react-router-dom'
import '../components/landing/landing.css'
import { Seal } from '../components/Seal'
import { CashBookPanel } from '../components/landing/CashBookPanel'
import { HeroPanel, type LandingAlert } from '../components/landing/HeroPanel'
import { InvoicesPanel } from '../components/landing/InvoicesPanel'
import { SharingPanel } from '../components/landing/SharingPanel'
import { StartPanel } from '../components/landing/StartPanel'
import { TablesPanel } from '../components/landing/TablesPanel'
import { GOOGLE_LOGIN_URL, loginErrorText } from '../lib/google-login'
import { LANDING_PAGES } from '../lib/landing'
import { useNotice } from '../lib/support'
import { prefersReducedMotion, useLandingNav } from '../lib/use-landing-nav'

const TITLE = 'Exin Finance — bookkeeping that feels like a sheet'

// The public home page, shown at "/" to anyone who is not signed in (see
// ProtectedRoute). It is also the sign-in page: there is no other. Pages slide
// sideways like the tabs under a sheet; every way of moving lives in
// lib/use-landing-nav. Colours and fonts are the app's own (see landing.css).
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { page, dir, go, ready } = useLandingNav(rootRef)
  const tabEls = useRef<(HTMLButtonElement | null)[]>([])
  const tabsRef = useRef<HTMLElement>(null)
  const indRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previous = document.title
    document.title = TITLE
    return () => {
      document.title = previous
    }
  }, [])

  // A failed sign-in comes back as /?error=<code> (the API's /login?error=... is passed on by App.tsx). The sentence
  // is kept in state and the code is taken out of the address bar, so a reload does not show it again.
  const [searchParams, setSearchParams] = useSearchParams()
  const [errorCode] = useState(() => searchParams.get('error'))
  useEffect(() => {
    if (!searchParams.has('error')) return
    const next = new URLSearchParams(searchParams)
    next.delete('error')
    setSearchParams(next, { replace: true })
  }, [searchParams, setSearchParams])
  const { data: notice } = useNotice()
  const alerts: LandingAlert[] = []
  const error = loginErrorText(errorCode, notice?.supportEmail)
  if (error) alerts.push({ kind: 'error', text: error })
  if (notice?.maintenance) alerts.push({ kind: 'warning', text: notice.maintenance })
  if (notice?.announcement) alerts.push({ kind: notice.announcement.level === 'info' ? 'info' : 'warning', text: notice.announcement.text })

  // The brass bar under the current tab, and the tab strip scrolled to show it (phones).
  useLayoutEffect(() => {
    function place() {
      const tab = tabEls.current[page]
      const bar = indRef.current
      const strip = tabsRef.current
      if (!tab || !bar || !strip) return
      bar.style.left = `${tab.offsetLeft}px`
      bar.style.width = `${tab.offsetWidth}px`
      if (strip.scrollWidth > strip.clientWidth) {
        strip.scrollTo({ left: tab.offsetLeft - (strip.clientWidth - tab.offsetWidth) / 2, behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
      }
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [page, ready])

  const last = LANDING_PAGES.length - 1
  const rootStyle = { '--i': page, '--dir': dir } as CSSProperties

  return (
    <div ref={rootRef} className={`lp${ready ? ' ready' : ''}`} style={rootStyle} data-page={page}>

      <header>
        <a
          className="logo"
          href="#home"
          aria-label="Exin Finance, home"
          onClick={(e) => {
            e.preventDefault()
            go(0)
          }}
        >
          <Seal size={34} />
          Exin Finance
        </a>
        <nav className="tabs" role="tablist" aria-label="Pages" ref={tabsRef}>
          {LANDING_PAGES.map((p, i) => (
            <button
              key={p.id}
              ref={(el) => {
                tabEls.current[i] = el
              }}
              type="button"
              role="tab"
              id={`lp-tab-${p.id}`}
              aria-controls={`lp-${p.id}`}
              aria-selected={i === page}
              tabIndex={i === page ? 0 : -1}
              onClick={() => go(i)}
            >
              {p.label}
            </button>
          ))}
          <i className="ind" ref={indRef} aria-hidden="true" />
        </nav>
        <a className="btn hdr-go" href={GOOGLE_LOGIN_URL}>
          Sign in
        </a>
      </header>

      <main>
        <HeroPanel active={page === 0} go={go} alerts={alerts} />
        <CashBookPanel active={page === 1} />
        <TablesPanel active={page === 2} />
        <InvoicesPanel active={page === 3} />
        <SharingPanel active={page === 4} />
        <StartPanel active={page === 5} />
      </main>

      <footer>
        <span className="ctr" aria-live="polite">
          {page + 1} / {LANDING_PAGES.length}
        </span>
        <div className="prog" aria-hidden="true">
          <i />
        </div>
        {page < last && (
          <button type="button" className="next" onClick={() => go(page + 1)}>
            <span>Next</span>
            <b>{LANDING_PAGES[page + 1].label}</b>
            <span aria-hidden="true">→</span>
          </button>
        )}
        <div className="arrows">
          <button type="button" aria-label="Previous page" disabled={page === 0} onClick={() => go(page - 1)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M10 3 5 8l5 5" />
            </svg>
          </button>
          <button type="button" aria-label="Next page" disabled={page === last} onClick={() => go(page + 1)}>
            <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="m6 3 5 5-5 5" />
            </svg>
          </button>
        </div>
      </footer>
    </div>
  )
}
