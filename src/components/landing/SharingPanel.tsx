import { stagger } from '../../lib/landing'
import { useTour } from '../../lib/use-tour'
import { LandingPanel } from './LandingPanel'
import { TourSteps, TourWindow, type TourStep } from './Tour'

const FACTS = ['Lock a period', 'History of changes', 'Trash for 30 days', 'Export to Excel']

const STEPS: TourStep[] = [
  { title: 'Share a business or one table', text: 'Pick the person and what they may open.', cursor: { x: 40, y: 262 } },
  { title: 'Choose View or Edit', text: 'View only looks. Edit can change rows.', cursor: { x: 80, y: 166 } },
  { title: 'Set an end date', text: 'Access stops on its own. Nothing to remember.', cursor: { x: 38, y: 166 } },
  { title: 'The date passes', text: 'Access ended. Share again with one click.', cursor: { x: 90, y: 300 } },
]

export function SharingPanel({ active }: { active: boolean }) {
  const { step, pick } = useTour(active, STEPS.length)
  const ended = step === 3

  return (
    <LandingPanel id="lp-sharing" tabId="lp-tab-sharing" active={active} ghost="Shared">
      <div>
        <div className="kick" data-r="" style={stagger(0)}>
          Sharing and safety
        </div>
        <h2 data-r="" style={stagger(1)}>
          Access that <b>ends on a date.</b>
        </h2>
        <TourSteps steps={STEPS} step={step} onPick={pick} />
        <div className="proof" data-r="" style={stagger(4)}>
          {FACTS.map((f) => (
            <span key={f}>{f}</span>
          ))}
        </div>
      </div>

      <TourWindow title="Linen Shop · Sharing" steps={STEPS} step={step} chip={ended ? 'Today 16 Dec' : 'Today 10 Dec'}>
        <div className="shr">
          <div className="who">
            <span className="av">RA</span>
            <div>
              <b>Rina, accountant</b>
              <small>Whole business · until 30 Dec</small>
            </div>
            <div className="acts">
              <span className="badge">View</span>
            </div>
          </div>
          <div className={`who rv${step >= 0 ? ' on' : ''}${ended ? ' ended' : ''}`}>
            <span className="av">TK</span>
            <div>
              <b>Tanvir, packing</b>
              <small>{ended ? 'Access ended' : step >= 2 ? 'Orders table only · until 15 Dec' : 'Orders table only · no end date'}</small>
            </div>
            <div className="acts">
              <span className={`badge${step >= 1 && !ended ? ' e' : ''}`}>{step >= 1 ? 'Edit' : 'View'}</span>
              <span className="endbtn">{ended ? 'Share again' : 'Stop'}</span>
            </div>
          </div>
          <div className="who add">
            <span className="av">+</span>
            <div>Share a business or one table</div>
            <span />
          </div>
        </div>
      </TourWindow>
    </LandingPanel>
  )
}
