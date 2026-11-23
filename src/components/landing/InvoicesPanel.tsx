import { stagger } from '../../lib/landing'
import { useTour } from '../../lib/use-tour'
import { LandingPanel } from './LandingPanel'
import { TourSteps, TourWindow, type TourStep } from './Tour'

const STEPS: TourStep[] = [
  { title: 'Fill in the first line', text: 'The invoice shows as it will print, while you type.', cursor: { x: 70, y: 158 } },
  { title: 'Add lines, the total adds up', text: 'Numbers count up on their own.', cursor: { x: 80, y: 250 } },
  { title: 'Send it', text: 'Once sent, it is locked for editing. The PDF is ready.', cursor: { x: 88, y: 18 } },
  { title: 'Mark it paid', text: 'It can post to the Cash book for you.', cursor: { x: 70, y: 285 } },
]

const STATUS = ['Draft', 'Draft', 'Sent', 'Paid']

export function InvoicesPanel({ active }: { active: boolean }) {
  const { step, pick } = useTour(active, STEPS.length)

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
        <TourSteps steps={STEPS} step={step} onPick={pick} />
      </div>

      <TourWindow
        title="Trail Gear · Invoice"
        steps={STEPS}
        step={step}
        chip={
          <span key={STATUS[step]} className={`stat s${STATUS[step]}`}>
            {STATUS[step]}
          </span>
        }
      >
        <div className="paper tourpaper">
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
              <tr className={`rv${step >= 1 ? ' on' : ''}`}>
                <td>Rain cover</td>
                <td className="num r">20</td>
                <td className="num r">240.00</td>
              </tr>
            </tbody>
          </table>
          <div className={`tot rv${step >= 1 ? ' on' : ''}`}>
            <span>Total</span>
            <span className="num">USD 2,040.00</span>
          </div>
          <div className={`stamp${step === 3 ? ' on' : ''}`}>PAID</div>
        </div>
        <div className={`ttoast rv${step >= 2 ? ' on' : ''}`}>
          {step === 3 ? (
            <>
              ✓ Posted to Cash book: <b className="num">USD +2,040.00</b>
            </>
          ) : (
            <>✓ Sent · PDF ready to download</>
          )}
        </div>
      </TourWindow>
    </LandingPanel>
  )
}
