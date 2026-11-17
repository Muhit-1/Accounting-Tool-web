import { Link } from 'react-router-dom'
import { GoogleSignInButton } from '../GoogleSignInButton'
import { stagger } from '../../lib/landing'
import { LandingPanel } from './LandingPanel'
import { SignInNote } from './SignInNote'

export function StartPanel({ active }: { active: boolean }) {
  return (
    <LandingPanel id="lp-start" tabId="lp-tab-start" active={active} ghost="Sheet1" className="cta-p">
      <div className="kick" data-r="" style={stagger(0)}>
        Ready when you are
      </div>
      <h2 data-r="" style={stagger(1)}>
        Open your <b>first sheet.</b>
      </h2>
      <p className="lede" data-r="" style={stagger(2)}>
        Sign in with Google. No new password to remember.
      </p>
      <div className="actions" data-r="" style={stagger(3)}>
        <div className="gbtn">
          <GoogleSignInButton />
        </div>
      </div>
      <div data-r="" style={stagger(4)}>
        <SignInNote centered />
      </div>
      <div className="get" data-r="" style={stagger(5)}>
        <span>You start with a Cash book</span>
        <span>and an empty Sheet1</span>
      </div>
      <nav className="links" aria-label="Legal" data-r="" style={stagger(6)}>
        <Link to="/privacy">Privacy Policy</Link>
        <Link to="/terms">Terms of Service</Link>
        <a href="https://www.sam-trek.com/impressum/" target="_blank" rel="noopener noreferrer">
          Legal notice<span className="sr"> (opens in a new tab)</span>
        </a>
        <span>© 2026 Exin Finance</span>
      </nav>
    </LandingPanel>
  )
}
