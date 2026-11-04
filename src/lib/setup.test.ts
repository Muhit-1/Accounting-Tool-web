import { describe, expect, it } from 'vitest'
import { setupCount, setupDone, setupSteps } from './setup'

describe('setupSteps', () => {
  it('starts with only the first step done', () => {
    const steps = setupSteps('b1', { rows: 0, ledgerEntries: 0, sharedWith: 0 })
    expect(steps.map((s) => s.done)).toEqual([true, false, false])
    expect(setupCount(steps)).toBe(1)
    expect(setupDone(steps)).toBe(false)
    expect(steps[2].to).toBe('/businesses/b1/sharing')
  })
  it('counts a row in a table or an entry in the Cash book as the first row', () => {
    expect(setupSteps('b', { rows: 3, ledgerEntries: 0, sharedWith: 0 })[1].done).toBe(true)
    expect(setupSteps('b', { rows: 0, ledgerEntries: 1, sharedWith: 0 })[1].done).toBe(true)
  })
  it('is done when all three are', () => {
    expect(setupDone(setupSteps('b', { rows: 1, ledgerEntries: 0, sharedWith: 1 }))).toBe(true)
  })
})
