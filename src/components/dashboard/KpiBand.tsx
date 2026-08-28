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
    <div className="rise rise-1 mb-8 grid grid-cols-2 border-t-2 border-ink border-b border-paper-line py-4.5 lg:grid-cols-4">
      {cells.map((cell, index) => (
        <div key={cell.label} className={`px-6 first:pl-0 ${index > 0 ? 'border-l border-paper-line' : ''}`}>
          <div className="mb-2 text-xs tracking-wider text-ink-soft uppercase">{cell.label}</div>
          <div className="tabular text-[28px] font-medium">{cell.value}</div>
          {cell.sub && <div className={`mt-1.5 text-[13px] ${TONE_CLASS[cell.tone ?? 'neutral']}`}>{cell.sub}</div>}
        </div>
      ))}
    </div>
  )
}
