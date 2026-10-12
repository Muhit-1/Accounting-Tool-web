import { compactNumber, niceCeiling } from '../../lib/chart-scale'
import { formatAmount } from '../../lib/format'
import { monthLabel } from '../../lib/statements'
import type { MonthlyRow } from '../../types/api'

const WIDTH = 600
const HEIGHT = 210
const PAD_LEFT = 38
const PAD_RIGHT = 8
const PAD_TOP = 12
const PAD_BOTTOM = 34
const INNER_WIDTH = WIDTH - PAD_LEFT - PAD_RIGHT
const INNER_HEIGHT = HEIGHT - PAD_TOP - PAD_BOTTOM

// Money in (green) and money out (red) side by side for each month. The table
// under it carries the exact figures; this is the picture.
export function MonthlyBarChart({ rows, currency }: { rows: MonthlyRow[]; currency: string }) {
  const ceiling = niceCeiling(Math.max(1, ...rows.map((row) => Math.max(row.moneyIn, row.moneyOut))))
  const slot = INNER_WIDTH / Math.max(1, rows.length)
  const barWidth = Math.min(18, slot * 0.38)
  const showYear = rows.length > 12
  const heightFor = (value: number) => (value / ceiling) * INNER_HEIGHT
  const baseline = PAD_TOP + INNER_HEIGHT

  const ticks = [0, 0.5, 1].map((fraction) => ({
    value: ceiling * fraction,
    y: baseline - INNER_HEIGHT * fraction,
  }))

  return (
    <svg
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      className="w-full"
      role="img"
      aria-label={`Money in and money out for each of ${rows.length} months`}
    >
      {ticks.map((tick) => (
        <g key={tick.value}>
          <line x1={PAD_LEFT} y1={tick.y} x2={WIDTH - PAD_RIGHT} y2={tick.y} stroke="var(--color-paper-line)" strokeWidth="1" />
          <text x={PAD_LEFT - 6} y={tick.y + 3.5} textAnchor="end" fontSize="10.5" fill="var(--color-ink-soft)">
            {compactNumber(tick.value)}
          </text>
        </g>
      ))}

      {rows.map((row, index) => {
        const center = PAD_LEFT + slot * index + slot / 2
        const inHeight = heightFor(row.moneyIn)
        const outHeight = heightFor(row.moneyOut)
        const [year, month] = row.month.split('-')
        const label = monthLabel(row.month, false)
        return (
          <g key={row.month}>
            <rect x={center - barWidth - 1} y={baseline - inHeight} width={barWidth} height={inHeight} rx="2" fill="var(--color-green)">
              <title>{`${monthLabel(row.month)} · Money in ${formatAmount(row.moneyIn)} ${currency}`}</title>
            </rect>
            <rect x={center + 1} y={baseline - outHeight} width={barWidth} height={outHeight} rx="2" fill="var(--color-rust)">
              <title>{`${monthLabel(row.month)} · Money out ${formatAmount(row.moneyOut)} ${currency}`}</title>
            </rect>
            <text x={center} y={HEIGHT - 17} textAnchor="middle" fontSize={showYear ? 9.5 : 11} fill="var(--color-ink-soft)">
              {label}
            </text>
            {showYear && (index === 0 || month === '01') && (
              <text x={center} y={HEIGHT - 5} textAnchor="middle" fontSize="9.5" fontWeight="600" fill="var(--color-ink-soft)">
                {year}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}
