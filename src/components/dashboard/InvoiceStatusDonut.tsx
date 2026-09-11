export interface InvoiceStatusSlice {
  label: string
  count: number
  colorVar: string
}

const SIZE = 84
const STROKE = 12
const RADIUS = (SIZE - STROKE) / 2
const CIRCUMFERENCE = 2 * Math.PI * RADIUS

export function InvoiceStatusDonut({ slices }: { slices: InvoiceStatusSlice[] }) {
  const total = slices.reduce((sum, s) => sum + s.count, 0)
  let offset = 0

  return (
    <div className="flex items-center gap-5">
      <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} role="img" aria-label="Invoice status breakdown">
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={RADIUS}
          fill="none"
          stroke="var(--color-paper-line)"
          strokeWidth={STROKE}
        />
        {total > 0 &&
          slices
            .filter((s) => s.count > 0)
            .map((slice) => {
              const fraction = slice.count / total
              const dash = fraction * CIRCUMFERENCE
              const segment = (
                <circle
                  key={slice.label}
                  cx={SIZE / 2}
                  cy={SIZE / 2}
                  r={RADIUS}
                  fill="none"
                  stroke={slice.colorVar}
                  strokeWidth={STROKE}
                  strokeDasharray={`${dash} ${CIRCUMFERENCE - dash}`}
                  strokeDashoffset={-offset}
                  transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
                  strokeLinecap={slices.filter((s) => s.count > 0).length === 1 ? 'butt' : 'round'}
                />
              )
              offset += dash
              return segment
            })}
      </svg>
      <div className="flex flex-col gap-1.5">
        {slices.map((slice) => (
          <div key={slice.label} className="flex items-center gap-2 text-[13px] text-ink-soft">
            <span className="h-2 w-2 flex-none rounded-full" style={{ backgroundColor: slice.colorVar }} />
            {slice.label}: <span className="font-medium text-ink">{slice.count}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
