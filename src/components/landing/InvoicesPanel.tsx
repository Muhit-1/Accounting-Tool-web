import { useState } from 'react'
import { stagger } from '../../lib/landing'
import { LandingPanel } from './LandingPanel'

const STATUSES = [
  { label: 'Draft', message: 'Draft: you can still edit it.' },
  { label: 'Sent', message: 'Sent: locked for editing now.' },
  { label: 'Paid', message: 'Paid. Posted to the Cash book as USD +2,040.00.' },
]

export function InvoicesPanel({ active }: { active: boolean }) {
  const [status, setStatus] = useState(0)

  return (
    <LandingPanel id="lp-invoices" tabId="lp-tab-invoices" active={active} ghost="Invoices">
      <div>
        <div className="kick" data-r="" style={stagger(0)}>
          Invoices
        </div>
        <h2 data-r="" style={stagger(1)}>
          Draft it, send it, <b>mark it paid.</b>
        </h2>
        <p className="lede" data-r="" style={stagger(2)}>
          See the invoice as it will print while you fill it in. Numbers count up on their own. Paid invoices can post to
          the Cash book.
        </p>
        <div className="steps" role="group" aria-label="Invoice status" data-r="" style={stagger(3)}>
          {STATUSES.map((s, i) => (
            <button key={s.label} type="button" aria-pressed={i === status} onClick={() => setStatus(i)}>
              {s.label}
            </button>
          ))}
        </div>
        <p className="toast" role="status">
          {STATUSES[status].message}
        </p>
      </div>

      <div className="paper-wrap" data-r="" style={stagger(2)}>
        <div className="paper">
          <div className="h">
            <div>
              <strong className="t">Invoice 0014</strong>
              <div className="paper-sub">Trail Gear · USD</div>
            </div>
            <div className="paper-sub paper-dates">
              Issued 02 Nov
              <br />
              Due 16 Nov
            </div>
          </div>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th className="r">Qty</th>
                <th className="r">Amount</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Trail pack, 40L</td>
                <td className="num r">20</td>
                <td className="num r">1,800.00</td>
              </tr>
              <tr>
                <td>Rain cover</td>
                <td className="num r">20</td>
                <td className="num r">240.00</td>
              </tr>
            </tbody>
          </table>
          <div className="tot">
            <span>Total</span>
            <span className="num">USD 2,040.00</span>
          </div>
        </div>
        <div className={`stamp${status === 2 ? ' on' : ''}`} aria-hidden="true">
          PAID
        </div>
      </div>
    </LandingPanel>
  )
}
