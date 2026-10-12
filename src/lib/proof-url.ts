export const MAX_PROOF_URL_LENGTH = 2000

// Mirrors the API's rule (common/validators.ts isHttpsUrl): https only, no
// spaces, at most 2000 characters, no user:password@ in front of the host.
// Returns the message to show, or null when the link is fine or left empty.
export function proofUrlError(text: string): string | null {
  const value = text.trim()
  if (value === '') return null
  if (value.length > MAX_PROOF_URL_LENGTH) return `The link is too long (max ${MAX_PROOF_URL_LENGTH} characters).`
  if (/\s/.test(value)) return 'The link cannot contain spaces.'
  let url: URL
  try {
    url = new URL(value)
  } catch {
    return 'Enter a full link starting with https://'
  }
  if (url.protocol !== 'https:') return 'The link must start with https://'
  if (url.username !== '' || url.password !== '') return 'Remove the name and password from the link.'
  return null
}

// Only ever hand a link to an <a href> after this: the API stores https links
// only, but a row written some other way must not become a javascript: link.
export function safeProofHref(value: string | null | undefined): string | null {
  if (!value) return null
  return proofUrlError(value) === null ? value.trim() : null
}
