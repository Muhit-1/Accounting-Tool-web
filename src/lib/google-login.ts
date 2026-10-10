import { API_URL } from './api-client'

// Where "Continue with Google" goes: a full-page navigation to the API, which
// redirects on to Google. Never fetch()ed — the browser has to follow the
// redirects and keep the API's httpOnly flow cookie.
export const GOOGLE_LOGIN_URL = `${API_URL}/auth/google`

// The API reports login failures as `/login?error=<code>`. Only these fixed
// codes are ever turned into text; anything else (including a code someone
// typed into the address bar) gets the generic message, never an echo.
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: 'Sign-in was cancelled. Choose “Continue with Google” to try again.',
  drive_permission_required:
    'Exin Finance needs permission to store files in your Google Drive. On Google’s screen, keep the Google Drive option ticked, then try again.',
  invalid_state: 'Your sign-in expired or was interrupted. Please try again.',
  google_failed: 'Google sign-in did not work. Please try again.',
}

export function googleLoginErrorMessage(code: string | null): string | null {
  if (code === null) return null
  return Object.hasOwn(ERROR_MESSAGES, code) ? ERROR_MESSAGES[code] : ERROR_MESSAGES.google_failed
}

// The API hands the JWT over in the URL fragment: `#token=<jwt>`. A JWT is three
// base64url segments, so anything else is rejected before it can be stored.
const JWT_PATTERN = /^[\w-]+\.[\w-]+\.[\w-]+$/

export function readTokenFromHash(hash: string): string | null {
  const token = new URLSearchParams(hash.replace(/^#/, '')).get('token')
  return token !== null && JWT_PATTERN.test(token) ? token : null
}
