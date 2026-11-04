// The "Set up in 3 steps" card for a new business: what is done, what is next. Pure, so it is tested without a browser.

export interface SetupStep {
  key: 'create' | 'row' | 'share'
  label: string
  done: boolean
  // where the step is done (a path inside the business), when it can be
  to?: string
}

export function setupSteps(businessId: string, input: { rows: number; ledgerEntries: number; sharedWith: number }): SetupStep[] {
  const base = `/businesses/${businessId}`
  return [
    { key: 'create', label: 'Create your business', done: true },
    { key: 'row', label: 'Add your first row', done: input.rows + input.ledgerEntries > 0, to: `${base}/workspace` },
    { key: 'share', label: 'Share with your accountant', done: input.sharedWith > 0, to: `${base}/sharing` },
  ]
}

export const setupDone = (steps: SetupStep[]) => steps.every((s) => s.done)
export const setupCount = (steps: SetupStep[]) => steps.filter((s) => s.done).length
