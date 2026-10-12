import { describe, expect, it } from 'vitest'
import { bulkRowErrors } from './bulk-errors'

describe('bulkRowErrors', () => {
  it('reads the per-row problems from an API error body', () => {
    const error = { status: 400, body: { message: '1 of 3 rows have a problem.', errors: [{ index: 1, field: 'date', message: 'That date is not valid' }] } }
    expect(bulkRowErrors(error)).toEqual([{ index: 1, field: 'date', message: 'That date is not valid' }])
  })

  it('ignores malformed entries and other errors', () => {
    expect(bulkRowErrors({ body: { errors: [{ index: '1' }, null, 5, { index: 2, field: 'x', message: 'ok' }] } })).toEqual([{ index: 2, field: 'x', message: 'ok' }])
    expect(bulkRowErrors(new Error('boom'))).toEqual([])
    expect(bulkRowErrors(null)).toEqual([])
    expect(bulkRowErrors({ body: 'text' })).toEqual([])
    expect(bulkRowErrors({ body: { errors: 'nope' } })).toEqual([])
  })
})
