import { Link } from 'react-router-dom'
import { Seal } from '../components/Seal'
import { Button } from '../components/Button'

export function NotFoundPage() {
  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <div className="rise w-full max-w-sm text-center">
        <div className="mb-6 flex flex-col items-center gap-3">
          <Seal size={44} />
          <div className="font-display text-sm font-bold text-ink-soft uppercase tracking-wider">404</div>
        </div>
        <h1 className="mb-2 font-display text-2xl font-bold tracking-tight">Page not found</h1>
        <p className="mb-7 text-sm text-ink-soft">
          The page you're looking for doesn't exist, or you don't have access to it.
        </p>
        <Link to="/">
          <Button type="button">Back to dashboard</Button>
        </Link>
      </div>
    </div>
  )
}
