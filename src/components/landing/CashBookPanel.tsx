import type { CSSProperties } from 'react'
import { buildLedger, formatWhole, stagger, type DemoEntry } from '../../lib/landing'
import { useTour } from '../../lib/use-tour'
import { LandingPanel } from './LandingPanel'
import { TourSteps, TourWindow, type TourStep } from './Tour'

const STEPS: TourStep[] = [
  { title: 'Type in the blank row', text: 'Click a cell and type, like in a sheet.', cursor: { x: 38, y: 155 } },
  { title: 'Put the amount in Money out', text: 'Money in and Money out are two plain columns.', cursor: { x: 76, y: 155 } },
  { title: 'The balance works itself out', text: 'It is locked. Nobody can type over it.', cursor: { x: 92, y: 155 } },
  { title: 'Or paste from Excel', text: 'Many rows at once, checked by the server.', cursor: { x: 30, y: 215 } },
]

const e = (date: string, memo: string, moneyIn: number, moneyOut: number, linked = false): DemoEntry => ({ date, memo, moneyIn, moneyOut, linked })

// The sixth entries below are the ones that arrive in step 4 (pasted).
const ROWS = buildLedger(48200, [
  e('04 Nov', 'Order ORD-0041', 4800, 0, true),
  e('05 Nov', 'Packaging', 0, 2150),
  e('06 Nov', 'Rent, shop', 0, 18000),
  e('07 Nov', 'Courier fee', 0, 380),
  e('08 Nov', 'Order ORD-0043', 3200, 0, true),
  e('09 Nov', 'Fabric restock', 0, 4200),
])

export function CashBookPanel({ active }: { active: boolean }) {
  const { step, pick } = useTour(active, STEPS.length)

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
        <TourSteps steps={STEPS} step={step} onPick={pick} />
      </div>

      <TourWindow title="Linen Shop · Cash book" steps={STEPS} step={step} chip="BDT">
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
            {ROWS.map((r, i) => {
              const draft = i === 2
              const pasted = i >= 3
              const shown = !pasted || step >= 3
              return (
                <tr key={r.memo} className={`rv${shown ? ' on' : ''}`} style={{ '--d': `${pasted ? (i - 3) * 160 : 0}ms` } as CSSProperties}>
                  <td className="num">{r.date}</td>
                  <td>
                    <span className={draft ? `typ${step >= 0 ? ' on' : ''}` : undefined}>{r.memo}</span>
                    {r.linked && <span className="pill">linked</span>}
                  </td>
                  <td className="r num up">{r.moneyIn ? formatWhole(r.moneyIn) : ''}</td>
                  <td className="r num dn">
                    <span className={draft ? `rv${step >= 1 ? ' on' : ''}` : undefined}>{r.moneyOut ? formatWhole(r.moneyOut) : ''}</span>
                  </td>
                  <td className="r num lock">
                    <span key={draft ? `b${step >= 2}` : undefined} className={draft ? `rv${step >= 2 ? ' on flash' : ''}` : undefined}>
                      {formatWhole(r.balance)}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        <div className={`tnote rv${step >= 3 ? ' on' : ''}`}>Pasted 3 rows · all checked</div>
      </TourWindow>
    </LandingPanel>
  )
}
