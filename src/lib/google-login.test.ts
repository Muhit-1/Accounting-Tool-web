import { describe, expect, it } from 'vitest'
import { googleLoginErrorMessage, loginErrorText, readTokenFromHash } from './google-login'

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

describe('loginErrorText', () => {
  it('is the plain sentence for most codes', () => {
    expect(loginErrorText('access_denied')).toBe(googleLoginErrorMessage('access_denied'))
    expect(loginErrorText(null)).toBeNull()
  })

  it('gives a deactivated person the support address, when there is one', () => {
    const text = loginErrorText('account_disabled', 'help@example.com')
    expect(text).toContain('help@example.com')
    expect(text).not.toContain('support address of Exin Finance')
    expect(loginErrorText('account_disabled', null)).toBe(googleLoginErrorMessage('account_disabled'))
  })

  it('never uses the address for other codes', () => {
    expect(loginErrorText('google_failed', 'help@example.com')).toBe(googleLoginErrorMessage('google_failed'))
  })
})
