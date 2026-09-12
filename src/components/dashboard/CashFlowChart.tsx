export interface CashFlowPoint {
  label: string
  income: number
  expense: number
}

const WIDTH = 600
const HEIGHT = 200
const PAD_LEFT = 34
const PAD_RIGHT = 8
const PAD_TOP = 14
const PAD_BOTTOM = 24
const INNER_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT
const INNER_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM

function compactNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return String(Math.round(value))
}

// Picks a "nice" axis ceiling (1/2/5 × a power of ten) above the data max,
// so gridlines land on round numbers instead of whatever the peak happened
// to be — e.g. a peak of 21,000 gets a 25,000 ceiling, not a jagged 21,000.
function niceCeiling(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const steps = [1, 2, 2.5, 5, 10]
  for (const step of steps) {
    const candidate = step * magnitude
    if (candidate >= value) return candidate
  }
  return 10 * magnitude
}

function pointsFor(values: number[], ceiling: number): { x: number; y: number }[] {
  const step = values.length > 1 ? INNER_WIDTH / (values.length - 1) : 0
  return values.map((value, index) => ({
    x: PAD_LEFT + step * index,
    y: PAD_TOP + INNER_HEIGHT * (1 - value / ceiling),
  }))
}

function toPath(points: { x: number; y: number }[]): string {
  return points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

export function CashFlowChart({ data }: { data: CashFlowPoint[] }) {
  const hasActivity = data.some((d) => d.income > 0 || d.expense > 0)
  const ceiling = niceCeiling(Math.max(1, ...data.map((d) => Math.max(d.income, d.expense))))
  const incomePoints = pointsFor(
    data.map((d) => d.income),
    ceiling,
  )
  const expensePoints = pointsFor(
    data.map((d) => d.expense),
    ceiling,
  )
  const incomePath = toPath(incomePoints)
  const expensePath = toPath(expensePoints)
  const areaPath = incomePath
    ? `${incomePath} L${(WIDTH - PAD_RIGHT).toFixed(1)},${(HEIGHT - PAD_BOTTOM).toFixed(1)} L${PAD_LEFT.toFixed(1)},${(HEIGHT - PAD_BOTTOM).toFixed(1)} Z`
    : ''
  const lastIncome = incomePoints[incomePoints.length - 1]

  const ticks = [0, 0.5, 1].map((fraction) => ({
    value: ceiling * fraction,
    y: PAD_TOP + INNER_HEIGHT * (1 - fraction),
  }))

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="w-full" role="img" aria-label="Cash flow over the last 6 months">
        <defs>
          <linearGradient id="cashflow-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-stamp)" stopOpacity="0.16" />
            <stop offset="100%" stopColor="var(--color-stamp)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((tick) => (
          <g key={tick.value}>
            <line
              x1={PAD_LEFT}
              y1={tick.y}
              x2={WIDTH - PAD_RIGHT}
              y2={tick.y}
              stroke="var(--color-paper-line)"
              strokeWidth="1"
            />
            <text x={PAD_LEFT - 8} y={tick.y + 3.5} textAnchor="end" fontSize="10.5" fill="var(--color-ink-soft)">
              {compactNumber(tick.value)}
            </text>
          </g>
        ))}

        {hasActivity && <path d={areaPath} fill="url(#cashflow-fill)" stroke="none" />}
        {hasActivity && <path d={expensePath} fill="none" stroke="var(--color-rust)" strokeWidth="2" />}
        {hasActivity && <path d={incomePath} fill="none" stroke="var(--color-stamp)" strokeWidth="2.5" />}
        {hasActivity && lastIncome && <circle cx={lastIncome.x} cy={lastIncome.y} r="3.5" fill="var(--color-stamp)" />}

        {data.map((d, index) => {
          const step = data.length > 1 ? INNER_WIDTH / (data.length - 1) : 0
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
