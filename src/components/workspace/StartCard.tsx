import { useState } from 'react'
import type { TemplateInfo } from '../../types/engine'
import { Button } from '../Button'

const dismissedKey = (businessId: string) => `start-card:v1:${businessId}`

function wasDismissed(businessId: string): boolean {
  try {
    return window.localStorage.getItem(dismissedKey(businessId)) === '1'
  } catch {
    return false
  }
}

// What a brand-new business shows above its empty sheet: bring in your own workbook, start from a ready-made
// table, or just start typing. Gone for good once it is closed (kept in this browser only; the page works without it).
export function StartCard({ businessId, templates, onUpload, onTemplate }: { businessId: string; templates: TemplateInfo[]; onUpload: () => void; onTemplate: (key: string) => void }) {
  const [closed, setClosed] = useState(() => wasDismissed(businessId))
  if (closed) return null

  function close() {
    try {
      window.localStorage.setItem(dismissedKey(businessId), '1')
    } catch {
      // nothing to do: it comes back next time
    }
    setClosed(true)
  }

  return (
    <section aria-label="Getting started" className="mb-4 rounded-ledger border border-paper-line bg-white px-5 py-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="font-display text-[17px] font-bold">Start with what you have</h2>
          <p className="mt-0.5 max-w-xl text-[13.5px] text-ink-soft">
            Upload your Excel or Google Sheets file and your tables, formulas and links are rebuilt for you. Or start from a ready-made table, or just type in the sheet below.
          </p>
        </div>
        <button type="button" onClick={close} className="flex-none text-[12.5px] text-ink-soft underline hover:text-ink">
          Start blank
        </button>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button onClick={onUpload}>Upload my sheet</Button>
        {templates.slice(0, 6).map((t) => (
          <button key={t.key} type="button" title={t.description} onClick={() => onTemplate(t.key)} className="rounded-ledger border border-paper-line bg-white px-3 py-2 text-[13px] font-semibold hover:bg-stamp-soft">
            {t.name}
          </button>
        ))}
      </div>
    </section>
  )
}
