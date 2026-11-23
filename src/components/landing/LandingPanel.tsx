import { useLayoutEffect, useRef, type ReactNode } from 'react'

interface LandingPanelProps {
  id: string
  tabId: string
  active: boolean
  // The big outlined word behind the content.
  ghost: string
  className?: string
  children: ReactNode
}

// One page of the public home page. A page that is not showing is inert, so
// the keyboard and screen readers only ever meet the one in front.
//
// On a computer the page never scrolls: whatever the window size, the content is
// shrunk (never enlarged) until it fits, by setting --fit on the content box.
// Below 960px wide (phones, small tablets) the content stacks and the page scrolls.
export function LandingPanel({ id, tabId, active, ghost, className = '', children }: LandingPanelProps) {
  const panelRef = useRef<HTMLElement>(null)
  const boxRef = useRef<HTMLDivElement>(null)

  useLayoutEffect(() => {
    const panel = panelRef.current
    const box = boxRef.current
    if (!panel || !box) return
    function fit() {
      if (!panel || !box) return
      if (window.matchMedia('(max-width: 960px)').matches) {
        box.style.removeProperty('--fit')
        return
      }
      const cs = getComputedStyle(panel)
      const availH = panel.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom)
      const availW = panel.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight)
      const scale = Math.max(0.45, Math.min(1, availH / box.offsetHeight, availW / box.offsetWidth))
      box.style.setProperty('--fit', scale.toFixed(4))
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(panel)
    ro.observe(box)
    return () => ro.disconnect()
  }, [])

  return (
    <section
      ref={panelRef}
      id={id}
      role="tabpanel"
      aria-labelledby={tabId}
      data-panel=""
      data-active={active}
      inert={!active}
      aria-hidden={active ? undefined : true}
      className={`panel${active ? ' active' : ''} ${className}`.trim()}
    >
      <span className="ghost" aria-hidden="true">
        {ghost}
      </span>
      <div className="in" ref={boxRef}>
        {children}
      </div>
    </section>
  )
}
