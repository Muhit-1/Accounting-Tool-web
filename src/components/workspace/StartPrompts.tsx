import { useState, type ReactNode } from 'react'
import { IconPlus, IconTable } from '../icons'

// Where a brand-new business starts. The three choices (bring a sheet, use a template, start blank) are shown once on
// the Dashboard. In the Cash book the same two ways in are only a thin line that can be closed. Both are remembered
// in this browser only; the pages work without them.
const welcomeKey = (businessId: string) => `welcome:v2:${businessId}`
const stripKey = (businessId: string) => `start-strip:v2:${businessId}`

function wasDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(key) === '1'
  } catch {
    return false
  }
}

function dismiss(key: string) {
  try {
    window.localStorage.setItem(key, '1')
  } catch {
    // nothing to do: it comes back next time
  }
}

function UploadIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M12 16V4M7 9l5-5 5 5M4 20h16" />
    </svg>
  )
}

function Choice({ icon, title, body, onClick }: { icon: ReactNode; title: string; body: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col items-start gap-2 rounded-ledger border border-paper-line bg-white p-4 text-left hover:border-stamp hover:shadow-[0_0_0_3px_var(--color-stamp-soft)]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-[9px] bg-stamp-soft text-stamp">{icon}</span>
      <span className="font-display text-[15px] font-bold">{title}</span>
      <span className="text-[13px] text-ink-soft">{body}</span>
    </button>
  )
}

export type StartChoice = 'upload' | 'templates' | 'blank'

// The first thing a business nobody has touched yet shows on its Dashboard.
export function WelcomeCards({ businessId, onChoose }: { businessId: string; onChoose: (choice: StartChoice) => void }) {
  const [closed, setClosed] = useState(() => wasDismissed(welcomeKey(businessId)))
  if (closed) return null

  function choose(choice: StartChoice) {
    // Once a way in was chosen there is nothing left to welcome.
    dismiss(welcomeKey(businessId))
    dismiss(stripKey(businessId))
    setClosed(true)
    onChoose(choice)
  }

  return (
    <section aria-label="Getting started" className="mb-7">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="font-display text-[19px] font-bold">Start with what you have</h2>
          <p className="mt-0.5 max-w-xl text-[13.5px] text-ink-soft">Bring your own sheet, begin from a ready-made one, or just start typing. You can change your mind any time.</p>
        </div>
        <button
          type="button"
          onClick={() => {
            dismiss(welcomeKey(businessId))
            setClosed(true)
          }}
          className="text-[12.5px] text-ink-soft underline hover:text-ink"
        >
          Hide this
        </button>
      </div>
      <div className="grid gap-3.5 md:grid-cols-3">
        <Choice icon={<UploadIcon />} title="Upload my sheet" body="An Excel or Google Sheets file. Tables, formulas and links are rebuilt for you." onClick={() => choose('upload')} />
        <Choice icon={<IconTable width={18} height={18} />} title="Start from a template" body="Orders, Costs, Clients, Members, Appointments, Rent." onClick={() => choose('templates')} />
        <Choice icon={<IconPlus width={18} height={18} />} title="Start blank" body="Open the Cash book and type your first entry." onClick={() => choose('blank')} />
      </div>
    </section>
  )
}

// One thin line under the toolbar of a business nobody has touched yet. It never pushes the sheet down.
export function StartStrip({ businessId, onUpload, onTemplates }: { businessId: string; onUpload: () => void; onTemplates: (anchor: DOMRect) => void }) {
  const [closed, setClosed] = useState(() => wasDismissed(stripKey(businessId)))
  if (closed) return null
  return (
    <div className="flex items-center gap-3 border-b border-paper-line bg-stamp-soft px-4 py-1.5 text-[13px]">
      <span>Already have a sheet?</span>
      <button type="button" onClick={onUpload} className="font-bold text-stamp underline">
        Upload it
      </button>
      <span className="text-ink-soft">or</span>
      <button type="button" onClick={(event) => onTemplates(event.currentTarget.getBoundingClientRect())} className="font-bold text-stamp underline">
        use a template
      </button>
      <span className="flex-1" />
      <button
        type="button"
        aria-label="Close this"
        onClick={() => {
          dismiss(stripKey(businessId))
          setClosed(true)
        }}
        className="h-6 w-6 rounded-md text-ink-soft hover:bg-white hover:text-ink"
      >
        ✕
      </button>
    </div>
  )
}
