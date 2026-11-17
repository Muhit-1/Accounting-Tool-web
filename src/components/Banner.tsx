import type { AnnouncementLevel } from '../types/admin'

const STYLES: Record<AnnouncementLevel, string> = {
  info: 'bg-stamp-soft text-info-ink',
  warning: 'bg-brass-soft text-warn-ink',
  critical: 'bg-rust text-white',
}

// A one-line notice above the top bar (the announcement or the maintenance message the admin panel sets). Plain text only.
export function Banner({ level, text }: { level: AnnouncementLevel; text: string }) {
  return (
    <div role={level === 'critical' ? 'alert' : 'status'} className={`flex items-center justify-center gap-2 px-4 py-2 text-center text-[13.5px] ${STYLES[level]}`}>
      <span>{text}</span>
    </div>
  )
}
