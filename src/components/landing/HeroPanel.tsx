import { GoogleSignInButton } from '../GoogleSignInButton'
import { stagger } from '../../lib/landing'
import { LandingPanel } from './LandingPanel'
import { SignInNote } from './SignInNote'
import { TourReel } from './TourReel'

// A message above the headline: a failed sign-in, or a notice set in the admin panel.
export interface LandingAlert {
  kind: 'error' | 'warning' | 'info'
  text: string
}

export function HeroPanel({ active, go, alerts }: { active: boolean; go: (page: number) => void; alerts: LandingAlert[] }) {
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
        <TourReel active={active} />
      </div>
    </LandingPanel>
  )
}
