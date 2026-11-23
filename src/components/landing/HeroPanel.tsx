import { useEffect, useRef } from 'react'
import { GoogleSignInButton } from '../GoogleSignInButton'
import { stagger } from '../../lib/landing'
import { prefersReducedMotion } from '../../lib/use-landing-nav'
import { LandingPanel } from './LandingPanel'
import { SignInNote } from './SignInNote'

// A message above the headline: a failed sign-in, or a notice set in the admin panel.
export interface LandingAlert {
  kind: 'error' | 'warning' | 'info'
  text: string
}

export function HeroPanel({ active, go, alerts }: { active: boolean; go: (page: number) => void; alerts: LandingAlert[] }) {
  const video = useRef<HTMLVideoElement>(null)
  const reduce = prefersReducedMotion()

  // The tour plays by itself, from the start, whenever this page comes to the front, and stops while it is away
  // (a video nobody can see should not keep decoding). With reduced motion it does not start: the picture shows
  // and the controls are there.
  useEffect(() => {
    const el = video.current
    if (!el || reduce) return
    if (active) {
      el.currentTime = 0
      el.play().catch(() => {})
    } else {
      el.pause()
    }
  }, [active, reduce])

  return (
    <LandingPanel id="lp-home" tabId="lp-tab-home" active={active} ghost="Exin">
      <div>
        {alerts.map((a) => (
          <p key={a.text} className={`alert ${a.kind}`} role={a.kind === 'error' ? 'alert' : 'status'}>
            {a.text}
          </p>
        ))}
        <div className="kick" data-r="" style={stagger(0)}>
          Bookkeeping + invoices
        </div>
        <h1 data-r="" style={stagger(1)}>
          Books that feel like <b>a sheet.</b>
        </h1>
        <p className="lede" data-r="" style={stagger(2)}>
          Type in cells, paste from Excel, add your own columns. Underneath, the balance is locked and the server checks
          every amount.
        </p>
        <div className="actions" data-r="" style={stagger(3)}>
          <div className="gbtn">
            <GoogleSignInButton />
          </div>
          <button type="button" className="link" onClick={() => go(1)}>
            Take the tour <span aria-hidden="true">→</span>
          </button>
        </div>
        <div data-r="" style={stagger(4)}>
          <SignInNote />
        </div>
        <div className="proof" data-r="" style={stagger(5)}>
          <span>Paste from Excel</span>
          <span>Invoices as PDF</span>
          <span>Share with an end date</span>
        </div>
      </div>

      <div className="win hero-win" data-r="" style={stagger(2)}>
        <div className="bar">
          <span className="dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Exin Finance · a one minute tour
          <span className="tchip">1:00</span>
        </div>
        <video
          ref={video}
          className="tourvideo"
          src="/exin-tour.mp4"
          poster="/exin-tour-poster.jpg"
          muted
          loop
          playsInline
          autoPlay={!reduce}
          controls={reduce}
          preload="auto"
          aria-label="A one minute tour: sign in with Google, the Cash book, tables with formulas, invoices, and sharing with an end date."
        />
      </div>
    </LandingPanel>
  )
}
