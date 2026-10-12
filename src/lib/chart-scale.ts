export function compactNumber(value: number): string {
  if (value >= 1000) return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`
  return String(Math.round(value))
}

// Picks a "nice" axis ceiling (1/2/5 × a power of ten) above the data max,
// so gridlines land on round numbers instead of whatever the peak happened
// to be — e.g. a peak of 21,000 gets a 25,000 ceiling, not a jagged 21,000.
export function niceCeiling(value: number): number {
  if (value <= 0) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const steps = [1, 2, 2.5, 5, 10]
  for (const step of steps) {
    const candidate = step * magnitude
    if (candidate >= value) return candidate
  }
  return 10 * magnitude
}
