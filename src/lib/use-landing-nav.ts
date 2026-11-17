import { useCallback, useEffect, useRef, useState, type RefObject } from 'react'
import { clampPage, LANDING_PAGES, pageFromHash, swipeDirection, wheelAction } from './landing'

export function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

const PAGE_MS = 900

// Which page of the public home page is showing, and every way of changing it:
// tabs, arrows, keys, mouse wheel, swipe and the address-bar hash (#cash). The
// page change itself is drawn by CSS (a sliding track); this hook only decides.
export function useLandingNav(rootRef: RefObject<HTMLElement | null>) {
  const [page, setPage] = useState(() => pageFromHash(window.location.hash))
  const [dir, setDir] = useState<1 | -1>(1)
  const [ready, setReady] = useState(false)
  const pageRef = useRef(page)
  const navEnd = useRef(0)
  const lastBlocked = useRef(0)
  const seamRef = useRef<HTMLDivElement>(null)
  // A tab had the keyboard focus when the page changed: the new tab takes it over.
  const refocusTab = useRef(false)

  const go = useCallback(
    (target: number) => {
      const next = clampPage(target)
      const from = pageRef.current
      if (next === from) return
      const forward = next > from
      refocusTab.current = !!rootRef.current?.querySelector('[role="tablist"]')?.contains(document.activeElement)
      pageRef.current = next
      setDir(forward ? 1 : -1)
      setPage(next)
      const reduce = prefersReducedMotion()
      navEnd.current = performance.now() + (reduce ? 60 : PAGE_MS)
      // A thin brass line sweeps the way the pages travel.
      const seam = seamRef.current
      if (!reduce && seam?.animate) {
        const start = forward ? 'calc(100vw - 2px)' : '0px'
        const end = forward ? '0px' : 'calc(100vw - 2px)'
        seam.animate(
          [
            { transform: `translateX(${start})`, opacity: 0 },
            { opacity: 1, offset: 0.18 },
            { opacity: 1, offset: 0.8 },
            { transform: `translateX(${end})`, opacity: 0 },
          ],
          { duration: 950, easing: 'cubic-bezier(.77,0,.18,1)' },
        )
      }
    },
    [rootRef],
  )

  // Keep the address bar in step (#cash), start a tall page at its top.
  const shown = useRef(page)
  useEffect(() => {
    if (shown.current === page) return
    shown.current = page
    history.replaceState(history.state, '', `#${LANDING_PAGES[page].id}`)
    rootRef.current?.querySelector<HTMLElement>('[data-panel][data-active="true"]')?.scrollTo({ top: 0 })
  }, [page, rootRef])

  // The keyboard stays on the tab strip when a tab (or an arrow key on it) changed the page.
  useEffect(() => {
    if (!refocusTab.current) return
    refocusTab.current = false
    rootRef.current?.querySelector<HTMLElement>('[role="tab"][aria-selected="true"]')?.focus({ preventScroll: true })
  }, [page, rootRef])

  // Fonts first, so the entrance does not play on fallback letters.
  useEffect(() => {
    let alive = true
    const show = () => alive && setReady(true)
    document.fonts?.ready.then(show, show)
    const t = window.setTimeout(show, 400)
    return () => {
      alive = false
      window.clearTimeout(t)
    }
  }, [])

  useEffect(() => {
    const root = rootRef.current
    if (!root) return

    function onWheel(e: WheelEvent) {
      const panel = root!.querySelector<HTMLElement>('[data-panel][data-active="true"]')
      const now = performance.now()
      const result = wheelAction({
        deltaX: e.deltaX,
        deltaY: e.deltaY,
        scrollTop: panel?.scrollTop ?? 0,
        clientHeight: panel?.clientHeight ?? 0,
        scrollHeight: panel?.scrollHeight ?? 0,
        now,
        navEnd: navEnd.current,
        lastBlocked: lastBlocked.current,
      })
      if (result.blocked) lastBlocked.current = now
      if (result.dir !== 0) go(pageRef.current + result.dir)
    }

    let sx = 0
    let sy = 0
    function onTouchStart(e: TouchEvent) {
      sx = e.touches[0].clientX
      sy = e.touches[0].clientY
    }
    function onTouchEnd(e: TouchEvent) {
      const dir = swipeDirection(e.changedTouches[0].clientX - sx, e.changedTouches[0].clientY - sy)
      if (dir !== 0) go(pageRef.current + dir)
    }

    function onKey(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return
      const target = e.target instanceof HTMLElement ? e.target : null
      if (target && /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName)) return
      const inTabs = !!target?.closest('[role="tablist"]')
      if (e.key === 'ArrowRight' || e.key === 'PageDown') {
        go(pageRef.current + 1)
        e.preventDefault()
      } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        go(pageRef.current - 1)
        e.preventDefault()
      } else if (inTabs && e.key === 'Home') {
        go(0)
        e.preventDefault()
      } else if (inTabs && e.key === 'End') {
        go(LANDING_PAGES.length - 1)
        e.preventDefault()
      }
    }

    // Someone typed or followed a link such as /#invoices while the page is open.
    function onHash() {
      go(pageFromHash(window.location.hash))
    }

    window.addEventListener('hashchange', onHash)
    root.addEventListener('wheel', onWheel, { passive: true })
    root.addEventListener('touchstart', onTouchStart, { passive: true })
    root.addEventListener('touchend', onTouchEnd, { passive: true })
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('hashchange', onHash)
      root.removeEventListener('wheel', onWheel)
      root.removeEventListener('touchstart', onTouchStart)
      root.removeEventListener('touchend', onTouchEnd)
      window.removeEventListener('keydown', onKey)
    }
  }, [go, rootRef])

  return { page, dir, go, ready, seamRef }
}
