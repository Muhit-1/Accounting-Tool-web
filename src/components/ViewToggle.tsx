import type { ViewMode } from '../lib/view-mode'
import { IconLayoutGrid, IconLayoutList } from './icons'

export function ViewToggle({ mode, onChange }: { mode: ViewMode; onChange: (mode: ViewMode) => void }) {
  return (
    <div className="flex flex-none items-center gap-0.5 rounded-ledger border border-paper-line bg-white p-0.5">
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={mode === 'grid'}
        onClick={() => onChange('grid')}
        className={`flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors ${
          mode === 'grid' ? 'bg-stamp-soft text-stamp' : 'text-ink-soft hover:bg-black/[0.03]'
        }`}
      >
        <IconLayoutGrid width={15} height={15} />
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={mode === 'list'}
        onClick={() => onChange('list')}
        className={`flex h-7 w-7 items-center justify-center rounded-[6px] transition-colors ${
          mode === 'list' ? 'bg-stamp-soft text-stamp' : 'text-ink-soft hover:bg-black/[0.03]'
        }`}
      >
        <IconLayoutList width={15} height={15} />
      </button>
    </div>
  )
}
