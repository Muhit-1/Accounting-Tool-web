import { useState } from 'react'
import { ApiError } from '../../lib/api-client'
import { useBusiness } from '../../lib/businesses'
import { formatDay } from '../../lib/format'
import { useSetPeriodLock } from '../../lib/trust'
import { useToast } from '../../lib/toast-context'
import { Button } from '../Button'
import { Panel } from '../Panel'
import { TextField } from '../TextField'

const messageOf = (err: unknown) => (err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')

// Settings → Data: close the books up to a day, so nothing earlier can be added, changed or removed
// (a month that was handed to an accountant, or a year that was filed).
export function PeriodLockPanel({ businessId }: { businessId: string }) {
  const toast = useToast()
  const { data: business } = useBusiness(businessId)
  const setLock = useSetPeriodLock(businessId)
  const locked = business?.lockedBefore ? business.lockedBefore.slice(0, 10) : null
  const [day, setDay] = useState('')

  function save(value: string | null) {
    setLock.mutate(value, {
      onSuccess: () => {
        toast(value ? `The books are closed before ${formatDay(value)}.` : 'The books are open again.')
        setDay('')
      },
      onError: (err) => toast(messageOf(err)),
    })
  }

  return (
    <Panel title="Close the books">
      <div className="flex flex-col gap-3 px-5 py-4 text-[14px]">
        <p className="text-ink-soft">
          Nothing dated before the day you choose can be added, changed or deleted, in the Cash book or in any table that posts to it. Only you can change this day.
        </p>
        {locked ? (
          <p className="font-medium">
            Closed before {formatDay(locked)}.{' '}
            <button type="button" className="text-stamp underline" disabled={setLock.isPending} onClick={() => save(null)}>
              Open the books again
            </button>
          </p>
        ) : (
          <p className="text-ink-soft">The books are open.</p>
        )}
        <form
          className="flex flex-wrap items-end gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            if (day) save(day)
          }}
        >
          <div className="w-52">
            <TextField label={locked ? 'Change the day' : 'Close before'} type="date" value={day} onChange={(event) => setDay(event.target.value)} />
          </div>
          <Button type="submit" disabled={!day || setLock.isPending}>
            {setLock.isPending ? 'Saving…' : 'Close the books'}
          </Button>
        </form>
      </div>
    </Panel>
  )
}
