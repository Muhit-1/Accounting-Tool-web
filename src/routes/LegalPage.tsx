import { Fragment, useEffect, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../lib/auth-context'
import { useLegalDocument } from '../lib/legal'
import { Seal } from '../components/Seal'
import { Button } from '../components/Button'
import { LegalFooter } from '../components/LegalFooter'
import type { LegalDocument } from '../types/api'

const FALLBACK_TITLES: Record<LegalDocument['slug'], string> = {
  privacy: 'Privacy Policy',
  terms: 'Terms of Service',
}

// The API sends plain text only. URLs and email addresses are turned into
// links here, as React elements (never as HTML), and only http(s) and mailto
// targets can be produced, so a text can't introduce a javascript: link.
const LINKABLE = /(https?:\/\/[^\s<>"]*[^\s<>".,;:)!?]|[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g

function linkify(text: string): ReactNode {
  return text.split(LINKABLE).map((part, index) => {
    // split() with one capture group puts the matches at the odd indexes.
    if (index % 2 === 0) return <Fragment key={index}>{part}</Fragment>
    const isEmail = !part.startsWith('http')
    return (
      <a
        key={index}
        href={isEmail ? `mailto:${part}` : part}
        {...(isEmail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
        className="break-words text-stamp underline underline-offset-2"
      >
        {part}
      </a>
    )
  })
}

function formatEffectiveDate(isoDate: string): string {
  // Parsed as UTC and formatted as UTC so the day never shifts with the
  // viewer's time zone.
  const date = new Date(`${isoDate}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return isoDate
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
}

export function LegalPage({ slug }: { slug: LegalDocument['slug'] }) {
  const { user } = useAuth()
  const { data, isLoading, isError, refetch, isFetching } = useLegalDocument(slug)

  // Set from the slug so the tab title is right while loading and on error.
  useEffect(() => {
    const previous = document.title
    document.title = `${data?.title ?? FALLBACK_TITLES[slug]} – Exin Finance`
    return () => {
      document.title = previous
    }
  }, [data?.title, slug])

  return (
    <div className="min-h-screen px-4 py-8 print:p-0">
      <div className="mx-auto w-full max-w-[720px]">
        <header className="mb-6 flex items-center justify-between gap-4 print:hidden">
          <Link to="/" className="flex items-center gap-2.5">
            <Seal size={32} />
            <span className="font-display text-lg font-bold tracking-tight">Exin Finance</span>
          </Link>
          <div className="flex items-center gap-3 text-sm">
            <button
              type="button"
              onClick={() => window.print()}
              className="text-ink-soft underline underline-offset-2 hover:text-ink"
            >
              Print
            </button>
            <Link to={user ? '/' : '/login'} className="text-stamp underline underline-offset-2">
              {user ? 'Back to app' : 'Sign in'}
            </Link>
          </div>
        </header>

        <main className="rounded-ledger border border-paper-line bg-white p-6 sm:p-9 print:rounded-none print:border-0 print:p-0">
          {isLoading && (
            <p role="status" className="py-10 text-center text-ink-soft">
              Loading…
            </p>
          )}

          {isError && (
            <div role="alert" className="py-10 text-center">
              <h1 className="mb-2 font-display text-xl font-bold">{FALLBACK_TITLES[slug]} couldn’t be loaded</h1>
              <p className="mb-5 text-sm text-ink-soft">
                Please check your connection and try again. If the problem continues, write to{' '}
                <a href="mailto:info@sam-trek.com" className="text-stamp underline underline-offset-2">
                  info@sam-trek.com
                </a>
                .
              </p>
              <Button type="button" onClick={() => void refetch()} disabled={isFetching}>
                {isFetching ? 'Retrying…' : 'Try again'}
              </Button>
            </div>
          )}

          {data && (
            <article>
              <h1 className="font-display text-3xl font-bold tracking-tight">{data.title}</h1>
              <p className="mt-2 mb-8 text-sm text-ink-soft">
                Version {data.version} · Effective {formatEffectiveDate(data.effectiveDate)}
              </p>
              {data.sections.map((section) => (
                <section key={section.heading} className="mb-7 print:mb-5 print:break-inside-avoid">
                  <h2 className="mb-2 font-display text-lg font-bold">{section.heading}</h2>
                  {section.paragraphs?.map((paragraph) => (
                    <p key={paragraph} className="mb-3 leading-relaxed">
                      {linkify(paragraph)}
                    </p>
                  ))}
                  {section.bullets && (
                    <ul className="mb-3 list-disc space-y-2 pl-6 leading-relaxed">
                      {section.bullets.map((bullet) => (
                        <li key={bullet}>{linkify(bullet)}</li>
                      ))}
                    </ul>
                  )}
                </section>
              ))}
            </article>
          )}
        </main>

        <LegalFooter className="mt-6" />
      </div>
    </div>
  )
}
