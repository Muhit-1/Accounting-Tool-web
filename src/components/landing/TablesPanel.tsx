import type { CSSProperties } from 'react'
import { demoTotal, formatWhole, stagger } from '../../lib/landing'
import { useTour } from '../../lib/use-tour'
import { LandingPanel } from './LandingPanel'
import { TourSteps, TourWindow, type TourStep } from './Tour'

const STEPS: TourStep[] = [
  { title: 'Add a column', text: 'Text, number, date, choice, tick, or one that links to another table.', cursor: { x: 74, y: 100 } },
  { title: 'Write the formula by name', text: 'Column names, never A1.', cursor: { x: 34, y: 23 } },
  { title: 'The answers fill in and lock', text: 'Worked out on the server, every time.', cursor: { x: 74, y: 154 } },
  { title: 'Tick Paid: it posts to the Cash book', text: 'Only because you set that rule on the table.', cursor: { x: 92, y: 154 } },
]

const ITEMS = [
  { item: 'Linen set', qty: 3, price: 1800 },
  { item: 'Cushion', qty: 4, price: 650 },
  { item: 'Throw', qty: 2, price: 2400 },
]

export function TablesPanel({ active }: { active: boolean }) {
  const { step, pick } = useTour(active, STEPS.length)
  const first = formatWhole(demoTotal(ITEMS[0].qty, ITEMS[0].price))

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
        <TourSteps steps={STEPS} step={step} onPick={pick} />
      </div>

      <TourWindow title="Linen Shop · Orders" steps={STEPS} step={step}>
        <div className="fx">
          <span>ƒ</span>
          <code className={`typ${step >= 1 ? ' on' : ''}`}>
            <i>{'{Total}'}</i> = <i>{'{Qty}'}</i> × <i>{'{Price}'}</i>
          </code>
          <em className={`rv${step < 1 ? ' on' : ''}`}>Formula</em>
        </div>
        <table className="t tt">
          <colgroup>
            <col />
            <col className="q" />
            <col className="p" />
            <col className="s" />
            <col className="k" />
          </colgroup>
          <thead>
            <tr>
              <th>Item</th>
              <th className="r">Qty</th>
              <th className="r">Price</th>
              <th className={`r ${step === 0 ? 'plus' : 'fcol'}`}>{step === 0 ? '＋ Add column' : 'Total ƒ'}</th>
              <th className="c">Paid</th>
            </tr>
          </thead>
          <tbody>
            {ITEMS.map((r, i) => (
              <tr key={r.item}>
                <td>{r.item}</td>
                <td className="r num">{r.qty}</td>
                <td className="r num">{formatWhole(r.price)}</td>
                <td className="r num lock">
                  <span className={`rv${step >= 2 ? ' on' : ''}`} style={{ '--d': `${i * 140}ms` } as CSSProperties}>
                    {formatWhole(demoTotal(r.qty, r.price))}
                  </span>
                </td>
                <td className="c">
                  <span className={`tick${i === 0 && step >= 3 ? ' on' : ''}`} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className={`ttoast rv${step >= 3 ? ' on' : ''}`}>
          ✓ Posted to Cash book: <b className="num">+{first}</b>
        </div>
      </TourWindow>
    </LandingPanel>
  )
}
