import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { readTokenFromHash } from '../lib/google-login'

// Landing page of the Google login: the API redirects here with the JWT in the
// URL fragment (`#token=...`), which is never sent to any server or logged.
export function AuthCallbackPage() {
  const { completeLogin } = useAuth()
  const navigate = useNavigate()
  // StrictMode runs effects twice in development; the fragment is erased on
  // the first run, so a second run would wrongly see "no token".
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    const token = readTokenFromHash(window.location.hash)
    // Out of the address bar and the history entry before anything else happens.
    window.history.replaceState(null, '', window.location.pathname)

    if (token === null) {
      navigate('/login?error=google_failed', { replace: true })
      return
    }
    completeLogin(token).then(
      () => navigate('/', { replace: true }),
      () => navigate('/login?error=google_failed', { replace: true }),
    )
  }, [completeLogin, navigate])

  return <div className="flex min-h-screen items-center justify-center text-ink-soft">Signing you in…</div>
}
