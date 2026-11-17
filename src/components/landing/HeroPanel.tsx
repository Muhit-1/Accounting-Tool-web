import { useEffect, useRef, useState } from 'react'
import { GoogleSignInButton } from '../GoogleSignInButton'
import { formatWhole, heroEntryAt, HERO_START_BALANCE, stagger } from '../../lib/landing'
import { prefersReducedMotion } from '../../lib/use-landing-nav'
import { LandingPanel } from './LandingPanel'
import { SignInNote } from './SignInNote'

interface Line {
  key: number
  memo: string
  tag: string
  amount: number
}

const START_LINES: Line[] = [
  { key: -1, memo: 'Order ORD-0042', tag: 'from Orders', amount: 6300 },
  { key: -2, memo: 'Packaging', tag: '', amount: -2150 },
  { key: -3, memo: 'Order ORD-0041', tag: 'from Orders', amount: 4800 },
]

// A message above the headline: a failed sign-in, or a notice set in the admin panel.
export interface LandingAlert {
  kind: 'error' | 'warning' | 'info'
  text: string
}

export function HeroPanel({ active, go, alerts }: { active: boolean; go: (page: number) => void; alerts: LandingAlert[] }) {
  const [lines, setLines] = useState(START_LINES)
  const [balance, setBalance] = useState(HERO_START_BALANCE)
  const [shake, setShake] = useState(0)
  const [lockedMessage, setLockedMessage] = useState(false)
  const arrived = useRef(0)
  const messageTimer = useRef<number | undefined>(undefined)

  // A new line lands in the Cash book every few seconds while this page is showing.
  useEffect(() => {
    if (!active || prefersReducedMotion()) return
    const id = window.setInterval(() => {
      if (document.hidden) return
      const n = arrived.current++
      const entry = heroEntryAt(n)
      setLines((old) => [{ key: n, memo: entry.memo, tag: entry.tag, amount: entry.amount }, ...old].slice(0, 4))
      setBalance(entry.balance)
    }, 3800)
    return () => window.clearInterval(id)
  }, [active])

  useEffect(() => () => window.clearTimeout(messageTimer.current), [])

  // The balance cannot be typed over; clicking it says so.
  function pokeBalance() {
    setShake((s) => s + 1)
    setLockedMessage(true)
    window.clearTimeout(messageTimer.current)
    messageTimer.current = window.setTimeout(() => setLockedMessage(false), 2600)
  }

  return (
    <LandingPanel id="lp-home" tabId="lp-tab-home" active={active} ghost="Sheet1">
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

      <div className="win" data-r="" style={stagger(2)}>
        <div className="bar">
          <span className="dots" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
          Linen Shop · Cash book
        </div>
        <div className="bal">
          <small>
            <span>Balance</span>
            <em>
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                <rect x="2" y="5.5" width="8" height="5.5" rx="1" />
                <path d="M4 5.5V4a2 2 0 0 1 4 0v1.5" />
              </svg>
              locked
            </em>
          </small>
          <button type="button" className="balbtn" onClick={pokeBalance} aria-describedby="lp-balmsg">
            <span key={shake} className={`big${shake ? ' shake' : ''}`}>
              <u>BDT</u>
              {formatWhole(balance)}
            </span>
          </button>
          <div className={`msg${lockedMessage ? ' on' : ''}`} id="lp-balmsg" role="status">
            {lockedMessage ? 'Locked. It’s worked out from your entries.' : ''}
          </div>
        </div>
        <ul className="ent">
          {lines.map((l) => (
            <li key={l.key}>
              <span>
                {l.memo}
                {l.tag && <em>{l.tag}</em>}
              </span>
              <b className={`num ${l.amount > 0 ? 'up' : 'dn'}`}>
                {l.amount > 0 ? '+' : '−'}
                {formatWhole(l.amount)}
              </b>
            </li>
          ))}
        </ul>
        <div className="sheettabs" aria-hidden="true">
          <span>Sheet1</span>
          <span className="on">Cash book</span>
          <span>Orders</span>
          <span>＋</span>
        </div>
      </div>
    </LandingPanel>
  )
}
