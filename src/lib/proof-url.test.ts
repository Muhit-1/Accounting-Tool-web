import { describe, expect, it } from 'vitest'
import { proofUrlError, safeProofHref } from './proof-url'

describe('proofUrlError', () => {
  it('accepts https links and an empty box', () => {
    expect(proofUrlError('https://drive.google.com/file/d/abc/view')).toBeNull()
    expect(proofUrlError('  https://example.com/a.png  ')).toBeNull()
    expect(proofUrlError('')).toBeNull()
    expect(proofUrlError('   ')).toBeNull()
  })

  it.each(['http://example.com/a', 'javascript:alert(1)', 'JAVASCRIPT:alert(1)', 'data:text/html;base64,AAAA', 'ftp://x.com/a'])(
    'rejects %s with a message',
    (value) => {
      expect(proofUrlError(value)).toEqual(expect.any(String))
    },
  )

  it('rejects spaces, no scheme, name:password and over-long links', () => {
    expect(proofUrlError('https://example.com/a b')).toMatch(/spaces/)
    expect(proofUrlError('example.com/a')).toMatch(/https:\/\//)
    expect(proofUrlError('https://user:pw@example.com/a')).toEqual(expect.any(String))
    expect(proofUrlError('https://example.com/' + 'a'.repeat(2000))).toMatch(/too long/)
  })
})

describe('safeProofHref', () => {
  it('only returns links that are safe to put in an href', () => {
    expect(safeProofHref('https://example.com/a')).toBe('https://example.com/a')
    expect(safeProofHref('javascript:alert(1)')).toBeNull()
    expect(safeProofHref('http://example.com')).toBeNull()
    expect(safeProofHref(null)).toBeNull()
    expect(safeProofHref('')).toBeNull()
  })
})
