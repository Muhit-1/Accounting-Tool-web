import type { InputHTMLAttributes } from 'react'

interface TextFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
}

export function TextField({ label, error, id, className = '', ...props }: TextFieldProps) {
  const inputId = id ?? props.name
  return (
    <label className="flex flex-col gap-1.5" htmlFor={inputId}>
      <span className="text-xs font-medium tracking-wider text-ink-soft uppercase">{label}</span>
      <input
        id={inputId}
        className={`rounded-ledger border border-paper-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-stamp focus:outline-none ${className}`}
        {...props}
      />
      {error && <span className="text-xs text-rust">{error}</span>}
    </label>
  )
}
