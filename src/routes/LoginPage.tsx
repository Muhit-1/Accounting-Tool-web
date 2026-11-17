import { Link, useSearchParams } from 'react-router-dom'
import { GoogleSignInButton } from '../components/GoogleSignInButton'
import { Seal } from '../components/Seal'
import { LegalFooter } from '../components/LegalFooter'
import { googleLoginErrorMessage } from '../lib/google-login'
import { useNotice } from '../lib/support'

// One page for signing in and signing up: Google is the only way in, and the
// first Google login creates the account.
export function LoginPage() {
  const [searchParams] = useSearchParams()
  const code = searchParams.get('error')
  const { data: notice } = useNotice()
  const base = googleLoginErrorMessage(code)
  // a deactivated person is given the address to write to (set in the admin panel)
  const error = base && code === 'account_disabled' && notice?.supportEmail ? `${base.replace(/ write to the support address of Exin Finance\.$/, ' write to')} ${notice.supportEmail}.` : base

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
          <h2 className="mb-1 font-display text-xl font-bold">Welcome</h2>
          <p className="mb-5 text-sm text-ink-soft">Sign in or create your account with Google.</p>
          {error && (
            <p role="alert" className="mb-4 rounded-ledger bg-rust-soft px-3 py-2 text-sm text-rust">
              {error}
            </p>
          )}
          <GoogleSignInButton />
          <p className="mt-4 text-xs text-ink-soft">
            Exin Finance keeps your invoice PDFs and receipts in a folder it creates in your own Google Drive, so
            Google will ask for that permission. It is required, and Exin Finance cannot see any other file in your
            Drive.
          </p>
          <p className="mt-3 text-xs text-ink-soft">
            By continuing you agree to the{' '}
            <Link to="/terms" target="_blank" rel="noopener noreferrer" className="text-stamp underline underline-offset-2">
              Terms of Service
            </Link>{' '}
            and{' '}
            <Link to="/privacy" target="_blank" rel="noopener noreferrer" className="text-stamp underline underline-offset-2">
              Privacy Policy
            </Link>
            .
          </p>
        </div>

        <p className="mt-5 text-center text-sm">
          <Link to="/" className="text-ink-soft underline underline-offset-2 hover:text-ink">
            ← Back to home
          </Link>
        </p>

        <LegalFooter className="mt-6" />
      </div>
    </div>
  )
}
