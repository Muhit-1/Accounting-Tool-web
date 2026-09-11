import { IconArrowDownRight, IconArrowUpRight } from '../icons'

export interface KpiCell {
  label: string
  value: string
  sub?: string
  tone?: 'up' | 'down' | 'neutral'
}

const TONE_CLASS: Record<NonNullable<KpiCell['tone']>, string> = {
  up: 'text-green',
  down: 'text-rust',
  neutral: 'text-ink-soft',
}

export function KpiBand({ cells }: { cells: KpiCell[] }) {
  return (
    <div className="rise rise-1 mb-8 grid grid-cols-2 gap-3 lg:grid-cols-4">
      {cells.map((cell) => (
        <div key={cell.label} className="flex flex-col gap-1.5 rounded-ledger border border-paper-line bg-white px-[18px] py-4">
          <div className="text-[11.5px] tracking-wider text-ink-soft uppercase">{cell.label}</div>
          <div className="tabular text-[24px] font-bold">{cell.value}</div>
          {cell.sub && (
            <div className={`flex items-center gap-1 text-[13px] ${TONE_CLASS[cell.tone ?? 'neutral']}`}>
              {cell.tone === 'up' && <IconArrowUpRight width={13} height={13} strokeWidth="2.4" />}
              {cell.tone === 'down' && <IconArrowDownRight width={13} height={13} strokeWidth="2.4" />}
              {cell.sub}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}
