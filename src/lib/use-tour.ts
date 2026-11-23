import { useCallback, useEffect, useState } from 'react'
import { prefersReducedMotion } from './use-landing-nav'

export const TOUR_MS = 3200

// The step a looping tutorial graphic is on. It advances by itself while its page
// is showing (and the tab is visible), and a person can pick a step: the timer then
// starts over. With reduced motion nothing moves: the last step is shown, finished.
export function useTour(active: boolean, count: number, ms: number = TOUR_MS) {
  const [step, setStep] = useState(0)
  const [restart, setRestart] = useState(0)
  const reduce = prefersReducedMotion()

  useEffect(() => {
    if (!active || reduce) return
    const id = window.setInterval(() => {
      if (!document.hidden) setStep((s) => (s + 1) % count)
    }, ms)
    return () => window.clearInterval(id)
  }, [active, reduce, count, ms, restart])

  const pick = useCallback((i: number) => {
    setStep(i)
    setRestart((r) => r + 1)
  }, [])

  return { step: reduce ? count - 1 : step, pick }
}
