import { useEffect, useLayoutEffect, useRef, type CSSProperties } from 'react'
import { Link } from 'react-router-dom'
import '../components/landing/landing.css'
import { CashBookPanel } from '../components/landing/CashBookPanel'
import { HeroPanel } from '../components/landing/HeroPanel'
import { InvoicesPanel } from '../components/landing/InvoicesPanel'
import { SharingPanel } from '../components/landing/SharingPanel'
import { StartPanel } from '../components/landing/StartPanel'
import { TablesPanel } from '../components/landing/TablesPanel'
import { LANDING_PAGES } from '../lib/landing'
import { prefersReducedMotion, useLandingNav } from '../lib/use-landing-nav'

// The page's own faces (display, text, figures). Loaded only when this page
// opens, so the app itself does not pay for them. Google Fonts is already
// allowed by the Content-Security-Policy.
const FONTS_URL =
  'https://fonts.googleapis.com/css2?family=Unbounded:wght@500;700;800&family=Figtree:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500&display=swap'
const TITLE = 'Exin Finance — bookkeeping that feels like a sheet'

// The public home page, shown at "/" to anyone who is not signed in (see
// ProtectedRoute). Pages slide sideways like the tabs under a sheet; every
// way of moving lives in lib/use-landing-nav.
export function LandingPage() {
  const rootRef = useRef<HTMLDivElement>(null)
  const { page, dir, go, ready, seamRef } = useLandingNav(rootRef)
  const tabEls = useRef<(HTMLButtonElement | null)[]>([])
  const tabsRef = useRef<HTMLElement>(null)
  const indRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const previous = document.title
    document.title = TITLE
    if (!document.getElementById('landing-fonts')) {
      const link = document.createElement('link')
      link.id = 'landing-fonts'
      link.rel = 'stylesheet'
      link.href = FONTS_URL
      document.head.append(link)
    }
    return () => {
      document.title = previous
    }
  }, [])

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
    <div ref={rootRef} className={`lp${ready ? ' ready' : ''}`} style={rootStyle}>
      <div className="bgfx" aria-hidden="true" />
      <div className="seam" ref={seamRef} aria-hidden="true" />

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
          <i aria-hidden="true">
            <svg viewBox="0 0 16 16" fill="none" stroke="#2a1d00" strokeWidth="2" strokeLinecap="round">
              <path d="M2 3h12M2 8h8M2 13h12" />
            </svg>
          </i>
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
        <Link className="btn hdr-go" to="/login">
          Sign in
        </Link>
      </header>

      <main>
        <div className="track" style={{ transform: `translateX(${-page * 100}%)` }}>
          <HeroPanel active={page === 0} go={go} />
          <CashBookPanel active={page === 1} />
          <TablesPanel active={page === 2} />
          <InvoicesPanel active={page === 3} />
          <SharingPanel active={page === 4} />
          <StartPanel active={page === 5} />
        </div>
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
