import { useMemo, useState } from 'react'
import { buildLedger, DEMO_BUSINESSES, formatWhole, stagger } from '../../lib/landing'
import { LandingPanel } from './LandingPanel'

export function CashBookPanel({ active }: { active: boolean }) {
  const [index, setIndex] = useState(0)
  const business = DEMO_BUSINESSES[index]
  const rows = useMemo(() => buildLedger(business.opening, business.entries), [business])

  return (
    <LandingPanel id="lp-cash" tabId="lp-tab-cash" active={active} ghost="Cash book">
      <div>
        <div className="kick" data-r="" style={stagger(0)}>
          One Cash book per business
        </div>
        <h2 data-r="" style={stagger(1)}>
          Money in, money out. <b>Balance locked.</b>
        </h2>
        <p className="lede" data-r="" style={stagger(2)}>
          Run several businesses from one login. Each keeps its own currency, and totals are never added across
          currencies.
        </p>
        <div className="chips" role="group" aria-label="Pick a business" data-r="" style={stagger(3)}>
          {DEMO_BUSINESSES.map((b, i) => (
            <button key={b.id} type="button" aria-pressed={i === index} onClick={() => setIndex(i)}>
              {b.name}
              <small>{b.currency}</small>
            </button>
          ))}
        </div>
      </div>

      <div className="win" data-r="" style={stagger(2)}>
        <div className="letters" aria-hidden="true">
          <span>A</span>
          <span>B</span>
          <span>C</span>
          <span>D</span>
          <span>E</span>
        </div>
        <table className="t">
          <colgroup>
            <col className="c1" />
            <col />
            <col className="c3" />
            <col className="c4" />
            <col className="c5" />
          </colgroup>
          <thead>
            <tr>
              <th>Date</th>
              <th>Memo</th>
              <th className="r">In</th>
              <th className="r">Out</th>
              <th className="r">Balance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.date + r.memo}>
                <td className="num">{r.date}</td>
                <td>
                  {r.memo}
                  {r.linked && <span className="pill">linked</span>}
                </td>
                <td className="r num up">{r.moneyIn ? formatWhole(r.moneyIn) : ''}</td>
                <td className="r num dn">{r.moneyOut ? formatWhole(r.moneyOut) : ''}</td>
                <td className="r num lock">{formatWhole(r.balance)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="note">
          Balance in {business.currency}. Brown cells are worked out or filled in by another table. You can’t type over
          them.
        </div>
      </div>
    </LandingPanel>
  )
}
