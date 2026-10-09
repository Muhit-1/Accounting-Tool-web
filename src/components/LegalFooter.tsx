import { Link } from 'react-router-dom'

// Shown on the public/auth screens, where there is no app shell to carry
// these links. The legal notice (Impressum) lives on the company website.
export function LegalFooter({ className = '' }: { className?: string }) {
  const linkClass = 'underline underline-offset-2 hover:text-ink'
  return (
    <footer className={`text-center text-xs text-ink-soft print:hidden ${className}`}>
      <nav aria-label="Legal" className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
        <Link to="/privacy" className={linkClass}>
          Privacy Policy
        </Link>
        <Link to="/terms" className={linkClass}>
          Terms of Service
        </Link>
        <a href="https://www.sam-trek.com/impressum/" target="_blank" rel="noopener noreferrer" className={linkClass}>
          Legal notice<span className="sr-only"> (opens in a new tab)</span>
        </a>
      </nav>
    </footer>
  )
}
