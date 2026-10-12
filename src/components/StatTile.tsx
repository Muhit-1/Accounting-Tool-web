// A small figure with a caption above it (orders, money in, balance …).
export function StatTile({
  label,
  value,
  note,
  tone,
}: {
  label: string
  value: string | number
  note?: string
  tone?: 'in' | 'out'
}) {
  const color = tone === 'in' ? 'text-green' : tone === 'out' ? 'text-rust' : 'text-ink'
  return (
    <div className="rounded-ledger border border-paper-line bg-white px-4 py-3">
      <div className="text-[11.5px] tracking-wider text-ink-soft uppercase">{label}</div>
      <div className={`tabular text-[22px] font-medium ${color}`}>{value}</div>
      {note && <div className="text-xs text-ink-soft">{note}</div>}
    </div>
  )
}
