import { useState } from 'react'
import { demoTotal, formatWhole, stagger } from '../../lib/landing'
import { LandingPanel } from './LandingPanel'

// Plain column types are grey; the ones that connect or work things out are blue.
const PLAIN_TYPES = ['Text', 'Number', 'Money', 'Date', 'Choice', 'Tick']
const SMART_TYPES = ['Link', 'Lookup', 'Rollup', 'Formula']

export function TablesPanel({ active }: { active: boolean }) {
  const [qty, setQty] = useState('3')
  const [price, setPrice] = useState('1800')
  const [paid, setPaid] = useState(false)
  const total = formatWhole(demoTotal(Number(qty), Number(price)))

  return (
    <LandingPanel id="lp-tables" tabId="lp-tab-tables" active={active} ghost="Orders">
      <div>
        <div className="kick" data-r="" style={stagger(0)}>
          Your own tables
        </div>
        <h2 data-r="" style={stagger(1)}>
          Formulas by <b>column name.</b> No A1.
        </h2>
        <p className="lede" data-r="" style={stagger(2)}>
          Add columns, link tables together, and decide which rows reach the Cash book. Nothing posts money unless you
          set the rule.
        </p>
        <div className="types" data-r="" style={stagger(3)} role="list" aria-label="Column types">
          {PLAIN_TYPES.map((t) => (
            <span key={t} role="listitem">
              {t}
            </span>
          ))}
          {SMART_TYPES.map((t) => (
            <span key={t} role="listitem" className="f">
              {t}
            </span>
          ))}
        </div>
      </div>

      <div className="win sandbox" data-r="" style={stagger(2)}>
        <div className="fld">
          <label htmlFor="lp-qty">Qty</label>
          <input
            id="lp-qty"
            type="number"
            min={0}
            max={999}
            inputMode="numeric"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
          />
        </div>
        <div className="fld">
          <label htmlFor="lp-price">Price</label>
          <input
            id="lp-price"
            type="number"
            min={0}
            max={99999}
            inputMode="numeric"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />
        </div>
        <div className="fld">
          <span className="lbl">Total ƒ</span>
          <div className="out">
            <b className="num">{total}</b>
            <span>worked out · locked</span>
          </div>
        </div>
        <div className="formula">
          <i>{'{Total}'}</i> = <i>{'{Qty}'}</i> × <i>{'{Price}'}</i>
        </div>
        <label className="sw">
          <input type="checkbox" checked={paid} onChange={(e) => setPaid(e.target.checked)} />
          <span className="k" />
          <span>Paid</span>
        </label>
        <div className={`posted${paid ? ' on' : ''}`} role="status">
          {paid ? (
            <>
              ✓ Posted to Cash book: +<span className="num posted-amount">{total}</span>
            </>
          ) : null}
        </div>
      </div>
    </LandingPanel>
  )
}
