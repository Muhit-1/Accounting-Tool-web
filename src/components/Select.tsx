import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
}

export function Select({ label, id, className = '', children, ...props }: SelectProps) {
  const selectId = id ?? props.name
  return (
    <label className="flex flex-col gap-1.5" htmlFor={selectId}>
      <span className="text-xs font-medium tracking-wider text-ink-soft uppercase">{label}</span>
      <select
        id={selectId}
        className={`rounded-ledger border border-paper-line bg-white px-3.5 py-2.5 text-[15px] text-ink focus:border-stamp focus:outline-none ${className}`}
        {...props}
      >
        {children}
      </select>
    </label>
  )
}
