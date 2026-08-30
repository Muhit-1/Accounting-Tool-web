import type { ReactNode } from 'react'

export function Panel({
  title,
  action,
  margined,
  children,
}: {
  title: string
  action?: ReactNode
  margined?: boolean
  children: ReactNode
}) {
  return (
    <section
      className={`relative rounded-ledger border border-paper-line bg-white/40 ${margined ? 'pl-[22px]' : ''}`}
    >
      {margined && (
        <div className="absolute top-[57px] bottom-4 left-[22px] w-px bg-rule-red opacity-50" aria-hidden="true" />
      )}
      <div className="flex items-center justify-between border-b border-paper-line px-5 py-4">
        <h2 className="font-display text-[19px] font-semibold">{title}</h2>
        {action}
      </div>
      {children}
    </section>
  )
}

export function PanelLink({ children, ...props }: { children: ReactNode } & React.AnchorHTMLAttributes<HTMLAnchorElement>) {
  return (
    <a className="border-b border-current text-[13px] text-stamp no-underline" {...props}>
      {children}
    </a>
  )
}
