import { describe, expect, it } from 'vitest'
import { googleLoginErrorMessage, readTokenFromHash } from './google-login'

// the API's `/login?error=<code>` codes are mapped to fixed sentences; nothing typed in the address bar is ever echoed
describe('googleLoginErrorMessage', () => {
  it('has a sentence for the codes the API sends, including a deactivated account and closed sign-ups', () => {
    expect(googleLoginErrorMessage('account_disabled')).toMatch(/deactivated/)
    expect(googleLoginErrorMessage('signup_closed')).toBe('New accounts are not being accepted right now.')
    expect(googleLoginErrorMessage('access_denied')).toMatch(/cancelled/)
  })
  it('gives the generic message for an unknown code, never an echo of it', () => {
    const text = googleLoginErrorMessage('<script>alert(1)</script>')
    expect(text).toBe(googleLoginErrorMessage('google_failed'))
    expect(text).not.toMatch(/script/)
  })
  it('gives nothing when there is no error', () => expect(googleLoginErrorMessage(null)).toBeNull())
})

describe('readTokenFromHash', () => {
  it('reads a token that looks like a JWT and nothing else', () => {
    expect(readTokenFromHash('#token=aaa.bbb.ccc')).toBe('aaa.bbb.ccc')
    expect(readTokenFromHash('#token=not-a-jwt')).toBeNull()
    expect(readTokenFromHash('')).toBeNull()
  })
})
