import type { CSSProperties, ReactNode } from 'react'
import { stagger } from '../../lib/landing'
import { TOUR_MS } from '../../lib/use-tour'

export interface TourStep {
  title: string
  text: string
  // Where the pointer rests: x in % of the window width, y in "pixels" (--u units) from the top of the window body.
  cursor: { x: number; y: number }
}

// The numbered list on the left; it follows the animation and can be clicked.
export function TourSteps({ steps, step, onPick }: { steps: TourStep[]; step: number; onPick: (i: number) => void }) {
  return (
    <ol className="tsteps" data-r="" style={stagger(3)}>
      {steps.map((s, i) => (
        <li key={s.title}>
          <button type="button" aria-current={i === step ? 'step' : undefined} onClick={() => onPick(i)}>
            <i className="num">{i + 1}</i>
            <span>
              <b>{s.title}</b>
              <small>{s.text}</small>
            </span>
          </button>
        </li>
      ))}
    </ol>
  )
}

// A looping "how it works" picture: a small window, a pointer that moves to each place, and a caption. The picture
// itself is a plain function of the step (drawn by the panel); the movement is CSS transitions. Decorative: the
// step list next to it says the same in words, so the window is hidden from screen readers.
export function TourWindow({
  title,
  steps,
  step,
  chip,
  children,
}: {
  title: string
  steps: TourStep[]
  step: number
  chip?: ReactNode
  children: ReactNode
}) {
  const c = steps[step].cursor
  return (
    <div className="win tour" data-r="" style={stagger(2)} aria-hidden="true">
      <div className="bar">
        <span className="dots">
          <i />
          <i />
          <i />
        </span>
        {title}
        {chip && <span className="tchip">{chip}</span>}
      </div>
      <div className="tbody">
        {children}
        <span className="cur" style={{ left: `${c.x}%`, top: `calc(${c.y} * var(--u))` }}>
          <i key={step} className="ripple" />
          <svg viewBox="0 0 22 22" fill="none">
            <path d="M3 2v15l4.2-3.8 2.9 6.3 2.7-1.2-2.9-6.2H16z" fill="#fff" stroke="#0e1a14" strokeWidth="1.4" strokeLinejoin="round" />
          </svg>
        </span>
      </div>
      <div className="cap" style={{ '--ms': `${TOUR_MS}ms` } as CSSProperties}>
        <span className="num">
          {step + 1}/{steps.length}
        </span>
        <b key={step}>{steps[step].title}</b>
        <i key={`f${step}`} className="fill" />
      </div>
    </div>
  )
}
