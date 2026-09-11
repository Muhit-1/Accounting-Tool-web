import type { TextareaHTMLAttributes } from 'react'

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string
}

export function Textarea({ label, id, className = '', ...props }: TextareaProps) {
  const areaId = id ?? props.name
  return (
    <label className="flex flex-col gap-1.5" htmlFor={areaId}>
      <span className="text-xs font-medium tracking-wider text-ink-soft uppercase">{label}</span>
      <textarea
        id={areaId}
        rows={3}
        className={`rounded-ledger border border-paper-line bg-white px-3.5 py-2.5 text-[15px] text-ink placeholder:text-ink-soft/60 focus:border-stamp focus:outline-none ${className}`}
        {...props}
      />
    </label>
  )
}
