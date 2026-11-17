import { useState } from 'react'
import { stagger } from '../../lib/landing'
import { LandingPanel } from './LandingPanel'

const FACTS = [
  ['Lock a period', 'Pick a date; nothing before it changes.'],
  ['History', 'Who changed what, and when.'],
  ['Trash', 'Deleted rows wait 30 days.'],
  ['Export', 'Excel with formulas, or a full copy.'],
]

const PEOPLE = [
  { id: 'rina', initials: 'RA', name: 'Rina, accountant', detail: 'Whole business · until 30 Nov', level: 'View' },
  { id: 'tanvir', initials: 'TK', name: 'Tanvir, packing', detail: 'Orders table only · until 15 Dec', level: 'Edit' },
]

export function SharingPanel({ active }: { active: boolean }) {
  const [ended, setEnded] = useState<Set<string>>(new Set())

  function toggle(id: string) {
    setEnded((old) => {
      const next = new Set(old)
      if (!next.delete(id)) next.add(id)
      return next
    })
  }

  return (
    <LandingPanel id="lp-sharing" tabId="lp-tab-sharing" active={active} ghost="Shared">
      <div>
        <div className="kick" data-r="" style={stagger(0)}>
          Sharing and safety
        </div>
        <h2 data-r="" style={stagger(1)}>
          Access that <b>ends on a date.</b>
        </h2>
        <dl className="facts" data-r="" style={stagger(2)}>
          {FACTS.map(([term, text]) => (
            <div key={term}>
              <dt>{term}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </div>

      <div className="win shr" data-r="" style={stagger(2)}>
        {PEOPLE.map((p) => {
          const isEnded = ended.has(p.id)
          return (
            <div key={p.id} className={`who${isEnded ? ' ended' : ''}`}>
              <span className="av" aria-hidden="true">
                {p.initials}
              </span>
              <div>
                <b>{p.name}</b>
                <small>{isEnded ? 'Access ended' : p.detail}</small>
              </div>
              <div className="acts">
                <span className={`badge${p.level === 'Edit' ? ' e' : ''}`}>{p.level}</span>
                <button
                  type="button"
                  className="endbtn"
                  aria-label={isEnded ? `Share again with ${p.name}` : `Stop sharing with ${p.name}`}
                  onClick={() => toggle(p.id)}
                >
                  {isEnded ? 'Share again' : 'Stop'}
                </button>
              </div>
            </div>
          )
        })}
        <div className="who add">
          <span className="av" aria-hidden="true">
            +
          </span>
          <div>Share a business or one table</div>
          <span />
        </div>
      </div>
    </LandingPanel>
  )
}
