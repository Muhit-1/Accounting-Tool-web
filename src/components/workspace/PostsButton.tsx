import { IconLink } from '../icons'

// The toolbar button of every table that can send rows to the Cash book.
export function PostsButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Choose what this table sends to the Cash book"
      className="flex items-center gap-1.5 rounded-ledger border border-paper-line bg-white px-2.5 py-1.5 text-[12.5px] font-semibold hover:bg-stamp-soft"
    >
      <span className={on ? 'text-brass' : 'text-ink-soft'}>
        <IconLink width={13} height={13} />
      </span>
      Posts to Cash book: {on ? 'On' : 'Off'}
    </button>
  )
}
