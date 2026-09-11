import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { ApiError } from '../lib/api-client'
import { TextField } from '../components/TextField'
import { Button } from '../components/Button'
import { Seal } from '../components/Seal'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setIsSubmitting(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="rise w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Seal size={44} />
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Accounting Tool</h1>
            <p className="text-sm text-ink-soft">Bookkeeping for every venture</p>
          </div>
        </div>

        <div className="rounded-ledger border border-paper-line bg-white p-7">
          <h2 className="mb-5 font-display text-xl font-bold">Welcome back</h2>
          <form className="flex flex-col gap-4" onSubmit={handleSubmit}>
            <TextField
              label="Email"
              type="email"
              name="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
            <TextField
              label="Password"
              type="password"
              name="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            {error && <p className="text-sm text-rust">{error}</p>}
            <Button type="submit" disabled={isSubmitting} className="mt-2">
              {isSubmitting ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>

        <p className="mt-5 text-center text-sm text-ink-soft">
          New here?{' '}
          <Link to="/register" className="text-stamp underline underline-offset-2">
            Create an account
          </Link>
        </p>
      </div>
    </div>
  )
}
