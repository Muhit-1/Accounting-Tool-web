export interface CashFlowPoint {
  label: string
  income: number
  expense: number
}

const WIDTH = 600
const HEIGHT = 180
const PAD_LEFT = 8
const PAD_RIGHT = 8
const PAD_TOP = 10
const PAD_BOTTOM = 24

function buildPath(values: number[], max: number): string {
  if (values.length === 0) return ''
  const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT
  const innerHeight = HEIGHT - PAD_TOP - PAD_BOTTOM
  const step = values.length > 1 ? innerWidth / (values.length - 1) : 0
  return values
    .map((value, index) => {
      const x = PAD_LEFT + step * index
      const y = max === 0 ? HEIGHT - PAD_BOTTOM : PAD_TOP + innerHeight * (1 - value / max)
      return `${index === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.income, d.expense)))
  const incomePath = buildPath(
    data.map((d) => d.income),
    max,
  )
  const expensePath = buildPath(
    data.map((d) => d.expense),
    max,
  )
  const areaPath = incomePath
    ? `${incomePath} L${(WIDTH - PAD_RIGHT).toFixed(1)},${(HEIGHT - PAD_BOTTOM).toFixed(1)} L${PAD_LEFT.toFixed(1)},${(HEIGHT - PAD_BOTTOM).toFixed(1)} Z`
    : ''

  const hasActivity = data.some((d) => d.income > 0 || d.expense > 0)

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Cash flow over the last 6 months">
        <defs>
          <linearGradient id="cashflow-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-stamp)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-stamp)" stopOpacity="0" />
          </linearGradient>
        </defs>
        {hasActivity && <path d={areaPath} fill="url(#cashflow-fill)" stroke="none" />}
        {hasActivity && <path d={expensePath} fill="none" stroke="var(--color-rust)" strokeWidth="2" />}
        {hasActivity && <path d={incomePath} fill="none" stroke="var(--color-stamp)" strokeWidth="2.5" />}
        {data.map((d, index) => {
          const innerWidth = WIDTH - PAD_LEFT - PAD_RIGHT
          const step = data.length > 1 ? innerWidth / (data.length - 1) : 0
          const x = PAD_LEFT + step * index
          return (
            <text key={d.label} x={x} y={HEIGHT - 6} textAnchor="middle" fontSize="11" fill="var(--color-ink-soft)">
              {d.label}
            </text>
          )
        })}
      </svg>
      {!hasActivity && (
        <p className="absolute inset-0 flex items-center justify-center pb-6 text-sm text-ink-soft">
          No activity in this period yet.
        </p>
      )}
    </div>
  )
}
