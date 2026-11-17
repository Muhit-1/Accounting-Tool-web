import type { ReactNode } from 'react'

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
export function LandingPanel({ id, tabId, active, ghost, className = '', children }: LandingPanelProps) {
  return (
    <section
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
      <div className="in">{children}</div>
    </section>
  )
}
