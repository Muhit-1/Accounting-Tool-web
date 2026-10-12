// One problem in one row of a bulk add (paste / import): 0-based position, the
// field and a plain message. The API refuses the whole request when there is any.
export interface BulkRowError {
  index: number
  field: string
  message: string
}

// Reads the per-row problems out of an API error (ApiError.body.errors).
// Anything else gives an empty list.
export function bulkRowErrors(error: unknown): BulkRowError[] {
  if (error === null || typeof error !== 'object' || !('body' in error)) return []
  const body = (error as { body: unknown }).body
  if (body === null || typeof body !== 'object') return []
  const errors = (body as { errors?: unknown }).errors
  if (!Array.isArray(errors)) return []
  return errors.filter(
    (entry): entry is BulkRowError =>
      entry !== null &&
      typeof entry === 'object' &&
      typeof (entry as BulkRowError).index === 'number' &&
      typeof (entry as BulkRowError).message === 'string' &&
      typeof (entry as BulkRowError).field === 'string',
  )
}
