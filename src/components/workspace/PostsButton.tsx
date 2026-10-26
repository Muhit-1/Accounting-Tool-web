import { IconLink } from '../icons'

// The chip on every sheet that can send rows to the Cash book: gold when it does, grey when it does not. A click
// opens the rule.
export function PostsButton({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title="Choose which rows of this sheet go to the Cash book"
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold ${
        on ? 'border-brass-line bg-brass-row text-brass hover:bg-brass-soft' : 'border-paper-line bg-paper text-ink-soft hover:bg-stamp-soft'
      }`}
    >
      <IconLink width={13} height={13} />
      {on ? 'Posts to Cash book' : 'Not posted to Cash book'}
    </button>
  )
}
